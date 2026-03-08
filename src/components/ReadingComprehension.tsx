import { useState, useEffect, useMemo } from 'react';
import {
  X,
  BookOpen,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  BarChart3,
  FileText,
  Target,
  Award,
  RefreshCw,
  List,
  Eye,
  CheckCircle,
  BookPlus
} from 'lucide-react';
import {
  ReadingPassage,
  ReadingQuestion,
  ReadingAnswer,
  ReadingProgress,
  ReadingStats,
  READING_QUESTION_TYPE_LABELS
} from '../types';

interface ReadingComprehensionProps {
  isOpen: boolean;
  onClose: () => void;
  passages: ReadingPassage[];
  completedPassageIds: string[];
  stats: ReadingStats;
  onAnswerQuestion: (passageId: string, questionId: number, answer: string, isCorrect: boolean, questionType: string) => Promise<void>;
  onCompletePassage: (passageId: string, score: number, difficulty: string) => Promise<void>;
  getProgress: (passageId: string) => Promise<ReadingProgress | null>;
  onResetProgress: (passageId: string) => Promise<void>;
  onAddToVault?: (word: string, questionContext: string, sourceId: string, questionId: number) => void;
  vocabWordsInVault?: string[];
}

type ViewMode = 'list' | 'reading' | 'results' | 'stats';

export const ReadingComprehension = ({
  isOpen,
  onClose,
  passages,
  completedPassageIds,
  stats,
  onAnswerQuestion,
  onCompletePassage,
  getProgress,
  onResetProgress,
  onAddToVault,
  vocabWordsInVault = []
}: ReadingComprehensionProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPassage, setSelectedPassage] = useState<ReadingPassage | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<Map<number, ReadingAnswer>>(new Map());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showPassageInQuestions, setShowPassageInQuestions] = useState(true);
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [showVocabOptions, setShowVocabOptions] = useState<number | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setViewMode('list');
      setSelectedPassage(null);
      setCurrentAnswers(new Map());
      setCurrentQuestionIndex(0);
    }
  }, [isOpen]);

  // Load existing progress when selecting a passage
  useEffect(() => {
    let isMounted = true;
    if (selectedPassage) {
      const load = async () => {
        try {
          const progress = await getProgress(selectedPassage.id);
          if (!isMounted) return;
          if (progress && progress.answers) {
            if (progress.answers instanceof Map) {
              setCurrentAnswers(new Map(progress.answers));
            } else {
              const answersMap = new Map<number, ReadingAnswer>();
              Object.entries(progress.answers).forEach(([key, value]) => {
                answersMap.set(parseInt(key), value as ReadingAnswer);
              });
              setCurrentAnswers(answersMap);
            }
          } else {
            setCurrentAnswers(new Map());
          }
        } catch (error) {
          console.error("Failed to fetch progress", error);
          if (isMounted) setCurrentAnswers(new Map());
        }
      };
      load();
    }
    return () => { isMounted = false; };
  }, [selectedPassage, getProgress]);

  // Filter passages by difficulty
  const filteredPassages = useMemo(() => {
    if (filterDifficulty === 'all') return passages;
    return passages.filter(p => p.difficulty === filterDifficulty);
  }, [passages, filterDifficulty]);

  // Get unique difficulties for filter
  const difficulties = useMemo(() => {
    const unique = [...new Set(passages.map(p => p.difficulty))];
    return unique.sort((a, b) => {
      const order = ['Pre-Intermediate', 'Intermediate', 'Upper Intermediate', 'Advanced'];
      return order.indexOf(a) - order.indexOf(b);
    });
  }, [passages]);

  // Calculate current passage progress
  const currentProgress = useMemo(() => {
    if (!selectedPassage) return { answered: 0, correct: 0, total: 0 };
    const total = selectedPassage.questions.length;
    const answered = currentAnswers.size;
    const correct = Array.from(currentAnswers.values()).filter(a => a.isCorrect).length;
    return { answered, correct, total };
  }, [selectedPassage, currentAnswers]);

  // Handle starting a passage
  const handleStartPassage = (passage: ReadingPassage) => {
    setSelectedPassage(passage);
    setCurrentQuestionIndex(0);
    setViewMode('reading');
  };

  // Handle answering a question
  const handleAnswer = async (questionId: number, selectedAnswer: string) => {
    if (!selectedPassage) return;
    if (currentAnswers.has(questionId)) return; // Already answered

    const question = selectedPassage.questions.find(q => q.id === questionId);
    if (!question) return;

    const isCorrect = selectedAnswer === question.correctAnswer;
    const answer: ReadingAnswer = {
      questionId,
      selectedAnswer,
      isCorrect,
      explanation: question.explanation
    };

    const newAnswers = new Map(currentAnswers);
    newAnswers.set(questionId, answer);
    setCurrentAnswers(newAnswers);

    // Track the answer
    await onAnswerQuestion(
      selectedPassage.id,
      questionId,
      selectedAnswer,
      isCorrect,
      question.questionType
    );

    // Check if all questions are answered
    if (newAnswers.size === selectedPassage.questions.length) {
      const correct = Array.from(newAnswers.values()).filter(a => a.isCorrect).length;
      const score = Math.round((correct / selectedPassage.questions.length) * 100);
      await onCompletePassage(selectedPassage.id, score, selectedPassage.difficulty);
    }
  };

  // Handle navigation
  const handleNextQuestion = () => {
    if (selectedPassage && currentQuestionIndex < selectedPassage.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Handle view results
  const handleViewResults = () => {
    setViewMode('results');
  };

  // Handle back to list
  const handleBackToList = () => {
    setViewMode('list');
    setSelectedPassage(null);
    setCurrentAnswers(new Map());
    setCurrentQuestionIndex(0);
  };

  // Handle reset passage
  const handleReset = async () => {
    if (selectedPassage) {
      await onResetProgress(selectedPassage.id);
      setCurrentAnswers(new Map());
      setCurrentQuestionIndex(0);
    }
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Pre-Intermediate': return 'var(--accent-green)';
      case 'Intermediate': return 'var(--accent-primary)';
      case 'Upper Intermediate': return 'var(--accent-orange)';
      case 'Advanced': return 'var(--accent-red)';
      default: return 'var(--text-secondary)';
    }
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--accent-green)';
    if (score >= 60) return 'var(--accent-yellow)';
    if (score >= 40) return 'var(--accent-orange)';
    return 'var(--accent-red)';
  };

  // Extract vocabulary words from question text and options
  const extractVocabWords = (question: ReadingQuestion): string[] => {
    const words: string[] = [];
    // Extract words from options (they often contain key vocabulary)
    question.options.forEach(opt => {
      // Extract individual words that might be vocabulary items
      const optionWords = opt.text.split(/[\s,;.!?()]+/)
        .filter(w => w.length > 4 && /^[a-zA-Z]+$/.test(w))
        .map(w => w.toLowerCase());
      words.push(...optionWords);
    });
    // Get unique words
    return [...new Set(words)].slice(0, 6);
  };

  // Handle adding word to vault
  const handleAddToVault = (word: string, context: string, questionId: number) => {
    if (selectedPassage && onAddToVault) {
      onAddToVault(word, context, `reading-${selectedPassage.id}`, questionId);
    }
  };

  if (!isOpen) return null;

  const currentQuestion = selectedPassage?.questions[currentQuestionIndex];

  return (
    <div className="reading-overlay" onClick={onClose}>
      <div className="reading-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="reading-header">
          <div className="reading-title">
            <BookOpen size={24} />
            <h2>Okuma Anlama</h2>
          </div>
          <div className="reading-header-actions">
            <button
              className={`mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={handleBackToList}
            >
              <List size={18} />
              <span>Pasajlar</span>
            </button>
            <button
              className={`mode-btn ${viewMode === 'stats' ? 'active' : ''}`}
              onClick={() => setViewMode('stats')}
            >
              <BarChart3 size={18} />
              <span>İstatistikler</span>
            </button>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="reading-content">
          {/* List View */}
          {viewMode === 'list' && (
            <div className="passage-list-view">
              {/* Difficulty Filter */}
              <div className="filter-bar">
                <span className="filter-label">Seviye:</span>
                <div className="filter-buttons">
                  <button
                    className={`filter-btn ${filterDifficulty === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterDifficulty('all')}
                  >
                    Tümü
                  </button>
                  {difficulties.map(diff => (
                    <button
                      key={diff}
                      className={`filter-btn ${filterDifficulty === diff ? 'active' : ''}`}
                      onClick={() => setFilterDifficulty(diff)}
                      style={{ '--filter-color': getDifficultyColor(diff) } as React.CSSProperties}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              {/* Passage Cards */}
              <div className="passage-grid">
                {filteredPassages.map(passage => {
                  const isCompleted = completedPassageIds.includes(passage.id);
                  // Since progress is async, we can't show it down here simultaneously without state.
                  // For the passage list view, we already know if it's completed via completedPassageIds.
                  // Since we don't have synchronous getProgress, we will omit the inline score card on the list view 
                  // to save on infinite API calls, and instead rely on the completion badge.

                  return (
                    <div
                      key={passage.id}
                      className={`passage-card ${isCompleted ? 'completed' : ''}`}
                    >
                      <div className="passage-card-header">
                        <span
                          className="difficulty-tag"
                          style={{ backgroundColor: getDifficultyColor(passage.difficulty) }}
                        >
                          {passage.difficulty}
                        </span>
                        {isCompleted && (
                          <span className="completed-badge">
                            <CheckCircle size={16} />
                            Tamamlandı
                          </span>
                        )}
                      </div>
                      <h3 className="passage-card-title">{passage.title}</h3>
                      <p className="passage-card-topic">{passage.topic}</p>
                      <div className="passage-card-meta">
                        <span>
                          <FileText size={14} />
                          {passage.wordCount} kelime
                        </span>
                        <span>
                          <Clock size={14} />
                          ~{passage.estimatedTime} dk
                        </span>
                        <span>
                          <Target size={14} />
                          {passage.questions.length} soru
                        </span>
                      </div>
                      <button
                        className="start-btn"
                        onClick={() => handleStartPassage(passage)}
                      >
                        <BookOpen size={18} />
                        <span>{isCompleted ? 'Tekrar Çöz' : 'Başla'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reading View */}
          {viewMode === 'reading' && selectedPassage && currentQuestion && (
            <div className="reading-view">
              {/* Progress Bar */}
              <div className="reading-progress-bar">
                <div className="progress-info">
                  <span>{currentProgress.answered} / {currentProgress.total} soru cevaplandı</span>
                  <span className="correct-count">
                    <Check size={14} />
                    {currentProgress.correct} doğru
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${(currentProgress.answered / currentProgress.total) * 100}%` }}
                  />
                </div>
              </div>

              <div className="reading-layout">
                {/* Passage Section */}
                {showPassageInQuestions && (
                  <div className="passage-section">
                    <div className="passage-header">
                      <h3>{selectedPassage.title}</h3>
                      <button
                        className="toggle-passage-btn"
                        onClick={() => setShowPassageInQuestions(false)}
                      >
                        <X size={16} />
                        Gizle
                      </button>
                    </div>
                    <div className="passage-text">
                      {selectedPassage.passage.split('\n\n').map((paragraph, idx) => (
                        <p key={idx}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question Section */}
                <div className={`question-section ${!showPassageInQuestions ? 'full-width' : ''}`}>
                  {!showPassageInQuestions && (
                    <button
                      className="show-passage-btn"
                      onClick={() => setShowPassageInQuestions(true)}
                    >
                      <Eye size={16} />
                      Metni Göster
                    </button>
                  )}

                  <div className="question-nav">
                    <span className="question-counter">
                      Soru {currentQuestionIndex + 1} / {selectedPassage.questions.length}
                    </span>
                    <span
                      className="question-type-badge"
                      title={READING_QUESTION_TYPE_LABELS[currentQuestion.questionType]}
                    >
                      {READING_QUESTION_TYPE_LABELS[currentQuestion.questionType]}
                    </span>
                  </div>

                  <div className="question-content">
                    <p className="question-text">{currentQuestion.questionText}</p>

                    <div className="options-list">
                      {currentQuestion.options.map(option => {
                        const answer = currentAnswers.get(currentQuestion.id);
                        const isSelected = answer?.selectedAnswer === option.letter;
                        const isCorrect = option.letter === currentQuestion.correctAnswer;
                        const showResult = answer !== undefined;

                        let optionClass = 'reading-option';
                        if (showResult) {
                          if (isCorrect) optionClass += ' correct';
                          else if (isSelected) optionClass += ' incorrect';
                        }
                        if (isSelected) optionClass += ' selected';

                        return (
                          <button
                            key={option.letter}
                            className={optionClass}
                            onClick={() => handleAnswer(currentQuestion.id, option.letter)}
                            disabled={answer !== undefined}
                          >
                            <span className="option-letter">{option.letter}</span>
                            <span className="option-text">{option.text}</span>
                            {showResult && isCorrect && <Check size={18} className="option-icon" />}
                            {showResult && isSelected && !isCorrect && <X size={18} className="option-icon" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {currentAnswers.has(currentQuestion.id) && currentQuestion.explanation && (
                      <div className={`question-explanation ${currentAnswers.get(currentQuestion.id)?.isCorrect ? 'correct' : 'incorrect'}`}>
                        <div className="explanation-header">
                          {currentAnswers.get(currentQuestion.id)?.isCorrect ? (
                            <>
                              <Check size={18} />
                              <span>Doğru!</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle size={18} />
                              <span>Yanlış</span>
                            </>
                          )}
                        </div>
                        <p>{currentQuestion.explanation}</p>
                      </div>
                    )}

                    {/* Vocab Vault Option - show for incorrect answers */}
                    {currentAnswers.has(currentQuestion.id) &&
                      !currentAnswers.get(currentQuestion.id)?.isCorrect &&
                      onAddToVault && (
                        <div className="vocab-section reading-vocab">
                          <button
                            className="vocab-toggle"
                            onClick={() => setShowVocabOptions(
                              showVocabOptions === currentQuestion.id ? null : currentQuestion.id
                            )}
                          >
                            <BookPlus size={18} />
                            <span>Kelime Kasasına Ekle</span>
                            {showVocabOptions === currentQuestion.id ? (
                              <ChevronLeft size={16} style={{ transform: 'rotate(-90deg)' }} />
                            ) : (
                              <ChevronLeft size={16} style={{ transform: 'rotate(-90deg)', opacity: 0.5 }} />
                            )}
                          </button>

                          {showVocabOptions === currentQuestion.id && (
                            <div className="vocab-options">
                              {extractVocabWords(currentQuestion).map(word => {
                                const isInVault = vocabWordsInVault.includes(word.toLowerCase());
                                return (
                                  <button
                                    key={word}
                                    className={`vocab-word-btn ${isInVault ? 'in-vault' : ''}`}
                                    onClick={() => !isInVault && handleAddToVault(
                                      word,
                                      currentQuestion.questionText,
                                      currentQuestion.id
                                    )}
                                    disabled={isInVault}
                                  >
                                    <span>{word}</span>
                                    {isInVault ? (
                                      <Check size={14} />
                                    ) : (
                                      <BookPlus size={14} />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                  </div>

                  {/* Question Navigation */}
                  <div className="question-navigation">
                    <button
                      className="nav-btn"
                      onClick={handlePrevQuestion}
                      disabled={currentQuestionIndex === 0}
                    >
                      <ChevronLeft size={20} />
                      <span>Önceki</span>
                    </button>

                    <div className="question-dots">
                      {selectedPassage.questions.map((q, idx) => {
                        const answer = currentAnswers.get(q.id);
                        let dotClass = 'dot';
                        if (idx === currentQuestionIndex) dotClass += ' current';
                        if (answer?.isCorrect) dotClass += ' correct';
                        else if (answer) dotClass += ' incorrect';

                        return (
                          <button
                            key={q.id}
                            className={dotClass}
                            onClick={() => setCurrentQuestionIndex(idx)}
                            title={`Soru ${idx + 1}`}
                          />
                        );
                      })}
                    </div>

                    {currentQuestionIndex < selectedPassage.questions.length - 1 ? (
                      <button
                        className="nav-btn"
                        onClick={handleNextQuestion}
                      >
                        <span>Sonraki</span>
                        <ChevronRight size={20} />
                      </button>
                    ) : (
                      <button
                        className="nav-btn results"
                        onClick={handleViewResults}
                        disabled={currentProgress.answered < currentProgress.total}
                      >
                        <span>Sonuçlar</span>
                        <Award size={20} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results View */}
          {viewMode === 'results' && selectedPassage && (
            <div className="results-view">
              <div className="results-header">
                <h3>{selectedPassage.title}</h3>
                <p className="results-subtitle">Sonuçlarınız</p>
              </div>

              {/* Score Display */}
              <div className="score-display">
                <div
                  className="score-circle"
                  style={{
                    background: `conic-gradient(${getScoreColor(Math.round((currentProgress.correct / currentProgress.total) * 100))} ${(currentProgress.correct / currentProgress.total) * 360}deg, var(--bg-tertiary) 0deg)`
                  }}
                >
                  <div className="score-inner">
                    <span className="score-value" style={{ color: getScoreColor(Math.round((currentProgress.correct / currentProgress.total) * 100)) }}>
                      {Math.round((currentProgress.correct / currentProgress.total) * 100)}%
                    </span>
                    <span className="score-label">Başarı</span>
                  </div>
                </div>
                <div className="score-details">
                  <div className="detail-item correct">
                    <Check size={20} />
                    <span>{currentProgress.correct} Doğru</span>
                  </div>
                  <div className="detail-item incorrect">
                    <X size={20} />
                    <span>{currentProgress.total - currentProgress.correct} Yanlış</span>
                  </div>
                  <div className="detail-item total">
                    <Target size={20} />
                    <span>{currentProgress.total} Toplam</span>
                  </div>
                </div>
              </div>

              {/* Question Review */}
              <div className="question-review">
                <h4>Soru Detayları</h4>
                {selectedPassage.questions.map((question, idx) => {
                  const answer = currentAnswers.get(question.id);
                  return (
                    <div
                      key={question.id}
                      className={`review-item ${answer?.isCorrect ? 'correct' : 'incorrect'}`}
                    >
                      <div className="review-header">
                        <span className="review-number">#{idx + 1}</span>
                        <span className="review-type">
                          {READING_QUESTION_TYPE_LABELS[question.questionType]}
                        </span>
                        {answer?.isCorrect ? (
                          <Check size={18} className="review-icon correct" />
                        ) : (
                          <X size={18} className="review-icon incorrect" />
                        )}
                      </div>
                      <p className="review-question">{question.questionText}</p>
                      {!answer?.isCorrect && (
                        <div className="review-answer">
                          <span className="wrong-answer">
                            Cevabınız: {answer?.selectedAnswer}
                          </span>
                          <span className="correct-answer">
                            Doğru: {question.correctAnswer}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="results-actions">
                <button className="action-btn secondary" onClick={handleReset}>
                  <RefreshCw size={18} />
                  <span>Tekrar Dene</span>
                </button>
                <button className="action-btn primary" onClick={handleBackToList}>
                  <List size={18} />
                  <span>Pasaj Listesi</span>
                </button>
              </div>
            </div>
          )}

          {/* Stats View */}
          {viewMode === 'stats' && (
            <div className="stats-view">
              <div className="stats-grid">
                <div className="stat-card">
                  <Award size={32} />
                  <div className="stat-info">
                    <span className="stat-value">{stats.totalPassagesCompleted}</span>
                    <span className="stat-label">Tamamlanan Pasaj</span>
                  </div>
                </div>
                <div className="stat-card">
                  <Target size={32} />
                  <div className="stat-info">
                    <span className="stat-value">{stats.totalQuestionsAnswered}</span>
                    <span className="stat-label">Cevaplanan Soru</span>
                  </div>
                </div>
                <div className="stat-card">
                  <Check size={32} />
                  <div className="stat-info">
                    <span className="stat-value">{stats.totalCorrect}</span>
                    <span className="stat-label">Doğru Cevap</span>
                  </div>
                </div>
                <div className="stat-card">
                  <BarChart3 size={32} />
                  <div className="stat-info">
                    <span className="stat-value" style={{ color: getScoreColor(stats.averageScore) }}>
                      %{stats.averageScore}
                    </span>
                    <span className="stat-label">Ortalama Başarı</span>
                  </div>
                </div>
              </div>

              {/* Question Type Performance */}
              {Object.keys(stats.questionTypePerformance).length > 0 && (
                <div className="type-performance">
                  <h4>Soru Tipi Performansı</h4>
                  <div className="type-list">
                    {Object.entries(stats.questionTypePerformance).map(([type, perf]) => {
                      const percentage = perf.total > 0 ? Math.round((perf.correct / perf.total) * 100) : 0;
                      return (
                        <div key={type} className="type-item">
                          <div className="type-info">
                            <span className="type-name">
                              {READING_QUESTION_TYPE_LABELS[type as keyof typeof READING_QUESTION_TYPE_LABELS]}
                            </span>
                            <span className="type-count">{perf.correct}/{perf.total}</span>
                          </div>
                          <div className="type-bar">
                            <div
                              className="type-fill"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: getScoreColor(percentage)
                              }}
                            />
                          </div>
                          <span className="type-percentage" style={{ color: getScoreColor(percentage) }}>
                            %{percentage}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {stats.totalPassagesCompleted === 0 && (
                <div className="empty-stats">
                  <BookOpen size={48} />
                  <p>Henüz pasaj tamamlamadınız.</p>
                  <button onClick={() => setViewMode('list')}>
                    Pasajlara Göz At
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

