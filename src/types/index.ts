// Types for the English Learning App

export interface Question {
  id: number;
  questionText: string;
  options: Option[];
  correctAnswer: string; // The letter (A, B, C, D)
  category?: string; // e.g., "vocabulary", "grammar", "idiom"
  difficulty?: string; // e.g., "Starter", "Elementary", "Intermediate", etc.
}

export interface Option {
  letter: string;
  text: string;
}

export interface Exam {
  id: string;
  name: string;
  description?: string;
  questions: Question[];
  createdAt: Date;
}

export interface UserAnswer {
  questionId: number;
  selectedAnswer: string;
  isCorrect: boolean;
  explanation?: string;
  isLoading?: boolean;
  grammarCategory?: GrammarCategory; // Track the grammar subject of the mistake
}

// Grammar categories for tracking student performance
export type GrammarCategory =
  | 'past_perfect'
  | 'present_perfect'
  | 'past_simple'
  | 'present_simple'
  | 'future_tenses'
  | 'continuous_tenses'
  | 'prepositions'
  | 'articles'
  | 'vocabulary'
  | 'phrasal_verbs'
  | 'conditionals'
  | 'modal_verbs'
  | 'gerunds_infinitives'
  | 'passive_voice'
  | 'relative_clauses'
  | 'reported_speech'
  | 'conjunctions'
  | 'idioms_expressions'
  | 'collocations'
  | 'comparatives_superlatives'
  | 'subject_verb_agreement'
  | 'pronouns'
  | 'word_order'
  | 'quantifiers'
  | 'other';

// Human-readable labels for grammar categories
export const GRAMMAR_CATEGORY_LABELS: Record<GrammarCategory, string> = {
  past_perfect: 'Past Perfect',
  present_perfect: 'Present Perfect',
  past_simple: 'Past Simple',
  present_simple: 'Present Simple',
  future_tenses: 'Future Tenses',
  continuous_tenses: 'Continuous Tenses',
  prepositions: 'Prepositions',
  articles: 'Articles (a, an, the)',
  vocabulary: 'Vocabulary / Word Choice',
  phrasal_verbs: 'Phrasal Verbs',
  conditionals: 'Conditionals (If clauses)',
  modal_verbs: 'Modal Verbs',
  gerunds_infinitives: 'Gerunds & Infinitives',
  passive_voice: 'Passive Voice',
  relative_clauses: 'Relative Clauses',
  reported_speech: 'Reported Speech',
  conjunctions: 'Conjunctions',
  idioms_expressions: 'Idioms & Expressions',
  collocations: 'Collocations',
  comparatives_superlatives: 'Comparatives & Superlatives',
  subject_verb_agreement: 'Subject-Verb Agreement',
  pronouns: 'Pronouns',
  word_order: 'Word Order',
  quantifiers: 'Quantifiers',
  other: 'Other'
};

// Record of a single mistake for tracking
export interface MistakeRecord {
  id: string;
  examId: string;
  questionId: number;
  questionText: string;
  selectedAnswer: string;
  correctAnswer: string;
  grammarCategory: GrammarCategory;
  difficulty?: string;
  timestamp: Date;
}

// Aggregated performance statistics by category
export interface CategoryStats {
  category: GrammarCategory;
  totalMistakes: number;
  recentMistakes: number; // Last 7 days
  lastMistake?: Date;
}

// Overall performance summary
export interface PerformanceStats {
  totalAnswered: number;
  totalCorrect: number;
  totalIncorrect: number;
  categoryBreakdown: CategoryStats[];
  weakestAreas: GrammarCategory[]; // Top 5 problem areas
  strongestAreas: GrammarCategory[]; // Top 5 strongest areas
}

export interface VocabWord {
  id: string;
  word: string;
  questionContext: string;
  addedAt: Date;
  examId: string;
  questionId: number;
}

export interface ExamResult {
  examId: string;
  answers: UserAnswer[];
  score: number;
  totalQuestions: number;
  completedAt: Date;
}

// For parsing imported exams
export interface ParsedQuestion {
  number: number;
  text: string;
  options: { letter: string; text: string }[];
}

export interface ParsedExam {
  questions: ParsedQuestion[];
  answers: Record<number, string>;
}

// ===================================
// Writing Practice Module Types
// ===================================

export type WritingPromptType = 'free' | 'topic' | 'sentence_correction' | 'paragraph';

export interface WritingPrompt {
  id: string;
  type: WritingPromptType;
  title: string;
  description: string;
  targetLevel?: string; // e.g., "Intermediate", "Advanced"
  minWords?: number;
  maxWords?: number;
}

export interface GrammarError {
  text: string;           // The erroneous text
  startIndex: number;     // Position in original text
  endIndex: number;       // End position
  suggestion: string;     // Corrected version
  explanation: string;    // Why it's wrong
  category: GrammarCategory;
  errorLevel: 'surface' | 'meta'; // surface = spelling/grammar (red), meta = style/phrasing (purple)
}

export interface WritingFeedback {
  overallScore: number;   // 0-100
  grammarScore: number;   // 0-100
  vocabularyScore: number; // 0-100
  structureScore: number; // 0-100
  errors: GrammarError[];
  suggestions: string[];  // General improvement suggestions
  correctedText: string;  // Full corrected version
  summary: string;        // Brief feedback summary
}

export interface WritingSubmission {
  id: string;
  promptId?: string;
  promptTitle?: string;
  originalText: string;
  feedback?: WritingFeedback;
  submittedAt: Date;
  wordCount: number;
}

// ===================================
// Reading Comprehension Module Types
// ===================================

export type ReadingQuestionType =
  | 'main_idea'           // What is the main idea of the passage?
  | 'detail'              // Specific information from the text
  | 'inference'           // What can be inferred from the passage?
  | 'vocabulary'          // Word meaning in context
  | 'purpose'             // Author's purpose
  | 'tone'                // Author's tone/attitude
  | 'structure'           // Text organization
  | 'reference';          // What does "it/they/this" refer to?

export const READING_QUESTION_TYPE_LABELS: Record<ReadingQuestionType, string> = {
  main_idea: 'Ana Fikir',
  detail: 'Detay Sorusu',
  inference: 'Çıkarım',
  vocabulary: 'Kelime Anlamı',
  purpose: 'Yazarın Amacı',
  tone: 'Ton/Tutum',
  structure: 'Metin Yapısı',
  reference: 'Referans'
};

export interface ReadingQuestion {
  id: number;
  questionText: string;
  options: Option[];
  correctAnswer: string;
  questionType: ReadingQuestionType;
  explanation?: string;        // Pre-written explanation for this question
  highlightStart?: number;     // Optional: highlight relevant part of passage
  highlightEnd?: number;
}

export interface ReadingPassage {
  id: string;
  title: string;
  topic: string;              // e.g., "Science", "History", "Culture"
  difficulty: string;         // e.g., "Intermediate", "Advanced"
  passage: string;            // The actual reading text
  wordCount: number;
  estimatedTime: number;      // Minutes to complete
  questions: ReadingQuestion[];
  createdAt: Date;
}

export interface ReadingAnswer {
  questionId: number;
  selectedAnswer: string;
  isCorrect: boolean;
  explanation?: string;
  isLoading?: boolean;
}

export interface ReadingProgress {
  passageId: string;
  answers: Map<number, ReadingAnswer> | Record<number, ReadingAnswer>;
  startedAt: Date;
  completedAt?: Date;
  score?: number;
}

export interface ReadingStats {
  totalPassagesCompleted: number;
  totalQuestionsAnswered: number;
  totalCorrect: number;
  averageScore: number;
  passagesByDifficulty: Record<string, number>;
  questionTypePerformance: Record<ReadingQuestionType, { correct: number; total: number }>;
}

// ===================================
// Speaking Practice Module Types
// ===================================

export type IELTSSpeakingSection = 'section1' | 'section2' | 'section3';

export const IELTS_SECTION_LABELS: Record<IELTSSpeakingSection, string> = {
  section1: 'Section 1 - Introduction & Interview',
  section2: 'Section 2 - Long Turn (Cue Card)',
  section3: 'Section 3 - Discussion'
};

export const IELTS_SECTION_DESCRIPTIONS: Record<IELTSSpeakingSection, string> = {
  section1: 'Answer short questions about yourself, your home, work, studies, and familiar topics.',
  section2: 'Speak for 1-2 minutes on a given topic with preparation time.',
  section3: 'Discuss abstract ideas and issues related to the Section 2 topic.'
};

export interface SpeakingQuestion {
  id: string;
  section: IELTSSpeakingSection;
  topic: string;
  questionText: string;
  followUpQuestions?: string[]; // For section 1 & 3
  cueCardPoints?: string[]; // For section 2 (bullet points to cover)
  preparationTime?: number; // In seconds (for section 2)
  speakingTime?: number; // Expected speaking time in seconds
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface SpeakingFeedback {
  overallBandScore: number; // 1-9 IELTS band score
  fluencyScore: number; // 1-9
  vocabularyScore: number; // 1-9
  grammarScore: number; // 1-9
  pronunciationScore: number; // 1-9
  transcript: string; // What the user said
  corrections: SpeakingCorrection[];
  suggestions: string[];
  summary: string; // General feedback summary
  modelAnswer?: string; // Example of a good answer
}

export interface SpeakingCorrection {
  original: string;
  corrected: string;
  explanation: string;
  type: 'grammar' | 'vocabulary' | 'pronunciation' | 'fluency';
}

export interface SpeakingSession {
  id: string;
  questionId: string;
  question: SpeakingQuestion;
  audioUrl?: string; // Base64 or blob URL
  feedback?: SpeakingFeedback;
  duration: number; // Actual speaking duration in seconds
  startedAt: Date;
  completedAt?: Date;
}

export interface SpeakingStats {
  totalSessions: number;
  averageBandScore: number;
  averageFluencyScore: number;
  averageVocabularyScore: number;
  averageGrammarScore: number;
  averagePronunciationScore: number;
  sessionsBySection: Record<IELTSSpeakingSection, number>;
  recentSessions: SpeakingSession[];
}

// ===================================
// Listening Practice Module Types
// ===================================

export type IELTSListeningSection = 'section1' | 'section2' | 'section3' | 'section4';

export const IELTS_LISTENING_SECTION_LABELS: Record<IELTSListeningSection, string> = {
  section1: 'Section 1 - Everyday Conversation',
  section2: 'Section 2 - Monologue (Social)',
  section3: 'Section 3 - Academic Discussion',
  section4: 'Section 4 - Academic Lecture'
};

export const IELTS_LISTENING_SECTION_DESCRIPTIONS: Record<IELTSListeningSection, string> = {
  section1: 'A conversation between two people in an everyday social context (e.g., booking a hotel, making arrangements).',
  section2: 'A monologue set in an everyday social context (e.g., a speech about local facilities, a tour guide).',
  section3: 'A conversation between up to four people in an educational or training context (e.g., university students discussing an assignment).',
  section4: 'A monologue on an academic subject (e.g., a university lecture).'
};

export type ListeningQuestionType =
  | 'multiple_choice'      // Choose from A, B, C, D
  | 'matching'             // Match items from two lists
  | 'completion'           // Fill in the blanks (sentence/note/form completion)
  | 'map_labeling'         // Label parts of a map/diagram
  | 'short_answer';        // Write a short answer

export const LISTENING_QUESTION_TYPE_LABELS: Record<ListeningQuestionType, string> = {
  multiple_choice: 'Çoktan Seçmeli',
  matching: 'Eşleştirme',
  completion: 'Boşluk Doldurma',
  map_labeling: 'Harita/Diyagram',
  short_answer: 'Kısa Cevap'
};

export interface ListeningQuestion {
  id: number;
  questionText: string;
  questionType: ListeningQuestionType;
  options?: Option[];               // For multiple choice/matching
  correctAnswer: string;            // The correct answer
  acceptableAnswers?: string[];     // Alternative correct answers for completion/short answer
  audioTimestamp?: number;          // When in the audio this question is relevant (seconds)
  explanation?: string;             // Explanation for the answer
}

export interface ListeningTest {
  id: string;
  title: string;
  section: IELTSListeningSection;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  transcript: string;               // Full transcript of the audio
  audioText: string;                // Text to be converted to speech (TTS)
  audioUrl?: string;                // Optional external audio URL
  duration: number;                 // Duration in seconds
  questions: ListeningQuestion[];
  createdAt: Date;
}

export interface ListeningAnswer {
  questionId: number;
  selectedAnswer: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface ListeningProgress {
  testId: string;
  answers: Map<number, ListeningAnswer> | Record<number, ListeningAnswer>;
  startedAt: Date;
  completedAt?: Date;
  score?: number;
  audioPlayCount: number;           // How many times the audio was played
}

export interface ListeningStats {
  totalTestsCompleted: number;
  totalQuestionsAnswered: number;
  totalCorrect: number;
  averageScore: number;
  testsBySection: Record<IELTSListeningSection, number>;
  testsByDifficulty: Record<string, number>;
  questionTypePerformance: Record<ListeningQuestionType, { correct: number; total: number }>;
}

export interface ListeningSession {
  id: string;
  testId: string;
  test: ListeningTest;
  answers: Map<number, ListeningAnswer>;
  score: number;
  duration: number;                 // Time taken in seconds
  audioPlayCount: number;
  startedAt: Date;
  completedAt?: Date;
}

