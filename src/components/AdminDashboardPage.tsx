import React, { useState } from 'react';
import '../admin-dashboard.css';
import {
    Plus, Trash2, FileText, Database,
    BarChart3, AlertTriangle, Shield
} from 'lucide-react';
import { ActivityDashboard } from './ActivityDashboard';
import {
    getLocalExams,
    createLocalExam,
    deleteLocalExam,
} from '../services/localStorageService';
import { ImportExamModal } from './ImportExamModal';
import { sampleExamQuestions, sampleExamName, sampleExamDescription } from '../data/sampleExam';
import { parseExamText } from '../services/examService';

type Tab = 'exams' | 'activity';

export const AdminDashboardPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('activity');
    const [exams, setExams] = useState(() => getLocalExams());
    const [showImport, setShowImport] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);

    const loadExams = () => setExams(getLocalExams());

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`"${name}" sınavını silmek istediğinizden emin misiniz?`)) {
            deleteLocalExam(id);
            loadExams();
        }
    };

    const handleLoadSample = () => {
        createLocalExam(sampleExamName, sampleExamDescription, sampleExamQuestions);
        loadExams();
    };

    const handleImport = async (
        name: string,
        description: string,
        examText: string,
        answerKey: string
    ): Promise<boolean> => {
        try {
            const questions = parseExamText(examText, answerKey);
            if (questions.length === 0) { setImportError('Soru bulunamadı.'); return false; }
            createLocalExam(name, description, questions);
            loadExams();
            setShowImport(false);
            return true;
        } catch {
            setImportError('İçe aktarma sırasında hata oluştu.');
            return false;
        }
    };

    return (
        <div className="adm-page">
            {/* ── Header ── */}
            <header className="adm-header">
                <div className="adm-header__brand">
                    <Shield size={26} />
                    <span>Admin Paneli</span>
                </div>
                <span className="adm-header__hint">Bu sayfaya doğrudan URL ile erişilir</span>
            </header>

            {/* ── Tab bar ── */}
            <div className="adm-tabs">
                <button
                    className={`adm-tab${activeTab === 'activity' ? ' adm-tab--active' : ''}`}
                    onClick={() => setActiveTab('activity')}
                >
                    <BarChart3 size={17} />
                    Kullanıcı Aktiviteleri
                </button>
                <button
                    className={`adm-tab${activeTab === 'exams' ? ' adm-tab--active' : ''}`}
                    onClick={() => setActiveTab('exams')}
                >
                    <FileText size={17} />
                    Sınav Yönetimi
                </button>
            </div>

            {/* ── Content ── */}
            <main className="adm-content">
                {activeTab === 'activity' && <ActivityDashboard />}

                {activeTab === 'exams' && (
                    <div className="adm-exams">
                        {/* Actions */}
                        <div className="adm-exam-actions">
                            <button className="adm-btn adm-btn--primary" onClick={() => setShowImport(true)}>
                                <Plus size={18} /> Sınav Ekle
                            </button>
                            <button className="adm-btn adm-btn--secondary" onClick={handleLoadSample}>
                                <Database size={18} /> Örnek Sınav Yükle
                            </button>
                        </div>

                        {importError && (
                            <div className="adm-error">
                                <AlertTriangle size={16} /> {importError}
                            </div>
                        )}

                        {/* Exam list */}
                        {exams.length === 0 ? (
                            <div className="adm-empty">
                                <FileText size={48} />
                                <p>Henüz sınav eklenmemiş.</p>
                                <button className="adm-btn adm-btn--primary" onClick={() => setShowImport(true)}>
                                    İlk Sınavı Ekle
                                </button>
                            </div>
                        ) : (
                            <div className="adm-exam-list">
                                {exams.map(exam => (
                                    <div key={exam.id} className="adm-exam-item">
                                        <div className="adm-exam-item__info">
                                            <div className="adm-exam-item__name">{exam.name}</div>
                                            {exam.description && (
                                                <div className="adm-exam-item__desc">{exam.description}</div>
                                            )}
                                            <div className="adm-exam-item__meta">
                                                <span>{exam.questionCount} soru</span>
                                            </div>
                                        </div>
                                        <button
                                            className="adm-btn adm-btn--danger"
                                            onClick={() => handleDelete(exam.id, exam.name)}
                                        >
                                            <Trash2 size={16} /> Sil
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {showImport && (
                <ImportExamModal
                    isOpen={showImport}
                    onClose={() => setShowImport(false)}
                    onImport={handleImport}
                />
            )}
        </div>
    );
};
