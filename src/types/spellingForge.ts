// ─── Exercise Types ───

export type SpellingExerciseType =
  | 'missing_letters'
  | 'unscramble'
  | 'turkish_to_english'
  | 'contextual_gap'
  | 'listen_and_spell'
  | 'spot_the_error';

export type SpellingLevel = 'starter' | 'elementary' | 'pre_intermediate';

export type SpellingCategory =
  | 'academic'
  | 'daily_life'
  | 'school'
  | 'travel'
  | 'technology'
  | 'health'
  | 'nature'
  | 'food';

// ─── Constants ───

export const SPELLING_TYPE_ORDER: SpellingExerciseType[] = [
  'missing_letters',
  'unscramble',
  'turkish_to_english',
  'contextual_gap',
  'listen_and_spell',
  'spot_the_error'
];

export const SPELLING_TYPE_LABELS: Record<SpellingExerciseType, string> = {
  missing_letters: 'Missing Letters',
  unscramble: 'Unscramble',
  turkish_to_english: 'Turkish → English',
  contextual_gap: 'Contextual Gap',
  listen_and_spell: 'Listen & Spell',
  spot_the_error: 'Spot the Error'
};

export const SPELLING_TYPE_DESCRIPTIONS: Record<SpellingExerciseType, string> = {
  missing_letters: 'Fill in the blanked-out letters to complete the word.',
  unscramble: 'Rearrange jumbled letters into the correct word.',
  turkish_to_english: 'See a Turkish word and type the English spelling from memory.',
  contextual_gap: 'Fill a missing word into a sentence.',
  listen_and_spell: 'Listen to a word or sentence and type it correctly.',
  spot_the_error: 'Find and fix the misspelled word in a sentence.'
};

export const SPELLING_TYPE_ICONS: Record<SpellingExerciseType, string> = {
  missing_letters: '🔤',
  unscramble: '🧩',
  turkish_to_english: '🇹🇷',
  contextual_gap: '📖',
  listen_and_spell: '🔊',
  spot_the_error: '🔍'
};

export const SPELLING_LEVEL_LABELS: Record<SpellingLevel, string> = {
  starter: 'Starter',
  elementary: 'Elementary',
  pre_intermediate: 'Pre-Intermediate'
};

export const SPELLING_CATEGORY_LABELS: Record<SpellingCategory, string> = {
  academic: 'Academic',
  daily_life: 'Daily Life',
  school: 'School',
  travel: 'Travel',
  technology: 'Technology',
  health: 'Health',
  nature: 'Nature',
  food: 'Food'
};

// ─── Exercise Data Shapes ───

interface SpellingExerciseBase {
  id: string;
  type: SpellingExerciseType;
  level: SpellingLevel;
  category: SpellingCategory;
}

export interface MissingLettersExercise extends SpellingExerciseBase {
  type: 'missing_letters';
  word: string;
  maskedWord: string;          // e.g. "b_a_t_f_l"
  turkishHint: string;
}

export interface UnscrambleExercise extends SpellingExerciseBase {
  type: 'unscramble';
  word: string;
  scrambledLetters: string[];  // individual letters, shuffled
  turkishHint: string;
}

export interface TurkishToEnglishExercise extends SpellingExerciseBase {
  type: 'turkish_to_english';
  turkishWord: string;
  englishWord: string;
  acceptedAnswers?: string[];  // alternatives
  exampleSentence: string;
}

export interface ContextualGapExercise extends SpellingExerciseBase {
  type: 'contextual_gap';
  sentence: string;            // contains "___" for the gap
  missingWord: string;
  acceptedAnswers?: string[];
  turkishHint: string;
}

export interface ListenAndSpellExercise extends SpellingExerciseBase {
  type: 'listen_and_spell';
  word: string;
  turkishHint: string;
  exampleSentence?: string;
}

export interface SpotTheErrorExercise extends SpellingExerciseBase {
  type: 'spot_the_error';
  sentence: string;            // contains the misspelled word
  incorrectWord: string;
  correctWord: string;
}

export type SpellingExercise =
  | MissingLettersExercise
  | UnscrambleExercise
  | TurkishToEnglishExercise
  | ContextualGapExercise
  | ListenAndSpellExercise
  | SpotTheErrorExercise;

// ─── Evaluation ───

export type CharDiffStatus = 'correct' | 'wrong' | 'missing' | 'extra';

export interface CharDiffEntry {
  char: string;
  status: CharDiffStatus;
}

export interface SpellingEvaluation {
  exerciseId: string;
  exerciseType: SpellingExerciseType;
  level: SpellingLevel;
  category: SpellingCategory;
  submittedAnswer: string;
  expectedAnswer: string;
  isCorrect: boolean;
  charDiff: CharDiffEntry[];
}

export interface SpellingAttempt extends SpellingEvaluation {
  id: string;
  createdAt: Date;
}

// ─── Stats ───

export interface SpellingTypeStat {
  type: SpellingExerciseType;
  attempts: number;
  correct: number;
  averageAccuracy: number;
}

export interface SpellingStats {
  totalAttempts: number;
  correctAttempts: number;
  overallAccuracy: number;
  currentStreak: number;
  bestStreak: number;
  typeStats: SpellingTypeStat[];
}
