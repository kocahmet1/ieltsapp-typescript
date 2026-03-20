import {
  SentenceLabAttempt,
  SentenceLabBreakdown,
  SentenceLabEvaluation,
  SentenceLabExercise,
  SentenceLabFocusArea,
  SentenceLabStats,
  SENTENCE_LAB_FOCUS_LABELS,
  SENTENCE_LAB_TYPE_ORDER
} from '../types/sentenceLab';

const SENTENCE_LAB_ATTEMPTS_KEY = 'english_master_sentence_lab_attempts';

const GRAMMAR_HELPER_WORDS = new Set([
  'a', 'an', 'the',
  'am', 'is', 'are', 'was', 'were',
  'do', 'does', 'did',
  'have', 'has', 'had',
  'to', 'in', 'on', 'at', 'for', 'with',
  'because', 'although', 'if',
  'can', 'could', 'will', 'would'
]);

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const collapseWhitespace = (text: string) => text.trim().replace(/\s+/g, ' ');

const normalizeForComparison = (text: string) => (
  collapseWhitespace(text)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, '')
);

const tokenize = (text: string) => (
  normalizeForComparison(text)
    .split(' ')
    .filter(Boolean)
);

const buildTokenCounts = (tokens: string[]) => {
  const counts = new Map<string, number>();
  tokens.forEach((token) => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });
  return counts;
};

const getCommonTokenCount = (answerTokens: string[], referenceTokens: string[]) => {
  const answerCounts = buildTokenCounts(answerTokens);
  const referenceCounts = buildTokenCounts(referenceTokens);
  let common = 0;

  referenceCounts.forEach((refCount, token) => {
    common += Math.min(refCount, answerCounts.get(token) || 0);
  });

  return common;
};

const getMeaningScore = (answer: string, reference: string) => {
  const answerTokens = tokenize(answer);
  const referenceTokens = tokenize(reference);

  if (answerTokens.length === 0 || referenceTokens.length === 0) {
    return 0;
  }

  const common = getCommonTokenCount(answerTokens, referenceTokens);
  const precision = common / answerTokens.length;
  const recall = common / referenceTokens.length;

  return Math.round(((precision + recall) / 2) * 100);
};

const getLcsLength = (left: string[], right: string[]) => {
  const dp = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      if (left[i - 1] === right[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[left.length][right.length];
};

const getWordOrderScore = (answer: string, reference: string) => {
  const answerTokens = tokenize(answer);
  const referenceTokens = tokenize(reference);

  if (answerTokens.length === 0 || referenceTokens.length === 0) {
    return 0;
  }

  const lcs = getLcsLength(answerTokens, referenceTokens);
  return Math.round((lcs / Math.max(answerTokens.length, referenceTokens.length)) * 100);
};

const getPunctuationProfile = (text: string) => {
  const trimmed = collapseWhitespace(text);
  const firstChar = trimmed.charAt(0);
  const lastChar = trimmed.charAt(trimmed.length - 1);

  return {
    startsWithCapital: firstChar ? firstChar === firstChar.toUpperCase() && /[A-Z]/.test(firstChar) : false,
    endingPunctuation: /[.!?]/.test(lastChar) ? lastChar : '',
    commaCount: (trimmed.match(/,/g) || []).length,
    apostropheCount: (trimmed.match(/[’']/g) || []).length
  };
};

const getPunctuationScore = (answer: string, reference: string) => {
  const answerProfile = getPunctuationProfile(answer);
  const referenceProfile = getPunctuationProfile(reference);

  let matchedRules = 0;
  let totalRules = 0;

  totalRules += 1;
  if (answerProfile.startsWithCapital === referenceProfile.startsWithCapital) {
    matchedRules += 1;
  }

  totalRules += 1;
  if (answerProfile.endingPunctuation === referenceProfile.endingPunctuation) {
    matchedRules += 1;
  }

  totalRules += 1;
  if (answerProfile.commaCount === referenceProfile.commaCount) {
    matchedRules += 1;
  }

  totalRules += 1;
  if (answerProfile.apostropheCount === referenceProfile.apostropheCount) {
    matchedRules += 1;
  }

  return Math.round((matchedRules / totalRules) * 100);
};

const getGrammarScore = (answer: string, reference: string, meaningScore: number, wordOrderScore: number) => {
  const answerTokens = tokenize(answer);
  const referenceTokens = tokenize(reference);

  if (answerTokens.length === 0) {
    return 0;
  }

  if (normalizeForComparison(answer) === normalizeForComparison(reference)) {
    return 100;
  }

  let score = Math.round((meaningScore * 0.45) + (wordOrderScore * 0.35) + 20);

  const answerCounts = buildTokenCounts(answerTokens);
  const referenceCounts = buildTokenCounts(referenceTokens);
  let missingHelperWords = 0;

  referenceCounts.forEach((refCount, token) => {
    if (!GRAMMAR_HELPER_WORDS.has(token)) {
      return;
    }

    const answerCount = answerCounts.get(token) || 0;
    if (answerCount < refCount) {
      missingHelperWords += refCount - answerCount;
    }
  });

  score -= missingHelperWords * 12;
  score -= Math.max(0, Math.abs(answerTokens.length - referenceTokens.length) - 1) * 5;

  return clamp(score);
};

const getReferenceCandidates = (exercise: SentenceLabExercise) => {
  const candidates = [exercise.modelAnswer, ...(exercise.acceptedAnswers || [])];
  return [...new Set(candidates.map(collapseWhitespace))];
};

const getBestReference = (answer: string, candidates: string[]) => {
  let bestReference = candidates[0] || '';
  let bestScore = -1;

  candidates.forEach((candidate) => {
    const score = (
      (getMeaningScore(answer, candidate) * 0.55) +
      (getWordOrderScore(answer, candidate) * 0.35) +
      (getPunctuationScore(answer, candidate) * 0.10)
    );

    if (score > bestScore) {
      bestScore = score;
      bestReference = candidate;
    }
  });

  return bestReference;
};

const fillTemplate = (template: string, values: string[]) => {
  let output = template;
  values.forEach((value) => {
    output = output.replace('___', collapseWhitespace(value) || '___');
  });
  return output;
};

const joinBuilderAnswer = (parts: string[]) => (
  parts
    .join(' ')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
);

const buildSubmittedAnswer = (exercise: SentenceLabExercise, userInput: string | string[]) => {
  switch (exercise.type) {
    case 'sentence_builder':
      return joinBuilderAnswer(Array.isArray(userInput) ? userInput : []);
    case 'partial_translation':
      return fillTemplate(exercise.template, Array.isArray(userInput) ? userInput : []);
    default:
      return collapseWhitespace(typeof userInput === 'string' ? userInput : userInput.join(' '));
  }
};

const getFocusScore = (focusArea: SentenceLabFocusArea, breakdown: SentenceLabBreakdown) => {
  switch (focusArea) {
    case 'word_order':
      return breakdown.wordOrder;
    case 'punctuation':
      return breakdown.punctuation;
    case 'questions':
      return Math.round((breakdown.grammar + breakdown.wordOrder) / 2);
    case 'naturalness':
      return Math.round((breakdown.meaning + breakdown.grammar) / 2);
    default:
      return breakdown.grammar;
  }
};

const buildFeedbackMessages = (
  exercise: SentenceLabExercise,
  breakdown: SentenceLabBreakdown,
  isCorrect: boolean
) => {
  const messages: string[] = [];

  if (isCorrect) {
    messages.push('Good job. The sentence is clear, structured, and close to natural English.');
  } else {
    if (breakdown.meaning < 80) {
      messages.push('The main meaning is not fully clear yet. Check whether every idea from the Turkish sentence is included.');
    }
    if (breakdown.grammar < 80) {
      messages.push('There is still a grammar issue. Check tense, helper verbs, or article use.');
    }
    if (breakdown.wordOrder < 80) {
      messages.push('The word order needs work. English sentence order is stricter than Turkish.');
    }
    if (breakdown.punctuation < 80) {
      messages.push('Punctuation or capitalization needs attention. Fix the first letter, apostrophes, commas, or the final punctuation mark.');
    }
  }

  messages.push(exercise.explanation);
  return messages;
};

export const getSentenceLabAttempts = (): SentenceLabAttempt[] => {
  try {
    const stored = localStorage.getItem(SENTENCE_LAB_ATTEMPTS_KEY);
    if (!stored) {
      return [];
    }

    const attempts = JSON.parse(stored) as Array<Omit<SentenceLabAttempt, 'createdAt'> & { createdAt: string }>;
    return attempts.map((attempt) => ({
      ...attempt,
      createdAt: new Date(attempt.createdAt)
    }));
  } catch (error) {
    console.error('Failed to read Sentence Lab attempts:', error);
    return [];
  }
};

export const saveSentenceLabAttempt = (evaluation: SentenceLabEvaluation) => {
  const attempts = getSentenceLabAttempts();

  const attempt: SentenceLabAttempt = {
    ...evaluation,
    id: `sentence_lab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date()
  };

  const nextAttempts = [attempt, ...attempts].slice(0, 120);

  try {
    localStorage.setItem(SENTENCE_LAB_ATTEMPTS_KEY, JSON.stringify(nextAttempts));
  } catch (error) {
    console.error('Failed to save Sentence Lab attempt:', error);
  }

  return attempt;
};

export const clearSentenceLabAttempts = () => {
  try {
    localStorage.removeItem(SENTENCE_LAB_ATTEMPTS_KEY);
  } catch (error) {
    console.error('Failed to clear Sentence Lab attempts:', error);
  }
};

export const getSentenceLabStats = (): SentenceLabStats => {
  const attempts = getSentenceLabAttempts();

  const typeStats = SENTENCE_LAB_TYPE_ORDER.map((type) => {
    const matchingAttempts = attempts.filter((attempt) => attempt.exerciseType === type);
    const totalScore = matchingAttempts.reduce((sum, attempt) => sum + attempt.overallScore, 0);

    return {
      type,
      attempts: matchingAttempts.length,
      correct: matchingAttempts.filter((attempt) => attempt.isCorrect).length,
      averageScore: matchingAttempts.length > 0 ? Math.round(totalScore / matchingAttempts.length) : 0
    };
  });

  const focusStats = Object.keys(SENTENCE_LAB_FOCUS_LABELS).map((rawFocusArea) => {
    const focusArea = rawFocusArea as SentenceLabFocusArea;
    const matchingAttempts = attempts.filter((attempt) => attempt.focusAreas.includes(focusArea));
    const totalScore = matchingAttempts.reduce(
      (sum, attempt) => sum + getFocusScore(focusArea, attempt.breakdown),
      0
    );

    return {
      focusArea,
      attempts: matchingAttempts.length,
      averageScore: matchingAttempts.length > 0 ? Math.round(totalScore / matchingAttempts.length) : 0
    };
  }).filter((focusStat) => focusStat.attempts > 0);

  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter((attempt) => attempt.isCorrect).length;
  const averageScore = totalAttempts > 0
    ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.overallScore, 0) / totalAttempts)
    : 0;

  return {
    totalAttempts,
    correctAttempts,
    averageScore,
    typeStats,
    focusStats
  };
};

export const evaluateSentenceLabExercise = (
  exercise: SentenceLabExercise,
  userInput: string | string[]
): SentenceLabEvaluation => {
  const submittedAnswer = buildSubmittedAnswer(exercise, userInput);
  const references = getReferenceCandidates(exercise);
  const referenceAnswer = getBestReference(submittedAnswer, references);

  let meaning = getMeaningScore(submittedAnswer, referenceAnswer);
  let wordOrder = getWordOrderScore(submittedAnswer, referenceAnswer);
  let punctuation = getPunctuationScore(submittedAnswer, referenceAnswer);
  let grammar = getGrammarScore(submittedAnswer, referenceAnswer, meaning, wordOrder);

  const normalizedSubmitted = normalizeForComparison(submittedAnswer);
  const normalizedReferences = references.map(normalizeForComparison);
  const exactNormalizedMatch = normalizedReferences.includes(normalizedSubmitted);
  const exactDisplayMatch = references.some((reference) => collapseWhitespace(reference) === collapseWhitespace(submittedAnswer));

  if (exactNormalizedMatch) {
    meaning = 100;
    wordOrder = 100;
    grammar = 100;
  }

  if (exercise.type === 'partial_translation') {
    const values = Array.isArray(userInput) ? userInput : [];
    const everyBlankCorrect = exercise.blankAnswers.every((acceptedValues, index) => {
      const normalizedValue = normalizeForComparison(values[index] || '');
      return acceptedValues.some((acceptedValue) => normalizeForComparison(acceptedValue) === normalizedValue);
    });

    if (everyBlankCorrect) {
      meaning = 100;
      grammar = 100;
      wordOrder = 100;
      punctuation = 100;
    }
  }

  const overallScore = Math.round(
    (meaning * 0.35) +
    (grammar * 0.30) +
    (wordOrder * 0.25) +
    (punctuation * 0.10)
  );

  const punctuationSensitive = exercise.type === 'punctuation_repair';
  const isCorrect = punctuationSensitive
    ? exactDisplayMatch
    : (
      exactNormalizedMatch && punctuation >= 50
    ) || (
      overallScore >= 88 &&
      meaning >= 85 &&
      grammar >= 80 &&
      wordOrder >= 80 &&
      punctuation >= (punctuationSensitive ? 80 : 50)
    );

  const breakdown = {
    meaning: clamp(meaning),
    grammar: clamp(grammar),
    wordOrder: clamp(wordOrder),
    punctuation: clamp(punctuation)
  };

  return {
    exerciseId: exercise.id,
    exerciseType: exercise.type,
    exerciseTitle: exercise.title,
    level: exercise.level,
    focusAreas: exercise.focusAreas,
    submittedAnswer,
    referenceAnswer,
    isCorrect,
    overallScore: clamp(overallScore),
    breakdown,
    feedbackMessages: buildFeedbackMessages(exercise, breakdown, isCorrect),
    explanation: exercise.explanation
  };
};
