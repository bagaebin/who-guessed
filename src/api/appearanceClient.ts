import { z } from 'zod';
import { eliminationRangeForPhase } from '../utils/phase';
import { CharacterTile, GamePhase, LlmInferenceResult } from '../types/appearance';

const appearanceCoreSchema = z.object({
  gender: z.enum(['male', 'female', 'non_binary', 'transgender']),
  race: z.enum([
    'east_asian',
    'southeast_asian',
    'south_asian',
    'black',
    'white',
    'latinx',
    'middle_eastern',
    'indigenous',
    'pacific_islander',
    'mixed'
  ]),
  ageGroup: z.enum(['child', 'teen', 'young_adult', 'adult', 'older_adult']),
  skinTone: z.enum(['very_light', 'light', 'medium', 'tan', 'deep']),
  bodyShape: z.enum(['very_slim', 'slim', 'average', 'slightly_chubby', 'chubby']),
  skinCondition: z.enum(['clear', 'some_acne', 'noticeable_acne', 'freckles_or_spots', 'sensitive_or_red']),
  hairLength: z.enum(['bald_or_shaved', 'short', 'medium', 'long']),
  hairStyle: z.enum(['straight', 'wavy', 'curly', 'coily', 'buzz']),
  hairColor: z.enum(['black', 'dark_brown', 'light_brown', 'blonde', 'red', 'gray', 'dyed_color']),
  glasses: z.enum(['none', 'round', 'square', 'other']),
  facialHair: z.enum(['none', 'stubble', 'mustache', 'beard']),
  faceShape: z.enum(['round', 'oval', 'square', 'long']),
  expressionBaseline: z.enum(['neutral', 'subtle_smile', 'big_smile', 'serious', 'tired', 'shy', 'confident']),
  styleVibe: z.enum(['casual', 'sporty', 'formal', 'artsy', 'geeky', 'punk_or_goth', 'street', 'minimal', 'colorful']),
  makeupLevel: z.enum(['none', 'light', 'noticeable', 'bold']),
  accessoriesPresence: z.enum(['none', 'ear', 'head', 'neck'])
});

const appearanceResponseSchema = z.object({
  profile: appearanceCoreSchema,
  eliminatedIds: z.array(z.string()),
  reasoning: z.record(z.string(), z.string()).optional()
});

function selectRandomIds(tiles: CharacterTile[], count: number): string[] {
  const available = [...tiles];
  for (let i = available.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  return available.slice(0, count).map((t) => t.id);
}

function buildMockProfile(seedTile: CharacterTile): LlmInferenceResult {
  return {
    profile: seedTile.core,
    eliminatedIds: [],
    reasoning: { mock: 'LLM 연결 전까지는 시드 타일 프로필을 그대로 사용합니다.' }
  };
}

export async function inferPlayerAppearance(
  playerText: string,
  remainingTiles: CharacterTile[],
  phase: GamePhase
): Promise<LlmInferenceResult> {
  const endpoint = import.meta.env.VITE_LLM_ENDPOINT;
  if (endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerText, remainingTiles, phase })
      });
      const json = await response.json();
      const parsed = appearanceResponseSchema.parse(json);
      return parsed;
    } catch (error) {
      console.warn('LLM 호출 실패, mock으로 대체합니다.', error);
    }
  }

  const range = eliminationRangeForPhase(phase);
  const eliminations = Math.min(
    Math.max(range.min, Math.floor(Math.random() * (range.max - range.min + 1)) + range.min),
    Math.max(0, remainingTiles.length - 1)
  );
  const seedTile = remainingTiles[0];
  const mock = buildMockProfile(seedTile);
  mock.eliminatedIds = selectRandomIds(remainingTiles, eliminations);
  return mock;
}
