export type AppearanceCore = {
  ageGroup: 'child' | 'teen' | 'young_adult' | 'adult' | 'older_adult';
  skinTone: 'very_light' | 'light' | 'medium' | 'tan' | 'deep';
  bodyShape: 'very_slim' | 'slim' | 'average' | 'slightly_chubby' | 'chubby';
  skinCondition: 'clear' | 'some_acne' | 'noticeable_acne' | 'freckles_or_spots' | 'sensitive_or_red';
  hairLength: 'bald_or_shaved' | 'short' | 'medium' | 'long';
  hairStyle: 'straight' | 'wavy' | 'curly' | 'coily' | 'buzz';
  hairColor: 'black' | 'dark_brown' | 'light_brown' | 'blonde' | 'red' | 'gray' | 'dyed_color';
  glasses: 'none' | 'round' | 'square' | 'other';
  facialHair: 'none' | 'stubble' | 'mustache' | 'beard';
  faceShape: 'round' | 'oval' | 'square' | 'long';
  expressionBaseline: 'neutral' | 'subtle_smile' | 'big_smile' | 'serious' | 'tired' | 'shy' | 'confident';
  styleVibe: 'casual' | 'sporty' | 'formal' | 'artsy' | 'geeky' | 'punk_or_goth' | 'street' | 'minimal' | 'colorful';
  makeupLevel: 'none' | 'light' | 'noticeable' | 'bold';
  accessoriesPresence: 'none' | 'ear' | 'head' | 'neck';
};
