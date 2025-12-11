import { z } from 'zod';

import { appearanceCoreSchema } from './appearanceClient';
import { AppearanceCore } from '../types/appearance';

const MAX_ANALYSIS_EDGE = 512;
const ANALYSIS_JPEG_QUALITY = 0.72;

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

  const compressedImages = await Promise.all(
    images.map(async (item) => ({ ...item, image: await compressImageForAnalysis(item.image) }))
  );

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: compressedImages, prompt })
  });

  if (!response.ok) {
    throw new Error(
      `Image analysis endpoint returned ${response.status} for ${endpoint}. Ensure the backend route exists and is reachable.`
    );
  }

  const json = await response.json();
  const parsed = analysisResponseSchema.parse(json);
  return mapResults(parsed.results);
}

async function compressImageForAnalysis(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith('data:image')) return dataUrl;

  try {
    const img = await loadImage(dataUrl);
    const { width, height } = resizeToFit(img.width, img.height, MAX_ANALYSIS_EDGE);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;

    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', ANALYSIS_JPEG_QUALITY);
  } catch (error) {
    console.warn('[imageAnalysis] failed to compress image; sending original', error);
    return dataUrl;
  }
}

function resizeToFit(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const largest = Math.max(width, height);
  if (largest <= maxEdge) return { width, height };

  const scale = maxEdge / largest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
