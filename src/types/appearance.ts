// appearance 관련 타입 정의 파일
export type Gender = 'male' | 'female' | 'non_binary' | 'transgender';
export type Race =
  | 'east_asian'
  | 'southeast_asian'
  | 'south_asian'
  | 'black'
  | 'white'
  | 'latinx'
  | 'middle_eastern'
  | 'indigenous'
  | 'pacific_islander'
  | 'mixed';
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
  gender: Gender;
  race: Race;
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
  /**
   * Generation/inference chain metadata used to orchestrate staged image generation.
   * `isVisible` gates whether the tile is currently rendered on the board.
   */
  chainId?: string;
  parentChainId?: string;
  isVisible?: boolean;
  isGenerated?: boolean;
};

export type GenerationPhase = 'gen1' | 'gen2' | 'gen3' | 'gen4';
export type EliminationPhase = 'early' | 'mid' | 'late';
export type GamePhase = GenerationPhase | EliminationPhase;

export type GameState = {
  tiles: CharacterTile[];
  playerProfile?: AppearanceCore;
  playerText: string;
  currentQuestion: string;
  questionIndex: number;
  questionHistory: string[];
  round: number;
  phase: GamePhase;
  isLoading: boolean;
  lastReasoning?: Record<string, string>;
  statusMessage?: string;
  lastEliminatedIds: string[];
  /** 기록된 모든 플레이어 텍스트 입력(기수별 맥락 전달용) */
  playerHistory: string[];
};

export type LlmInferenceResult = {
  profile: AppearanceCore;
  eliminatedIds: string[];
  reasoning?: Record<string, string>;
};
