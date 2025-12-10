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

/**
 * 프론트엔드에서 prompt/chainIds를 전달해 이미지를 요청하는 클라이언트
 */
export async function requestImages(prompt: string, chainIds: string[]): Promise<Record<string, string>> {
  const endpoint = import.meta.env.VITE_IMAGE_ENDPOINT || '/api/generate-images';

  try {
    const response = await fetch(endpoint, {
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
  } catch (error) {
    console.warn('Image generation request failed, using placeholders instead.', error);
    return {};
  }
}
