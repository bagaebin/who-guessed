import { z } from 'zod';

type ImageMap = Record<string, string>;

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

async function postImages(url: string, prompt: string, chainIds: string[]): Promise<ImageMap> {
  console.debug('[imageClient] POST images to', url, { promptSummary: prompt.slice(0, 60), chainIds });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, chainIds })
  });

  if (!response.ok) {
    throw new Error(`Image endpoint returned ${response.status}`);
  }

  const json = await response.json();
  console.debug('[imageClient] raw response', json);
  const parsed = imageResponseSchema.parse(json);

  const map: ImageMap = {};
  parsed.images?.forEach((item, index) => {
    const key = item.id || chainIds[index] || `image-${index + 1}`;
    map[key] = item.image;
  });
  return map;
}

/**
 * 프론트엔드에서 prompt/chainIds를 전달해 이미지를 요청하는 클라이언트
 * - VITE_IMAGE_ENDPOINT로만 요청을 전송하며, 모킹/placeholder로 대체하지 않는다.
 */
export async function requestImages(
  prompt: string,
  chainIds: string[] = []
): Promise<ImageMap> {
  const endpoint = import.meta.env.VITE_IMAGE_ENDPOINT;

  if (!endpoint) {
    // 👉 모킹 절대 금지: 엔드포인트 없으면 바로 에러
    throw new Error('VITE_IMAGE_ENDPOINT is not set. Cannot request real images.');
  }

  try {
    console.debug('[imageClient] requestImages using endpoint', endpoint);
    return await postImages(endpoint, prompt, chainIds);
  } catch (error) {
    console.error('[imageClient] requestImages failed for endpoint', endpoint, error);
    throw error;
  }
}