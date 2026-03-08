import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    orderBy,
    deleteDoc,
    Timestamp,
    updateDoc
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import {
    MistakeRecord,
    PerformanceStats,
    GrammarCategory,
    WritingSubmission,
    ReadingProgress,
    ReadingStats,
    ListeningProgress,
    ListeningStats,
    SpeakingSession,
    SpeakingStats,
    ReadingQuestionType,
    IELTSSpeakingSection,
    IELTSListeningSection,
    ListeningQuestionType
} from '../types';

// Helper to get current user ID
const getUserId = () => {
    const userId = auth?.currentUser?.uid;
    if (!userId) throw new Error("User must be logged in to save data.");
    return userId;
};

// ===================================
// GRAMMAR & EXAM TRACKING
// ===================================

export async function addMistakeRecord(
    examId: string,
    questionId: number,
    questionText: string,
    selectedAnswer: string,
    correctAnswer: string,
    grammarCategory: GrammarCategory,
    difficulty?: string
): Promise<void> {
    const userId = getUserId();
    const mistake: Omit<MistakeRecord, 'id'> = {
        examId,
        questionId,
        questionText,
        selectedAnswer,
        correctAnswer,
        grammarCategory,
        difficulty,
        timestamp: new Date()
    };

    const mistakesRef = collection(db, 'users', userId, 'mistakes');
    await setDoc(doc(mistakesRef), {
        ...mistake,
        timestamp: Timestamp.fromDate(mistake.timestamp)
    });
}

export async function updateAnswerStats(isCorrect: boolean): Promise<void> {
    const userId = getUserId();
    const statsRef = doc(db, 'users', userId, 'stats', 'performance');

    const snap = await getDoc(statsRef);
    if (snap.exists()) {
        const data = snap.data();
        await updateDoc(statsRef, {
            totalAnswered: (data.totalAnswered || 0) + 1,
            totalCorrect: (data.totalCorrect || 0) + (isCorrect ? 1 : 0),
            totalIncorrect: (data.totalIncorrect || 0) + (isCorrect ? 0 : 1)
        });
    } else {
        // Initial creation
        await setDoc(statsRef, {
            totalAnswered: 1,
            totalCorrect: isCorrect ? 1 : 0,
            totalIncorrect: isCorrect ? 0 : 1
        });
    }
}

export async function getPerformanceStats(): Promise<PerformanceStats> {
    const userId = auth?.currentUser?.uid;
    if (!userId) {
        return { totalAnswered: 0, totalCorrect: 0, totalIncorrect: 0, categoryBreakdown: [], weakestAreas: [], strongestAreas: [] };
    }

    // Get base stats
    const statsRef = doc(db, 'users', userId, 'stats', 'performance');
    const snap = await getDoc(statsRef);
    let totalAnswered = 0, totalCorrect = 0, totalIncorrect = 0;

    if (snap.exists()) {
        const data = snap.data();
        totalAnswered = data.totalAnswered || 0;
        totalCorrect = data.totalCorrect || 0;
        totalIncorrect = data.totalIncorrect || 0;
    }

    // Get all mistakes for category breakdown
    const mistakesRef = collection(db, 'users', userId, 'mistakes');
    const mistakesSnap = await getDocs(mistakesRef);
    const mistakes = mistakesSnap.docs.map(d => ({
        ...d.data(),
        timestamp: d.data().timestamp?.toDate() || new Date()
    })) as MistakeRecord[];

    // Calculate breakdown
    const categoryCounts: Record<string, { total: number; recent: number; last: Date | undefined }> = {};
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    mistakes.forEach(m => {
        if (!categoryCounts[m.grammarCategory]) {
            categoryCounts[m.grammarCategory] = { total: 0, recent: 0, last: undefined };
        }

        categoryCounts[m.grammarCategory].total++;

        if (m.timestamp > sevenDaysAgo) {
            categoryCounts[m.grammarCategory].recent++;
        }

        if (!categoryCounts[m.grammarCategory].last || m.timestamp > categoryCounts[m.grammarCategory].last!) {
            categoryCounts[m.grammarCategory].last = m.timestamp;
        }
    });

    const categoryBreakdown = Object.entries(categoryCounts).map(([cat, stats]) => ({
        category: cat as GrammarCategory,
        totalMistakes: stats.total,
        recentMistakes: stats.recent,
        lastMistake: stats.last
    })).sort((a, b) => b.totalMistakes - a.totalMistakes);

    const weakestAreas = categoryBreakdown.slice(0, 5).map(c => c.category);
    const strongestAreas: GrammarCategory[] = [];

    return {
        totalAnswered,
        totalCorrect,
        totalIncorrect,
        categoryBreakdown,
        weakestAreas,
        strongestAreas
    };
}

export async function getRecentMistakes(limitCount: number = 20): Promise<MistakeRecord[]> {
    const userId = auth?.currentUser?.uid;
    if (!userId) return [];

    const mistakesRef = collection(db, 'users', userId, 'mistakes');
    const q = query(mistakesRef, orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);

    return snap.docs.slice(0, limitCount).map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date()
        } as MistakeRecord;
    });
}

export async function getMistakesByCategory(category: GrammarCategory): Promise<MistakeRecord[]> {
    const userId = auth?.currentUser?.uid;
    if (!userId) return [];

    const mistakesRef = collection(db, 'users', userId, 'mistakes');
    const q = query(
        mistakesRef,
        orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);

    // We filter client-side because Firestore requires a composite index for where() + orderBy()
    return snap.docs
        .map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate() || new Date()
            } as MistakeRecord;
        })
        .filter(m => m.grammarCategory === category);
}

export async function clearTrackingData(): Promise<void> {
    const userId = auth?.currentUser?.uid;
    if (!userId) return;

    // Clear stats doc
    await setDoc(doc(db, 'users', userId, 'stats', 'performance'), {
        totalAnswered: 0, totalCorrect: 0, totalIncorrect: 0
    });

    // Delete all mistakes
    const mistakesRef = collection(db, 'users', userId, 'mistakes');
    const snap = await getDocs(mistakesRef);
    const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
}

// ===================================
// WRITING PRACTICE
// ===================================

export async function getWritingSubmissions(): Promise<WritingSubmission[]> {
    const userId = auth?.currentUser?.uid;
    if (!userId) return [];

    const ref = collection(db, 'users', userId, 'writingSubmissions');
    const q = query(ref, orderBy('submittedAt', 'desc'));
    const snap = await getDocs(q);

    return snap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            submittedAt: data.submittedAt?.toDate() || new Date()
        } as WritingSubmission;
    });
}

export async function saveWritingSubmission(submission: Omit<WritingSubmission, 'id'>): Promise<string> {
    const userId = getUserId();
    const ref = collection(db, 'users', userId, 'writingSubmissions');

    const docRef = doc(ref);
    await setDoc(docRef, {
        ...submission,
        submittedAt: Timestamp.fromDate(submission.submittedAt)
    });

    return docRef.id;
}

export async function updateWritingSubmission(id: string, updates: Partial<WritingSubmission>): Promise<void> {
    const userId = getUserId();
    const ref = doc(db, 'users', userId, 'writingSubmissions', id);

    const updateData = { ...updates };
    if (updateData.submittedAt) {
        updateData.submittedAt = Timestamp.fromDate(updateData.submittedAt as Date) as any;
    }

    await updateDoc(ref, updateData);
}

export async function deleteWritingSubmission(id: string): Promise<boolean> {
    const userId = getUserId();
    try {
        await deleteDoc(doc(db, 'users', userId, 'writingSubmissions', id));
        return true;
    } catch (error) {
        console.error("Failed to delete", error);
        return false;
    }
}

// ===================================
// READING TRACKING
// ===================================

const helperMapToObj = (map: Map<number, any> | Record<number, any>) => {
    if (map instanceof Map) return Object.fromEntries(map);
    return map;
};

const helperObjToMap = (obj: Record<number, any> | undefined) => {
    if (!obj) return new Map();
    return new Map(Object.entries(obj).map(([k, v]) => [parseInt(k), v]));
};

export async function getReadingProgress(passageId: string): Promise<ReadingProgress | null> {
    const userId = auth?.currentUser?.uid;
    if (!userId) return null;

    const docSnap = await getDoc(doc(db, 'users', userId, 'readingProgress', passageId));
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
        passageId: data.passageId,
        startedAt: data.startedAt?.toDate() || new Date(),
        completedAt: data.completedAt?.toDate(),
        score: data.score,
        answers: helperObjToMap(data.answers)
    };
}

export async function getAllReadingProgress(): Promise<ReadingProgress[]> {
    const userId = auth?.currentUser?.uid;
    if (!userId) return [];

    const snap = await getDocs(collection(db, 'users', userId, 'readingProgress'));
    return snap.docs.map(doc => {
        const data = doc.data();
        return {
            passageId: data.passageId,
            startedAt: data.startedAt?.toDate() || new Date(),
            completedAt: data.completedAt?.toDate(),
            score: data.score,
            answers: helperObjToMap(data.answers)
        };
    });
}

export async function saveReadingProgress(progress: ReadingProgress): Promise<void> {
    const userId = getUserId();
    await setDoc(doc(db, 'users', userId, 'readingProgress', progress.passageId), {
        ...progress,
        answers: helperMapToObj(progress.answers),
        startedAt: Timestamp.fromDate(progress.startedAt),
        completedAt: progress.completedAt ? Timestamp.fromDate(progress.completedAt) : null
    });
}

export async function deleteReadingProgress(passageId: string): Promise<void> {
    const userId = getUserId();
    await deleteDoc(doc(db, 'users', userId, 'readingProgress', passageId));
}

export async function getReadingStats(): Promise<ReadingStats> {
    const userId = auth?.currentUser?.uid;
    const defaultStats = {
        totalPassagesCompleted: 0,
        totalQuestionsAnswered: 0,
        totalCorrect: 0,
        averageScore: 0,
        passagesByDifficulty: {},
        questionTypePerformance: {} as any
    };
    if (!userId) return defaultStats;

    const docSnap = await getDoc(doc(db, 'users', userId, 'stats', 'reading'));
    if (!docSnap.exists()) return defaultStats;
    return docSnap.data() as ReadingStats;
}

export async function updateReadingStats(
    isComplete: boolean,
    difficulty: string,
    totalQuestions: number,
    correctAnswers: number,
    questionTypeResults: Record<ReadingQuestionType, { correct: number; total: number }>
): Promise<void> {
    const userId = getUserId();
    const ref = doc(db, 'users', userId, 'stats', 'reading');

    const docSnap = await getDoc(ref);
    const current = docSnap.exists() ? docSnap.data() as ReadingStats : {
        totalPassagesCompleted: 0,
        totalQuestionsAnswered: 0,
        totalCorrect: 0,
        averageScore: 0,
        passagesByDifficulty: {},
        questionTypePerformance: {} as any
    };

    if (isComplete) {
        current.totalPassagesCompleted++;
        const passagesByDifficulty = current.passagesByDifficulty as Record<string, number>;
        passagesByDifficulty[difficulty] = (passagesByDifficulty[difficulty] || 0) + 1;
    }

    // This is a naive increment approach, assuming test completions only happen once
    current.totalQuestionsAnswered += totalQuestions;
    current.totalCorrect += correctAnswers;

    // Update score (cumulative)
    const currentTotalScore = current.averageScore * Math.max(0, current.totalPassagesCompleted - (isComplete ? 1 : 0));
    const newTestScore = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    if (isComplete) {
        current.averageScore = Math.round((currentTotalScore + newTestScore) / current.totalPassagesCompleted);
    }

    // Question Types loop
    Object.keys(questionTypeResults).forEach(key => {
        const qType = key as ReadingQuestionType;
        if (!current.questionTypePerformance[qType]) {
            current.questionTypePerformance[qType] = { correct: 0, total: 0 };
        }
        current.questionTypePerformance[qType].correct += questionTypeResults[qType].correct;
        current.questionTypePerformance[qType].total += questionTypeResults[qType].total;
    });

    await setDoc(ref, current);
}

// ===================================
// SPEAKING TRACKING
// ===================================

export async function getSpeakingSessions(): Promise<SpeakingSession[]> {
    const userId = auth?.currentUser?.uid;
    if (!userId) return [];

    const ref = collection(db, 'users', userId, 'speakingSessions');
    const q = query(ref, orderBy('startedAt', 'desc'));
    const snap = await getDocs(q);

    return snap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            startedAt: data.startedAt?.toDate() || new Date(),
            completedAt: data.completedAt?.toDate()
        } as SpeakingSession;
    });
}

export async function saveSpeakingSession(session: Omit<SpeakingSession, 'id'>): Promise<string> {
    const userId = getUserId();
    const ref = collection(db, 'users', userId, 'speakingSessions');
    const docRef = doc(ref);

    await setDoc(docRef, {
        ...session,
        startedAt: Timestamp.fromDate(session.startedAt),
        completedAt: session.completedAt ? Timestamp.fromDate(session.completedAt) : null
    });

    return docRef.id;
}

export async function deleteSpeakingSession(id: string): Promise<void> {
    const userId = getUserId();
    await deleteDoc(doc(db, 'users', userId, 'speakingSessions', id));
}

export async function getSpeakingStats(): Promise<SpeakingStats> {
    const userId = auth?.currentUser?.uid;
    const defaultStats = {
        totalSessions: 0,
        averageBandScore: 0,
        averageFluencyScore: 0,
        averageVocabularyScore: 0,
        averageGrammarScore: 0,
        averagePronunciationScore: 0,
        sessionsBySection: { section1: 0, section2: 0, section3: 0 } as any,
        recentSessions: []
    };
    if (!userId) return defaultStats;

    const docSnap = await getDoc(doc(db, 'users', userId, 'stats', 'speaking'));
    if (!docSnap.exists()) return defaultStats;
    return docSnap.data() as SpeakingStats;
}

export async function updateSpeakingStats(
    section: IELTSSpeakingSection,
    scores: { overall: number; fluency: number; vocab: number; grammar: number; pronunciation: number }
): Promise<void> {
    const userId = getUserId();
    const ref = doc(db, 'users', userId, 'stats', 'speaking');

    const docSnap = await getDoc(ref);
    const current = docSnap.exists() ? docSnap.data() as SpeakingStats : {
        totalSessions: 0,
        averageBandScore: 0,
        averageFluencyScore: 0,
        averageVocabularyScore: 0,
        averageGrammarScore: 0,
        averagePronunciationScore: 0,
        sessionsBySection: { section1: 0, section2: 0, section3: 0 } as any,
        recentSessions: []
    };

    const ts = current.totalSessions;
    current.averageBandScore = (current.averageBandScore * ts + scores.overall) / (ts + 1);
    current.averageFluencyScore = (current.averageFluencyScore * ts + scores.fluency) / (ts + 1);
    current.averageVocabularyScore = (current.averageVocabularyScore * ts + scores.vocab) / (ts + 1);
    current.averageGrammarScore = (current.averageGrammarScore * ts + scores.grammar) / (ts + 1);
    current.averagePronunciationScore = (current.averagePronunciationScore * ts + scores.pronunciation) / (ts + 1);

    current.totalSessions++;
    current.sessionsBySection[section] = (current.sessionsBySection[section] || 0) + 1;

    // Format numbers to 1 decimal place
    current.averageBandScore = Math.round(current.averageBandScore * 10) / 10;

    await setDoc(ref, current);
}

// ===================================
// LISTENING TRACKING
// ===================================

export async function getListeningProgress(testId: string): Promise<ListeningProgress | null> {
    const userId = auth?.currentUser?.uid;
    if (!userId) return null;

    const docSnap = await getDoc(doc(db, 'users', userId, 'listeningProgress', testId));
    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
        testId: data.testId,
        startedAt: data.startedAt?.toDate() || new Date(),
        completedAt: data.completedAt?.toDate(),
        score: data.score,
        audioPlayCount: data.audioPlayCount || 0,
        answers: helperObjToMap(data.answers)
    };
}

export async function getAllListeningProgress(): Promise<ListeningProgress[]> {
    const userId = auth?.currentUser?.uid;
    if (!userId) return [];

    const snap = await getDocs(collection(db, 'users', userId, 'listeningProgress'));
    return snap.docs.map(doc => {
        const data = doc.data();
        return {
            testId: data.testId,
            startedAt: data.startedAt?.toDate() || new Date(),
            completedAt: data.completedAt?.toDate(),
            score: data.score,
            audioPlayCount: data.audioPlayCount || 0,
            answers: helperObjToMap(data.answers)
        };
    });
}

export async function saveListeningProgress(progress: ListeningProgress): Promise<void> {
    const userId = getUserId();
    await setDoc(doc(db, 'users', userId, 'listeningProgress', progress.testId), {
        ...progress,
        answers: helperMapToObj(progress.answers),
        startedAt: Timestamp.fromDate(progress.startedAt),
        completedAt: progress.completedAt ? Timestamp.fromDate(progress.completedAt) : null
    });
}

export async function deleteListeningProgress(testId: string): Promise<void> {
    const userId = getUserId();
    await deleteDoc(doc(db, 'users', userId, 'listeningProgress', testId));
}

export async function getListeningStats(): Promise<ListeningStats> {
    const userId = auth?.currentUser?.uid;
    const defaultStats = {
        totalTestsCompleted: 0,
        totalQuestionsAnswered: 0,
        totalCorrect: 0,
        averageScore: 0,
        testsBySection: {} as any,
        testsByDifficulty: {},
        questionTypePerformance: {} as any
    };
    if (!userId) return defaultStats;

    const docSnap = await getDoc(doc(db, 'users', userId, 'stats', 'listening'));
    if (!docSnap.exists()) return defaultStats;
    return docSnap.data() as ListeningStats;
}

export async function updateListeningStats(
    section: IELTSListeningSection,
    difficulty: string,
    totalQuestions: number,
    correctAnswers: number,
    questionTypeResults: Record<ListeningQuestionType, { correct: number; total: number }>
): Promise<void> {
    const userId = getUserId();
    const ref = doc(db, 'users', userId, 'stats', 'listening');

    const docSnap = await getDoc(ref);
    const current = docSnap.exists() ? docSnap.data() as ListeningStats : {
        totalTestsCompleted: 0,
        totalQuestionsAnswered: 0,
        totalCorrect: 0,
        averageScore: 0,
        testsBySection: {} as any,
        testsByDifficulty: {},
        questionTypePerformance: {} as any
    };

    current.totalTestsCompleted++;
    current.testsBySection[section] = (current.testsBySection[section] || 0) + 1;
    const testsByDifficulty = current.testsByDifficulty as Record<string, number>;
    testsByDifficulty[difficulty] = (testsByDifficulty[difficulty] || 0) + 1;

    // Update totals
    current.totalQuestionsAnswered += totalQuestions;
    current.totalCorrect += correctAnswers;

    const currentTotalScore = current.averageScore * Math.max(0, current.totalTestsCompleted - 1);
    const newTestScore = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    current.averageScore = Math.round((currentTotalScore + newTestScore) / current.totalTestsCompleted);

    // Question Types
    Object.keys(questionTypeResults).forEach(key => {
        const qType = key as ListeningQuestionType;
        if (!current.questionTypePerformance[qType]) {
            current.questionTypePerformance[qType] = { correct: 0, total: 0 };
        }
        current.questionTypePerformance[qType].correct += questionTypeResults[qType].correct;
        current.questionTypePerformance[qType].total += questionTypeResults[qType].total;
    });

    await setDoc(ref, current);
}

