import {
  CharDiffEntry,
  SpellingAttempt,
  SpellingEvaluation,
  SpellingExercise,
  SpellingExerciseType,
  SpellingStats,
  SPELLING_TYPE_ORDER
} from '../types/spellingForge';

const SPELLING_ATTEMPTS_KEY = 'english_master_spelling_attempts';
const SPELLING_STREAK_KEY = 'english_master_spelling_streak';

// ─── Character Diff ───

export const getCharacterDiff = (submitted: string, expected: string): CharDiffEntry[] => {
  const sub = submitted.toLowerCase();
  const exp = expected.toLowerCase();
  const result: CharDiffEntry[] = [];

  const dp: number[][] = Array.from({ length: sub.length + 1 }, () =>
    Array(exp.length + 1).fill(0)
  );

  for (let i = 0; i <= sub.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= exp.length; j += 1) dp[0][j] = j;

  for (let i = 1; i <= sub.length; i += 1) {
    for (let j = 1; j <= exp.length; j += 1) {
      if (sub[i - 1] === exp[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = sub.length;
  let j = exp.length;
  const ops: CharDiffEntry[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && sub[i - 1] === exp[j - 1]) {
      ops.push({ char: expected[j - 1], status: 'correct' });
      i -= 1;
      j -= 1;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      ops.push({ char: submitted[i - 1], status: 'wrong' });
      i -= 1;
      j -= 1;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      ops.push({ char: expected[j - 1], status: 'missing' });
      j -= 1;
    } else if (i > 0) {
      ops.push({ char: submitted[i - 1], status: 'extra' });
      i -= 1;
    }
  }

  ops.reverse().forEach((op) => result.push(op));
  return result;
};

// ─── Evaluation ───

const normalize = (text: string) => text.trim().toLowerCase();

const matchesAny = (answer: string, expected: string, alternatives?: string[]): boolean => {
  const norm = normalize(answer);
  if (norm === normalize(expected)) return true;
  if (alternatives) {
    return alternatives.some((alt) => normalize(alt) === norm);
  }
  return false;
};

export const evaluateSpellingAnswer = (
  exercise: SpellingExercise,
  userAnswer: string
): SpellingEvaluation => {
  let expectedAnswer: string;
  let isCorrect: boolean;

  switch (exercise.type) {
    case 'missing_letters':
      expectedAnswer = exercise.word;
      isCorrect = normalize(userAnswer) === normalize(expectedAnswer);
      break;
    case 'unscramble':
      expectedAnswer = exercise.word;
      isCorrect = normalize(userAnswer) === normalize(expectedAnswer);
      break;
    case 'turkish_to_english':
      expectedAnswer = exercise.englishWord;
      isCorrect = matchesAny(userAnswer, expectedAnswer, exercise.acceptedAnswers);
      break;
    case 'contextual_gap':
      expectedAnswer = exercise.missingWord;
      isCorrect = matchesAny(userAnswer, expectedAnswer, exercise.acceptedAnswers);
      break;
    case 'listen_and_spell':
      expectedAnswer = exercise.word;
      isCorrect = normalize(userAnswer) === normalize(expectedAnswer);
      break;
    case 'spot_the_error':
      expectedAnswer = exercise.correctWord;
      isCorrect = normalize(userAnswer) === normalize(expectedAnswer);
      break;
    default:
      expectedAnswer = '';
      isCorrect = false;
  }

  const charDiff = isCorrect ? [] : getCharacterDiff(userAnswer, expectedAnswer);

  return {
    exerciseId: exercise.id,
    exerciseType: exercise.type,
    level: exercise.level,
    category: exercise.category,
    submittedAnswer: userAnswer,
    expectedAnswer,
    isCorrect,
    charDiff
  };
};

// ─── Streak Management ───

interface StreakData {
  current: number;
  best: number;
}

const getStreakData = (): StreakData => {
  try {
    const raw = localStorage.getItem(SPELLING_STREAK_KEY);
    if (!raw) return { current: 0, best: 0 };
    return JSON.parse(raw) as StreakData;
  } catch {
    return { current: 0, best: 0 };
  }
};

const saveStreakData = (data: StreakData) => {
  try {
    localStorage.setItem(SPELLING_STREAK_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save streak data:', error);
  }
};

export const updateStreak = (isCorrect: boolean): StreakData => {
  const data = getStreakData();
  if (isCorrect) {
    data.current += 1;
    if (data.current > data.best) {
      data.best = data.current;
    }
  } else {
    data.current = 0;
  }
  saveStreakData(data);
  return data;
};

// ─── Attempt Persistence ───

export const getSpellingAttempts = (): SpellingAttempt[] => {
  try {
    const stored = localStorage.getItem(SPELLING_ATTEMPTS_KEY);
    if (!stored) return [];
    const attempts = JSON.parse(stored) as Array<Omit<SpellingAttempt, 'createdAt'> & { createdAt: string }>;
    return attempts.map((a) => ({ ...a, createdAt: new Date(a.createdAt) }));
  } catch (error) {
    console.error('Failed to read spelling attempts:', error);
    return [];
  }
};

export const saveSpellingAttempt = (evaluation: SpellingEvaluation): SpellingAttempt => {
  const attempts = getSpellingAttempts();
  const attempt: SpellingAttempt = {
    ...evaluation,
    id: `spell_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date()
  };
  const next = [attempt, ...attempts].slice(0, 200);
  try {
    localStorage.setItem(SPELLING_ATTEMPTS_KEY, JSON.stringify(next));
  } catch (error) {
    console.error('Failed to save spelling attempt:', error);
  }
  return attempt;
};

export const clearSpellingAttempts = () => {
  try {
    localStorage.removeItem(SPELLING_ATTEMPTS_KEY);
    localStorage.removeItem(SPELLING_STREAK_KEY);
  } catch (error) {
    console.error('Failed to clear spelling data:', error);
  }
};

// ─── Stats ───

export const getSpellingStats = (): SpellingStats => {
  const attempts = getSpellingAttempts();
  const streak = getStreakData();

  const typeStats = SPELLING_TYPE_ORDER.map((type: SpellingExerciseType) => {
    const matching = attempts.filter((a) => a.exerciseType === type);
    const correct = matching.filter((a) => a.isCorrect).length;
    return {
      type,
      attempts: matching.length,
      correct,
      averageAccuracy: matching.length > 0 ? Math.round((correct / matching.length) * 100) : 0
    };
  });

  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter((a) => a.isCorrect).length;

  return {
    totalAttempts,
    correctAttempts,
    overallAccuracy: totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0,
    currentStreak: streak.current,
    bestStreak: streak.best,
    typeStats
  };
};
