import { z } from 'zod';

export const appearanceCoreSchema = z.object({
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
  accessoriesPresence: z.enum(['none', 'ear', 'head', 'neck']),
});

export const llmResponseSchema = z.object({
  profile: appearanceCoreSchema,
  eliminatedIds: z.array(z.string()),
  reasoning: z.record(z.string()).optional(),
});

export type LlmResponse = z.infer<typeof llmResponseSchema>;
