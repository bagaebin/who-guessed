import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { inferPlayerAppearance } from '../api/appearanceClient';
import { analyzeGeneratedImages } from '../api/imageAnalysisClient';
import { requestImages } from '../api/imageClient';
import { initialTiles } from '../data/tiles';
import { questionPool } from '../data/questions';
import { normalizeEliminations } from '../utils/elimination';
import { getPhaseFromRemaining, isGenerationPhase } from '../utils/phase';
import {
  AppearanceCore,
  CharacterTile,
  EliminationPhase,
  GamePhase,
  GameState,
  GENERATION_PHASES,
  GenerationPhase,
  PendingGenerationJob
} from '../types/appearance';

const FINAL_SLOT_COUNT = 10;
const generationPhases = GENERATION_PHASES;
const QUESTION_ROTATION_DELAY_MS = 3000;

function createSvgPlaceholder(label: string) {
  const textElement = label
    ? `<text x="100" y="120" text-anchor="middle" font-size="16" fill="#4b5563" font-family="Arial, sans-serif">${label}</text>`
    : '';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="240" viewBox="0 0 200 240">
      <rect width="200" height="240" fill="white" stroke="#d1d5db" stroke-width="3" />
      ${textElement}
    </svg>
  `;

  // TextureLoader sometimes fails to render utf-8 data URIs consistently across browsers;
  // base64 encoding keeps the placeholder visible both on the 3D board and in the admin console.
  const base64 = typeof btoa === 'function' ? btoa(svg) : Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

const PLACEHOLDER_IMAGE = createSvgPlaceholder('');
const seedPool = initialTiles.slice(0, FINAL_SLOT_COUNT);
const chainIds = Array.from({ length: FINAL_SLOT_COUNT }, (_, index) => `chain-${index + 1}`);
const initialQuestionEntry = questionPool[Math.floor(Math.random() * questionPool.length)];
const initialQuestion = initialQuestionEntry?.text ?? '';
const initialQuestionId = initialQuestionEntry?.id;

function drawRandomQuestion(askedIds: string[]): { id?: string; text: string } | null {
  const remaining = questionPool.filter((question) => !askedIds.includes(question.id));
  if (!remaining.length) return null;
  const next = remaining[Math.floor(Math.random() * remaining.length)];
  return { id: next.id, text: next.text };
}

function scheduleNextQuestion(
  get: () => GameState,
  set: (fn: (draft: GameState) => void) => void
) {
  const currentTimer = get().questionTimerId;
  if (currentTimer) {
    clearTimeout(currentTimer);
  }

  set((draft) => {
    draft.isInputLocked = true;
  });

  const timerId = setTimeout(() => {
    const next = drawRandomQuestion(get().askedQuestionIds);
    set((draft) => {
      if (next) {
        draft.currentQuestion = next.text;
        draft.currentQuestionId = next.id;
        if (next.id && !draft.askedQuestionIds.includes(next.id)) {
          draft.askedQuestionIds.push(next.id);
        }
        draft.questionHistory.push(next.text);
      } else {
        draft.currentQuestion = '';
        draft.currentQuestionId = undefined;
      }

      const shouldLock =
        draft.generationAnswers >= FINAL_SLOT_COUNT && (draft.pendingGenerations.length > 0 || draft.generationInFlight);
      draft.isInputLocked = shouldLock ? true : false;
      draft.questionTimerId = null;
    });
  }, QUESTION_ROTATION_DELAY_MS);

  set((draft) => {
    draft.questionTimerId = timerId as unknown as ReturnType<typeof setTimeout>;
  });
}

const visibilityByPhase = generationPhases.reduce<Record<GamePhase, Set<string>>>((acc, phase, index) => {
  acc[phase] = new Set(chainIds.slice(0, index + 1));
  return acc;
}, {
  early: new Set(chainIds),
  mid: new Set(chainIds),
  late: new Set(chainIds)
} as Record<GamePhase, Set<string>>);

function baseSlotFromSeed(index: number): CharacterTile {
  const seed = seedPool[index % seedPool.length];
  const id = chainIds[index];
  return {
    ...seed,
    id,
    image: PLACEHOLDER_IMAGE,
    isVisible: index === 0,
    isGenerated: false,
    isGenerating: false,
    isEliminated: false,
    core: { ...seed.core }
  };
}

function buildInitialTiles(): CharacterTile[] {
  return chainIds.map((_, index) => baseSlotFromSeed(index));
}

function computeHash(text: string, salt: string): number {
  return Array.from(text).reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0) +
    Array.from(salt).reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 3), 0);
}

function pickFromList<T>(items: T[], hash: number, offset = 0): T {
  const index = Math.abs(hash + offset) % items.length;
  return items[index];
}

function remixCore(base: AppearanceCore, prompt: string, salt: string): AppearanceCore {
  const hash = computeHash(prompt, salt);
  const hairColors: AppearanceCore['hairColor'][] = [
    'black',
    'dark_brown',
    'light_brown',
    'blonde',
    'red',
    'gray',
    'dyed_color'
  ];
  const expressions: AppearanceCore['expressionBaseline'][] = [
    'neutral',
    'subtle_smile',
    'big_smile',
    'serious',
    'tired',
    'shy',
    'confident'
  ];
  const vibes: AppearanceCore['styleVibe'][] = [
    'casual',
    'sporty',
    'formal',
    'artsy',
    'geeky',
    'punk_or_goth',
    'street',
    'minimal',
    'colorful'
  ];
  const accessories: AppearanceCore['accessoriesPresence'][] = ['none', 'ear', 'head', 'neck'];
  const makeups: AppearanceCore['makeupLevel'][] = ['none', 'light', 'noticeable', 'bold'];

  return {
    ...base,
    hairColor: pickFromList(hairColors, hash, 1),
    hairStyle: pickFromList(['straight', 'wavy', 'curly', 'coily', 'buzz'], hash, 2),
    expressionBaseline: pickFromList(expressions, hash, 3),
    styleVibe: pickFromList(vibes, hash, 5),
    accessoriesPresence: pickFromList(accessories, hash, 7),
    makeupLevel: pickFromList(makeups, hash, 11)
  };
}

function buildPromptFromTurn(question: string, answer: string): string {
  const fallbackQuestion = question?.trim() || 'the current question';
  const trimmedAnswer = answer?.trim() || 'no answer provided yet';
  const descriptor = `a real human person who would answer "${trimmedAnswer}" to the question "${fallbackQuestion}", described only through appearance and mood (never as text)`;
  return `realistic ID photo, centered bust portrait on a clean white background. The image must depict ${descriptor}, avoiding animals or fictional beings and containing absolutely no written text, captions, labels, or symbols.`;
}

function formatGenerationError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('VITE_IMAGE_ENDPOINT')) {
      return 'Image endpoint is missing. Set VITE_IMAGE_ENDPOINT to enable generation.';
    }

    if (error.message.includes('VITE_IMAGE_ANALYSIS_ENDPOINT')) {
      return 'Image analysis endpoint is missing. Set VITE_IMAGE_ANALYSIS_ENDPOINT to analyze generated images.';
    }

    if (error.message.includes('Image analysis endpoint returned 404')) {
      return 'Image analysis endpoint returned 404. Verify VITE_IMAGE_ANALYSIS_ENDPOINT points to a backend route that exists (e.g., /api/imageAnalysisClient must be implemented or update the URL to a reachable analysis service).';
    }

    return `Failed to generate appearance samples: ${error.message}`;
  }

  return 'Failed to generate appearance samples.';
}

function determineVisibleIds(phase: GamePhase): Set<string> {
  return visibilityByPhase[phase] ?? new Set(chainIds);
}

function updateVisibility(tiles: CharacterTile[], phase: GamePhase): CharacterTile[] {
  const visibleIds = determineVisibleIds(phase);
  return tiles.map((tile) => {
    const isVisible = visibleIds.has(tile.id);
    return {
      ...tile,
      isVisible,
      image: isVisible && !tile.isGenerated ? PLACEHOLDER_IMAGE : tile.image
    };
  });
}

function selectBaseCore(chainId: string, tiles: CharacterTile[]): AppearanceCore {
  const tile = tiles.find((t) => t.id === chainId);
  if (tile) return tile.core;
  const index = Math.max(chainIds.indexOf(chainId), 0);
  return seedPool[index % seedPool.length].core;
}

async function generateAppearanceForChains(
  chainList: string[],
  question: string,
  answer: string,
  tiles: CharacterTile[],
  stage: GenerationPhase
): Promise<{ chainId: string; core: AppearanceCore; image: string; prompt: string }[]> {
  const prompt = buildPromptFromTurn(question, answer);
  const fetchedImages = await requestImages(prompt, chainList);

  const stageImages = chainList.map((chainId) => {
    const slotIndex = chainIds.indexOf(chainId) + 1;
    const fallback = createSvgPlaceholder(`${stage.toUpperCase()}-${slotIndex}`);
    const image = fetchedImages[chainId] ?? fallback;
    return { id: chainId, image };
  });

  const analyzedCores = await analyzeGeneratedImages(stageImages, prompt);

  return stageImages.map(({ id, image }) => {
    const baseCore = selectBaseCore(id, tiles);
    const derivedCore = remixCore(baseCore, prompt, `${id}-${stage}`);
    const analyzedCore = analyzedCores[id];

    return { chainId: id, core: analyzedCore ?? derivedCore, image, prompt };
  });
}

function updatePhaseForUnlockedSlots(draft: GameState) {
  const unlockedSlots = Math.min(draft.generationAnswers + 1, FINAL_SLOT_COUNT);
  const nextPhaseIndex = Math.max(0, Math.min(unlockedSlots - 1, generationPhases.length - 1));
  draft.phase = generationPhases[nextPhaseIndex];
  draft.tiles = updateVisibility(draft.tiles, draft.phase);
}

function startEliminationIfReady(draft: GameState) {
  const generatedCount = draft.tiles.filter((tile) => tile.isGenerated).length;
  if (generatedCount < FINAL_SLOT_COUNT) {
    updatePhaseForUnlockedSlots(draft);
    return;
  }

  const remainingCount = draft.tiles.filter((t) => !t.isEliminated && t.isVisible !== false).length;
  draft.phase = getPhaseFromRemaining(remainingCount, FINAL_SLOT_COUNT);
  draft.isInputLocked = false;
  draft.tiles = updateVisibility(draft.tiles, draft.phase);
}

async function processGenerationQueue(
  get: () => GameState,
  set: (fn: (draft: GameState) => void) => void
) {
  const state = get();
  if (state.generationInFlight) return;
  const job = state.pendingGenerations[0];
  if (!job) {
    set((draft) => {
      draft.isLoading = false;
      if (!draft.generationInFlight && draft.generationAnswers < FINAL_SLOT_COUNT) {
        draft.isInputLocked = false;
      }
      startEliminationIfReady(draft);
    });
    return;
  }

  set((draft) => {
    draft.generationInFlight = true;
    draft.isLoading = true;
  });

  try {
    const updates = await generateAppearanceForChains([job.chainId], job.questionText, job.answer, state.tiles, job.phase);

    const generationLog = {
      stage: job.phase,
      question: job.questionText,
      answer: job.answer,
      prompt: updates[0]?.prompt ?? '',
      outputs: updates.map(({ chainId, image }) => ({ id: chainId, image })),
      timestamp: Date.now()
    } as const;

    set((draft) => {
      updates.forEach((update) => {
        const tileIndex = draft.tiles.findIndex((tile) => tile.id === update.chainId);
        if (tileIndex >= 0) {
          draft.tiles[tileIndex] = {
            ...draft.tiles[tileIndex],
            core: update.core,
            image: update.image,
            isGenerated: true,
            isGenerating: false
          };
        }
      });

      draft.playerProfile = updates[0]?.core ?? draft.playerProfile;
      draft.playerHistory.push(job.answer);
      draft.generationLogs.unshift(generationLog);
      draft.lastEliminatedIds = [];
      draft.lastReasoning = undefined;
      draft.round += 1;
      draft.playerText = '';
      startEliminationIfReady(draft);
      draft.statusMessage = `Generated ${updates.length} images from the prompt built for "${job.questionText}".`;
    });
  } catch (error) {
    const statusMessage = formatGenerationError(error);
    console.warn(statusMessage, error);
    set((draft) => {
      draft.statusMessage = statusMessage;
      const tileIndex = draft.tiles.findIndex((tile) => tile.id === job.chainId);
      if (tileIndex >= 0) {
        draft.tiles[tileIndex].isGenerating = false;
      }
    });
  } finally {
    set((draft) => {
      draft.pendingGenerations.shift();
      draft.generationInFlight = false;
      draft.isLoading = false;
      const pendingCount = draft.pendingGenerations.length;
      const generatedCount = draft.tiles.filter((tile) => tile.isGenerated).length;
      const shouldLock =
        draft.generationAnswers >= FINAL_SLOT_COUNT && (pendingCount > 0 || generatedCount < FINAL_SLOT_COUNT);
      draft.isInputLocked = shouldLock;

      const tileIndex = draft.tiles.findIndex((tile) => tile.id === job.chainId);
      if (tileIndex >= 0) {
        draft.tiles[tileIndex].isGenerating = false;
      }

      if (!shouldLock) {
        startEliminationIfReady(draft);
      } else {
        updatePhaseForUnlockedSlots(draft);
      }
    });

    await processGenerationQueue(get, set);
  }
}

export const useGameStore = create<GameState & {
  submitPlayerText: (text: string) => Promise<void>;
  setPlayerText: (next: string | ((prev: string) => string)) => void;
  reset: () => void;
}>()(
  immer((set, get) => ({
    tiles: buildInitialTiles(),
    playerProfile: undefined,
    playerText: '',
    currentQuestion: initialQuestion,
    currentQuestionId: initialQuestionId,
    askedQuestionIds: initialQuestionId ? [initialQuestionId] : [],
    generationAnswers: 0,
    questionIndex: 0,
    questionHistory: initialQuestion ? [initialQuestion] : [],
    generationLogs: [],
    round: 1,
    phase: 'gen1',
    isLoading: false,
    isInputLocked: false,
    lastReasoning: undefined,
    statusMessage: undefined,
    lastEliminatedIds: [],
    playerHistory: [],
    pendingGenerations: [],
    generationInFlight: false,
    questionTimerId: null,

    reset: () => {
      set((draft) => {
        if (draft.questionTimerId) {
          clearTimeout(draft.questionTimerId);
        }
        draft.tiles = buildInitialTiles();
        draft.playerProfile = undefined;
        draft.playerText = '';
        draft.currentQuestion = initialQuestion;
        draft.currentQuestionId = initialQuestionId;
        draft.askedQuestionIds = initialQuestionId ? [initialQuestionId] : [];
        draft.generationAnswers = 0;
        draft.questionIndex = 0;
        draft.questionHistory = initialQuestion ? [initialQuestion] : [];
        draft.generationLogs = [];
        draft.round = 1;
        draft.phase = 'gen1';
        draft.isLoading = false;
        draft.isInputLocked = false;
        draft.lastReasoning = undefined;
        draft.statusMessage = undefined;
        draft.lastEliminatedIds = [];
        draft.playerHistory = [];
        draft.pendingGenerations = [];
        draft.generationInFlight = false;
        draft.questionTimerId = null;
      });
    },

    setPlayerText: (next) => {
      set((draft) => {
        const resolved = typeof next === 'function' ? next(draft.playerText) : next;
        draft.playerText = resolved;
      });
    },

    submitPlayerText: async (text: string) => {
      const state = get();
      const remainingVisible = state.tiles.filter((t) => t.isVisible !== false && !t.isEliminated);
      const isGenPhase = isGenerationPhase(state.phase);
      if (!isGenPhase && state.isLoading) return;
      if (!isGenPhase && remainingVisible.length <= 1) return;

      const trimmed = text.trim();
      if (!trimmed) {
        set({ isLoading: false });
        return;
      }

      if (isGenPhase) {
        if (state.generationAnswers >= FINAL_SLOT_COUNT) {
          set((draft) => {
            draft.isInputLocked = true;
            draft.statusMessage = 'Waiting for generated images to finish before elimination begins.';
          });
          return;
        }

        const nextSlotIndex = Math.min(state.generationAnswers, FINAL_SLOT_COUNT - 1);
        const chainId = chainIds[nextSlotIndex];
        const phase = generationPhases[nextSlotIndex];

        const job: PendingGenerationJob = {
          chainId,
          questionId: state.currentQuestionId,
          questionText: state.currentQuestion,
          answer: trimmed,
          phase
        };

        set((draft) => {
          draft.pendingGenerations.push(job);
          draft.playerHistory.push(trimmed);
          draft.generationAnswers += 1;
          draft.lastReasoning = undefined;
          draft.lastEliminatedIds = [];
          draft.statusMessage = undefined;
          draft.isInputLocked = true;

          const tileIndex = draft.tiles.findIndex((tile) => tile.id === chainId);
          if (tileIndex >= 0) {
            draft.tiles[tileIndex] = {
              ...draft.tiles[tileIndex],
              image: PLACEHOLDER_IMAGE,
              isGenerated: false,
              isGenerating: true,
              isVisible: true
            };
          }

          updatePhaseForUnlockedSlots(draft);
        });

        scheduleNextQuestion(get, set);
        await processGenerationQueue(get, set);
        return;
      }

      try {
        set((draft) => {
          draft.playerHistory.push(trimmed);
          draft.isLoading = true;
        });
        const result = await inferPlayerAppearance(trimmed, remainingVisible, state.phase as EliminationPhase);
        const normalizedIds = normalizeEliminations(result.eliminatedIds, state.phase as EliminationPhase, remainingVisible);
        set((draft) => {
          draft.playerProfile = result.profile;

          draft.tiles = draft.tiles.map((tile) =>
            normalizedIds.includes(tile.id)
              ? { ...tile, isEliminated: true }
              : tile
          );
          draft.lastReasoning = result.reasoning;
          draft.lastEliminatedIds = normalizedIds;
        });

        set((draft) => {
          const remainingTiles = draft.tiles.filter((t) => !t.isEliminated && t.isVisible !== false).length;
          draft.round += 1;
          draft.phase = getPhaseFromRemaining(remainingTiles, FINAL_SLOT_COUNT);
          draft.playerText = '';
          if (remainingTiles <= 1) {
            draft.statusMessage = 'A predicted look-alike has been chosen!';
          }
          draft.isLoading = false;
        });

        const remainingAfter = get().tiles.filter((t) => !t.isEliminated && t.isVisible !== false).length;
        if (remainingAfter > 1) {
          scheduleNextQuestion(get, set);
        }
      } catch (error) {
        set({ statusMessage: 'Something went wrong while processing the LLM response.' });
      } finally {
        set({ isLoading: false });
      }
    }
  }))
);
