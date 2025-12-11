import { z } from 'zod';

import { appearanceCoreSchema } from './appearanceClient';
import { AppearanceCore } from '../types/appearance';

type AnalyzableImage = { id: string; image: string };

const analysisResponseSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      core: appearanceCoreSchema
    })
  )
});

function mapResults(results: { id: string; core: AppearanceCore }[]): Record<string, AppearanceCore> {
  return results.reduce<Record<string, AppearanceCore>>((acc, current) => {
    acc[current.id] = current.core;
    return acc;
  }, {});
}

/**
 * 요청된 이미지 묶음을 외부 분석 엔드포인트로 전송해 AppearanceCore를 추출한다.
 * - VITE_IMAGE_ANALYSIS_ENDPOINT가 없으면 오류를 던져 생성 과정을 중단한다.
 */
export async function analyzeGeneratedImages(
  images: AnalyzableImage[],
  prompt: string
): Promise<Record<string, AppearanceCore>> {
  const endpoint = import.meta.env.VITE_IMAGE_ANALYSIS_ENDPOINT;
  if (!endpoint) {
    throw new Error('VITE_IMAGE_ANALYSIS_ENDPOINT is not set. Cannot analyze generated images.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images, prompt })
  });

  if (!response.ok) {
    throw new Error(`Image analysis endpoint returned ${response.status}`);
  }

  const json = await response.json();
  const parsed = analysisResponseSchema.parse(json);
  return mapResults(parsed.results);
}
