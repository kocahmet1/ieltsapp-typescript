import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  ChevronLeft,
  History,
  RotateCcw,
  Send,
  Trash2,
  Volume2,
  XCircle
} from 'lucide-react';
import '../spelling-forge.css';
import { spellingExercises } from '../data/spellingExercises';
import {
  clearSpellingAttempts,
  evaluateSpellingAnswer,
  getSpellingAttempts,
  getSpellingStats,
  saveSpellingAttempt,
  updateStreak
} from '../services/spellingForgeService';
import {
  SpellingAttempt,
  SpellingEvaluation,
  SpellingExercise,
  SpellingExerciseType,
  SpellingStats,
  SPELLING_CATEGORY_LABELS,
  SPELLING_LEVEL_LABELS,
  SPELLING_TYPE_DESCRIPTIONS,
  SPELLING_TYPE_ICONS,
  SPELLING_TYPE_LABELS,
  SPELLING_TYPE_ORDER
} from '../types/spellingForge';

type SpellingViewMode = 'overview' | 'practice' | 'stats' | 'history';

const EXERCISES_BY_TYPE = SPELLING_TYPE_ORDER.reduce((acc, type) => {
  acc[type] = spellingExercises.filter((ex) => ex.type === type);
  return acc;
}, {} as Record<SpellingExerciseType, SpellingExercise[]>);

const formatDate = (date: Date) =>
  new Date(date).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

const shuffleArray = <T,>(items: T[]): T[] => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export function SpellingForge() {
  const [viewMode, setViewMode] = useState<SpellingViewMode>('overview');
  const [activeType, setActiveType] = useState<SpellingExerciseType | null>(null);
  const [exerciseQueue, setExerciseQueue] = useState<SpellingExercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [textAnswer, setTextAnswer] = useState('');
  const [selectedLetterIndexes, setSelectedLetterIndexes] = useState<number[]>([]);
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const [correctionText, setCorrectionText] = useState('');
  const [evaluation, setEvaluation] = useState<SpellingEvaluation | null>(null);
  const [sessionResults, setSessionResults] = useState<SpellingEvaluation[]>([]);
  const [attempts, setAttempts] = useState<SpellingAttempt[]>([]);
  const [stats, setStats] = useState<SpellingStats>(getSpellingStats());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentExercise = currentIndex < exerciseQueue.length ? exerciseQueue[currentIndex] : null;
  const isSessionComplete = Boolean(activeType) && currentIndex >= exerciseQueue.length;

  const sessionAccuracy = useMemo(() => {
    if (sessionResults.length === 0) return 0;
    const correct = sessionResults.filter((r) => r.isCorrect).length;
    return Math.round((correct / sessionResults.length) * 100);
  }, [sessionResults]);

  const loadStoredData = useCallback(() => {
    setAttempts(getSpellingAttempts());
    setStats(getSpellingStats());
  }, []);

  useEffect(() => {
    loadStoredData();
  }, [loadStoredData]);

  const resetInputs = () => {
    setTextAnswer('');
    setSelectedLetterIndexes([]);
    setSelectedWordIndex(null);
    setCorrectionText('');
    setEvaluation(null);
  };

  const handleStartType = (type: SpellingExerciseType) => {
    const exercises = shuffleArray(EXERCISES_BY_TYPE[type]);
    setActiveType(type);
    setExerciseQueue(exercises);
    setCurrentIndex(0);
    setSessionResults([]);
    setViewMode('practice');
    resetInputs();
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleBackToOverview = () => {
    setViewMode('overview');
    setActiveType(null);
    setCurrentIndex(0);
    setSessionResults([]);
    setExerciseQueue([]);
    resetInputs();
  };

  const handleNextExercise = () => {
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    resetInputs();
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleRestartType = () => {
    if (!activeType) return;
    const exercises = shuffleArray(EXERCISES_BY_TYPE[activeType]);
    setExerciseQueue(exercises);
    setCurrentIndex(0);
    setSessionResults([]);
    setViewMode('practice');
    resetInputs();
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleRetryCurrent = () => {
    resetInputs();
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleClearHistory = () => {
    if (!confirm('Yazım geçmişini silmek istiyor musunuz?')) return;
    clearSpellingAttempts();
    loadStoredData();
  };

  // ─── Unscramble letter selection ───
  const handleSelectLetter = (letterIdx: number) => {
    if (evaluation) return;
    if (selectedLetterIndexes.includes(letterIdx)) return;
    setSelectedLetterIndexes((prev) => [...prev, letterIdx]);
  };

  const handleRemoveLetter = (position: number) => {
    if (evaluation) return;
    setSelectedLetterIndexes((prev) => prev.filter((_, i) => i !== position));
  };

  // ─── Spot the error: word selection ───
  const handleSelectWord = (wordIdx: number) => {
    if (evaluation) return;
    setSelectedWordIndex(wordIdx === selectedWordIndex ? null : wordIdx);
  };

  // ─── Listen & Spell: TTS ───
  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // ─── Submit ───
  const handleSubmit = () => {
    if (!currentExercise || evaluation) return;

    let answer = textAnswer;

    if (currentExercise.type === 'unscramble') {
      answer = selectedLetterIndexes
        .map((idx) => currentExercise.scrambledLetters[idx])
        .join('');
    }

    if (currentExercise.type === 'spot_the_error') {
      answer = correctionText;
    }

    const result = evaluateSpellingAnswer(currentExercise, answer);
    saveSpellingAttempt(result);
    updateStreak(result.isCorrect);
    setEvaluation(result);
    setSessionResults((prev) => [...prev, result]);
    loadStoredData();
  };

  const canSubmit = useMemo(() => {
    if (!currentExercise || evaluation) return false;
    switch (currentExercise.type) {
      case 'unscramble':
        return selectedLetterIndexes.length === currentExercise.scrambledLetters.length;
      case 'spot_the_error':
        return selectedWordIndex !== null && correctionText.trim().length > 0;
      default:
        return textAnswer.trim().length > 0;
    }
  }, [currentExercise, evaluation, textAnswer, selectedLetterIndexes, selectedWordIndex, correctionText]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canSubmit && !evaluation) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ═══════════════════════════════════════
  //  RENDER EXERCISE INPUT
  // ═══════════════════════════════════════

  const renderExerciseInput = () => {
    if (!currentExercise) return null;

    switch (currentExercise.type) {
      case 'missing_letters':
        return (
          <div className="sf-input-area">
            <div className="sf-turkish-hint">
              <span className="sf-hint-flag">🇹🇷</span>
              <span className="sf-hint-word">{currentExercise.turkishHint}</span>
            </div>
            <div className="sf-masked-display">
              {currentExercise.maskedWord.split('').map((ch, idx) => {
                if (ch === ' ') return <div key={idx} className="sf-masked-char space" />;
                return (
                  <div
                    key={idx}
                    className={`sf-masked-char ${ch === '_' ? 'blank' : ''}`}
                  >
                    {ch === '_' ? '·' : ch}
                  </div>
                );
              })}
            </div>
            <input
              ref={inputRef}
              className="sf-text-input"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type the full word..."
              disabled={Boolean(evaluation)}
              autoFocus
            />
          </div>
        );

      case 'unscramble':
        return (
          <div className="sf-input-area">
            <div className="sf-turkish-hint">
              <span className="sf-hint-flag">🇹🇷</span>
              <span className="sf-hint-word">{currentExercise.turkishHint}</span>
            </div>

            <div className="sf-selected-letters">
              {selectedLetterIndexes.length > 0 ? (
                selectedLetterIndexes.map((letterIdx, pos) => (
                  <button
                    key={`sel-${pos}`}
                    type="button"
                    className="sf-selected-tile"
                    onClick={() => handleRemoveLetter(pos)}
                    disabled={Boolean(evaluation)}
                  >
                    {currentExercise.scrambledLetters[letterIdx]}
                  </button>
                ))
              ) : (
                <span className="sf-selected-placeholder">Tap letters to build the word</span>
              )}
            </div>

            <div className="sf-letter-tiles">
              {currentExercise.scrambledLetters.map((letter, idx) => {
                const isUsed = selectedLetterIndexes.includes(idx);
                return (
                  <button
                    key={`tile-${idx}`}
                    type="button"
                    className={`sf-letter-tile ${isUsed ? 'is-used' : ''}`}
                    onClick={() => handleSelectLetter(idx)}
                    disabled={isUsed || Boolean(evaluation)}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'turkish_to_english':
        return (
          <div className="sf-input-area">
            <div className="sf-turkish-hint">
              <span className="sf-hint-flag">🇹🇷</span>
              <span className="sf-hint-word">{currentExercise.turkishWord}</span>
            </div>
            {currentExercise.exampleSentence && (
              <div className="sf-context-sentence" style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                💡 {currentExercise.exampleSentence}
              </div>
            )}
            <input
              ref={inputRef}
              className="sf-text-input"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type the English word..."
              disabled={Boolean(evaluation)}
              autoFocus
            />
          </div>
        );

      case 'contextual_gap': {
        const parts = currentExercise.sentence.split('___');
        return (
          <div className="sf-input-area">
            <div className="sf-turkish-hint">
              <span className="sf-hint-flag">🇹🇷</span>
              <span className="sf-hint-word">{currentExercise.turkishHint}</span>
            </div>
            <div className="sf-context-sentence">
              {parts[0]}
              <span className="sf-context-gap">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
              {parts[1]}
            </div>
            <input
              ref={inputRef}
              className="sf-text-input"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type the missing word..."
              disabled={Boolean(evaluation)}
              autoFocus
            />
          </div>
        );
      }

      case 'listen_and_spell':
        return (
          <div className="sf-input-area">
            <div className="sf-audio-area">
              <button
                type="button"
                className={`sf-play-btn ${isSpeaking ? 'is-speaking' : ''}`}
                onClick={() => handleSpeak(currentExercise.word)}
              >
                <Volume2 size={22} />
                <span>{isSpeaking ? 'Playing...' : 'Play'}</span>
              </button>
              <span className="sf-play-hint">Click to hear the word, then type it below</span>
            </div>
            <div className="sf-turkish-hint">
              <span className="sf-hint-flag">🇹🇷</span>
              <span className="sf-hint-word">{currentExercise.turkishHint}</span>
            </div>
            <input
              ref={inputRef}
              className="sf-text-input"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type what you hear..."
              disabled={Boolean(evaluation)}
            />
          </div>
        );

      case 'spot_the_error': {
        const words = currentExercise.sentence.split(/\s+/);
        return (
          <div className="sf-input-area">
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Tap the misspelled word, then type the correct spelling:
            </p>
            <div className="sf-word-tokens">
              {words.map((word, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`sf-word-token ${selectedWordIndex === idx ? 'selected' : ''}`}
                  onClick={() => handleSelectWord(idx)}
                  disabled={Boolean(evaluation)}
                >
                  {word}
                </button>
              ))}
            </div>
            {selectedWordIndex !== null && (
              <div className="sf-correction-input">
                <label>Correct spelling:</label>
                <input
                  ref={inputRef}
                  value={correctionText}
                  onChange={(e) => setCorrectionText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type correct word..."
                  disabled={Boolean(evaluation)}
                  autoFocus
                />
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  // ═══════════════════════════════════════
  //  RENDER FEEDBACK
  // ═══════════════════════════════════════

  const renderFeedback = () => {
    if (!evaluation) return null;
    const isLast = currentIndex === exerciseQueue.length - 1;

    return (
      <div className={`sf-feedback ${evaluation.isCorrect ? 'is-correct' : 'is-wrong'}`}>
        <div className={`sf-feedback-header ${evaluation.isCorrect ? 'correct' : 'wrong'}`}>
          {evaluation.isCorrect ? <CheckCircle size={22} /> : <XCircle size={22} />}
          <h4>{evaluation.isCorrect ? 'Correct! 🎉' : 'Not quite right'}</h4>
        </div>

        {!evaluation.isCorrect && evaluation.charDiff.length > 0 && (
          <div className="sf-char-diff">
            {evaluation.charDiff.map((entry, idx) => (
              <span key={idx} className={`sf-diff-char ${entry.status}`}>
                {entry.char}
              </span>
            ))}
          </div>
        )}

        <div className="sf-expected">
          <span>Correct answer:</span>
          <strong>{evaluation.expectedAnswer}</strong>
        </div>

        <div className="sf-feedback-actions">
          {!evaluation.isCorrect && (
            <button type="button" className="sf-secondary-btn" onClick={handleRetryCurrent}>
              <RotateCcw size={16} />
              <span>Try Again</span>
            </button>
          )}
          <button type="button" className="sf-primary-btn" onClick={handleNextExercise}>
            <span>{isLast ? 'Finish Set' : 'Next'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════
  //  VIEWS
  // ═══════════════════════════════════════

  return (
    <div>
      {/* ── OVERVIEW ── */}
      {viewMode === 'overview' && (
        <div className="sf-overview">
          <div className="sf-hero">
            <div className="sf-hero-copy">
              <span className="sf-kicker">Spelling Practice</span>
              <h3>Master English spelling one word at a time.</h3>
              <p>
                Work through 6 exercise types: fill missing letters, unscramble words,
                translate from Turkish, fill contextual gaps, listen &amp; spell, and spot errors.
              </p>
            </div>

            <div className="sf-summary-grid">
              <div className="sf-summary-card">
                <span>Attempts</span>
                <strong>{stats.totalAttempts}</strong>
              </div>
              <div className="sf-summary-card">
                <span>Accuracy</span>
                <strong>{stats.overallAccuracy}%</strong>
              </div>
              <div className="sf-summary-card streak">
                <span>Streak</span>
                <strong>🔥 {stats.currentStreak}</strong>
              </div>
              <div className="sf-summary-card">
                <span>Best Streak</span>
                <strong>{stats.bestStreak}</strong>
              </div>
            </div>
          </div>

          {/* Tabs: Stats / History */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="sf-secondary-btn"
              onClick={() => setViewMode('stats')}
            >
              <BarChart3 size={16} />
              <span>Stats</span>
            </button>
            <button
              type="button"
              className="sf-secondary-btn"
              onClick={() => setViewMode('history')}
            >
              <History size={16} />
              <span>History ({attempts.length})</span>
            </button>
          </div>

          <div className="sf-mode-grid">
            {SPELLING_TYPE_ORDER.map((type) => {
              const exercises = EXERCISES_BY_TYPE[type];
              const typeStat = stats.typeStats.find((s) => s.type === type);

              return (
                <button
                  key={type}
                  type="button"
                  className="sf-mode-card"
                  onClick={() => handleStartType(type)}
                >
                  <div className="sf-mode-top">
                    <div>
                      <div className="sf-mode-icon">{SPELLING_TYPE_ICONS[type]}</div>
                      <h4>{SPELLING_TYPE_LABELS[type]}</h4>
                      <p>{SPELLING_TYPE_DESCRIPTIONS[type]}</p>
                    </div>
                    <span className="sf-mode-count">{exercises.length} words</span>
                  </div>

                  <div className="sf-mode-meta">
                    <span>{typeStat?.attempts || 0} attempts</span>
                    <span>{typeStat?.averageAccuracy || 0}% accuracy</span>
                  </div>

                  <div className="sf-mode-footer">
                    <span>Start practice</span>
                    <ArrowRight size={16} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PRACTICE ── */}
      {viewMode === 'practice' && activeType && !isSessionComplete && currentExercise && (
        <div className="sf-practice">
          <div className="sf-topbar">
            <button type="button" className="sf-back-btn" onClick={handleBackToOverview}>
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>

            <div className="sf-progress-meta">
              <span>{SPELLING_TYPE_LABELS[activeType]}</span>
              <span>
                {currentIndex + 1} / {exerciseQueue.length}
              </span>
              {stats.currentStreak > 0 && (
                <span className="sf-streak-badge">🔥 {stats.currentStreak}</span>
              )}
            </div>
          </div>

          <div className="sf-exercise-card">
            <div className="sf-exercise-header">
              <h3>
                {SPELLING_TYPE_ICONS[currentExercise.type]}{' '}
                {SPELLING_TYPE_LABELS[currentExercise.type]}
              </h3>
              <p>{SPELLING_TYPE_DESCRIPTIONS[currentExercise.type]}</p>
              <div className="sf-meta-row">
                <span className="sf-level-chip">
                  {SPELLING_LEVEL_LABELS[currentExercise.level]}
                </span>
                <span className="sf-category-chip">
                  {SPELLING_CATEGORY_LABELS[currentExercise.category]}
                </span>
              </div>
            </div>

            {renderExerciseInput()}

            {!evaluation && (
              <div className="sf-submit-row">
                <button
                  type="button"
                  className="sf-submit-btn"
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                >
                  <Send size={16} />
                  <span>Check</span>
                </button>
              </div>
            )}

            {renderFeedback()}
          </div>
        </div>
      )}

      {/* ── SESSION SUMMARY ── */}
      {viewMode === 'practice' && isSessionComplete && (
        <div className="sf-session-summary">
          <div className="sf-session-score">
            <div
              className={`score-ring ${
                sessionAccuracy >= 80 ? 'high' : sessionAccuracy >= 50 ? 'mid' : 'low'
              }`}
            >
              {sessionAccuracy}%
            </div>
            <span className="sf-session-label">Session Accuracy</span>
            <span className="sf-session-detail">
              {sessionResults.filter((r) => r.isCorrect).length} / {sessionResults.length} correct
            </span>
          </div>

          <div className="sf-session-actions">
            <button type="button" className="sf-secondary-btn" onClick={handleBackToOverview}>
              <ChevronLeft size={16} />
              <span>Overview</span>
            </button>
            <button type="button" className="sf-primary-btn" onClick={handleRestartType}>
              <RotateCcw size={16} />
              <span>Restart Set</span>
            </button>
          </div>
        </div>
      )}

      {/* ── STATS ── */}
      {viewMode === 'stats' && (
        <div className="sf-stats">
          <button type="button" className="sf-back-btn" onClick={handleBackToOverview}>
            <ChevronLeft size={16} />
            <span>Overview</span>
          </button>

          <div className="sf-stats-grid">
            <div className="sf-stat-card">
              <span>Total</span>
              <strong>{stats.totalAttempts}</strong>
            </div>
            <div className="sf-stat-card">
              <span>Correct</span>
              <strong style={{ color: 'var(--accent-green)' }}>{stats.correctAttempts}</strong>
            </div>
            <div className="sf-stat-card">
              <span>Accuracy</span>
              <strong>{stats.overallAccuracy}%</strong>
            </div>
            <div className="sf-stat-card">
              <span>Best Streak</span>
              <strong style={{ color: '#f97316' }}>🔥 {stats.bestStreak}</strong>
            </div>
          </div>

          <div className="sf-type-stats">
            <h4>By Exercise Type</h4>
            {stats.typeStats.map((ts) => (
              <div key={ts.type} className="sf-type-row">
                <span style={{ fontSize: '1rem' }}>{SPELLING_TYPE_ICONS[ts.type]}</span>
                <span className="sf-type-name">{SPELLING_TYPE_LABELS[ts.type]}</span>
                <span className="sf-type-detail">
                  {ts.correct}/{ts.attempts}
                </span>
                <div className="sf-type-bar">
                  <div
                    className="sf-type-bar-fill"
                    style={{ width: `${ts.averageAccuracy}%` }}
                  />
                </div>
                <span className="sf-type-detail">{ts.averageAccuracy}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── HISTORY ── */}
      {viewMode === 'history' && (
        <div className="sf-history">
          <div className="sf-history-header">
            <button type="button" className="sf-back-btn" onClick={handleBackToOverview}>
              <ChevronLeft size={16} />
              <span>Overview</span>
            </button>
            {attempts.length > 0 && (
              <button type="button" className="sf-clear-btn" onClick={handleClearHistory}>
                <Trash2 size={14} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {attempts.length === 0 ? (
            <div className="sf-empty-state">
              <p>No attempts yet. Start practicing!</p>
            </div>
          ) : (
            <div className="sf-history-list">
              {attempts.slice(0, 50).map((attempt) => (
                <div key={attempt.id} className="sf-history-item">
                  <span className="sf-history-icon">
                    {SPELLING_TYPE_ICONS[attempt.exerciseType]}
                  </span>
                  <span className="sf-history-word">{attempt.expectedAnswer}</span>
                  <span
                    className={`sf-history-result ${attempt.isCorrect ? 'correct' : 'wrong'}`}
                  >
                    {attempt.isCorrect ? '✓' : '✗'}
                  </span>
                  <span className="sf-history-date">{formatDate(attempt.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
