import axios from 'axios';
import { CharacterTile } from '../domain/tile';
import { LlmResponse, llmResponseSchema } from './llmSchema';
import { mockInferPlayerAppearance } from './mockLlm';

export async function inferPlayerAppearance(
  playerText: string,
  remainingTiles: CharacterTile[]
): Promise<LlmResponse> {
  const endpoint = import.meta.env?.VITE_LLM_ENDPOINT;

  if (!endpoint) {
    return mockInferPlayerAppearance(playerText, remainingTiles);
  }

  try {
    const response = await axios.post(endpoint, {
      playerText,
      remainingTiles,
    });

    const parsed = llmResponseSchema.safeParse(response.data);
    if (!parsed.success) {
      throw new Error(parsed.error.message);
    }

    return parsed.data;
  } catch (error) {
    console.warn('LLM API 실패, 목업 사용', error);
    return mockInferPlayerAppearance(playerText, remainingTiles);
  }
}
