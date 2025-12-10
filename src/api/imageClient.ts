import { z } from 'zod';

const imageResponseSchema = z.object({
  images: z
    .array(
      z.object({
        id: z.string().optional(),
        image: z.string()
      })
    )
    .optional()
});

async function postImages(url: string, prompt: string, chainIds: string[]) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, chainIds })
  });

  if (!response.ok) {
    throw new Error(`Image endpoint returned ${response.status}`);
  }

  const json = await response.json();
  const parsed = imageResponseSchema.parse(json);

  const map: Record<string, string> = {};
  parsed.images?.forEach((item, index) => {
    const key = item.id || chainIds[index] || `image-${index + 1}`;
    map[key] = item.image;
  });
  return map;
}

/**
 * 프론트엔드에서 prompt/chainIds를 전달해 이미지를 요청하는 클라이언트
 */
export async function requestImages(prompt: string, chainIds: string[] = []): Promise<Record<string, string>> {
  const primary = import.meta.env.VITE_IMAGE_ENDPOINT || '/api/generate-images';
  const fallbacks = primary === '/api/generate-images' ? ['/generate-images'] : [];
  const attempts = [primary, ...fallbacks];

  let lastError: unknown;

  for (const url of attempts) {
    try {
      return await postImages(url, prompt, chainIds);
    } catch (error) {
      lastError = error;
      console.warn(`Image request to ${url} failed; trying next endpoint if available.`, error);
    }
  }

  console.warn('Image generation request failed on all endpoints, using placeholders instead.', lastError);
  return {};
}
