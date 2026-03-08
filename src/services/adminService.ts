import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import {
    PerformanceStats,
    MistakeRecord,
    WritingSubmission,
    ReadingProgress,
    ReadingStats,
    SpeakingSession,
    SpeakingStats,
    ListeningProgress,
    ListeningStats,
    VocabWord
} from '../types';

export interface AdminUserData {
    uid: string;
    email: string;
}

// 1. Fetch all registered users who have a document
export async function getAllUsers(): Promise<AdminUserData[]> {
    const usersRef = collection(db, 'users');
    const snap = await getDocs(usersRef);
    return snap.docs.map(d => ({
        uid: d.id,
        email: d.data().email || 'Unknown User'
    }));
}

// Ensure the current user has a document mapping uid to email
export async function initializeUserDocIfMissing(): Promise<void> {
    const user = auth.currentUser;
    if (!user || !user.email) return;

    try {
        const userDocRef = doc(db, 'users', user.uid);
        // We use merge: true so we don't overwrite stats subcollections explicitly (though setDoc on parent doesn't affect subcollections)
        await setDoc(userDocRef, {
            email: user.email,
            lastLogin: new Date()
        }, { merge: true });
    } catch (e) {
        console.error("Failed to init user doc", e);
    }
}

// generic fetch for all users' subcollections
async function fetchFromAllUsers<T>(
    users: AdminUserData[],
    subcollectionName: string,
    mapper: (docData: any, docId: string, email: string) => T
): Promise<T[]> {
    const allRecords: T[] = [];

    // fetch all concurrently
    await Promise.all(
        users.map(async (u) => {
            try {
                const subRef = collection(db, 'users', u.uid, subcollectionName);
                const subSnap = await getDocs(subRef);
                subSnap.forEach(d => {
                    allRecords.push(mapper(d.data(), d.id, u.email));
                });
            } catch (e) { console.error(`Failed to fetch ${subcollectionName} for ${u.email}`, e); }
        })
    );
    return allRecords;
}

export async function getAdminMistakes(users: AdminUserData[]): Promise<(MistakeRecord & { userEmail: string })[]> {
    const m = await fetchFromAllUsers(users, 'mistakes', (data, id, email) => ({
        id,
        userEmail: email,
        ...data,
        startedAt: data.startedAt?.toDate() || new Date(),
        completedAt: data.completedAt ? data.completedAt.toDate() : undefined
    } as MistakeRecord & { userEmail: string }));
    return m.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export async function getAdminWritings(users: AdminUserData[]): Promise<(WritingSubmission & { userEmail: string })[]> {
    const w = await fetchFromAllUsers(users, 'writingSubmissions', (data, id, email) => ({
        id,
        userEmail: email,
        ...data,
        submittedAt: data.submittedAt?.toDate() || new Date()
    } as WritingSubmission & { userEmail: string }));
    return w.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
}

export async function getAdminReadingProgress(users: AdminUserData[]): Promise<(ReadingProgress & { userEmail: string })[]> {
    const p = await fetchFromAllUsers(users, 'readingProgress', (data, id, email) => ({
        passageId: id,
        userEmail: email,
        ...data,
        startedAt: data.startedAt?.toDate() || new Date(),
        completedAt: data.completedAt ? data.completedAt.toDate() : undefined
    } as ReadingProgress & { userEmail: string }));
    return p;
}

export async function getAdminSpeakingSessions(users: AdminUserData[]): Promise<(SpeakingSession & { userEmail: string })[]> {
    const s = await fetchFromAllUsers(users, 'speakingSessions', (data, id, email) => ({
        id,
        userEmail: email,
        ...data,
        startedAt: data.startedAt?.toDate() || new Date(),
        completedAt: data.completedAt ? data.completedAt.toDate() : undefined
    } as SpeakingSession & { userEmail: string }));
    return s.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

export async function getAdminListeningProgress(users: AdminUserData[]): Promise<(ListeningProgress & { userEmail: string })[]> {
    const p = await fetchFromAllUsers(users, 'listeningProgress', (data, id, email) => ({
        testId: id,
        userEmail: email,
        ...data,
        startedAt: data.startedAt?.toDate() || new Date(),
        completedAt: data.completedAt ? data.completedAt.toDate() : undefined
    } as ListeningProgress & { userEmail: string }));
    return p;
}

export async function getAdminVocab(users: AdminUserData[]): Promise<(VocabWord & { userEmail: string })[]> {
    const v = await fetchFromAllUsers(users, 'vocabVault', (data, id, email) => ({
        id,
        userEmail: email,
        ...data,
        addedAt: data.addedAt?.toDate() || new Date()
    } as VocabWord & { userEmail: string }));
    return v.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
}

// For stats aggregations that exist implicitly
// In firebaseUserService, stats are stored at 'users/{uid}/stats/...', so let's define fetchers for them
export async function getAdminPerformanceStats(users: AdminUserData[]): Promise<{ email: string, stat: PerformanceStats }[]> {
    return await fetchFromAllUsers(users, 'stats', (data, id, email) => {
        if (id === 'performance') {
            return { email, stat: data as PerformanceStats };
        }
        return null;
    }).then(res => res.filter(r => r !== null) as { email: string, stat: PerformanceStats }[]);
}

export async function getAdminReadingStats(users: AdminUserData[]): Promise<{ email: string, stat: ReadingStats }[]> {
    return await fetchFromAllUsers(users, 'stats', (data, id, email) => {
        if (id === 'reading') {
            return { email, stat: data as ReadingStats };
        }
        return null;
    }).then(res => res.filter(r => r !== null) as { email: string, stat: ReadingStats }[]);
}

export async function getAdminSpeakingStats(users: AdminUserData[]): Promise<{ email: string, stat: SpeakingStats }[]> {
    return await fetchFromAllUsers(users, 'stats', (data, id, email) => {
        if (id === 'speaking') {
            return { email, stat: data as SpeakingStats };
        }
        return null;
    }).then(res => res.filter(r => r !== null) as { email: string, stat: SpeakingStats }[]);
}

export async function getAdminListeningStats(users: AdminUserData[]): Promise<{ email: string, stat: ListeningStats }[]> {
    return await fetchFromAllUsers(users, 'stats', (data, id, email) => {
        if (id === 'listening') {
            return { email, stat: data as ListeningStats };
        }
        return null;
    }).then(res => res.filter(r => r !== null) as { email: string, stat: ListeningStats }[]);
}

