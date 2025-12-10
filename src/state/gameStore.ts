import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { inferPlayerAppearance } from '../api/appearanceClient';
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
  GenerationPhase
} from '../types/appearance';

const FINAL_SLOT_COUNT = 12;

function createSvgPlaceholder(label: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="240" viewBox="0 0 200 240">
      <rect width="200" height="240" fill="#f3f4f6" stroke="#d1d5db" stroke-width="3" />
      <text x="100" y="120" text-anchor="middle" font-size="16" fill="#4b5563" font-family="Arial, sans-serif">
        ${label}
      </text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const PLACEHOLDER_IMAGE = createSvgPlaceholder('Awaiting image');
const seedPool = initialTiles.slice(0, FINAL_SLOT_COUNT);
const chainIds = Array.from({ length: FINAL_SLOT_COUNT }, (_, index) => `chain-${index + 1}`);
const initialQuestionIndex = 0;
const initialQuestion = questionPool[initialQuestionIndex]?.text ?? '';

function getNextQuestion(index: number): { nextQuestion: string; nextIndex: number } {
  if (!questionPool.length) return { nextQuestion: '', nextIndex: 0 };
  const nextIndex = (index + 1) % questionPool.length;
  return { nextQuestion: questionPool[nextIndex].text, nextIndex };
}

const generationTargets: Record<GenerationPhase, string[]> = {
  gen1: ['chain-1'],
  gen2: ['chain-2', 'chain-3', 'chain-4'],
  gen3: chainIds.slice(0, 8),
  gen4: chainIds
};

const visibilityByPhase: Record<GamePhase, Set<string>> = {
  gen1: new Set(['chain-1']),
  gen2: new Set(['chain-1', 'chain-2', 'chain-3', 'chain-4']),
  gen3: new Set(chainIds.slice(0, 8)),
  gen4: new Set(chainIds),
  early: new Set(chainIds),
  mid: new Set(chainIds),
  late: new Set(chainIds)
};

function baseSlotFromSeed(index: number): CharacterTile {
  const seed = seedPool[index % seedPool.length];
  const id = chainIds[index];
  return {
    ...seed,
    id,
    image: PLACEHOLDER_IMAGE,
    isVisible: index === 0,
    isGenerated: false,
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
  const descriptor = `a person described as: "${trimmedAnswer}" (answering: "${fallbackQuestion}")`;
  return `realistic ID photo on a white background, centered bust portrait, ${descriptor}`;
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

function generateAppearanceForChains(
  chainList: string[],
  question: string,
  answer: string,
  tiles: CharacterTile[],
  stage: GenerationPhase
): { chainId: string; core: AppearanceCore; image: string; prompt: string }[] {
  const prompt = buildPromptFromTurn(question, answer);

  return chainList.map((chainId) => {
    const baseCore = selectBaseCore(chainId, tiles);
    const derivedCore = remixCore(baseCore, prompt, `${chainId}-${stage}`);
    const slotIndex = chainIds.indexOf(chainId) + 1;
    const image = createSvgPlaceholder(`${stage.toUpperCase()}-${slotIndex}`);
    return { chainId, core: derivedCore, image, prompt };
  });
}

const nextPhase: Record<GenerationPhase, GamePhase> = {
  gen1: 'gen2',
  gen2: 'gen3',
  gen3: 'gen4',
  gen4: 'early'
};

export const useGameStore = create<GameState & {
  submitPlayerText: (text: string) => Promise<void>;
  setPlayerText: (next: string | ((prev: string) => string)) => void;
  reset: () => void;
}>(
  immer((set, get) => ({
    tiles: buildInitialTiles(),
    playerProfile: undefined,
    playerText: '',
    currentQuestion: initialQuestion,
    questionIndex: initialQuestionIndex,
    questionHistory: initialQuestion ? [initialQuestion] : [],
    generationLogs: [],
    round: 1,
    phase: 'gen1',
    isLoading: false,
    lastReasoning: undefined,
    statusMessage: undefined,
    lastEliminatedIds: [],
    playerHistory: [],

    reset: () => {
      set({
        tiles: buildInitialTiles(),
        playerProfile: undefined,
        playerText: '',
        currentQuestion: initialQuestion,
        questionIndex: initialQuestionIndex,
        questionHistory: initialQuestion ? [initialQuestion] : [],
        generationLogs: [],
        round: 1,
        phase: 'gen1',
        isLoading: false,
        lastReasoning: undefined,
        statusMessage: undefined,
        lastEliminatedIds: [],
        playerHistory: []
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
      if (state.isLoading) return;
      if (!isGenerationPhase(state.phase) && remainingVisible.length <= 1) return;

      set((draft) => {
        draft.isLoading = true;
        draft.statusMessage = undefined;
      });

      const trimmed = text.trim();
      if (!trimmed) {
        set({ isLoading: false });
        return;
      }

      if (isGenerationPhase(state.phase)) {
        try {
          const { nextQuestion, nextIndex } = getNextQuestion(state.questionIndex);
          const updates = generateAppearanceForChains(
            generationTargets[state.phase],
            state.currentQuestion,
            trimmed,
            state.tiles,
            state.phase
          );

          const generationLog = {
            stage: state.phase,
            question: state.currentQuestion,
            answer: trimmed,
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
                  isGenerated: true
                };
              }
            });

            draft.playerProfile = updates[0]?.core ?? draft.playerProfile;
            draft.playerHistory.push(trimmed);
            draft.generationLogs.unshift(generationLog);
            draft.lastEliminatedIds = [];
            draft.lastReasoning = undefined;
            draft.round += 1;
            const upcomingPhase = nextPhase[state.phase];
            draft.phase = upcomingPhase;
            draft.tiles = updateVisibility(draft.tiles, upcomingPhase);
            draft.playerText = '';
            draft.currentQuestion = nextQuestion;
            draft.questionIndex = nextIndex;
            if (nextQuestion) {
              draft.questionHistory.push(nextQuestion);
            }
            if (!isGenerationPhase(upcomingPhase)) {
              const remainingCount = draft.tiles.filter((t) => !t.isEliminated && t.isVisible !== false).length;
              draft.phase = getPhaseFromRemaining(remainingCount, FINAL_SLOT_COUNT);
            }
            draft.statusMessage = `Generated ${updates.length} images from the prompt built for "${state.currentQuestion}".`;
          });
        } catch (error) {
          console.warn('Failed to generate appearance samples', error);
          set({ statusMessage: 'Failed to generate appearance samples.', isLoading: false });
        } finally {
          set((draft) => {
            draft.isLoading = false;
          });
        }
        return;
      }

      try {
        set((draft) => {
          draft.playerHistory.push(trimmed);
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
          const { nextQuestion, nextIndex } = getNextQuestion(draft.questionIndex);
          draft.playerText = '';
          draft.currentQuestion = nextQuestion;
          draft.questionIndex = nextIndex;
          if (nextQuestion) {
            draft.questionHistory.push(nextQuestion);
          }
          if (remainingTiles <= 1) {
            draft.statusMessage = 'A predicted look-alike has been chosen!';
          }
        });
      } catch (error) {
        set({ statusMessage: 'Something went wrong while processing the LLM response.' });
      } finally {
        set({ isLoading: false });
      }
    }
  }))
);
