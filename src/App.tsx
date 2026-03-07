import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Moon, Sun, AlertCircle, Settings, BarChart3, PenLine, FileText, Mic, Headphones } from 'lucide-react';
import { ExamSelector } from './components/ExamSelector';
import { ExamView } from './components/ExamView';
import { ImportExamModal } from './components/ImportExamModal';
import { VocabVault } from './components/VocabVault';
import { AdminPage } from './components/AdminPage';
import { PerformanceTracker } from './components/PerformanceTracker';
import { WritingPractice } from './components/WritingPractice';
import { ReadingComprehension } from './components/ReadingComprehension';
import { SpeakingPractice } from './components/SpeakingPractice';
import { ListeningPractice } from './components/ListeningPractice';
import { GrammarLessons } from './components/GrammarLessons';
import { Exam, UserAnswer, VocabWord, PerformanceStats, MistakeRecord, GrammarCategory, WritingSubmission, WritingPrompt, WritingFeedback, ReadingProgress, ReadingStats, ReadingQuestionType, ListeningProgress, ListeningStats, ListeningQuestionType, IELTSListeningSection } from './types';
import { getAllExams, getExamById, createExam, parseExamText, deleteExam } from './services/examService';
import { getAllVocabWords, addVocabWord, removeVocabWord } from './services/vocabService';
import { getExplanation, getFullWritingFeedback } from './services/openaiService';
import { sampleReadingPassages } from './data/readingPassages';
import { listeningTests } from './data/listeningQuestions';
import {
  isFirebaseConfigured,
  getLocalExams,
  getLocalExamById,
  createLocalExam,
  deleteLocalExam,
  getLocalVocabWords,
  addLocalVocabWord,
  removeLocalVocabWord,
  addMistakeRecord,
  updateAnswerStats,
  getPerformanceStats,
  getRecentMistakes,
  getMistakesByCategory,
  clearTrackingData,
  getWritingSubmissions,
  saveWritingSubmission,
  updateWritingSubmission,
  deleteWritingSubmission,
  getWritingPrompts,
  getReadingProgress,
  saveReadingProgress,
  deleteReadingProgress,
  getReadingStats,
  updateReadingStats,
  getCompletedPassageIds,
  getListeningProgress,
  saveListeningProgress,
  deleteListeningProgress,
  getListeningStats,
  updateListeningStats,
  getCompletedListeningTestIds
} from './services/localStorageService';
import { sampleExamQuestions, sampleExamName, sampleExamDescription } from './data/sampleExam';
import './App.css';

function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : true;
  });

  // Firebase check
  const [useFirebase] = useState(isFirebaseConfigured());
  const [openAIConfigured] = useState(() => {
    const key = import.meta.env.VITE_OPENAI_API_KEY;
    return Boolean(key && key !== 'your-openai-api-key-here' && key.startsWith('sk-'));
  });

  // Exam states
  const [exams, setExams] = useState<{ id: string; name: string; description?: string; questionCount: number }[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [userAnswers, setUserAnswers] = useState<Map<number, UserAnswer>>(new Map());
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [isLoadingCurrentExam, setIsLoadingCurrentExam] = useState(false);

  // Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [showVocabVault, setShowVocabVault] = useState(false);
  const [showAdminPage, setShowAdminPage] = useState(false);
  const [showPerformanceTracker, setShowPerformanceTracker] = useState(false);
  const [showWritingPractice, setShowWritingPractice] = useState(false);
  const [showReadingComprehension, setShowReadingComprehension] = useState(false);
  const [showSpeakingPractice, setShowSpeakingPractice] = useState(false);
  const [showListeningPractice, setShowListeningPractice] = useState(false);
  const [showGrammarLessons, setShowGrammarLessons] = useState(false);

  // Vocab vault state
  const [vocabWords, setVocabWords] = useState<VocabWord[]>([]);

  // Writing practice state
  const [writingSubmissions, setWritingSubmissions] = useState<WritingSubmission[]>([]);
  const [writingPrompts] = useState<WritingPrompt[]>(getWritingPrompts());

  // Reading comprehension state
  const [completedPassageIds, setCompletedPassageIds] = useState<string[]>([]);
  const [readingStats, setReadingStats] = useState<ReadingStats>(getReadingStats());

  // Listening practice state
  const [completedListeningTestIds, setCompletedListeningTestIds] = useState<string[]>([]);
  const [listeningStats, setListeningStats] = useState<ListeningStats>(getListeningStats());

  // Performance tracking state
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats>({
    totalAnswered: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    categoryBreakdown: [],
    weakestAreas: [],
    strongestAreas: []
  });
  const [recentMistakes, setRecentMistakes] = useState<MistakeRecord[]>([]);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Load exams on mount
  useEffect(() => {
    loadExams();
    loadVocabWords();
    loadPerformanceData();
    loadWritingSubmissions();
    loadReadingData();
    loadListeningData();
  }, []);

  const loadPerformanceData = () => {
    const stats = getPerformanceStats();
    const recent = getRecentMistakes(7);
    setPerformanceStats(stats);
    setRecentMistakes(recent);
  };

  // Load selected exam
  useEffect(() => {
    if (selectedExamId) {
      loadExam(selectedExamId);
    }
  }, [selectedExamId]);

  const loadExams = async () => {
    setIsLoadingExams(true);
    try {
      if (useFirebase) {
        // Add timeout for Firebase - fallback to local if it takes too long
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firebase timeout')), 5000)
        );

        try {
          const examList = await Promise.race([getAllExams(), timeoutPromise]);
          setExams(examList);
        } catch (firebaseError) {
          console.warn('Firebase failed or timed out, using local storage:', firebaseError);
          const examList = getLocalExams();
          setExams(examList);
        }
      } else {
        const examList = getLocalExams();
        setExams(examList);
      }
    } catch (error) {
      console.error('Failed to load exams:', error);
      // Fallback to local storage
      const examList = getLocalExams();
      setExams(examList);
    } finally {
      setIsLoadingExams(false);
    }
  };

  const loadExam = async (examId: string) => {
    setIsLoadingCurrentExam(true);
    setUserAnswers(new Map());
    try {
      let exam: Exam | null = null;
      if (useFirebase) {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firebase timeout')), 5000)
        );
        try {
          exam = await Promise.race([getExamById(examId), timeoutPromise]);
        } catch {
          exam = getLocalExamById(examId);
        }
      } else {
        exam = getLocalExamById(examId);
      }
      setCurrentExam(exam);
    } catch (error) {
      console.error('Failed to load exam:', error);
      const exam = getLocalExamById(examId);
      setCurrentExam(exam);
    } finally {
      setIsLoadingCurrentExam(false);
    }
  };

  const loadVocabWords = async () => {
    try {
      if (useFirebase) {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firebase timeout')), 5000)
        );
        try {
          const words = await Promise.race([getAllVocabWords(), timeoutPromise]);
          setVocabWords(words);
        } catch {
          const words = getLocalVocabWords();
          setVocabWords(words);
        }
      } else {
        const words = getLocalVocabWords();
        setVocabWords(words);
      }
    } catch (error) {
      console.error('Failed to load vocab words:', error);
      const words = getLocalVocabWords();
      setVocabWords(words);
    }
  };

  const handleAnswer = useCallback(async (questionId: number, selectedAnswer: string) => {
    if (!currentExam) return;

    const question = currentExam.questions.find(q => q.id === questionId);
    if (!question) return;

    const isCorrect = selectedAnswer === question.correctAnswer;

    // Update answer statistics
    updateAnswerStats(isCorrect);

    // Set initial answer state
    setUserAnswers(prev => {
      const newAnswers = new Map(prev);
      newAnswers.set(questionId, {
        questionId,
        selectedAnswer,
        isCorrect,
        isLoading: !isCorrect && openAIConfigured,
        explanation: !isCorrect && !openAIConfigured ?
          'OpenAI API yapılandırılmamış. Açıklama almak için .env dosyasında VITE_OPENAI_API_KEY değerini ayarlayın.' :
          undefined
      });
      return newAnswers;
    });

    // If incorrect and OpenAI is configured, get explanation and track mistake
    if (!isCorrect && openAIConfigured) {
      try {
        const response = await getExplanation(question, selectedAnswer, question.correctAnswer);

        // Track the mistake with the grammar category
        addMistakeRecord(
          currentExam.id,
          questionId,
          question.questionText,
          selectedAnswer,
          question.correctAnswer,
          response.grammarCategory,
          question.difficulty
        );

        // Reload performance data after tracking mistake
        loadPerformanceData();

        setUserAnswers(prev => {
          const newAnswers = new Map(prev);
          const currentAnswer = newAnswers.get(questionId);
          if (currentAnswer) {
            newAnswers.set(questionId, {
              ...currentAnswer,
              isLoading: false,
              explanation: response.explanation,
              grammarCategory: response.grammarCategory
            });
          }
          return newAnswers;
        });
      } catch (error) {
        console.error('Failed to get explanation:', error);
        setUserAnswers(prev => {
          const newAnswers = new Map(prev);
          const currentAnswer = newAnswers.get(questionId);
          if (currentAnswer) {
            newAnswers.set(questionId, {
              ...currentAnswer,
              isLoading: false,
              explanation: 'Açıklama yüklenirken bir hata oluştu. Lütfen tekrar deneyin.'
            });
          }
          return newAnswers;
        });
      }
    } else if (!isCorrect && !openAIConfigured) {
      // Track mistake even without OpenAI, using 'other' as category
      addMistakeRecord(
        currentExam.id,
        questionId,
        question.questionText,
        selectedAnswer,
        question.correctAnswer,
        'other',
        question.difficulty
      );
      loadPerformanceData();
    } else {
      // Correct answer - just reload stats
      loadPerformanceData();
    }
  }, [currentExam, openAIConfigured]);

  const handleImportExam = async (
    name: string,
    description: string,
    examText: string,
    answerKey: string
  ): Promise<boolean> => {
    try {
      const questions = parseExamText(examText, answerKey);

      if (questions.length === 0) {
        console.error('No questions parsed');
        return false;
      }

      let examId: string | null;

      if (useFirebase) {
        examId = await createExam(name, description, questions);
      } else {
        examId = createLocalExam(name, description, questions);
      }

      if (examId) {
        await loadExams();
        setSelectedExamId(examId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to import exam:', error);
      return false;
    }
  };

  const handleAddToVault = async (word: string, questionContext: string, questionId: number) => {
    if (!selectedExamId) return;

    try {
      let wordId: string | null;

      if (useFirebase) {
        wordId = await addVocabWord(word, questionContext, selectedExamId, questionId);
      } else {
        wordId = addLocalVocabWord(word, questionContext, selectedExamId, questionId);
      }

      if (wordId) {
        await loadVocabWords();
      }
    } catch (error) {
      console.error('Failed to add word to vault:', error);
    }
  };

  // Generic handler for adding words to vault from any source (reading, listening, etc.)
  const handleAddToVaultGeneric = async (word: string, questionContext: string, sourceId: string, questionId: number) => {
    try {
      let wordId: string | null;

      if (useFirebase) {
        wordId = await addVocabWord(word, questionContext, sourceId, questionId);
      } else {
        wordId = addLocalVocabWord(word, questionContext, sourceId, questionId);
      }

      if (wordId) {
        await loadVocabWords();
      }
    } catch (error) {
      console.error('Failed to add word to vault:', error);
    }
  };

  const handleRemoveFromVault = async (wordId: string) => {
    try {
      let success: boolean;

      if (useFirebase) {
        success = await removeVocabWord(wordId);
      } else {
        success = removeLocalVocabWord(wordId);
      }

      if (success) {
        setVocabWords(prev => prev.filter(w => w.id !== wordId));
      }
    } catch (error) {
      console.error('Failed to remove word from vault:', error);
    }
  };

  const handleResetExam = () => {
    setUserAnswers(new Map());
  };

  const handleClearTrackingData = () => {
    if (confirm('Tüm performans verilerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      clearTrackingData();
      loadPerformanceData();
    }
  };

  const handleGetMistakesByCategory = (category: GrammarCategory): MistakeRecord[] => {
    return getMistakesByCategory(category);
  };

  // Writing Practice Functions
  const loadWritingSubmissions = () => {
    const submissions = getWritingSubmissions();
    setWritingSubmissions(submissions);
  };

  const handleSubmitWriting = async (
    text: string,
    promptId?: string,
    promptTitle?: string
  ): Promise<WritingFeedback | null> => {
    // Calculate word count
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

    // Save submission first (without feedback)
    const submissionId = saveWritingSubmission({
      promptId,
      promptTitle,
      originalText: text,
      wordCount
    });

    if (!submissionId) {
      return null;
    }

    // Get AI feedback if OpenAI is configured
    if (openAIConfigured) {
      try {
        const feedback = await getFullWritingFeedback(text, promptTitle);

        // Update submission with feedback
        updateWritingSubmission(submissionId, { feedback });

        // Reload submissions
        loadWritingSubmissions();

        return feedback;
      } catch (error) {
        console.error('Failed to get writing feedback:', error);
        loadWritingSubmissions();
        return null;
      }
    } else {
      loadWritingSubmissions();
      return null;
    }
  };

  const handleDeleteWritingSubmission = (submissionId: string) => {
    deleteWritingSubmission(submissionId);
    loadWritingSubmissions();
  };

  // Reading Comprehension Functions
  const loadReadingData = () => {
    setCompletedPassageIds(getCompletedPassageIds());
    setReadingStats(getReadingStats());
  };

  const handleAnswerReadingQuestion = (
    passageId: string,
    questionId: number,
    answer: string,
    isCorrect: boolean,
    _questionType: string
  ) => {
    // Get or create progress for this passage
    let progress = getReadingProgress(passageId);

    if (!progress) {
      progress = {
        passageId,
        answers: new Map(),
        startedAt: new Date()
      };
    }

    // Add the answer
    const answersMap = progress.answers instanceof Map
      ? progress.answers
      : new Map(Object.entries(progress.answers).map(([k, v]) => [parseInt(k), v]));

    answersMap.set(questionId, {
      questionId,
      selectedAnswer: answer,
      isCorrect
    });

    progress.answers = answersMap;
    saveReadingProgress(progress);
  };

  const handleCompleteReadingPassage = (passageId: string, score: number, difficulty: string) => {
    // Update progress with completion
    const progress = getReadingProgress(passageId);
    if (progress) {
      const answersMap = progress.answers instanceof Map
        ? progress.answers
        : new Map(Object.entries(progress.answers).map(([k, v]) => [parseInt(k), v]));

      // Calculate question type results
      const passage = sampleReadingPassages.find(p => p.id === passageId);
      const questionTypeResults: Record<ReadingQuestionType, { correct: number; total: number }> = {} as Record<ReadingQuestionType, { correct: number; total: number }>;

      if (passage) {
        passage.questions.forEach(q => {
          const answer = answersMap.get(q.id);
          if (!questionTypeResults[q.questionType]) {
            questionTypeResults[q.questionType] = { correct: 0, total: 0 };
          }
          questionTypeResults[q.questionType].total += 1;
          if (answer?.isCorrect) {
            questionTypeResults[q.questionType].correct += 1;
          }
        });
      }

      saveReadingProgress({
        ...progress,
        answers: answersMap,
        completedAt: new Date(),
        score
      });

      // Update stats
      updateReadingStats(
        true,
        difficulty,
        answersMap.size,
        Array.from(answersMap.values()).filter(a => a.isCorrect).length,
        questionTypeResults
      );

      loadReadingData();
    }
  };

  const handleGetReadingProgress = (passageId: string): ReadingProgress | null => {
    return getReadingProgress(passageId);
  };

  const handleResetReadingProgress = (passageId: string) => {
    deleteReadingProgress(passageId);
    loadReadingData();
  };

  // Listening Practice Functions
  const loadListeningData = () => {
    setCompletedListeningTestIds(getCompletedListeningTestIds());
    setListeningStats(getListeningStats());
  };

  const handleAnswerListeningQuestion = (
    testId: string,
    questionId: number,
    answer: string,
    isCorrect: boolean,
    _questionType: string
  ) => {
    // Get or create progress for this test
    let progress = getListeningProgress(testId);

    if (!progress) {
      progress = {
        testId,
        answers: new Map(),
        startedAt: new Date(),
        audioPlayCount: 0
      };
    }

    // Add the answer
    const answersMap = progress.answers instanceof Map
      ? progress.answers
      : new Map(Object.entries(progress.answers).map(([k, v]) => [parseInt(k), v]));

    answersMap.set(questionId, {
      questionId,
      selectedAnswer: answer,
      isCorrect
    });

    progress.answers = answersMap;
    saveListeningProgress(progress);
  };

  const handleCompleteListeningTest = (
    testId: string,
    score: number,
    section: IELTSListeningSection,
    difficulty: string,
    questionTypeResults: Record<ListeningQuestionType, { correct: number; total: number }>
  ) => {
    // Update progress with completion
    const progress = getListeningProgress(testId);
    if (progress) {
      const answersMap = progress.answers instanceof Map
        ? progress.answers
        : new Map(Object.entries(progress.answers).map(([k, v]) => [parseInt(k), v]));

      saveListeningProgress({
        ...progress,
        answers: answersMap,
        completedAt: new Date(),
        score
      });

      // Update stats
      updateListeningStats(
        section,
        difficulty,
        answersMap.size,
        Array.from(answersMap.values()).filter(a => a.isCorrect).length,
        questionTypeResults
      );

      loadListeningData();
    }
  };

  const handleGetListeningProgress = (testId: string): ListeningProgress | null => {
    return getListeningProgress(testId);
  };

  const handleResetListeningProgress = (testId: string) => {
    deleteListeningProgress(testId);
    loadListeningData();
  };

  const handleLoadSampleExam = async () => {
    try {
      let examId: string | null;

      if (useFirebase) {
        examId = await createExam(sampleExamName, sampleExamDescription, sampleExamQuestions);
      } else {
        examId = createLocalExam(sampleExamName, sampleExamDescription, sampleExamQuestions);
      }

      if (examId) {
        await loadExams();
        setSelectedExamId(examId);
      }
    } catch (error) {
      console.error('Failed to load sample exam:', error);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    try {
      let success: boolean;

      if (useFirebase) {
        success = await deleteExam(examId);
      } else {
        success = deleteLocalExam(examId);
      }

      if (success) {
        // If deleted exam was selected, clear selection
        if (selectedExamId === examId) {
          setSelectedExamId(null);
          setCurrentExam(null);
          setUserAnswers(new Map());
        }
        await loadExams();
      }
    } catch (error) {
      console.error('Failed to delete exam:', error);
    }
  };

  const vocabWordsInVault = vocabWords.map(w => w.word.toLowerCase());

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <BookOpen size={32} />
            <span>English Master</span>
          </div>
          {!useFirebase && (
            <div className="local-mode-badge" title="Firebase yapılandırılmamış - Yerel depolama kullanılıyor">
              <AlertCircle size={16} />
              <span>Yerel Mod</span>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="nav-menu">
          <button
            className="nav-item nav-exam"
            onClick={() => {
              if (exams.length > 0) {
                setSelectedExamId(exams[0].id);
              } else {
                handleLoadSampleExam();
              }
              setShowAdminPage(false);
            }}
            title="Sınav Modu"
          >
            <BookOpen size={18} />
            <span>Sınav</span>
          </button>

          <button
            className="nav-item nav-grammar"
            onClick={() => setShowGrammarLessons(true)}
            title="Gramer Dersleri"
          >
            <BookOpen size={18} />
            <span>Gramer</span>
          </button>

          <button
            className="nav-item nav-reading"
            onClick={() => setShowReadingComprehension(true)}
            title="Okuma Anlama"
          >
            <FileText size={18} />
            <span>Okuma</span>
          </button>

          <button
            className="nav-item nav-speaking"
            onClick={() => setShowSpeakingPractice(true)}
            title="IELTS Konuşma Pratiği"
          >
            <Mic size={18} />
            <span>Konuşma</span>
          </button>

          <button
            className="nav-item nav-listening"
            onClick={() => setShowListeningPractice(true)}
            title="IELTS Dinleme Pratiği"
          >
            <Headphones size={18} />
            <span>Dinleme</span>
          </button>

          <button
            className="nav-item nav-writing"
            onClick={() => setShowWritingPractice(true)}
            title="Yazma Pratiği"
          >
            <PenLine size={18} />
            <span>Yazma</span>
          </button>
        </nav>

        <div className="header-right">
          <button
            className="performance-btn"
            onClick={() => setShowPerformanceTracker(true)}
            title="Performans Analizi"
          >
            <BarChart3 size={20} />
            <span>Performans</span>
            {performanceStats.totalIncorrect > 0 && (
              <span className="badge warning">{performanceStats.totalIncorrect}</span>
            )}
          </button>

          <button
            className="vocab-vault-btn"
            onClick={() => setShowVocabVault(true)}
          >
            <BookOpen size={20} />
            <span>Kelime Kasası</span>
            {vocabWords.length > 0 && (
              <span className="badge">{vocabWords.length}</span>
            )}
          </button>

          <button
            className="admin-btn"
            onClick={() => setShowAdminPage(true)}
            title="Yönetim Paneli"
          >
            <Settings size={20} />
            <span>Yönetim</span>
          </button>

          <button
            className="theme-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? 'Açık tema' : 'Koyu tema'}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {showAdminPage ? (
          <AdminPage
            exams={exams}
            onBack={() => setShowAdminPage(false)}
            onImportExam={() => setShowImportModal(true)}
            onDeleteExam={handleDeleteExam}
            onLoadSampleExam={handleLoadSampleExam}
            useFirebase={useFirebase}
          />
        ) : (
          <>
            {/* Sidebar with Exam Selector */}
            <aside className="sidebar">
              <ExamSelector
                exams={exams}
                selectedExamId={selectedExamId}
                onSelectExam={setSelectedExamId}
                onDeleteExam={handleDeleteExam}
                isLoading={isLoadingExams}
              />

              {/* Configuration Status */}
              <div className="config-status">
                <h3>Yapılandırma Durumu</h3>
                <div className={`status-item ${useFirebase ? 'configured' : 'not-configured'}`}>
                  <span className="status-dot"></span>
                  <span>Firebase: {useFirebase ? 'Aktif' : 'Yerel Depolama'}</span>
                </div>
                <div className={`status-item ${openAIConfigured ? 'configured' : 'not-configured'}`}>
                  <span className="status-dot"></span>
                  <span>OpenAI: {openAIConfigured ? 'Aktif' : 'Yapılandırılmamış'}</span>
                </div>
              </div>

              {/* Quick Stats */}
              {currentExam && userAnswers.size > 0 && (
                <div className="quick-stats">
                  <h3>Hızlı İstatistik</h3>
                  <div className="stat-row">
                    <span>Cevaplanan:</span>
                    <span>{userAnswers.size} / {currentExam.questions.length}</span>
                  </div>
                  <div className="stat-row correct">
                    <span>Doğru:</span>
                    <span>{Array.from(userAnswers.values()).filter(a => a.isCorrect).length}</span>
                  </div>
                  <div className="stat-row incorrect">
                    <span>Yanlış:</span>
                    <span>{Array.from(userAnswers.values()).filter(a => !a.isCorrect).length}</span>
                  </div>
                </div>
              )}
            </aside>

            {/* Exam Content */}
            <div className="content">
              {isLoadingCurrentExam ? (
                <div className="loading-state">
                  <div className="spinner-large"></div>
                  <p>Sınav yükleniyor...</p>
                </div>
              ) : currentExam ? (
                <ExamView
                  exam={currentExam}
                  userAnswers={userAnswers}
                  onAnswer={handleAnswer}
                  onAddToVault={handleAddToVault}
                  onResetExam={handleResetExam}
                  vocabWordsInVault={vocabWordsInVault}
                />
              ) : (
                <div className="welcome-dashboard">
                  <div className="welcome-hero">
                    <div className="hero-glow"></div>
                    <BookOpen size={56} className="hero-icon" />
                  </div>

                  <div className="skill-cards-grid">
                    {/* Sınav Card */}
                    <button
                      className="skill-card skill-card-exam"
                      onClick={() => {
                        if (exams.length > 0) {
                          setSelectedExamId(exams[0].id);
                        } else {
                          handleLoadSampleExam();
                        }
                      }}
                    >
                      <div className="skill-card-icon">
                        <BookOpen size={32} />
                      </div>
                      <div className="skill-card-content">
                        <h3>Sınav</h3>
                        <p>Gramer ve kelime bilgini test et</p>
                      </div>
                      <div className="skill-card-arrow">→</div>
                    </button>

                    {/* Gramer Card */}
                    <button
                      className="skill-card skill-card-grammar highlight-card"
                      onClick={() => setShowGrammarLessons(true)}
                    >
                      <div className="new-badge">NEW</div>
                      <div className="skill-card-icon">
                        <BookOpen size={32} />
                      </div>
                      <div className="skill-card-content">
                        <h3>Gramer</h3>
                        <p>Dilbilgisi kurallarını öğren ve pratik yap</p>
                      </div>
                      <div className="skill-card-arrow">→</div>
                    </button>

                    {/* Okuma Card */}
                    <button
                      className="skill-card skill-card-reading"
                      onClick={() => setShowReadingComprehension(true)}
                    >
                      <div className="skill-card-icon">
                        <FileText size={32} />
                      </div>
                      <div className="skill-card-content">
                        <h3>Okuma</h3>
                        <p>Akademik metinleri anlama pratiği yap</p>
                      </div>
                      <div className="skill-card-arrow">→</div>
                    </button>

                    {/* Konuşma Card */}
                    <button
                      className="skill-card skill-card-speaking"
                      onClick={() => setShowSpeakingPractice(true)}
                    >
                      <div className="skill-card-icon">
                        <Mic size={32} />
                      </div>
                      <div className="skill-card-content">
                        <h3>Konuşma</h3>
                        <p>Speaking sınavına hazırlan</p>
                      </div>
                      <div className="skill-card-arrow">→</div>
                    </button>

                    {/* Dinleme Card */}
                    <button
                      className="skill-card skill-card-listening"
                      onClick={() => setShowListeningPractice(true)}
                    >
                      <div className="skill-card-icon">
                        <Headphones size={32} />
                      </div>
                      <div className="skill-card-content">
                        <h3>Dinleme</h3>
                        <p>Listening bölümüne hazırlan</p>
                      </div>
                      <div className="skill-card-arrow">→</div>
                    </button>

                    {/* Yazma Card */}
                    <button
                      className="skill-card skill-card-writing"
                      onClick={() => setShowWritingPractice(true)}
                    >
                      <div className="skill-card-icon">
                        <PenLine size={32} />
                      </div>
                      <div className="skill-card-content">
                        <h3>Yazma</h3>
                        <p>Essay ve task yazımını geliştir</p>
                      </div>
                      <div className="skill-card-arrow">→</div>
                    </button>
                  </div>

                  {/* Quick Start CTA */}
                  <div className="quick-start-section">
                    {exams.length > 0 ? (
                      <button
                        className="quick-start-btn"
                        onClick={() => setSelectedExamId(exams[0].id)}
                      >
                        <span className="btn-pulse"></span>
                        İlk Sınavı Başlat
                      </button>
                    ) : (
                      <button
                        className="quick-start-btn"
                        onClick={handleLoadSampleExam}
                      >
                        <span className="btn-pulse"></span>
                        120 Soruluk Örnek Sınavı Yükle
                      </button>
                    )}
                    <p className="quick-start-hint">
                      veya üst menüden bir beceri seçin
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Import Modal */}
      <ImportExamModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportExam}
      />

      {/* Vocab Vault Panel */}
      <VocabVault
        isOpen={showVocabVault}
        onClose={() => setShowVocabVault(false)}
        vocabWords={vocabWords}
        onRemoveWord={handleRemoveFromVault}
      />

      {/* Performance Tracker Panel */}
      <PerformanceTracker
        isOpen={showPerformanceTracker}
        onClose={() => setShowPerformanceTracker(false)}
        stats={performanceStats}
        recentMistakes={recentMistakes}
        onClearData={handleClearTrackingData}
        getMistakesByCategory={handleGetMistakesByCategory}
      />

      {/* Writing Practice Panel */}
      <WritingPractice
        isOpen={showWritingPractice}
        onClose={() => setShowWritingPractice(false)}
        submissions={writingSubmissions}
        prompts={writingPrompts}
        onSubmitWriting={handleSubmitWriting}
        onDeleteSubmission={handleDeleteWritingSubmission}
        isOpenAIConfigured={openAIConfigured}
      />

      {/* Reading Comprehension Panel */}
      <ReadingComprehension
        isOpen={showReadingComprehension}
        onClose={() => setShowReadingComprehension(false)}
        passages={sampleReadingPassages}
        completedPassageIds={completedPassageIds}
        stats={readingStats}
        onAnswerQuestion={handleAnswerReadingQuestion}
        onCompletePassage={handleCompleteReadingPassage}
        getProgress={handleGetReadingProgress}
        onResetProgress={handleResetReadingProgress}
        onAddToVault={handleAddToVaultGeneric}
        vocabWordsInVault={vocabWordsInVault}
      />

      {/* Speaking Practice Panel */}
      <SpeakingPractice
        isOpen={showSpeakingPractice}
        onClose={() => setShowSpeakingPractice(false)}
        isOpenAIConfigured={openAIConfigured}
      />

      {/* Listening Practice Panel */}
      <ListeningPractice
        isOpen={showListeningPractice}
        onClose={() => setShowListeningPractice(false)}
        tests={listeningTests}
        completedTestIds={completedListeningTestIds}
        stats={listeningStats}
        onAnswerQuestion={handleAnswerListeningQuestion}
        onCompleteTest={handleCompleteListeningTest}
        getProgress={handleGetListeningProgress}
        onResetProgress={handleResetListeningProgress}
        onAddToVault={handleAddToVaultGeneric}
        vocabWordsInVault={vocabWordsInVault}
      />

      {/* Grammar Lessons Modal */}
      {showGrammarLessons && (
        <GrammarLessons onClose={() => setShowGrammarLessons(false)} />
      )}
    </div>
  );
}

export default App;
