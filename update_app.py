import re
import os

file_path = 'src/App.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace localStorageService imports
old_import = """import {
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
} from './services/localStorageService';"""

new_import = """import {
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
  getMistakesByCategory,
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
} from './services/firebaseUserService';"""

content = content.replace(old_import, new_import)

# Update useEffect
old_effect = """  // Load exams on mount
  useEffect(() => {
    loadExams();
    loadVocabWords();
    loadPerformanceData();
    loadWritingSubmissions();
    loadReadingData();
    loadListeningData();
  }, []);"""

new_effect = """  // Load exams and static data on mount
  useEffect(() => {
    loadExams();
    loadVocabWords();
  }, []);

  // Load user data when user changes
  useEffect(() => {
    if (user) {
      loadPerformanceData();
      loadWritingSubmissions();
      loadReadingData();
      loadListeningData();
    } else {
      setPerformanceStats({
        totalAnswered: 0, totalCorrect: 0, totalIncorrect: 0,
        categoryBreakdown: [], weakestAreas: [], strongestAreas: []
      });
      setRecentMistakes([]);
      setWritingSubmissions([]);
      setCompletedPassageIds([]);
      setReadingStats({ totalPassagesCompleted: 0, totalQuestionsAnswered: 0, totalCorrect: 0, averageScore: 0, passagesByDifficulty: {}, questionTypePerformance: {} as any });
      setCompletedListeningTestIds([]);
      setListeningStats({ totalTestsCompleted: 0, totalQuestionsAnswered: 0, totalCorrect: 0, averageScore: 0, testsBySection: {} as any, testsByDifficulty: {}, questionTypePerformance: {} as any });
    }
  }, [user]);"""

content = content.replace(old_effect, new_effect)

# Update loadPerformanceData
old_load_perf = """  const loadPerformanceData = () => {
    const stats = getPerformanceStats();
    const recent = getRecentMistakes(7);
    setPerformanceStats(stats);
    setRecentMistakes(recent);
  };"""

new_load_perf = """  const loadPerformanceData = async () => {
    if (!user) return;
    try {
      const stats = await getPerformanceStats();
      const recent = await getRecentMistakes(7);
      setPerformanceStats(stats);
      setRecentMistakes(recent);
    } catch (e) {
      console.error(e);
    }
  };"""

content = content.replace(old_load_perf, new_load_perf)

# Update replace getMistakesByCategory proxy
old_get_cat = """  const handleGetMistakesByCategory = (category: GrammarCategory): MistakeRecord[] => {
    return getMistakesByCategory(category);
  };"""
new_get_cat = """  const [mistakesByCategory, setMistakesByCategory] = useState<MistakeRecord[]>([]);
  // We don't change the render props signature yet, we pass the pre-fetched 'recentMistakes' filtered
  const handleGetMistakesByCategory = (category: GrammarCategory): MistakeRecord[] => {
    return recentMistakes.filter(m => m.grammarCategory === category);
  };"""
content = content.replace(old_get_cat, new_get_cat)

# update handleAnswer
content = content.replace("""    updateAnswerStats(isCorrect);""", """    await updateAnswerStats(isCorrect);""")
content = content.replace("""        addMistakeRecord(""", """        await addMistakeRecord(""")
content = content.replace("""        loadPerformanceData();""", """        await loadPerformanceData();""")
content = content.replace("""      // Track mistake even without OpenAI, using 'other' as category
      addMistakeRecord(
        currentExam.id,""", """      // Track mistake even without OpenAI, using 'other' as category
      await addMistakeRecord(
        currentExam.id,""")

# handleClearTrackingData
old_clear = """  const handleClearTrackingData = () => {
    if (confirm('Tüm performans verilerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      clearTrackingData();
      loadPerformanceData();
    }
  };"""
new_clear = """  const handleClearTrackingData = async () => {
    if (confirm('Tüm performans verilerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      await clearTrackingData();
      await loadPerformanceData();
    }
  };"""
content = content.replace(old_clear, new_clear)

# Writing Practice
old_load_write = """  const loadWritingSubmissions = () => {
    const submissions = getWritingSubmissions();
    setWritingSubmissions(submissions);
  };"""
new_load_write = """  const loadWritingSubmissions = async () => {
    if (!user) return;
    try {
      const submissions = await getWritingSubmissions();
      setWritingSubmissions(submissions);
    } catch (e) {
      console.error(e);
    }
  };"""
content = content.replace(old_load_write, new_load_write)

content = content.replace("""const submissionId = saveWritingSubmission({""", """const submissionId = await saveWritingSubmission({""")
content = content.replace("""updateWritingSubmission(submissionId, { feedback });""", """await updateWritingSubmission(submissionId, { feedback });""")
content = content.replace("""loadWritingSubmissions();""", """await loadWritingSubmissions();""")
content = content.replace("""deleteWritingSubmission(submissionId);""", """await deleteWritingSubmission(submissionId);""")

old_del_write = """  const handleDeleteWritingSubmission = (submissionId: string) => {"""
new_del_write = """  const handleDeleteWritingSubmission = async (submissionId: string) => {"""
content = content.replace(old_del_write, new_del_write)


# Reading Data
old_load_read = """  const loadReadingData = () => {
    setCompletedPassageIds(getCompletedPassageIds());
    setReadingStats(getReadingStats());
  };"""
new_load_read = """  const loadReadingData = async () => {
    if (!user) return;
    try {
      const stats = await getReadingStats();
      setReadingStats(stats);
      const allProg = await getAllReadingProgress();
      setCompletedPassageIds(allProg.filter(p => p.completedAt).map(p => p.passageId));
    } catch (e) {
      console.error(e);
    }
  };"""
content = content.replace(old_load_read, new_load_read)

content = content.replace("""let progress = getReadingProgress(passageId);""", """let progress = await getReadingProgress(passageId);""")
content = content.replace("""saveReadingProgress(progress);""", """await saveReadingProgress(progress);""")
content = content.replace("""const progress = getReadingProgress(passageId);""", """const progress = await getReadingProgress(passageId);""")

old_handle_read1 = """  const handleAnswerReadingQuestion = (
    passageId: string,
    questionId: number,
    answer: string,
    isCorrect: boolean,
    _questionType: string
  ) => {"""
new_handle_read1 = """  const handleAnswerReadingQuestion = async (
    passageId: string,
    questionId: number,
    answer: string,
    isCorrect: boolean,
    _questionType: string
  ) => {"""
content = content.replace(old_handle_read1, new_handle_read1)

old_handle_read2 = """  const handleCompleteReadingPassage = (passageId: string, score: number, difficulty: string) => {"""
new_handle_read2 = """  const handleCompleteReadingPassage = async (passageId: string, score: number, difficulty: string) => {"""
content = content.replace(old_handle_read2, new_handle_read2)

content = content.replace("""saveReadingProgress({""", """await saveReadingProgress({""")
content = content.replace("""updateReadingStats(""", """await updateReadingStats(""")
content = content.replace("""loadReadingData();""", """await loadReadingData();""")

old_get_read = """  const handleGetReadingProgress = (passageId: string): ReadingProgress | null => {
    return getReadingProgress(passageId);
  };"""
new_get_read = """  const handleGetReadingProgress = async (passageId: string): Promise<ReadingProgress | null> => {
    return await getReadingProgress(passageId);
  };"""
content = content.replace(old_get_read, new_get_read)

old_reset_read = """  const handleResetReadingProgress = (passageId: string) => {"""
new_reset_read = """  const handleResetReadingProgress = async (passageId: string) => {"""
content = content.replace(old_reset_read, new_reset_read)
content = content.replace("""deleteReadingProgress(passageId);""", """await deleteReadingProgress(passageId);""")

# Listening
old_load_listen = """  const loadListeningData = () => {
    setCompletedListeningTestIds(getCompletedListeningTestIds());
    setListeningStats(getListeningStats());
  };"""
new_load_listen = """  const loadListeningData = async () => {
    if (!user) return;
    try {
      const stats = await getListeningStats();
      setListeningStats(stats);
      const allProg = await getAllListeningProgress();
      setCompletedListeningTestIds(allProg.filter(p => p.completedAt).map(p => p.testId));
    } catch(e) { console.error(e); }
  };"""
content = content.replace(old_load_listen, new_load_listen)

old_handle_listen1 = """  const handleAnswerListeningQuestion = (
    testId: string,
    questionId: number,
    answer: string,
    isCorrect: boolean,
    _questionType: string
  ) => {"""
new_handle_listen1 = """  const handleAnswerListeningQuestion = async (
    testId: string,
    questionId: number,
    answer: string,
    isCorrect: boolean,
    _questionType: string
  ) => {"""
content = content.replace(old_handle_listen1, new_handle_listen1)

content = content.replace("""let progress = getListeningProgress(testId);""", """let progress = await getListeningProgress(testId);""")
content = content.replace("""saveListeningProgress(progress);""", """await saveListeningProgress(progress);""")
content = content.replace("""const progress = getListeningProgress(testId);""", """const progress = await getListeningProgress(testId);""")

old_handle_listen2 = """  const handleCompleteListeningTest = (
    testId: string,
    score: number,
    section: IELTSListeningSection,
    difficulty: string,
    questionTypeResults: Record<ListeningQuestionType, { correct: number; total: number }>
  ) => {"""
new_handle_listen2 = """  const handleCompleteListeningTest = async (
    testId: string,
    score: number,
    section: IELTSListeningSection,
    difficulty: string,
    questionTypeResults: Record<ListeningQuestionType, { correct: number; total: number }>
  ) => {"""
content = content.replace(old_handle_listen2, new_handle_listen2)

content = content.replace("""saveListeningProgress({""", """await saveListeningProgress({""")
content = content.replace("""updateListeningStats(""", """await updateListeningStats(""")
content = content.replace("""loadListeningData();""", """await loadListeningData();""")

old_get_listen = """  const handleGetListeningProgress = (testId: string): ListeningProgress | null => {
    return getListeningProgress(testId);
  };"""
new_get_listen = """  const handleGetListeningProgress = async (testId: string): Promise<ListeningProgress | null> => {
    return await getListeningProgress(testId);
  };"""
content = content.replace(old_get_listen, new_get_listen)

old_reset_listen = """  const handleResetListeningProgress = (testId: string) => {"""
new_reset_listen = """  const handleResetListeningProgress = async (testId: string) => {"""
content = content.replace(old_reset_listen, new_reset_listen)
content = content.replace("""deleteListeningProgress(testId);""", """await deleteListeningProgress(testId);""")


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
