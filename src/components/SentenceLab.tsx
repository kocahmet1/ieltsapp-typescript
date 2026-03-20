import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle,
  ChevronLeft,
  Eraser,
  History,
  Languages,
  Lightbulb,
  PenLine,
  RotateCcw,
  Target,
  X
} from 'lucide-react';
import '../sentence-lab.css';
import { sentenceLabExercises } from '../data/sentenceLabExercises';
import {
  clearSentenceLabAttempts,
  evaluateSentenceLabExercise,
  getSentenceLabAttempts,
  getSentenceLabStats,
  saveSentenceLabAttempt
} from '../services/sentenceLabService';
import {
  SentenceLabAttempt,
  SentenceLabEvaluation,
  SentenceLabExercise,
  SentenceLabExerciseType,
  SentenceLabFocusArea,
  SentenceLabStats,
  SENTENCE_LAB_FOCUS_LABELS,
  SENTENCE_LAB_LEVEL_LABELS,
  SENTENCE_LAB_TYPE_DESCRIPTIONS,
  SENTENCE_LAB_TYPE_LABELS,
  SENTENCE_LAB_TYPE_ORDER
} from '../types/sentenceLab';

interface SentenceLabProps {
  isOpen: boolean;
  onClose: () => void;
}

type SentenceLabViewMode = 'overview' | 'practice' | 'stats' | 'history';

const EXERCISES_BY_TYPE = SENTENCE_LAB_TYPE_ORDER.reduce((accumulator, type) => {
  accumulator[type] = sentenceLabExercises.filter((exercise) => exercise.type === type);
  return accumulator;
}, {} as Record<SentenceLabExerciseType, SentenceLabExercise[]>);

const formatDate = (date: Date) => (
  new Date(date).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
);

const getScoreTone = (score: number) => {
  if (score >= 85) return 'strong';
  if (score >= 65) return 'steady';
  return 'weak';
};

const getAccuracy = (stats: SentenceLabStats) => (
  stats.totalAttempts > 0
    ? Math.round((stats.correctAttempts / stats.totalAttempts) * 100)
    : 0
);

const shuffleArray = <T,>(items: T[]) => {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
};

const scrambleArray = <T,>(items: T[]) => {
  if (items.length <= 1) {
    return [...items];
  }

  if (items.length === 2) {
    return [items[1], items[0]];
  }

  let candidate = [...items];

  for (let attempt = 0; attempt < 8; attempt += 1) {
    candidate = shuffleArray(items);
    const movedCount = candidate.filter((item, index) => item !== items[index]).length;

    if (movedCount >= 2) {
      return candidate;
    }
  }

  return [...items].reverse();
};

export function SentenceLab({ isOpen, onClose }: SentenceLabProps) {
  const [viewMode, setViewMode] = useState<SentenceLabViewMode>('overview');
  const [activeType, setActiveType] = useState<SentenceLabExerciseType | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [textAnswer, setTextAnswer] = useState('');
  const [blankAnswers, setBlankAnswers] = useState<string[]>([]);
  const [selectedChunkIndexes, setSelectedChunkIndexes] = useState<number[]>([]);
  const [activeBlankIndex, setActiveBlankIndex] = useState(0);
  const [evaluation, setEvaluation] = useState<SentenceLabEvaluation | null>(null);
  const [sessionResults, setSessionResults] = useState<SentenceLabEvaluation[]>([]);
  const [attempts, setAttempts] = useState<SentenceLabAttempt[]>([]);
  const [stats, setStats] = useState<SentenceLabStats>(getSentenceLabStats());
  const [showHints, setShowHints] = useState(false);
  const [shuffleVersion, setShuffleVersion] = useState(0);

  const activeExercises = activeType ? EXERCISES_BY_TYPE[activeType] : [];
  const currentExercise = currentIndex < activeExercises.length ? activeExercises[currentIndex] : null;
  const isSessionComplete = Boolean(activeType) && currentIndex >= activeExercises.length;
  const shuffledBuilderChunks = useMemo(() => {
    if (!currentExercise || currentExercise.type !== 'sentence_builder') {
      return [];
    }

    return scrambleArray(
      currentExercise.chunks.map((chunk, originalIndex) => ({ chunk, originalIndex }))
    );
  }, [currentExercise, shuffleVersion]);
  const shuffledWordBank = useMemo(() => {
    if (!currentExercise || !('wordBank' in currentExercise) || !currentExercise.wordBank) {
      return [];
    }

    return scrambleArray(
      currentExercise.wordBank.map((word, index) => ({ word, originalIndex: index }))
    );
  }, [currentExercise, shuffleVersion]);

  const weakestFocus = useMemo(() => {
    if (stats.focusStats.length === 0) {
      return null;
    }

    return [...stats.focusStats].sort((left, right) => left.averageScore - right.averageScore)[0];
  }, [stats.focusStats]);

  const sessionAverage = useMemo(() => {
    if (sessionResults.length === 0) {
      return 0;
    }

    const total = sessionResults.reduce((sum, result) => sum + result.overallScore, 0);
    return Math.round(total / sessionResults.length);
  }, [sessionResults]);

  const loadStoredData = () => {
    setAttempts(getSentenceLabAttempts());
    setStats(getSentenceLabStats());
  };

  const resetInputs = (exercise: SentenceLabExercise | null) => {
    setTextAnswer('');
    setSelectedChunkIndexes([]);
    setBlankAnswers(exercise?.type === 'partial_translation' ? exercise.blankAnswers.map(() => '') : []);
    setActiveBlankIndex(0);
    setEvaluation(null);
    setShowHints(false);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    loadStoredData();
    setViewMode('overview');
    setActiveType(null);
    setCurrentIndex(0);
    setSessionResults([]);
    resetInputs(null);
  }, [isOpen]);

  const handleStartType = (type: SentenceLabExerciseType) => {
    const exercises = EXERCISES_BY_TYPE[type];
    setActiveType(type);
    setCurrentIndex(0);
    setSessionResults([]);
    setShuffleVersion((prev) => prev + 1);
    setViewMode('practice');
    resetInputs(exercises[0] || null);
  };

  const handleResumePractice = () => {
    if (!activeType) {
      return;
    }

    setViewMode('practice');
  };

  const handleBackToOverview = () => {
    setViewMode('overview');
    setActiveType(null);
    setCurrentIndex(0);
    setSessionResults([]);
    resetInputs(null);
  };

  const handleNextExercise = () => {
    if (!activeType) {
      return;
    }

    const nextIndex = currentIndex + 1;
    const nextExercise = activeExercises[nextIndex] || null;
    setCurrentIndex(nextIndex);
    setShuffleVersion((prev) => prev + 1);
    resetInputs(nextExercise);
  };

  const handleRestartType = () => {
    if (!activeType) {
      return;
    }

    setCurrentIndex(0);
    setSessionResults([]);
    setShuffleVersion((prev) => prev + 1);
    resetInputs(activeExercises[0] || null);
    setViewMode('practice');
  };

  const handleSelectChunk = (chunkIndex: number) => {
    if (!currentExercise || currentExercise.type !== 'sentence_builder' || evaluation) {
      return;
    }

    if (selectedChunkIndexes.includes(chunkIndex)) {
      return;
    }

    setSelectedChunkIndexes((prev) => [...prev, chunkIndex]);
  };

  const handleRemoveChunk = (selectedPosition: number) => {
    if (evaluation) {
      return;
    }

    setSelectedChunkIndexes((prev) => prev.filter((_, index) => index !== selectedPosition));
  };

  const handleTextWordInsert = (word: string) => {
    if (evaluation) {
      return;
    }

    setTextAnswer((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${word}` : word;
    });
  };

  const handleBlankChange = (index: number, value: string) => {
    if (evaluation) {
      return;
    }

    setBlankAnswers((prev) => prev.map((item, itemIndex) => (
      itemIndex === index ? value : item
    )));
    setActiveBlankIndex(index);
  };

  const handleBlankWordInsert = (word: string) => {
    if (!currentExercise || currentExercise.type !== 'partial_translation' || evaluation) {
      return;
    }

    const nextEmptyAfterActive = blankAnswers.findIndex((value, index) => index >= activeBlankIndex && !value.trim());
    const firstEmpty = blankAnswers.findIndex((value) => !value.trim());
    const targetIndex = nextEmptyAfterActive !== -1
      ? nextEmptyAfterActive
      : (firstEmpty !== -1 ? firstEmpty : activeBlankIndex);

    setBlankAnswers((prev) => prev.map((value, index) => (
      index === targetIndex ? word : value
    )));

    setActiveBlankIndex(Math.min(currentExercise.blankAnswers.length - 1, targetIndex + 1));
  };

  const handleRetryCurrent = () => {
    setShuffleVersion((prev) => prev + 1);
    resetInputs(currentExercise);
  };

  const handleClearHistory = () => {
    if (!confirm('Sentence Lab gecmisini silmek istiyor musunuz?')) {
      return;
    }

    clearSentenceLabAttempts();
    loadStoredData();
  };

  const handleSubmit = () => {
    if (!currentExercise || evaluation) {
      return;
    }

    let submission: string | string[] = textAnswer;

    if (currentExercise.type === 'sentence_builder') {
      submission = selectedChunkIndexes.map((index) => currentExercise.chunks[index]);
    } else if (currentExercise.type === 'partial_translation') {
      submission = blankAnswers;
    }

    const result = evaluateSentenceLabExercise(currentExercise, submission);
    saveSentenceLabAttempt(result);
    setEvaluation(result);
    setSessionResults((prev) => {
      const withoutCurrent = prev.filter((item) => item.exerciseId !== result.exerciseId);
      return [...withoutCurrent, result];
    });
    loadStoredData();
  };

  const canSubmit = useMemo(() => {
    if (!currentExercise || evaluation) {
      return false;
    }

    switch (currentExercise.type) {
      case 'sentence_builder':
        return selectedChunkIndexes.length === currentExercise.chunks.length;
      case 'partial_translation':
        return blankAnswers.every((value) => value.trim().length > 0);
      default:
        return textAnswer.trim().length > 0;
    }
  }, [blankAnswers, currentExercise, evaluation, selectedChunkIndexes.length, textAnswer]);

  const renderFocusChips = (focusAreas: SentenceLabFocusArea[]) => (
    <div className="sentence-lab-chip-row">
      {focusAreas.map((focusArea) => (
        <span key={focusArea} className="sentence-lab-chip">
          {SENTENCE_LAB_FOCUS_LABELS[focusArea]}
        </span>
      ))}
    </div>
  );

  const renderWordBank = (words: string[], onInsert: (word: string) => void) => (
    <div className="sentence-lab-word-bank">
      {words.map((word, index) => (
        <button
          key={`${word}-${index}`}
          type="button"
          className="sentence-lab-word-pill"
          onClick={() => onInsert(word)}
          disabled={Boolean(evaluation)}
        >
          {word}
        </button>
      ))}
    </div>
  );

  const renderExerciseInput = () => {
    if (!currentExercise) {
      return null;
    }

    switch (currentExercise.type) {
      case 'sentence_builder': {
        const selectedChunks = selectedChunkIndexes.map((index) => currentExercise.chunks[index]);

        return (
          <div className="sentence-lab-builder">
            <div className="sentence-lab-selected-line">
              {selectedChunks.length > 0 ? (
                selectedChunks.map((chunk, index) => (
                  <button
                    key={`${chunk}-${index}`}
                    type="button"
                    className="sentence-lab-selected-chunk"
                    onClick={() => handleRemoveChunk(index)}
                    disabled={Boolean(evaluation)}
                  >
                    {chunk}
                  </button>
                ))
              ) : (
                <p className="sentence-lab-placeholder">Build the sentence here.</p>
              )}
            </div>

            <div className="sentence-lab-bank-grid">
              {shuffledBuilderChunks.map(({ chunk, originalIndex }) => {
                const isUsed = selectedChunkIndexes.includes(originalIndex);

                return (
                  <button
                    key={`${chunk}-${originalIndex}`}
                    type="button"
                    className={`sentence-lab-bank-chunk ${isUsed ? 'is-used' : ''}`}
                    onClick={() => handleSelectChunk(originalIndex)}
                    disabled={isUsed || Boolean(evaluation)}
                  >
                    {chunk}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      case 'guided_translation':
        return (
          <div className="sentence-lab-answer-block">
            <textarea
              className="sentence-lab-textarea"
              value={textAnswer}
              onChange={(event) => setTextAnswer(event.target.value)}
              placeholder="Write the English sentence here."
              disabled={Boolean(evaluation)}
            />
            {renderWordBank(shuffledWordBank.map((item) => item.word), handleTextWordInsert)}
          </div>
        );

      case 'partial_translation': {
        const templateParts = currentExercise.template.split('___');

        return (
          <div className="sentence-lab-answer-block">
            <div className="sentence-lab-template-row">
              {templateParts.map((part, index) => (
                <div key={`part-${index}`} className="sentence-lab-template-piece">
                  {part && <span>{part}</span>}
                  {index < currentExercise.blankAnswers.length && (
                    <input
                      className={`sentence-lab-inline-input ${activeBlankIndex === index ? 'is-active' : ''}`}
                      value={blankAnswers[index] || ''}
                      onFocus={() => setActiveBlankIndex(index)}
                      onChange={(event) => handleBlankChange(index, event.target.value)}
                      disabled={Boolean(evaluation)}
                    />
                  )}
                </div>
              ))}
            </div>
            {currentExercise.wordBank && renderWordBank(shuffledWordBank.map((item) => item.word), handleBlankWordInsert)}
          </div>
        );
      }

      case 'error_correction':
        return (
          <div className="sentence-lab-answer-block">
            <div className="sentence-lab-example-card danger">
              <span className="sentence-lab-label">Incorrect sentence</span>
              <p>{currentExercise.incorrectSentence}</p>
            </div>
            <textarea
              className="sentence-lab-textarea"
              value={textAnswer}
              onChange={(event) => setTextAnswer(event.target.value)}
              placeholder="Write the corrected sentence."
              disabled={Boolean(evaluation)}
            />
          </div>
        );

      case 'punctuation_repair':
        return (
          <div className="sentence-lab-answer-block">
            <div className="sentence-lab-example-card">
              <span className="sentence-lab-label">Raw sentence</span>
              <p className="sentence-lab-mono">{currentExercise.rawSentence}</p>
            </div>
            <input
              className="sentence-lab-input"
              value={textAnswer}
              onChange={(event) => setTextAnswer(event.target.value)}
              placeholder="Rewrite it with correct punctuation."
              disabled={Boolean(evaluation)}
            />
          </div>
        );

      case 'sentence_transformation':
        return (
          <div className="sentence-lab-answer-block">
            <div className="sentence-lab-example-card">
              <span className="sentence-lab-label">Source sentence</span>
              <p>{currentExercise.sourceSentence}</p>
            </div>
            <div className="sentence-lab-callout">
              <Target size={16} />
              <span>{currentExercise.transformationInstruction}</span>
            </div>
            <input
              className="sentence-lab-input"
              value={textAnswer}
              onChange={(event) => setTextAnswer(event.target.value)}
              placeholder="Write the transformed sentence."
              disabled={Boolean(evaluation)}
            />
          </div>
        );

      case 'sentence_combining':
        return (
          <div className="sentence-lab-answer-block">
            <div className="sentence-lab-sentence-pair">
              {currentExercise.sourceSentences.map((sentence) => (
                <div key={sentence} className="sentence-lab-example-card">
                  <p>{sentence}</p>
                </div>
              ))}
            </div>
            <div className="sentence-lab-callout accent">
              <span className="sentence-lab-connector-chip">{currentExercise.connector}</span>
              <span>Use this connector in one natural sentence.</span>
            </div>
            <textarea
              className="sentence-lab-textarea"
              value={textAnswer}
              onChange={(event) => setTextAnswer(event.target.value)}
              placeholder="Combine the ideas into one sentence."
              disabled={Boolean(evaluation)}
            />
          </div>
        );

      case 'situation_response':
        return (
          <div className="sentence-lab-answer-block">
            <div className="sentence-lab-example-card">
              <span className="sentence-lab-label">Situation</span>
              <p>{currentExercise.scenario}</p>
            </div>
            {currentExercise.requirements && currentExercise.requirements.length > 0 && (
              <div className="sentence-lab-requirements">
                {currentExercise.requirements.map((requirement) => (
                  <span key={requirement} className="sentence-lab-requirement-pill">
                    {requirement}
                  </span>
                ))}
              </div>
            )}
            <textarea
              className="sentence-lab-textarea"
              value={textAnswer}
              onChange={(event) => setTextAnswer(event.target.value)}
              placeholder="Write one complete sentence."
              disabled={Boolean(evaluation)}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const renderEvaluation = () => {
    if (!evaluation) {
      return null;
    }

    const isLastExercise = currentIndex === activeExercises.length - 1;

    return (
      <div className={`sentence-lab-feedback-card ${evaluation.isCorrect ? 'is-correct' : 'needs-work'}`}>
        <div className="sentence-lab-feedback-header">
          <div className="sentence-lab-feedback-title">
            {evaluation.isCorrect ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <div>
              <h4>{evaluation.isCorrect ? 'Strong answer' : 'Needs another pass'}</h4>
              <p>{evaluation.exerciseTitle}</p>
            </div>
          </div>
          <div className={`sentence-lab-score-badge ${getScoreTone(evaluation.overallScore)}`}>
            {evaluation.overallScore}
          </div>
        </div>

        <div className="sentence-lab-breakdown-grid">
          <div className="sentence-lab-breakdown-card">
            <span>Meaning</span>
            <strong>{evaluation.breakdown.meaning}</strong>
          </div>
          <div className="sentence-lab-breakdown-card">
            <span>Grammar</span>
            <strong>{evaluation.breakdown.grammar}</strong>
          </div>
          <div className="sentence-lab-breakdown-card">
            <span>Word Order</span>
            <strong>{evaluation.breakdown.wordOrder}</strong>
          </div>
          <div className="sentence-lab-breakdown-card">
            <span>Punctuation</span>
            <strong>{evaluation.breakdown.punctuation}</strong>
          </div>
        </div>

        <div className="sentence-lab-compare-grid">
          <div className="sentence-lab-compare-card">
            <span className="sentence-lab-label">Your answer</span>
            <p>{evaluation.submittedAnswer || 'No answer submitted.'}</p>
          </div>
          <div className="sentence-lab-compare-card">
            <span className="sentence-lab-label">Model answer</span>
            <p>{evaluation.referenceAnswer}</p>
          </div>
        </div>

        <div className="sentence-lab-feedback-messages">
          {evaluation.feedbackMessages.map((message) => (
            <div key={message} className="sentence-lab-feedback-line">
              <ArrowRight size={14} />
              <span>{message}</span>
            </div>
          ))}
        </div>

        <div className="sentence-lab-feedback-actions">
          <button type="button" className="sentence-lab-secondary-btn" onClick={handleRetryCurrent}>
            <RotateCcw size={16} />
            <span>Try Again</span>
          </button>
          <button type="button" className="sentence-lab-primary-btn" onClick={handleNextExercise}>
            <span>{isLastExercise ? 'Finish Set' : 'Next Exercise'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="sentence-lab-overlay" onClick={onClose}>
      <div className="sentence-lab-panel" onClick={(event) => event.stopPropagation()}>
        <div className="sentence-lab-header">
          <div className="sentence-lab-title">
            <Languages size={24} />
            <div>
              <h2>Sentence Lab</h2>
              <p>Sentence-level writing practice for structure, grammar, and punctuation.</p>
            </div>
          </div>

          <div className="sentence-lab-header-actions">
            <button
              type="button"
              className={`sentence-lab-tab ${viewMode === 'overview' ? 'active' : ''}`}
              onClick={handleBackToOverview}
            >
              <Languages size={16} />
              <span>Overview</span>
            </button>

            {activeType && (
              <button
                type="button"
                className={`sentence-lab-tab ${viewMode === 'practice' ? 'active' : ''}`}
                onClick={handleResumePractice}
              >
                <PenLine size={16} />
                <span>{SENTENCE_LAB_TYPE_LABELS[activeType]}</span>
              </button>
            )}

            <button
              type="button"
              className={`sentence-lab-tab ${viewMode === 'stats' ? 'active' : ''}`}
              onClick={() => setViewMode('stats')}
            >
              <BarChart3 size={16} />
              <span>Stats</span>
            </button>

            <button
              type="button"
              className={`sentence-lab-tab ${viewMode === 'history' ? 'active' : ''}`}
              onClick={() => setViewMode('history')}
            >
              <History size={16} />
              <span>History</span>
            </button>

            <button type="button" className="sentence-lab-close-btn" onClick={onClose}>
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="sentence-lab-content">
          {viewMode === 'overview' && (
            <div className="sentence-lab-overview">
              <div className="sentence-lab-hero">
                <div className="sentence-lab-hero-copy">
                  <span className="sentence-lab-kicker">Micro Writing Practice</span>
                  <h3>Build correct English sentences one step at a time.</h3>
                  <p>
                    Start with guided structure work, then move into translation, correction,
                    punctuation, transformation, combining, and natural response practice.
                  </p>
                </div>

                <div className="sentence-lab-summary-grid">
                  <div className="sentence-lab-summary-card">
                    <span>Total Attempts</span>
                    <strong>{stats.totalAttempts}</strong>
                  </div>
                  <div className="sentence-lab-summary-card">
                    <span>Accuracy</span>
                    <strong>{getAccuracy(stats)}%</strong>
                  </div>
                  <div className="sentence-lab-summary-card">
                    <span>Average Score</span>
                    <strong>{stats.averageScore}</strong>
                  </div>
                </div>
              </div>

              {weakestFocus && (
                <div className="sentence-lab-weak-focus">
                  <AlertCircle size={18} />
                  <span>
                    Current weak focus: <strong>{SENTENCE_LAB_FOCUS_LABELS[weakestFocus.focusArea]}</strong>
                    {' '}({weakestFocus.averageScore}/100 across {weakestFocus.attempts} attempts)
                  </span>
                </div>
              )}

              <div className="sentence-lab-mode-grid">
                {SENTENCE_LAB_TYPE_ORDER.map((type) => {
                  const exercises = EXERCISES_BY_TYPE[type];
                  const typeStat = stats.typeStats.find((item) => item.type === type);

                  return (
                    <button
                      key={type}
                      type="button"
                      className="sentence-lab-mode-card"
                      onClick={() => handleStartType(type)}
                    >
                      <div className="sentence-lab-mode-top">
                        <div>
                          <h4>{SENTENCE_LAB_TYPE_LABELS[type]}</h4>
                          <p>{SENTENCE_LAB_TYPE_DESCRIPTIONS[type]}</p>
                        </div>
                        <span className="sentence-lab-mode-count">{exercises.length} tasks</span>
                      </div>

                      <div className="sentence-lab-mode-meta">
                        <span>{typeStat?.attempts || 0} attempts</span>
                        <span>{typeStat?.averageScore || 0} avg</span>
                      </div>

                      <div className="sentence-lab-mode-footer">
                        <span>Start practice</span>
                        <ArrowRight size={16} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'practice' && activeType && !isSessionComplete && currentExercise && (
            <div className="sentence-lab-practice">
              <div className="sentence-lab-practice-topbar">
                <button type="button" className="sentence-lab-back-btn" onClick={handleBackToOverview}>
                  <ChevronLeft size={16} />
                  <span>Back to Lab</span>
                </button>

                <div className="sentence-lab-progress-meta">
                  <span>{SENTENCE_LAB_TYPE_LABELS[activeType]}</span>
                  <span>{currentIndex + 1} / {activeExercises.length}</span>
                </div>
              </div>

              <div className="sentence-lab-progress-track">
                <div
                  className="sentence-lab-progress-fill"
                  style={{ width: `${((currentIndex + 1) / activeExercises.length) * 100}%` }}
                />
              </div>

              <div className="sentence-lab-question-card">
                <div className="sentence-lab-question-head">
                  <div>
                    <h3>{currentExercise.title}</h3>
                    <p>{currentExercise.instructions}</p>
                  </div>
                  <span className="sentence-lab-level-badge">
                    {SENTENCE_LAB_LEVEL_LABELS[currentExercise.level]}
                  </span>
                </div>

                {renderFocusChips(currentExercise.focusAreas)}

                {currentExercise.turkishPrompt && (
                  <div className="sentence-lab-prompt-card">
                    <span className="sentence-lab-label">Turkish prompt</span>
                    <p>{currentExercise.turkishPrompt}</p>
                  </div>
                )}

                {renderExerciseInput()}

                {currentExercise.hints && currentExercise.hints.length > 0 && (
                  <div className="sentence-lab-hint-box">
                    <button
                      type="button"
                      className="sentence-lab-hint-toggle"
                      onClick={() => setShowHints((prev) => !prev)}
                    >
                      <Lightbulb size={16} />
                      <span>{showHints ? 'Hide Hints' : 'Show Hints'}</span>
                    </button>

                    {showHints && (
                      <div className="sentence-lab-hint-list">
                        {currentExercise.hints.map((hint) => (
                          <div key={hint} className="sentence-lab-hint-line">
                            <ArrowRight size={14} />
                            <span>{hint}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="sentence-lab-practice-actions">
                  <button
                    type="button"
                    className="sentence-lab-secondary-btn"
                    onClick={() => resetInputs(currentExercise)}
                    disabled={Boolean(evaluation)}
                  >
                    <Eraser size={16} />
                    <span>Clear</span>
                  </button>

                  <button
                    type="button"
                    className="sentence-lab-primary-btn"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                  >
                    <span>Check Answer</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              {renderEvaluation()}
            </div>
          )}

          {viewMode === 'practice' && activeType && isSessionComplete && (
            <div className="sentence-lab-session-end">
              <div className="sentence-lab-session-card">
                <CheckCircle size={28} />
                <h3>{SENTENCE_LAB_TYPE_LABELS[activeType]} complete</h3>
                <p>You finished {sessionResults.length} exercises in this set.</p>

                <div className="sentence-lab-summary-grid session">
                  <div className="sentence-lab-summary-card">
                    <span>Correct</span>
                    <strong>{sessionResults.filter((item) => item.isCorrect).length}</strong>
                  </div>
                  <div className="sentence-lab-summary-card">
                    <span>Average</span>
                    <strong>{sessionAverage}</strong>
                  </div>
                  <div className="sentence-lab-summary-card">
                    <span>Total Tasks</span>
                    <strong>{activeExercises.length}</strong>
                  </div>
                </div>

                <div className="sentence-lab-feedback-actions">
                  <button type="button" className="sentence-lab-secondary-btn" onClick={handleBackToOverview}>
                    <Languages size={16} />
                    <span>Back to Overview</span>
                  </button>
                  <button type="button" className="sentence-lab-primary-btn" onClick={handleRestartType}>
                    <RotateCcw size={16} />
                    <span>Restart Set</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'stats' && (
            <div className="sentence-lab-stats">
              <div className="sentence-lab-summary-grid">
                <div className="sentence-lab-summary-card">
                  <span>Total Attempts</span>
                  <strong>{stats.totalAttempts}</strong>
                </div>
                <div className="sentence-lab-summary-card">
                  <span>Accuracy</span>
                  <strong>{getAccuracy(stats)}%</strong>
                </div>
                <div className="sentence-lab-summary-card">
                  <span>Average Score</span>
                  <strong>{stats.averageScore}</strong>
                </div>
              </div>

              <div className="sentence-lab-stats-section">
                <h3>By Exercise Type</h3>
                <div className="sentence-lab-stats-list">
                  {stats.typeStats.map((typeStat) => (
                    <div key={typeStat.type} className="sentence-lab-stat-row">
                      <div className="sentence-lab-stat-copy">
                        <strong>{SENTENCE_LAB_TYPE_LABELS[typeStat.type]}</strong>
                        <span>{typeStat.attempts} attempts</span>
                      </div>
                      <div className="sentence-lab-stat-bar">
                        <div
                          className={`sentence-lab-stat-fill ${getScoreTone(typeStat.averageScore)}`}
                          style={{ width: `${typeStat.averageScore}%` }}
                        />
                      </div>
                      <div className="sentence-lab-stat-score">{typeStat.averageScore}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sentence-lab-stats-section">
                <h3>By Focus Area</h3>
                {stats.focusStats.length === 0 ? (
                  <div className="sentence-lab-empty-state compact">
                    <BarChart3 size={28} />
                    <p>No stats yet. Complete a few exercises first.</p>
                  </div>
                ) : (
                  <div className="sentence-lab-stats-list">
                    {stats.focusStats.map((focusStat) => (
                      <div key={focusStat.focusArea} className="sentence-lab-stat-row">
                        <div className="sentence-lab-stat-copy">
                          <strong>{SENTENCE_LAB_FOCUS_LABELS[focusStat.focusArea]}</strong>
                          <span>{focusStat.attempts} attempts</span>
                        </div>
                        <div className="sentence-lab-stat-bar">
                          <div
                            className={`sentence-lab-stat-fill ${getScoreTone(focusStat.averageScore)}`}
                            style={{ width: `${focusStat.averageScore}%` }}
                          />
                        </div>
                        <div className="sentence-lab-stat-score">{focusStat.averageScore}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {viewMode === 'history' && (
            <div className="sentence-lab-history">
              <div className="sentence-lab-history-head">
                <div>
                  <h3>Recent Attempts</h3>
                  <p>Review what students submitted and compare it with the model sentence.</p>
                </div>

                {attempts.length > 0 && (
                  <button type="button" className="sentence-lab-secondary-btn danger" onClick={handleClearHistory}>
                    <Eraser size={16} />
                    <span>Clear History</span>
                  </button>
                )}
              </div>

              {attempts.length === 0 ? (
                <div className="sentence-lab-empty-state">
                  <History size={40} />
                  <h4>No attempts yet</h4>
                  <p>Start a Sentence Lab activity to create history and progress data.</p>
                </div>
              ) : (
                <div className="sentence-lab-history-list">
                  {attempts.map((attempt) => (
                    <div key={attempt.id} className="sentence-lab-history-item">
                      <div className="sentence-lab-history-top">
                        <div>
                          <h4>{attempt.exerciseTitle}</h4>
                          <div className="sentence-lab-history-meta">
                            <span>{SENTENCE_LAB_TYPE_LABELS[attempt.exerciseType]}</span>
                            <span>{formatDate(attempt.createdAt)}</span>
                          </div>
                        </div>

                        <div className={`sentence-lab-score-badge ${getScoreTone(attempt.overallScore)}`}>
                          {attempt.overallScore}
                        </div>
                      </div>

                      <div className="sentence-lab-history-compare">
                        <div className="sentence-lab-history-answer">
                          <span className="sentence-lab-label">Student</span>
                          <p>{attempt.submittedAnswer || 'No answer submitted.'}</p>
                        </div>
                        <div className="sentence-lab-history-answer">
                          <span className="sentence-lab-label">Model</span>
                          <p>{attempt.referenceAnswer}</p>
                        </div>
                      </div>

                      {renderFocusChips(attempt.focusAreas)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
