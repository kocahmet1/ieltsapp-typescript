export type SentenceLabExerciseType =
  | 'sentence_builder'
  | 'guided_translation'
  | 'partial_translation'
  | 'error_correction'
  | 'punctuation_repair'
  | 'sentence_transformation'
  | 'sentence_combining'
  | 'situation_response';

export type SentenceLabLevel = 'starter' | 'elementary' | 'pre_intermediate';

export type SentenceLabFocusArea =
  | 'grammar'
  | 'word_order'
  | 'punctuation'
  | 'articles'
  | 'questions'
  | 'tense'
  | 'prepositions'
  | 'connectors'
  | 'naturalness';

export const SENTENCE_LAB_TYPE_ORDER: SentenceLabExerciseType[] = [
  'sentence_builder',
  'guided_translation',
  'partial_translation',
  'error_correction',
  'punctuation_repair',
  'sentence_transformation',
  'sentence_combining',
  'situation_response'
];

export const SENTENCE_LAB_TYPE_LABELS: Record<SentenceLabExerciseType, string> = {
  sentence_builder: 'Sentence Builder',
  guided_translation: 'Guided Translation',
  partial_translation: 'Partial Translation',
  error_correction: 'Error Correction',
  punctuation_repair: 'Punctuation Repair',
  sentence_transformation: 'Sentence Transformation',
  sentence_combining: 'Sentence Combining',
  situation_response: 'Situation Response'
};

export const SENTENCE_LAB_TYPE_DESCRIPTIONS: Record<SentenceLabExerciseType, string> = {
  sentence_builder: 'Build correct English sentences from shuffled chunks.',
  guided_translation: 'Translate Turkish into English with hints and word banks.',
  partial_translation: 'Complete missing parts of a sentence accurately.',
  error_correction: 'Fix grammar and structure mistakes in a faulty sentence.',
  punctuation_repair: 'Repair capitals, apostrophes, commas, and end punctuation.',
  sentence_transformation: 'Say the same idea in a new structure.',
  sentence_combining: 'Combine short ideas with natural connectors.',
  situation_response: 'Write one useful sentence for a real-life situation.'
};

export const SENTENCE_LAB_LEVEL_LABELS: Record<SentenceLabLevel, string> = {
  starter: 'Starter',
  elementary: 'Elementary',
  pre_intermediate: 'Pre-Intermediate'
};

export const SENTENCE_LAB_FOCUS_LABELS: Record<SentenceLabFocusArea, string> = {
  grammar: 'Grammar',
  word_order: 'Word Order',
  punctuation: 'Punctuation',
  articles: 'Articles',
  questions: 'Questions',
  tense: 'Tense',
  prepositions: 'Prepositions',
  connectors: 'Connectors',
  naturalness: 'Natural English'
};

interface SentenceLabExerciseBase {
  id: string;
  type: SentenceLabExerciseType;
  title: string;
  level: SentenceLabLevel;
  instructions: string;
  focusAreas: SentenceLabFocusArea[];
  modelAnswer: string;
  explanation: string;
  acceptedAnswers?: string[];
  hints?: string[];
  turkishPrompt?: string;
}

export interface SentenceBuilderExercise extends SentenceLabExerciseBase {
  type: 'sentence_builder';
  chunks: string[];
  correctOrder: string[];
}

export interface GuidedTranslationExercise extends SentenceLabExerciseBase {
  type: 'guided_translation';
  wordBank: string[];
}

export interface PartialTranslationExercise extends SentenceLabExerciseBase {
  type: 'partial_translation';
  template: string;
  blankAnswers: string[][];
  wordBank?: string[];
}

export interface ErrorCorrectionExercise extends SentenceLabExerciseBase {
  type: 'error_correction';
  incorrectSentence: string;
}

export interface PunctuationRepairExercise extends SentenceLabExerciseBase {
  type: 'punctuation_repair';
  rawSentence: string;
}

export interface SentenceTransformationExercise extends SentenceLabExerciseBase {
  type: 'sentence_transformation';
  sourceSentence: string;
  transformationInstruction: string;
}

export interface SentenceCombiningExercise extends SentenceLabExerciseBase {
  type: 'sentence_combining';
  sourceSentences: string[];
  connector: string;
}

export interface SituationResponseExercise extends SentenceLabExerciseBase {
  type: 'situation_response';
  scenario: string;
  requirements?: string[];
}

export type SentenceLabExercise =
  | SentenceBuilderExercise
  | GuidedTranslationExercise
  | PartialTranslationExercise
  | ErrorCorrectionExercise
  | PunctuationRepairExercise
  | SentenceTransformationExercise
  | SentenceCombiningExercise
  | SituationResponseExercise;

export interface SentenceLabBreakdown {
  meaning: number;
  grammar: number;
  wordOrder: number;
  punctuation: number;
}

export interface SentenceLabEvaluation {
  exerciseId: string;
  exerciseType: SentenceLabExerciseType;
  exerciseTitle: string;
  level: SentenceLabLevel;
  focusAreas: SentenceLabFocusArea[];
  submittedAnswer: string;
  referenceAnswer: string;
  isCorrect: boolean;
  overallScore: number;
  breakdown: SentenceLabBreakdown;
  feedbackMessages: string[];
  explanation: string;
}

export interface SentenceLabAttempt extends SentenceLabEvaluation {
  id: string;
  createdAt: Date;
}

export interface SentenceLabTypeStat {
  type: SentenceLabExerciseType;
  attempts: number;
  correct: number;
  averageScore: number;
}

export interface SentenceLabFocusStat {
  focusArea: SentenceLabFocusArea;
  attempts: number;
  averageScore: number;
}

export interface SentenceLabStats {
  totalAttempts: number;
  correctAttempts: number;
  averageScore: number;
  typeStats: SentenceLabTypeStat[];
  focusStats: SentenceLabFocusStat[];
}
