// server.js
import "dotenv/config";
import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

// 🔐 서버에서만 키를 사용
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 프론트 zod 스키마와 동일한 enum 목록
 */
const allowed = {
  gender: ["male", "female", "non_binary", "transgender"],
  race: [
    "east_asian",
    "southeast_asian",
    "south_asian",
    "black",
    "white",
    "latinx",
    "middle_eastern",
    "indigenous",
    "pacific_islander",
    "mixed",
  ],
  ageGroup: ["child", "teen", "young_adult", "adult", "older_adult"],
  skinTone: ["very_light", "light", "medium", "tan", "deep"],
  bodyShape: ["very_slim", "slim", "average", "slightly_chubby", "chubby"],
  skinCondition: [
    "clear",
    "some_acne",
    "noticeable_acne",
    "freckles_or_spots",
    "sensitive_or_red",
  ],
  hairLength: ["bald_or_shaved", "short", "medium", "long"],
  hairStyle: ["straight", "wavy", "curly", "coily", "buzz"],
  hairColor: ["black", "dark_brown", "light_brown", "blonde", "red", "gray", "dyed_color"],
  glasses: ["none", "round", "square", "other"],
  facialHair: ["none", "stubble", "mustache", "beard"],
  faceShape: ["round", "oval", "square", "long"],
  expressionBaseline: [
    "neutral",
    "subtle_smile",
    "big_smile",
    "serious",
    "tired",
    "shy",
    "confident",
  ],
  styleVibe: [
    "casual",
    "sporty",
    "formal",
    "artsy",
    "geeky",
    "punk_or_goth",
    "street",
    "minimal",
    "colorful",
  ],
  makeupLevel: ["none", "light", "noticeable", "bold"],
  accessoriesPresence: ["none", "ear", "head", "neck"],
};

/**
 * profile 전체가 enum 규칙을 지키는지 검사
 * 유효하지 않은 필드 목록을 반환
 */
function validateProfile(profile = {}) {
  const invalid = [];

  for (const field of Object.keys(allowed)) {
    const options = allowed[field];
    const value = profile[field];
    if (typeof value !== "string" || !options.includes(value)) {
      invalid.push({ field, value, expected: options });
    }
  }

  return invalid;
}

/**
 * enum 밖의 값을 seedCore 또는 안전한 기본값으로 정규화
 */
function normalizeEnum(field, value, seedCore, fallback) {
  const options = allowed[field];
  if (!options) return fallback;
  if (typeof value === "string" && options.includes(value)) return value;

  // 1순위: seedCore 값
  const seedVal = seedCore?.[field];
  if (typeof seedVal === "string" && options.includes(seedVal)) return seedVal;

  // 2순위: 미리 정한 기본값
  if (options.includes(fallback)) return fallback;

  // 마지막: 첫 번째 옵션
  return options[0];
}

/**
 * LLM 응답 + seedTile.core 를 합쳐 최종 profile 생성
 */
function buildNormalizedProfile(rawProfile = {}, seedCore = {}) {
  return {
    gender: normalizeEnum("gender", rawProfile.gender, seedCore, "non_binary"),
    race: normalizeEnum("race", rawProfile.race, seedCore, "mixed"),
    ageGroup: normalizeEnum("ageGroup", rawProfile.ageGroup, seedCore, "adult"),
    skinTone: normalizeEnum("skinTone", rawProfile.skinTone, seedCore, "medium"),
    bodyShape: normalizeEnum("bodyShape", rawProfile.bodyShape, seedCore, "average"),
    skinCondition: normalizeEnum(
      "skinCondition",
      rawProfile.skinCondition,
      seedCore,
      "clear"
    ),
    hairLength: normalizeEnum("hairLength", rawProfile.hairLength, seedCore, "medium"),
    hairStyle: normalizeEnum("hairStyle", rawProfile.hairStyle, seedCore, "straight"),
    hairColor: normalizeEnum("hairColor", rawProfile.hairColor, seedCore, "black"),
    glasses: normalizeEnum("glasses", rawProfile.glasses, seedCore, "none"),
    facialHair: normalizeEnum("facialHair", rawProfile.facialHair, seedCore, "none"),
    faceShape: normalizeEnum("faceShape", rawProfile.faceShape, seedCore, "oval"),
    expressionBaseline: normalizeEnum(
      "expressionBaseline",
      rawProfile.expressionBaseline,
      seedCore,
      "neutral"
    ),
    styleVibe: normalizeEnum("styleVibe", rawProfile.styleVibe, seedCore, "casual"),
    makeupLevel: normalizeEnum("makeupLevel", rawProfile.makeupLevel, seedCore, "none"),
    accessoriesPresence: normalizeEnum(
      "accessoriesPresence",
      rawProfile.accessoriesPresence,
      seedCore,
      "none"
    ),
  };
}

function validateStrength(profile = {}, seedCore = {}, eliminatedIds = [], remainingTiles = [], playerText = "") {
  const issues = [];
  const fields = Object.keys(allowed);

  // 플레이어가 뭔가를 적었고 타일이 남아 있을 때, 프로필이 시드와 완전히 동일하면 너무 소극적인 응답으로 간주
  const trimmed = (playerText || "").trim();
  if (trimmed.length > 0 && Array.isArray(remainingTiles) && remainingTiles.length > 0) {
    const sameCount = fields.filter(
      (f) =>
        typeof profile[f] === "string" &&
        seedCore &&
        typeof seedCore[f] === "string" &&
        profile[f] === seedCore[f]
    ).length;

    if (sameCount === fields.length) {
      issues.push({
        field: "__profile_similarity",
        value: "too_close_to_seed",
        expected: "at_least_some_fields_differ_from_seed_when_player_provides_text",
      });
    }
  }

  // 타일이 두 개 이상 남았는데 제거된 타일이 하나도 없으면 너무 소극적인 응답으로 간주
  if (Array.isArray(remainingTiles) && remainingTiles.length > 1 && eliminatedIds.length === 0) {
    issues.push({
      field: "eliminatedIds",
      value: "none",
      expected: "at_least_one_eliminated_tile_when_more_than_one_remains",
    });
  }

  return issues;
}

/**
 * LLM에 한 번 요청
 * extraInvalid가 있으면 "지난 응답에서 어떤 필드가 잘못됐는지"를 피드백으로 함께 보냄
 */
async function requestProfileOnce({
  playerText,
  remainingTiles,
  phase,
  seedCore,
  extraInvalid,
}) {
  const systemPrompt = `
You are an assistant for a guessing game.
You infer the player's appearance profile based on their self description and remaining character tiles.

You MUST return a JSON object with EXACTLY this shape and ONLY these fields:

{
  "profile": {
    "gender": "male|female|non_binary|transgender",
    "race": "east_asian|southeast_asian|south_asian|black|white|latinx|middle_eastern|indigenous|pacific_islander|mixed",
    "ageGroup": "child|teen|young_adult|adult|older_adult",
    "skinTone": "very_light|light|medium|tan|deep",
    "bodyShape": "very_slim|slim|average|slightly_chubby|chubby",
    "skinCondition": "clear|some_acne|noticeable_acne|freckles_or_spots|sensitive_or_red",
    "hairLength": "bald_or_shaved|short|medium|long",
    "hairStyle": "straight|wavy|curly|coily|buzz",
    "hairColor": "black|dark_brown|light_brown|blonde|red|gray|dyed_color",
    "glasses": "none|round|square|other",
    "facialHair": "none|stubble|mustache|beard",
    "faceShape": "round|oval|square|long",
    "expressionBaseline": "neutral|subtle_smile|big_smile|serious|tired|shy|confident",
    "styleVibe": "casual|sporty|formal|artsy|geeky|punk_or_goth|street|minimal|colorful",
    "makeupLevel": "none|light|noticeable|bold",
    "accessoriesPresence": "none|ear|head|neck"
  },
  "eliminatedIds": ["id1", "id2", "..."],
  "reasoning": {
    "summary": "short explanation in Korean or English"
  }
}

IMPORTANT RULES:
- For EVERY field in "profile", you MUST choose EXACTLY ONE value from the allowed list.
- NEVER use values like "any", "unknown", "none_of_the_above", "other_than_these".
- If the player's description does not specify a field, choose the closest reasonable option
  OR copy the corresponding value from the seed reference character in the instructions.
- Even if the player's description does NOT mention appearance, you MUST still infer a plausible profile by using linguistic cues, context, tone, or by falling back to the seed reference character where reasonable. Never return vague values; always choose one concrete enum value per field.
- You MUST NOT say that there is "not enough information" to infer appearance traits. You must always commit to a concrete guess for every field.
- You MUST NOT simply copy the entire profile of the seed reference character unless the player's description explicitly states that they look exactly like that character.
- When more than one tile remains, you MUST always eliminate at least one tile. Even with minimal information, choose the least compatible characters and briefly justify it in "reasoning.summary".
- Do not add extra fields.
- Do not wrap the JSON in backticks or markdown.
`.trim();

  const baseUserPrompt = `
Player free-text description (Korean or English):
${playerText}

Remaining character tiles (for reference):
${JSON.stringify(remainingTiles, null, 2)}

Seed reference character core:
${JSON.stringify(seedCore, null, 2)}

Current phase: ${phase}
`.trim();

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: baseUserPrompt },
  ];

  if (extraInvalid && extraInvalid.length > 0) {
    const feedbackText =
      "Your previous answer used invalid values for these fields:\n" +
      extraInvalid
        .map(
          (i) =>
            `- ${i.field}: received '${i.value}', expected one of [${i.expected.join(
              ", "
            )}]`
        )
        .join("\n") +
      "\n\nPlease answer again with a NEW JSON object that strictly follows the allowed values.";
    messages.push({
      role: "user",
      content: feedbackText,
    });
  }

  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages,
    temperature: 0.6,
  });

  const content = completion.choices[0]?.message?.content ?? "{}";

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.warn("⚠ LLM 응답 JSON.parse 실패:", e, "\ncontent:", content);
    return { parsed: null, invalid: [{ field: "json", value: content, expected: ["valid JSON"] }] };
  }

  const profile = parsed?.profile ?? {};
  const eliminatedIdsRaw = Array.isArray(parsed?.eliminatedIds) ? parsed.eliminatedIds : [];
  const eliminatedIds = eliminatedIdsRaw.filter((id) => typeof id === "string");

  const enumInvalid = validateProfile(profile);
  const strengthInvalid = validateStrength(
    profile,
    seedCore,
    eliminatedIds,
    remainingTiles,
    playerText
  );

  const invalid = [...enumInvalid, ...strengthInvalid];

  return { parsed, invalid };
}

/**
 * LLM 재시도 래퍼
 * - 첫 시도에서 invalid면, 무엇이 잘못됐는지 피드백을 주고 다시 요청
 * - maxRetries 회수 동안 유효한 profile을 얻으려고 시도
 */
async function requestProfileWithRetry(params, maxRetries = 2) {
  let lastParsed = null;
  let lastInvalid = [];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const { parsed, invalid } = await requestProfileOnce({
      ...params,
      extraInvalid: attempt === 0 ? null : lastInvalid,
    });

    lastParsed = parsed;
    lastInvalid = invalid;

    if (!invalid.length && parsed) {
      console.log(`✅ LLM profile valid at attempt ${attempt + 1}`);
      return parsed;
    }

    console.warn(
      `⚠ LLM profile invalid at attempt ${attempt + 1}:`,
      invalid.map((i) => ({
        field: i.field,
        value: i.value,
        expected: i.expected,
      }))
    );
  }

  console.warn("⚠ LLM profile invalid after all retries, fallback to normalization");
  return lastParsed;
}

// appearanceClient.ts 에서 부르는 엔드포인트와 매칭
app.post("/api/appearance", async (req, res) => {
  try {
    const { playerText, remainingTiles, phase } = req.body;

    if (!Array.isArray(remainingTiles) || remainingTiles.length === 0) {
      return res.status(400).json({ error: "remainingTiles is empty" });
    }

    const seedTile = remainingTiles[0];
    const seedCore = seedTile.core ?? {};

    // 1) LLM에 프로필 요청 (재시도 포함)
    const parsed = await requestProfileWithRetry(
      { playerText, remainingTiles, phase, seedCore },
      2 // 재시도 2번 (총 3회 시도)
    );

    // 2) rawProfile + seedCore 를 이용해 최종 profile 정규화
    const rawProfile = parsed?.profile || {};
    const normalizedProfile = buildNormalizedProfile(rawProfile, seedCore);

    let eliminatedIds = Array.isArray(parsed?.eliminatedIds) ? parsed.eliminatedIds : [];
    eliminatedIds = eliminatedIds.filter((id) => typeof id === "string");

    // 최소 1개는 제거되도록 강제 (남은 타일이 2개 이상일 때)
    if (Array.isArray(remainingTiles) && remainingTiles.length > 1 && eliminatedIds.length === 0) {
      const allIds = remainingTiles.map((t) => t.id);
      const candidateIds = allIds.slice(1); // 시드 타일은 남겨두고 나머지 중에서 제거
      if (candidateIds.length > 0) {
        const rand = candidateIds[Math.floor(Math.random() * candidateIds.length)];
        eliminatedIds = [rand];
      }
    }

    const reasoning =
      parsed?.reasoning && typeof parsed.reasoning === "object"
        ? parsed.reasoning
        : { summary: "LLM 추론 결과를 seedTile 정보와 조합해 정규화했습니다." };

    return res.json({
      profile: normalizedProfile,
      eliminatedIds,
      reasoning,
    });
  } catch (error) {
    console.error("🔥 /api/appearance OpenAI error:", error);
    // 완전 fallback (seedTile 기반)
    const { remainingTiles = [] } = req.body;
    const seedTile = Array.isArray(remainingTiles) && remainingTiles[0] ? remainingTiles[0] : {};
    const seedCore = seedTile.core ?? {};
    const fallbackProfile = buildNormalizedProfile({}, seedCore);

    return res.status(200).json({
      profile: fallbackProfile,
      eliminatedIds: [],
      reasoning: { fallback: "OpenAI 오류 발생. 시드 타일 기반 fallback 사용." },
    });
  }
});

app.listen(3000, () => {
  console.log("API server listening on http://localhost:3000");
});