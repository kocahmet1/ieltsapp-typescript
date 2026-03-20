import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Moon, Sun, AlertCircle, BarChart3, PenLine, FileText, Mic, Headphones, Languages } from 'lucide-react';
import { ExamSelector } from './components/ExamSelector';
import { ExamView } from './components/ExamView';
import { ImportExamModal } from './components/ImportExamModal';
import { AuthModal } from './components/AuthModal';
import { useAuth } from './contexts/AuthContext';
import { VocabVault } from './components/VocabVault';
import { AdminPage } from './components/AdminPage';
import { PerformanceTracker } from './components/PerformanceTracker';
import { WritingPractice } from './components/WritingPractice';
import { ReadingComprehension } from './components/ReadingComprehension';
import { SpeakingPractice } from './components/SpeakingPractice';
import { ListeningPractice } from './components/ListeningPractice';
import { GrammarLessons } from './components/GrammarLessons';
import { SentenceLab } from './components/SentenceLab';
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
  getWritingPrompts
} from './services/localStorageService';
import {
  addMistakeRecord,
  updateAnswerStats,
  getPerformanceStats,
  getRecentMistakes,
  clearTrackingData,
  getWritingSubmissions,
  saveWritingSubmission,
  updateWritingSubmission,
  deleteWritingSubmission,
  getReadingProgress,
  getAllReadingProgress,
  saveReadingProgress,
  deleteReadingProgress,
  getReadingStats,
  updateReadingStats,
  getListeningProgress,
  getAllListeningProgress,
  saveListeningProgress,
  deleteListeningProgress,
  getListeningStats,
  updateListeningStats
} from './services/firebaseUserService';
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
  const [openAIConfigured, setOpenAIConfigured] = useState(false);

  // Exam states
  const [exams, setExams] = useState<{ id: string; name: string; description?: string; questionCount: number }[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [userAnswers, setUserAnswers] = useState<Map<number, UserAnswer>>(new Map());
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [isLoadingCurrentExam, setIsLoadingCurrentExam] = useState(false);

  // Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showVocabVault, setShowVocabVault] = useState(false);
  const [showAdminPage, setShowAdminPage] = useState(false);
  const [showPerformanceTracker, setShowPerformanceTracker] = useState(false);
  const [showWritingPractice, setShowWritingPractice] = useState(false);
  const [showReadingComprehension, setShowReadingComprehension] = useState(false);
  const [showSpeakingPractice, setShowSpeakingPractice] = useState(false);
  const [showListeningPractice, setShowListeningPractice] = useState(false);
  const [showGrammarLessons, setShowGrammarLessons] = useState(false);
  const [showSentenceLab, setShowSentenceLab] = useState(false);

  // Vocab vault state
  const [vocabWords, setVocabWords] = useState<VocabWord[]>([]);

  // Writing practice state
  const [writingSubmissions, setWritingSubmissions] = useState<WritingSubmission[]>([]);
  const [writingPrompts] = useState<WritingPrompt[]>(getWritingPrompts());

  // Reading comprehension state
  const [completedPassageIds, setCompletedPassageIds] = useState<string[]>([]);
  const [readingStats, setReadingStats] = useState<ReadingStats>({ totalPassagesCompleted: 0, totalQuestionsAnswered: 0, totalCorrect: 0, averageScore: 0, passagesByDifficulty: {} as Record<string, number>, questionTypePerformance: {} as any });

  // Listening practice state
  const [completedListeningTestIds, setCompletedListeningTestIds] = useState<string[]>([]);
  const [listeningStats, setListeningStats] = useState<ListeningStats>({ totalTestsCompleted: 0, totalQuestionsAnswered: 0, totalCorrect: 0, averageScore: 0, testsBySection: {} as any, testsByDifficulty: {} as Record<string, number>, questionTypePerformance: {} as any });

  // Performance tracking state
  const { user, logout } = useAuth();
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats>({
    totalAnswered: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    categoryBreakdown: [],
    weakestAreas: [],
    strongestAreas: []
  });
  const [recentMistakes, setRecentMistakes] = useState<MistakeRecord[]>([]);

  useEffect(() => {
    let isMounted = true;

    fetch('/api/config')
      .then(async response => {
        if (!response.ok) {
          throw new Error('Config request failed');
        }
        return response.json() as Promise<{ openaiConfigured?: boolean }>;
      })
      .then(data => {
        if (isMounted) {
          setOpenAIConfigured(Boolean(data.openaiConfigured));
        }
      })
      .catch(error => {
        console.error('Failed to load runtime config:', error);
        if (isMounted) {
          setOpenAIConfigured(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Load exams and static data on mount
  useEffect(() => {
    loadExams();
    loadVocabWords();
  }, []);

  // Load user data when user changes
  useEffect(() => {
    if (user) {
      const loadUserData = async () => {
        await loadPerformanceData();
        await loadWritingSubmissions();
        await loadReadingData();
        await loadListeningData();
      };

      loadUserData().catch(error => {
        console.error('Failed to load user data:', error);
      });
    } else {
      setPerformanceStats({
        totalAnswered: 0, totalCorrect: 0, totalIncorrect: 0,
        categoryBreakdown: [], weakestAreas: [], strongestAreas: []
      });
      setRecentMistakes([]);
      setWritingSubmissions([]);
      setCompletedPassageIds([]);
      setReadingStats({ totalPassagesCompleted: 0, totalQuestionsAnswered: 0, totalCorrect: 0, averageScore: 0, passagesByDifficulty: {} as Record<string, number>, questionTypePerformance: {} as any });
      setCompletedListeningTestIds([]);
      setListeningStats({ totalTestsCompleted: 0, totalQuestionsAnswered: 0, totalCorrect: 0, averageScore: 0, testsBySection: {} as any, testsByDifficulty: {} as Record<string, number>, questionTypePerformance: {} as any });
    }
  }, [user]);

  const loadPerformanceData = async () => {
    if (!user) return;
    try {
      const stats = await getPerformanceStats();
      const recent = await getRecentMistakes(7);
      setPerformanceStats(stats);
      setRecentMistakes(recent);
    } catch (e) {
      console.error(e);
    }
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
    await updateAnswerStats(isCorrect);

    // Set initial answer state
    setUserAnswers(prev => {
      const newAnswers = new Map(prev);
      newAnswers.set(questionId, {
        questionId,
        selectedAnswer,
        isCorrect,
        isLoading: !isCorrect && openAIConfigured,
        explanation: !isCorrect && !openAIConfigured ?
          'OpenAI sunucuda yapılandırılmamış. Açıklama almak için Render ortam değişkenlerine OPENAI_API_KEY ekleyin.' :
          undefined
      });
      return newAnswers;
    });

    // If incorrect and OpenAI is configured, get explanation and track mistake
    if (!isCorrect && openAIConfigured) {
      try {
        const response = await getExplanation(question, selectedAnswer, question.correctAnswer);

        // Track the mistake with the grammar category
        await addMistakeRecord(
          currentExam.id,
          questionId,
          question.questionText,
          selectedAnswer,
          question.correctAnswer,
          response.grammarCategory,
          question.difficulty
        );

        // Reload performance data after tracking mistake
        await loadPerformanceData();

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
      await addMistakeRecord(
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

  const handleClearTrackingData = async () => {
    if (confirm('Tüm performans verilerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      await clearTrackingData();
      await loadPerformanceData();
    }
  };

  const handleGetMistakesByCategory = (category: GrammarCategory): MistakeRecord[] => {
    return recentMistakes.filter(m => m.grammarCategory === category);
  };

  // Writing Practice Functions
  const loadWritingSubmissions = async () => {
    if (!user) return;
    try {
      const submissions = await getWritingSubmissions();
      setWritingSubmissions(submissions);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitWriting = async (
    text: string,
    promptId?: string,
    promptTitle?: string
  ): Promise<WritingFeedback | null> => {
    // Calculate word count
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

    // Save submission first (without feedback)
    const submissionId = await saveWritingSubmission({
      promptId,
      promptTitle,
      originalText: text,
      submittedAt: new Date(),
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
        await updateWritingSubmission(submissionId, { feedback });

        // Reload submissions
        await loadWritingSubmissions();

        return feedback;
      } catch (error) {
        console.error('Failed to get writing feedback:', error);
        await loadWritingSubmissions();
        return null;
      }
    } else {
      await loadWritingSubmissions();
      return null;
    }
  };

  const handleDeleteWritingSubmission = async (submissionId: string) => {
    await deleteWritingSubmission(submissionId);
    await loadWritingSubmissions();
  };

  // Reading Comprehension Functions
  const loadReadingData = async () => {
    if (!user) return;
    try {
      const stats = await getReadingStats();
      setReadingStats(stats);
      const allProg = await getAllReadingProgress();
      setCompletedPassageIds(allProg.filter(p => p.completedAt).map(p => p.passageId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAnswerReadingQuestion = async (
    passageId: string,
    questionId: number,
    answer: string,
    isCorrect: boolean,
    _questionType: string
  ) => {
    // Get or create progress for this passage
    let progress = await getReadingProgress(passageId);

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
    await saveReadingProgress(progress);
  };

  const handleCompleteReadingPassage = async (passageId: string, score: number, difficulty: string) => {
    // Update progress with completion
    const progress = await getReadingProgress(passageId);
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

      await saveReadingProgress({
        ...progress,
        answers: answersMap,
        completedAt: new Date(),
        score
      });

      // Update stats
      await updateReadingStats(
        true,
        difficulty,
        answersMap.size,
        Array.from(answersMap.values()).filter(a => a.isCorrect).length,
        questionTypeResults
      );

      await loadReadingData();
    }
  };

  const handleGetReadingProgress = async (passageId: string): Promise<ReadingProgress | null> => {
    return await getReadingProgress(passageId);
  };

  const handleResetReadingProgress = async (passageId: string) => {
    await deleteReadingProgress(passageId);
    await loadReadingData();
  };

  // Listening Practice Functions
  const loadListeningData = async () => {
    if (!user) return;
    try {
      const stats = await getListeningStats();
      setListeningStats(stats);
      const allProg = await getAllListeningProgress();
      setCompletedListeningTestIds(allProg.filter(p => p.completedAt).map(p => p.testId));
    } catch (e) { console.error(e); }
  };

  const handleAnswerListeningQuestion = async (
    testId: string,
    questionId: number,
    answer: string,
    isCorrect: boolean,
    _questionType: string
  ) => {
    // Get or create progress for this test
    let progress = await getListeningProgress(testId);

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
    await saveListeningProgress(progress);
  };

  const handleCompleteListeningTest = async (
    testId: string,
    score: number,
    section: IELTSListeningSection,
    difficulty: string,
    questionTypeResults: Record<ListeningQuestionType, { correct: number; total: number }>
  ) => {
    // Update progress with completion
    const progress = await getListeningProgress(testId);
    if (progress) {
      const answersMap = progress.answers instanceof Map
        ? progress.answers
        : new Map(Object.entries(progress.answers).map(([k, v]) => [parseInt(k), v]));

      await saveListeningProgress({
        ...progress,
        answers: answersMap,
        completedAt: new Date(),
        score
      });

      // Update stats
      await updateListeningStats(
        section,
        difficulty,
        answersMap.size,
        Array.from(answersMap.values()).filter(a => a.isCorrect).length,
        questionTypeResults
      );

      await loadListeningData();
    }
  };

  const handleGetListeningProgress = async (testId: string): Promise<ListeningProgress | null> => {
    return await getListeningProgress(testId);
  };

  const handleResetListeningProgress = async (testId: string) => {
    await deleteListeningProgress(testId);
    await loadListeningData();
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
          <div className="logo" onClick={() => { setSelectedExamId(null); setCurrentExam(null); }} style={{ cursor: 'pointer' }}>
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
              setSelectedExamId(null);
              setCurrentExam(null);
              setShowAdminPage(false);
            }}
            title="Ana Sayfa"
          >
            <BookOpen size={18} />
            <span>Ana Sayfa</span>
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

          <button
            className="nav-item nav-sentence-lab"
            onClick={() => setShowSentenceLab(true)}
            title="Sentence Lab"
          >
            <Languages size={18} />
            <span>Sentence Lab</span>
          </button>
        </nav>

        <div className="header-right">
          {user ? (
            <button
              className="nav-item nav-logout"
              onClick={logout}
              title="Çıkış Yap"
              style={{ color: '#f87171' }}
            >
              <span>Çıkış Yap ({user.email?.split('@')[0]})</span>
            </button>
          ) : (
            <>
              <button
                className="nav-item nav-login"
                onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
              >
                <span>Giriş Yap</span>
              </button>
              <button
                className="nav-item nav-signup"
                onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}
                style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#c4b5fd', borderRadius: '8px' }}
              >
                <span>Kayıt Ol</span>
              </button>
            </>
          )}

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
            {/* Sidebar with Exam Selector (Only shown during an exam) */}
            {currentExam && (
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
                  <div className={`status - item ${useFirebase ? 'configured' : 'not-configured'} `}>
                    <span className="status-dot"></span>
                    <span>Firebase: {useFirebase ? 'Aktif' : 'Yerel Depolama'}</span>
                  </div>
                  <div className={`status - item ${openAIConfigured ? 'configured' : 'not-configured'} `}>
                    <span className="status-dot"></span>
                    <span>OpenAI: {openAIConfigured ? 'Aktif' : 'Yapılandırılmamış'}</span>
                  </div>
                </div>

                {/* Quick Stats */}
                {userAnswers.size > 0 && (
                  <div className="quick-stats">
                    <h3>Hızlı statistik</h3>
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
            )}

            {/* Exam Content */}
            <div className={`content ${!currentExam ? 'full-width' : ''} `}>
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
                    <h1>ngilizce Öğrenme Yolculuğu</h1>
                    <p>Beceri bazlı pratik yap, kelime hazneni geliştir ve AI tabanlı geri bildirimlerle performansını takip et.</p>
                  </div>

                  <div className="dashboard-controls">
                    <div className="exam-selector-wrapper">
                      <ExamSelector
                        exams={exams}
                        selectedExamId={selectedExamId}
                        onSelectExam={setSelectedExamId}
                        onDeleteExam={handleDeleteExam}
                        isLoading={isLoadingExams}
                      />
                    </div>
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
                      <div className="skill-card-arrow">â†’</div>
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
                      <div className="skill-card-arrow">â†’</div>
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
                      <div className="skill-card-arrow">â†’</div>
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
                      <div className="skill-card-arrow">â†’</div>
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
                      <div className="skill-card-arrow">â†’</div>
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
                      <div className="skill-card-arrow">â†’</div>
                    </button>

                    <button
                      className="skill-card skill-card-sentence-lab"
                      onClick={() => setShowSentenceLab(true)}
                    >
                      <div className="skill-card-icon">
                        <Languages size={32} />
                      </div>
                      <div className="skill-card-content">
                        <h3>Sentence Lab</h3>
                        <p>Kucuk cumlelerle yapi, grammar ve punctuation calis</p>
                      </div>
                      <div className="skill-card-arrow">â†’</div>
                    </button>
                  </div>

                  {/* Floating Config Status */}
                  <div className="floating-config-status">
                    <div className={`status - dot ${useFirebase ? 'configured' : 'not-configured'} `} title={`Firebase: ${useFirebase ? 'Aktif' : 'Yerel'} `}></div>
                    <div className={`status - dot ${openAIConfigured ? 'configured' : 'not-configured'} `} title={`OpenAI: ${openAIConfigured ? 'Aktif' : 'Pasif'} `}></div>
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
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

      <SentenceLab
        isOpen={showSentenceLab}
        onClose={() => setShowSentenceLab(false)}
      />
    </div>
  );
}

export default App;






