import React, { useState } from 'react';
import { X, Mail, Lock, Loader2, LogIn, UserPlus } from 'lucide-react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
    isOpen,
    onClose,
    initialMode = 'login'
}) => {
    const [mode, setMode] = useState<'login' | 'register'>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Lütfen tüm alanları doldurun.');
            return;
        }

        if (password.length < 6) {
            setError('Şifre en az 6 karakter olmalıdır.');
            return;
        }

        setIsLoading(true);

        try {
            if (mode === 'login') {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
            // Auth is handled by context, so we just close the modal
            onClose();
            // Clear form
            setEmail('');
            setPassword('');
        } catch (err: any) {
            console.error(err);
            switch (err.code) {
                case 'auth/email-already-in-use':
                    setError('Bu email adresi zaten kullanımda.');
                    break;
                case 'auth/invalid-email':
                    setError('Geçersiz email adresi.');
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    setError('Email veya şifre hatalı.');
                    break;
                default:
                    setError('Bir hata oluştu. Lütfen tekrar deneyin.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>
                        {mode === 'login' ? (
                            <><LogIn size={24} /> Giriş Yap</>
                        ) : (
                            <><UserPlus size={24} /> Kayıt Ol</>
                        )}
                    </h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body">
                    <form onSubmit={handleSubmit} id="auth-form">
                        <div className="form-group">
                            <label htmlFor="auth-email">
                                <Mail size={16} /> Email
                            </label>
                            <input
                                id="auth-email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="ornek@email.com"
                                disabled={isLoading}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="auth-password">
                                <Lock size={16} /> Şifre
                            </label>
                            <input
                                id="auth-password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="En az 6 karakter"
                                disabled={isLoading}
                            />
                        </div>

                        {error && (
                            <div className="error-message" style={{ margin: '15px 0 0 0' }}>
                                {error}
                            </div>
                        )}
                    </form>
                </div>

                <div className="modal-footer" style={{ flexDirection: 'column', gap: '15px' }}>
                    <button
                        type="submit"
                        form="auth-form"
                        className="import-btn"
                        style={{ width: '100%', justifyContent: 'center' }}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <><Loader2 size={18} className="spinner" /> İşleniyor...</>
                        ) : (
                            mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'
                        )}
                    </button>

                    <div style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {mode === 'login' ? (
                            <>Hesabınız yok mu? <button type="button" className="text-btn" onClick={() => { setMode('register'); setError(''); }} style={{ color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>Kayıt Ol</button></>
                        ) : (
                            <>Zaten hesabınız var mı? <button type="button" className="text-btn" onClick={() => { setMode('login'); setError(''); }} style={{ color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>Giriş Yap</button></>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
