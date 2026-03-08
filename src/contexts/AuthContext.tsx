import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    onAuthStateChanged,
    signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => Promise<void>;
    isFirebaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    logout: async () => { },
    isFirebaseConfigured: false
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Check if Firebase is actually configured or if it's using the dummy placeholder from the .env
    const isFirebaseConfigured = Boolean(
        import.meta.env.VITE_FIREBASE_API_KEY &&
        import.meta.env.VITE_FIREBASE_API_KEY !== "your-api-key" &&
        import.meta.env.VITE_FIREBASE_API_KEY !== "your-api-key-here"
    );

    useEffect(() => {
        if (!isFirebaseConfigured || !auth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isFirebaseConfigured]);

    const logout = async () => {
        try {
            if (auth) {
                await firebaseSignOut(auth);
            }
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    const value = {
        user,
        loading,
        logout,
        isFirebaseConfigured
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
