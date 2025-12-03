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

// appearanceClient.ts 에서 부르는 엔드포인트와 매칭
app.post("/api/appearance", async (req, res) => {
  try {
    const { playerText, remainingTiles, phase } = req.body;

    // ✅ 최소 동작: 남은 타일 중 첫 번째를 프로필로 쓰기 (지금 mock과 유사)
    //   나중에 여기만 진짜 LLM 호출 로직으로 갈아끼우면 됩니다.
    const seedTile = remainingTiles[0];

    // ——— 여기부터는 실제 OpenAI 호출을 하는 예시 ———
    const systemPrompt = `
You are a game assistant that infers a player's appearance profile for a guessing game.
Return ONLY a JSON object with the following shape:

{
  "profile": {
    "ageGroup": "...",
    "skinTone": "...",
    "bodyShape": "...",
    "skinCondition": "...",
    "hairLength": "...",
    "hairStyle": "...",
    "hairColor": "...",
    "glasses": "...",
    "facialHair": "...",
    "faceShape": "...",
    "expressionBaseline": "...",
    "styleVibe": "...",
    "makeupLevel": "...",
    "accessoriesPresence": "..."
  },
  "eliminatedIds": ["...", "..."],
  "reasoning": {
    "summary": "..."
  }
}

All enum values must be one of the allowed options given by the game.
No extra fields, no explanations outside JSON.
    `;

    const userPrompt = `
Player description (Korean or English):
${playerText}

Remaining character tiles:
${JSON.stringify(remainingTiles, null, 2)}

Current phase: ${phase}
    `;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content ?? "{}";

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // 모델이 이상하게 답하면 fallback
      parsed = {
        profile: seedTile.core,
        eliminatedIds: [],
        reasoning: { fallback: "LLM 응답 파싱 실패, seedTile 사용" },
      };
    }

    res.json(parsed);
  } catch (error) {
    console.error("OpenAI error:", error);
    res.status(500).json({ error: "OpenAI request failed" });
  }
});

app.listen(3000, () => {
  console.log("API server listening on http://localhost:3000");
});