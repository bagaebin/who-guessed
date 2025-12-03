import { CharacterTile } from '../types/appearance';

const baseImage = 'https://placehold.co/200x240?text=Tile';

export const initialTiles: CharacterTile[] = [
  {
    id: 'tile-1',
    core: {
      ageGroup: 'young_adult',
      skinTone: 'medium',
      bodyShape: 'average',
      skinCondition: 'clear',
      hairLength: 'short',
      hairStyle: 'straight',
      hairColor: 'dark_brown',
      glasses: 'none',
      facialHair: 'none',
      faceShape: 'oval',
      expressionBaseline: 'subtle_smile',
      styleVibe: 'casual',
      makeupLevel: 'none',
      accessoriesPresence: 'none'
    },
    image: `${baseImage}+1`,
    isEliminated: false
  },
  {
    id: 'tile-2',
    core: {
      ageGroup: 'adult',
      skinTone: 'tan',
      bodyShape: 'slim',
      skinCondition: 'freckles_or_spots',
      hairLength: 'long',
      hairStyle: 'wavy',
      hairColor: 'black',
      glasses: 'round',
      facialHair: 'none',
      faceShape: 'round',
      expressionBaseline: 'neutral',
      styleVibe: 'formal',
      makeupLevel: 'light',
      accessoriesPresence: 'ear'
    },
    image: `${baseImage}+2`,
    isEliminated: false
  },
  {
    id: 'tile-3',
    core: {
      ageGroup: 'young_adult',
      skinTone: 'light',
      bodyShape: 'very_slim',
      skinCondition: 'some_acne',
      hairLength: 'medium',
      hairStyle: 'curly',
      hairColor: 'blonde',
      glasses: 'square',
      facialHair: 'stubble',
      faceShape: 'square',
      expressionBaseline: 'confident',
      styleVibe: 'street',
      makeupLevel: 'noticeable',
      accessoriesPresence: 'head'
    },
    image: `${baseImage}+3`,
    isEliminated: false
  },
  {
    id: 'tile-4',
    core: {
      ageGroup: 'adult',
      skinTone: 'deep',
      bodyShape: 'slightly_chubby',
      skinCondition: 'clear',
      hairLength: 'short',
      hairStyle: 'buzz',
      hairColor: 'black',
      glasses: 'none',
      facialHair: 'beard',
      faceShape: 'oval',
      expressionBaseline: 'serious',
      styleVibe: 'sporty',
      makeupLevel: 'none',
      accessoriesPresence: 'none'
    },
    image: `${baseImage}+4`,
    isEliminated: false
  },
  {
    id: 'tile-5',
    core: {
      ageGroup: 'teen',
      skinTone: 'very_light',
      bodyShape: 'slim',
      skinCondition: 'sensitive_or_red',
      hairLength: 'long',
      hairStyle: 'straight',
      hairColor: 'red',
      glasses: 'none',
      facialHair: 'none',
      faceShape: 'round',
      expressionBaseline: 'big_smile',
      styleVibe: 'colorful',
      makeupLevel: 'bold',
      accessoriesPresence: 'ear'
    },
    image: `${baseImage}+5`,
    isEliminated: false
  },
  {
    id: 'tile-6',
    core: {
      ageGroup: 'adult',
      skinTone: 'medium',
      bodyShape: 'average',
      skinCondition: 'noticeable_acne',
      hairLength: 'bald_or_shaved',
      hairStyle: 'buzz',
      hairColor: 'black',
      glasses: 'square',
      facialHair: 'mustache',
      faceShape: 'square',
      expressionBaseline: 'neutral',
      styleVibe: 'minimal',
      makeupLevel: 'none',
      accessoriesPresence: 'none'
    },
    image: `${baseImage}+6`,
    isEliminated: false
  },
  {
    id: 'tile-7',
    core: {
      ageGroup: 'older_adult',
      skinTone: 'light',
      bodyShape: 'slightly_chubby',
      skinCondition: 'clear',
      hairLength: 'short',
      hairStyle: 'wavy',
      hairColor: 'gray',
      glasses: 'round',
      facialHair: 'beard',
      faceShape: 'long',
      expressionBaseline: 'tired',
      styleVibe: 'casual',
      makeupLevel: 'none',
      accessoriesPresence: 'head'
    },
    image: `${baseImage}+7`,
    isEliminated: false
  },
  {
    id: 'tile-8',
    core: {
      ageGroup: 'young_adult',
      skinTone: 'tan',
      bodyShape: 'average',
      skinCondition: 'freckles_or_spots',
      hairLength: 'medium',
      hairStyle: 'wavy',
      hairColor: 'light_brown',
      glasses: 'none',
      facialHair: 'none',
      faceShape: 'oval',
      expressionBaseline: 'subtle_smile',
      styleVibe: 'artsy',
      makeupLevel: 'noticeable',
      accessoriesPresence: 'neck'
    },
    image: `${baseImage}+8`,
    isEliminated: false
  },
  {
    id: 'tile-9',
    core: {
      ageGroup: 'adult',
      skinTone: 'medium',
      bodyShape: 'slightly_chubby',
      skinCondition: 'some_acne',
      hairLength: 'short',
      hairStyle: 'straight',
      hairColor: 'dark_brown',
      glasses: 'other',
      facialHair: 'stubble',
      faceShape: 'oval',
      expressionBaseline: 'neutral',
      styleVibe: 'geeky',
      makeupLevel: 'light',
      accessoriesPresence: 'none'
    },
    image: `${baseImage}+9`,
    isEliminated: false
  },
  {
    id: 'tile-10',
    core: {
      ageGroup: 'teen',
      skinTone: 'light',
      bodyShape: 'very_slim',
      skinCondition: 'clear',
      hairLength: 'long',
      hairStyle: 'curly',
      hairColor: 'dyed_color',
      glasses: 'none',
      facialHair: 'none',
      faceShape: 'round',
      expressionBaseline: 'shy',
      styleVibe: 'punk_or_goth',
      makeupLevel: 'bold',
      accessoriesPresence: 'head'
    },
    image: `${baseImage}+10`,
    isEliminated: false
  },
  {
    id: 'tile-11',
    core: {
      ageGroup: 'adult',
      skinTone: 'deep',
      bodyShape: 'chubby',
      skinCondition: 'sensitive_or_red',
      hairLength: 'short',
      hairStyle: 'coily',
      hairColor: 'black',
      glasses: 'square',
      facialHair: 'mustache',
      faceShape: 'square',
      expressionBaseline: 'confident',
      styleVibe: 'formal',
      makeupLevel: 'none',
      accessoriesPresence: 'none'
    },
    image: `${baseImage}+11`,
    isEliminated: false
  },
  {
    id: 'tile-12',
    core: {
      ageGroup: 'young_adult',
      skinTone: 'tan',
      bodyShape: 'average',
      skinCondition: 'clear',
      hairLength: 'medium',
      hairStyle: 'wavy',
      hairColor: 'light_brown',
      glasses: 'none',
      facialHair: 'none',
      faceShape: 'oval',
      expressionBaseline: 'subtle_smile',
      styleVibe: 'minimal',
      makeupLevel: 'light',
      accessoriesPresence: 'ear'
    },
    image: `${baseImage}+12`,
    isEliminated: false
  }
];
