export type AgeGroup = 'child' | 'teen' | 'young_adult' | 'adult' | 'older_adult';
export type SkinTone = 'very_light' | 'light' | 'medium' | 'tan' | 'deep';
export type BodyShape = 'very_slim' | 'slim' | 'average' | 'slightly_chubby' | 'chubby';
export type SkinCondition =
  | 'clear'
  | 'some_acne'
  | 'noticeable_acne'
  | 'freckles_or_spots'
  | 'sensitive_or_red';

export type HairLength = 'bald_or_shaved' | 'short' | 'medium' | 'long';
export type HairStyle = 'straight' | 'wavy' | 'curly' | 'coily' | 'buzz';
export type HairColor = 'black' | 'dark_brown' | 'light_brown' | 'blonde' | 'red' | 'gray' | 'dyed_color';

export type Glasses = 'none' | 'round' | 'square' | 'other';
export type FacialHair = 'none' | 'stubble' | 'mustache' | 'beard';
export type FaceShape = 'round' | 'oval' | 'square' | 'long';

export type ExpressionBaseline =
  | 'neutral'
  | 'subtle_smile'
  | 'big_smile'
  | 'serious'
  | 'tired'
  | 'shy'
  | 'confident';
export type StyleVibe =
  | 'casual'
  | 'sporty'
  | 'formal'
  | 'artsy'
  | 'geeky'
  | 'punk_or_goth'
  | 'street'
  | 'minimal'
  | 'colorful';
export type MakeupLevel = 'none' | 'light' | 'noticeable' | 'bold';
export type AccessoriesPresence = 'none' | 'ear' | 'head' | 'neck';

export type AppearanceCore = {
  ageGroup: AgeGroup;
  skinTone: SkinTone;
  bodyShape: BodyShape;
  skinCondition: SkinCondition;
  hairLength: HairLength;
  hairStyle: HairStyle;
  hairColor: HairColor;
  glasses: Glasses;
  facialHair: FacialHair;
  faceShape: FaceShape;
  expressionBaseline: ExpressionBaseline;
  styleVibe: StyleVibe;
  makeupLevel: MakeupLevel;
  accessoriesPresence: AccessoriesPresence;
};

export type CharacterTile = {
  id: string;
  core: AppearanceCore;
  image: string;
  isEliminated: boolean;
};

export type GamePhase = 'early' | 'mid' | 'late';

export type GameState = {
  tiles: CharacterTile[];
  playerProfile?: AppearanceCore;
  round: number;
  phase: GamePhase;
  isLoading: boolean;
  lastReasoning?: Record<string, string>;
  statusMessage?: string;
};

export type LlmInferenceResult = {
  profile: AppearanceCore;
  eliminatedIds: string[];
  reasoning?: Record<string, string>;
};
