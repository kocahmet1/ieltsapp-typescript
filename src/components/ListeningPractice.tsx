import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X,
  Headphones,
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  BarChart3,
  Clock,
  Target,
  RefreshCw,
  List,
  Volume2,
  CheckCircle,
  FileText,
  BookPlus,
  Award
} from 'lucide-react';
import {
  ListeningTest,
  ListeningAnswer,
  ListeningProgress,
  ListeningStats,
  IELTSListeningSection,
  IELTS_LISTENING_SECTION_LABELS,
  LISTENING_QUESTION_TYPE_LABELS,
  ListeningQuestionType
} from '../types';

interface ListeningPracticeProps {
  isOpen: boolean;
  onClose: () => void;
  tests: ListeningTest[];
  completedTestIds: string[];
  stats: ListeningStats;
  onAnswerQuestion: (testId: string, questionId: number, answer: string, isCorrect: boolean, questionType: ListeningQuestionType) => Promise<void>;
  onCompleteTest: (testId: string, score: number, section: IELTSListeningSection, difficulty: string, questionTypeResults: Record<ListeningQuestionType, { correct: number; total: number }>) => Promise<void>;
  getProgress: (testId: string) => Promise<ListeningProgress | null>;
  onResetProgress: (testId: string) => Promise<void>;
  onAddToVault?: (word: string, questionContext: string, sourceId: string, questionId: number) => void;
  vocabWordsInVault?: string[];
}

type ViewMode = 'list' | 'test' | 'results' | 'stats';
type AudioState = 'idle' | 'playing' | 'paused' | 'ended';

export const ListeningPractice = ({
  isOpen,
  onClose,
  tests,
  completedTestIds,
  stats,
  onAnswerQuestion,
  onCompleteTest,
  getProgress,
  onResetProgress,
  onAddToVault,
  vocabWordsInVault = []
}: ListeningPracticeProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTest, setSelectedTest] = useState<ListeningTest | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<Map<number, ListeningAnswer>>(new Map());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [filterSection, setFilterSection] = useState<IELTSListeningSection | 'all'>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

  // Audio state
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioPlayCount, setAudioPlayCount] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // Completion state for fill-in questions
  const [textInputs, setTextInputs] = useState<Map<number, string>>(new Map());

  // Vocab vault state
  const [showVocabOptions, setShowVocabOptions] = useState<number | null>(null);

  // Refs
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setViewMode('list');
      setSelectedTest(null);
      setCurrentAnswers(new Map());
      setCurrentQuestionIndex(0);
      setAudioState('idle');
      setAudioProgress(0);
      setAudioPlayCount(0);
      setShowTranscript(false);
      setTextInputs(new Map());
      stopAudio();
    }
  }, [isOpen]);

  // Load existing progress when selecting a test
  useEffect(() => {
    let isMounted = true;
    if (selectedTest) {
      const load = async () => {
        try {
          const progress = await getProgress(selectedTest.id);
          if (!isMounted) return;
          if (progress && progress.answers) {
            if (progress.answers instanceof Map) {
              setCurrentAnswers(new Map(progress.answers));
            } else {
              const answersMap = new Map<number, ListeningAnswer>();
              Object.entries(progress.answers).forEach(([key, value]) => {
                answersMap.set(parseInt(key), value as ListeningAnswer);
              });
              setCurrentAnswers(answersMap);
            }
            setAudioPlayCount(progress.audioPlayCount || 0);
          } else {
            setCurrentAnswers(new Map());
            setAudioPlayCount(0);
          }
          setTextInputs(new Map());
        } catch (error) {
          console.error("Failed to fetch listening progress", error);
          if (isMounted) {
            setCurrentAnswers(new Map());
            setAudioPlayCount(0);
            setTextInputs(new Map());
          }
        }
      };
      load();
    }
    return () => { isMounted = false; };
  }, [selectedTest, getProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  // Filter tests
  const filteredTests = useMemo(() => {
    return tests.filter(t => {
      if (filterSection !== 'all' && t.section !== filterSection) return false;
      if (filterDifficulty !== 'all' && t.difficulty !== filterDifficulty) return false;
      return true;
    });
  }, [tests, filterSection, filterDifficulty]);

  // Calculate current test progress
  const currentProgress = useMemo(() => {
    if (!selectedTest) return { answered: 0, correct: 0, total: 0 };
    const total = selectedTest.questions.length;
    const answered = currentAnswers.size;
    const correct = Array.from(currentAnswers.values()).filter(a => a.isCorrect).length;
    return { answered, correct, total };
  }, [selectedTest, currentAnswers]);

  // Text-to-Speech functions
  const playAudio = useCallback(() => {
    if (!selectedTest) return;

    // Cancel any existing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(selectedTest.audioText);
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to use a British English voice for IELTS authenticity
    const voices = window.speechSynthesis.getVoices();
    const britishVoice = voices.find(v => v.lang === 'en-GB') ||
      voices.find(v => v.lang.startsWith('en-'));
    if (britishVoice) {
      utterance.voice = britishVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setAudioState('playing');
      startTimeRef.current = Date.now();
      setAudioPlayCount(prev => prev + 1);

      // Update progress
      setAudioDuration(selectedTest.duration);
      audioIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setAudioProgress(Math.min(elapsed, selectedTest.duration));
      }, 100);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setAudioState('ended');
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
      }
      setAudioProgress(selectedTest.duration);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setAudioState('idle');
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
      }
    };

    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [selectedTest]);

  const pauseAudio = useCallback(() => {
    window.speechSynthesis.pause();
    setAudioState('paused');
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
    }
  }, []);

  const resumeAudio = useCallback(() => {
    window.speechSynthesis.resume();
    setAudioState('playing');
    startTimeRef.current = Date.now() - audioProgress * 1000;
    audioIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setAudioProgress(Math.min(elapsed, audioDuration));
    }, 100);
  }, [audioProgress, audioDuration]);

  const stopAudio = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setAudioState('idle');
    setAudioProgress(0);
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
    }
  }, []);

  const restartAudio = useCallback(() => {
    stopAudio();
    setTimeout(() => {
      playAudio();
    }, 100);
  }, [stopAudio, playAudio]);

  // Handle starting a test
  const handleStartTest = (test: ListeningTest) => {
    setSelectedTest(test);
    setCurrentQuestionIndex(0);
    setViewMode('test');
    setShowTranscript(false);
  };

  // Check if answer is correct (handles completion type questions)
  const checkAnswer = (question: ListeningTest['questions'][0], answer: string): boolean => {
    if (question.questionType === 'completion' || question.questionType === 'short_answer') {
      const normalizedAnswer = answer.trim().toLowerCase();
      const normalizedCorrect = question.correctAnswer.toLowerCase();

      if (normalizedAnswer === normalizedCorrect) return true;

      // Check acceptable answers
      if (question.acceptableAnswers) {
        return question.acceptableAnswers.some(
          acceptable => acceptable.toLowerCase() === normalizedAnswer
        );
      }
      return false;
    }

    return answer === question.correctAnswer;
  };

  // Handle answering a question
  const handleAnswer = async (questionId: number, selectedAnswer: string) => {
    if (!selectedTest) return;
    if (currentAnswers.has(questionId)) return; // Already answered

    const question = selectedTest.questions.find(q => q.id === questionId);
    if (!question) return;

    const isCorrect = checkAnswer(question, selectedAnswer);
    const answer: ListeningAnswer = {
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
      selectedTest.id,
      questionId,
      selectedAnswer,
      isCorrect,
      question.questionType
    );

    // Check if all questions are answered
    if (newAnswers.size === selectedTest.questions.length) {
      const correct = Array.from(newAnswers.values()).filter(a => a.isCorrect).length;
      const score = Math.round((correct / selectedTest.questions.length) * 100);

      // Calculate question type results
      const questionTypeResults: Record<ListeningQuestionType, { correct: number; total: number }> = {} as Record<ListeningQuestionType, { correct: number; total: number }>;
      selectedTest.questions.forEach(q => {
        const ans = newAnswers.get(q.id);
        if (!questionTypeResults[q.questionType]) {
          questionTypeResults[q.questionType] = { correct: 0, total: 0 };
        }
        questionTypeResults[q.questionType].total += 1;
        if (ans?.isCorrect) {
          questionTypeResults[q.questionType].correct += 1;
        }
      });

      await onCompleteTest(selectedTest.id, score, selectedTest.section, selectedTest.difficulty, questionTypeResults);
    }
  };

  // Handle text input submission
  const handleTextSubmit = (questionId: number) => {
    const answer = textInputs.get(questionId)?.trim();
    if (answer) {
      handleAnswer(questionId, answer);
    }
  };

  // Handle navigation
  const handleNextQuestion = () => {
    if (selectedTest && currentQuestionIndex < selectedTest.questions.length - 1) {
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
    stopAudio();
  };

  // Handle back to list
  const handleBackToList = () => {
    setViewMode('list');
    setSelectedTest(null);
    setCurrentAnswers(new Map());
    setCurrentQuestionIndex(0);
    stopAudio();
    setShowTranscript(false);
    setTextInputs(new Map());
  };

  // Handle reset test
  const handleReset = async () => {
    if (selectedTest) {
      await onResetProgress(selectedTest.id);
      setCurrentAnswers(new Map());
      setCurrentQuestionIndex(0);
      setAudioPlayCount(0);
      stopAudio();
      setTextInputs(new Map());
    }
  };

  // Get section color
  const getSectionColor = (section: IELTSListeningSection) => {
    switch (section) {
      case 'section1': return 'var(--accent-green)';
      case 'section2': return 'var(--accent-primary)';
      case 'section3': return 'var(--accent-orange)';
      case 'section4': return 'var(--accent-purple)';
      default: return 'var(--text-secondary)';
    }
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'var(--accent-green)';
      case 'medium': return 'var(--accent-yellow)';
      case 'hard': return 'var(--accent-red)';
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

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Extract vocabulary words from question text and options
  const extractVocabWords = (question: ListeningTest['questions'][0]): string[] => {
    const words: string[] = [];

    // Extract from question text
    const questionWords = question.questionText.split(/[\s,;.!?()]+/)
      .filter(w => w.length > 4 && /^[a-zA-Z]+$/.test(w))
      .map(w => w.toLowerCase());
    words.push(...questionWords);

    // Extract words from options if they exist
    if (question.options) {
      question.options.forEach(opt => {
        const optionWords = opt.text.split(/[\s,;.!?()]+/)
          .filter(w => w.length > 4 && /^[a-zA-Z]+$/.test(w))
          .map(w => w.toLowerCase());
        words.push(...optionWords);
      });
    }

    // Also include the correct answer if it's a text answer
    if (question.questionType === 'completion' || question.questionType === 'short_answer') {
      const answerWords = question.correctAnswer.split(/[\s,;.!?()]+/)
        .filter(w => w.length > 3 && /^[a-zA-Z]+$/.test(w))
        .map(w => w.toLowerCase());
      words.push(...answerWords);
    }

    // Get unique words
    return [...new Set(words)].slice(0, 8);
  };

  // Handle adding word to vault
  const handleAddToVault = (word: string, context: string, questionId: number) => {
    if (selectedTest && onAddToVault) {
      onAddToVault(word, context, `listening-${selectedTest.id}`, questionId);
    }
  };

  if (!isOpen) return null;

  const currentQuestion = selectedTest?.questions[currentQuestionIndex];

  return (
    <div className="listening-overlay" onClick={onClose}>
      <div className="listening-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="listening-header">
          <div className="listening-title">
            <Headphones size={24} />
            <h2>Dinleme PratiÄŸi</h2>
          </div>
          <div className="listening-header-actions">
            <button
              className={`mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={handleBackToList}
            >
              <List size={18} />
              <span>Testler</span>
            </button>
            <button
              className={`mode-btn ${viewMode === 'stats' ? 'active' : ''}`}
              onClick={() => setViewMode('stats')}
            >
              <BarChart3 size={18} />
              <span>Ä°statistikler</span>
            </button>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="listening-content">
          {/* List View */}
          {viewMode === 'list' && (
            <div className="test-list-view">
              {/* Section Filter */}
              <div className="filter-bar">
                <div className="filter-group">
                  <span className="filter-label">BÃ¶lÃ¼m:</span>
                  <div className="filter-buttons">
                    <button
                      className={`filter-btn ${filterSection === 'all' ? 'active' : ''}`}
                      onClick={() => setFilterSection('all')}
                    >
                      TÃ¼mÃ¼
                    </button>
                    {(['section1', 'section2', 'section3', 'section4'] as IELTSListeningSection[]).map(sec => (
                      <button
                        key={sec}
                        className={`filter-btn ${filterSection === sec ? 'active' : ''}`}
                        onClick={() => setFilterSection(sec)}
                        style={{ '--filter-color': getSectionColor(sec) } as React.CSSProperties}
                      >
                        {sec.replace('section', 'S')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="filter-group">
                  <span className="filter-label">Zorluk:</span>
                  <div className="filter-buttons">
                    <button
                      className={`filter-btn ${filterDifficulty === 'all' ? 'active' : ''}`}
                      onClick={() => setFilterDifficulty('all')}
                    >
                      TÃ¼mÃ¼
                    </button>
                    {['easy', 'medium', 'hard'].map(diff => (
                      <button
                        key={diff}
                        className={`filter-btn ${filterDifficulty === diff ? 'active' : ''}`}
                        onClick={() => setFilterDifficulty(diff)}
                        style={{ '--filter-color': getDifficultyColor(diff) } as React.CSSProperties}
                      >
                        {diff === 'easy' ? 'Kolay' : diff === 'medium' ? 'Orta' : 'Zor'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Test Cards */}
              <div className="test-grid">
                {filteredTests.map(test => {
                  const isCompleted = completedTestIds.includes(test.id);

                  return (
                    <div
                      key={test.id}
                      className={`test-card ${isCompleted ? 'completed' : ''}`}
                    >
                      <div className="test-card-header">
                        <span
                          className="section-tag"
                          style={{ backgroundColor: getSectionColor(test.section) }}
                        >
                          {IELTS_LISTENING_SECTION_LABELS[test.section].split(' - ')[0]}
                        </span>
                        <span
                          className="difficulty-tag"
                          style={{ backgroundColor: getDifficultyColor(test.difficulty) }}
                        >
                          {test.difficulty === 'easy' ? 'Kolay' : test.difficulty === 'medium' ? 'Orta' : 'Zor'}
                        </span>
                        {isCompleted && (
                          <span className="completed-badge">
                            <CheckCircle size={16} />
                          </span>
                        )}
                      </div>
                      <h3 className="test-card-title">{test.title}</h3>
                      <p className="test-card-topic">{test.topic}</p>
                      <div className="test-card-meta">
                        <span>
                          <Clock size={14} />
                          ~{Math.ceil(test.duration / 60)} dk
                        </span>
                        <span>
                          <Target size={14} />
                          {test.questions.length} soru
                        </span>
                      </div>
                      <button
                        className="start-btn"
                        onClick={() => handleStartTest(test)}
                      >
                        <Headphones size={18} />
                        <span>{isCompleted ? 'SonuÃ§lar / Devam' : 'BaÅŸla'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {filteredTests.length === 0 && (
                <div className="empty-state-listening">
                  <Headphones size={48} />
                  <p>Bu filtrelere uygun test bulunamadÄ±.</p>
                </div>
              )}
            </div>
          )}

          {/* Test View */}
          {viewMode === 'test' && selectedTest && currentQuestion && (
            <div className="test-view">
              {/* Test Header */}
              <div className="test-header-info">
                <div className="test-info">
                  <h3>{selectedTest.title}</h3>
                  <div className="test-badges">
                    <span style={{ backgroundColor: getSectionColor(selectedTest.section) }}>
                      {IELTS_LISTENING_SECTION_LABELS[selectedTest.section].split(' - ')[0]}
                    </span>
                    <span style={{ backgroundColor: getDifficultyColor(selectedTest.difficulty) }}>
                      {selectedTest.difficulty === 'easy' ? 'Kolay' : selectedTest.difficulty === 'medium' ? 'Orta' : 'Zor'}
                    </span>
                  </div>
                </div>
                <div className="audio-play-count">
                  <Volume2 size={16} />
                  <span>Dinleme: {audioPlayCount}</span>
                </div>
              </div>

              {/* Audio Player */}
              <div className="audio-player">
                <div className="audio-controls">
                  {audioState === 'idle' || audioState === 'ended' ? (
                    <button className="audio-btn play" onClick={playAudio}>
                      <Play size={24} />
                    </button>
                  ) : audioState === 'playing' ? (
                    <button className="audio-btn pause" onClick={pauseAudio}>
                      <Pause size={24} />
                    </button>
                  ) : (
                    <button className="audio-btn play" onClick={resumeAudio}>
                      <Play size={24} />
                    </button>
                  )}
                  <button className="audio-btn restart" onClick={restartAudio}>
                    <RotateCcw size={20} />
                  </button>
                </div>

                <div className="audio-progress-container">
                  <div className="audio-progress-bar">
                    <div
                      className="audio-progress-fill"
                      style={{ width: `${audioDuration ? (audioProgress / audioDuration) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="audio-time">
                    <span>{formatTime(audioProgress)}</span>
                    <span>/</span>
                    <span>{formatTime(selectedTest.duration)}</span>
                  </div>
                </div>

                <button
                  className={`transcript-toggle ${showTranscript ? 'active' : ''}`}
                  onClick={() => setShowTranscript(!showTranscript)}
                >
                  <FileText size={18} />
                  <span>Transkript</span>
                </button>
              </div>

              {/* Speaking indicator */}
              {isSpeaking && (
                <div className="speaking-indicator">
                  <div className="sound-wave">
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span>Dinliyorsunuz...</span>
                </div>
              )}

              {/* Transcript (collapsible) */}
              {showTranscript && (
                <div className="transcript-panel">
                  <div className="transcript-content">
                    {selectedTest.transcript.split('\n\n').map((para, idx) => (
                      <p key={idx}>{para}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              <div className="listening-progress-bar">
                <div className="progress-info">
                  <span>{currentProgress.answered} / {currentProgress.total} soru cevaplandÄ±</span>
                  <span className="correct-count">
                    <Check size={14} />
                    {currentProgress.correct} doÄŸru
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${(currentProgress.answered / currentProgress.total) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question */}
              <div className="question-section-listening">
                <div className="question-nav-listening">
                  <span className="question-counter">
                    Soru {currentQuestionIndex + 1} / {selectedTest.questions.length}
                  </span>
                  <span className="question-type-badge">
                    {LISTENING_QUESTION_TYPE_LABELS[currentQuestion.questionType]}
                  </span>
                </div>

                <div className="question-content-listening">
                  <p className="question-text">{currentQuestion.questionText}</p>

                  {/* Multiple Choice Options */}
                  {currentQuestion.questionType === 'multiple_choice' && currentQuestion.options && (
                    <div className="options-list">
                      {currentQuestion.options.map(option => {
                        const answer = currentAnswers.get(currentQuestion.id);
                        const isSelected = answer?.selectedAnswer === option.letter;
                        const isCorrect = option.letter === currentQuestion.correctAnswer;
                        const showResult = answer !== undefined;

                        let optionClass = 'listening-option';
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
                  )}

                  {/* Completion/Short Answer Input */}
                  {(currentQuestion.questionType === 'completion' || currentQuestion.questionType === 'short_answer') && (
                    <div className="completion-input">
                      {!currentAnswers.has(currentQuestion.id) ? (
                        <div className="input-group">
                          <input
                            type="text"
                            placeholder="CevabÄ±nÄ±zÄ± yazÄ±n..."
                            value={textInputs.get(currentQuestion.id) || ''}
                            onChange={(e) => {
                              const newInputs = new Map(textInputs);
                              newInputs.set(currentQuestion.id, e.target.value);
                              setTextInputs(newInputs);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleTextSubmit(currentQuestion.id);
                              }
                            }}
                          />
                          <button
                            className="submit-btn"
                            onClick={() => handleTextSubmit(currentQuestion.id)}
                            disabled={!textInputs.get(currentQuestion.id)?.trim()}
                          >
                            <Check size={18} />
                            GÃ¶nder
                          </button>
                        </div>
                      ) : (
                        <div className={`answer-result ${currentAnswers.get(currentQuestion.id)?.isCorrect ? 'correct' : 'incorrect'}`}>
                          <div className="your-answer">
                            <span>CevabÄ±nÄ±z:</span>
                            <strong>{currentAnswers.get(currentQuestion.id)?.selectedAnswer}</strong>
                          </div>
                          {!currentAnswers.get(currentQuestion.id)?.isCorrect && (
                            <div className="correct-answer">
                              <span>DoÄŸru cevap:</span>
                              <strong>{currentQuestion.correctAnswer}</strong>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Explanation */}
                  {currentAnswers.has(currentQuestion.id) && currentQuestion.explanation && (
                    <div className={`question-explanation ${currentAnswers.get(currentQuestion.id)?.isCorrect ? 'correct' : 'incorrect'}`}>
                      <div className="explanation-header">
                        {currentAnswers.get(currentQuestion.id)?.isCorrect ? (
                          <>
                            <Check size={18} />
                            <span>DoÄŸru!</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={18} />
                            <span>YanlÄ±ÅŸ</span>
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
                      <div className="vocab-section listening-vocab">
                        <button
                          className="vocab-toggle"
                          onClick={() => setShowVocabOptions(
                            showVocabOptions === currentQuestion.id ? null : currentQuestion.id
                          )}
                        >
                          <BookPlus size={18} />
                          <span>Kelime KasasÄ±na Ekle</span>
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
                    <span>Ã–nceki</span>
                  </button>

                  <div className="question-dots">
                    {selectedTest.questions.map((q, idx) => {
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

                  {currentQuestionIndex < selectedTest.questions.length - 1 ? (
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
                      <span>SonuÃ§lar</span>
                      <Award size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Results View */}
          {viewMode === 'results' && selectedTest && (
            <div className="results-view">
              <div className="results-header">
                <h3>{selectedTest.title}</h3>
                <p className="results-subtitle">SonuÃ§larÄ±nÄ±z</p>
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
                    <span className="score-label">BaÅŸarÄ±</span>
                  </div>
                </div>
                <div className="score-details">
                  <div className="detail-item correct">
                    <Check size={20} />
                    <span>{currentProgress.correct} DoÄŸru</span>
                  </div>
                  <div className="detail-item incorrect">
                    <X size={20} />
                    <span>{currentProgress.total - currentProgress.correct} YanlÄ±ÅŸ</span>
                  </div>
                  <div className="detail-item total">
                    <Target size={20} />
                    <span>{currentProgress.total} Toplam</span>
                  </div>
                  <div className="detail-item plays">
                    <Volume2 size={20} />
                    <span>{audioPlayCount} Dinleme</span>
                  </div>
                </div>
              </div>

              {/* Question Review */}
              <div className="question-review">
                <h4>Soru DetaylarÄ±</h4>
                {selectedTest.questions.map((question, idx) => {
                  const answer = currentAnswers.get(question.id);
                  return (
                    <div
                      key={question.id}
                      className={`review-item ${answer?.isCorrect ? 'correct' : 'incorrect'}`}
                    >
                      <div className="review-header">
                        <span className="review-number">#{idx + 1}</span>
                        <span className="review-type">
                          {LISTENING_QUESTION_TYPE_LABELS[question.questionType]}
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
                            CevabÄ±nÄ±z: {answer?.selectedAnswer}
                          </span>
                          <span className="correct-answer">
                            DoÄŸru: {question.correctAnswer}
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
                  <span>Test Listesi</span>
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
                    <span className="stat-value">{stats.totalTestsCompleted}</span>
                    <span className="stat-label">Tamamlanan Test</span>
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
                    <span className="stat-label">DoÄŸru Cevap</span>
                  </div>
                </div>
                <div className="stat-card">
                  <BarChart3 size={32} />
                  <div className="stat-info">
                    <span className="stat-value" style={{ color: getScoreColor(stats.averageScore) }}>
                      %{stats.averageScore}
                    </span>
                    <span className="stat-label">Ortalama BaÅŸarÄ±</span>
                  </div>
                </div>
              </div>

              {/* Section Performance */}
              {Object.values(stats.testsBySection).some(v => v > 0) && (
                <div className="section-performance">
                  <h4>BÃ¶lÃ¼m PerformansÄ±</h4>
                  <div className="section-bars">
                    {(['section1', 'section2', 'section3', 'section4'] as IELTSListeningSection[]).map(section => {
                      const count = stats.testsBySection[section] || 0;
                      const total = Object.values(stats.testsBySection).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

                      return (
                        <div key={section} className="section-bar-item">
                          <div className="section-bar-info">
                            <span style={{ color: getSectionColor(section) }}>
                              {IELTS_LISTENING_SECTION_LABELS[section].split(' - ')[0]}
                            </span>
                            <span>{count} test</span>
                          </div>
                          <div className="section-bar">
                            <div
                              className="section-bar-fill"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: getSectionColor(section)
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Question Type Performance */}
              {Object.keys(stats.questionTypePerformance).length > 0 && (
                <div className="type-performance">
                  <h4>Soru Tipi PerformansÄ±</h4>
                  <div className="type-list">
                    {Object.entries(stats.questionTypePerformance).map(([type, perf]) => {
                      const percentage = perf.total > 0 ? Math.round((perf.correct / perf.total) * 100) : 0;
                      return (
                        <div key={type} className="type-item">
                          <div className="type-info">
                            <span className="type-name">
                              {LISTENING_QUESTION_TYPE_LABELS[type as ListeningQuestionType]}
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

              {stats.totalTestsCompleted === 0 && (
                <div className="empty-stats">
                  <Headphones size={48} />
                  <p>HenÃ¼z test tamamlamadÄ±nÄ±z.</p>
                  <button onClick={() => setViewMode('list')}>
                    Testlere GÃ¶z At
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



