import React, { useState } from 'react';
import {
    BarChart3, PenLine, FileText, Mic, Headphones,
    ChevronDown, ChevronUp, BookMarked
} from 'lucide-react';
import {
    getAllUsers, getAdminPerformanceStats, getAdminMistakes, getAdminWritings, getAdminReadingStats, getAdminReadingProgress, getAdminSpeakingStats, getAdminSpeakingSessions, getAdminListeningStats, getAdminListeningProgress, getAdminVocab
} from '../services/adminService';
import {
    PerformanceStats, MistakeRecord, WritingSubmission, ReadingProgress, ReadingStats, SpeakingSession, SpeakingStats, ListeningProgress, ListeningStats, VocabWord
} from '../types';
import { GRAMMAR_CATEGORY_LABELS } from '../types';

// â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function fmt(date: Date | string | undefined): string {
    if (!date) return 'â€”';
    return new Date(date).toLocaleDateString('tr-TR', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

function pct(correct: number, total: number): string {
    if (total === 0) return 'â€”';
    return `${Math.round((correct / total) * 100)}%`;
}

// â”€â”€ sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SectionCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    color: string;
    children: React.ReactNode;
}> = ({ icon, title, color, children }) => {
    const [open, setOpen] = useState(true);
    return (
        <div className={`act-section act-section--${color}`}>
            <button className="act-section__header" onClick={() => setOpen(o => !o)}>
                <span className="act-section__icon">{icon}</span>
                <span className="act-section__title">{title}</span>
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {open && <div className="act-section__body">{children}</div>}
        </div>
    );
};

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
    <p className="act-empty">{label}</p>
);

const StatPill: React.FC<{ label: string; value: string | number; accent?: boolean }> = ({ label, value, accent }) => (
    <div className={`act-pill${accent ? ' act-pill--accent' : ''}`}>
        <span className="act-pill__value">{value}</span>
        <span className="act-pill__label">{label}</span>
    </div>
);

// â”€â”€ main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const ActivityDashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [perfStats, setPerfStats] = useState<{ email: string, stat: PerformanceStats }[]>([]);
    const [mistakes, setMistakes] = useState<(MistakeRecord & { userEmail: string })[]>([]);
    const [writings, setWritings] = useState<(WritingSubmission & { userEmail: string })[]>([]);
    const [readingStats, setReadingStats] = useState<{ email: string, stat: ReadingStats }[]>([]);
    const [readingProg, setReadingProg] = useState<(ReadingProgress & { userEmail: string })[]>([]);
    const [speakStats, setSpeakStats] = useState<{ email: string, stat: SpeakingStats }[]>([]);
    const [speakSessions, setSpeakSessions] = useState<(SpeakingSession & { userEmail: string })[]>([]);
    const [listeningStats, setListeningStats] = useState<{ email: string, stat: ListeningStats }[]>([]);
    const [listeningProg, setListeningProg] = useState<(ListeningProgress & { userEmail: string })[]>([]);
    const [vocab, setVocab] = useState<(VocabWord & { userEmail: string })[]>([]);

    React.useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const users = await getAllUsers();
                const [ps, m, w, rs, rp, ss, ses, ls, lp, v] = await Promise.all([
                    getAdminPerformanceStats(users),
                    getAdminMistakes(users),
                    getAdminWritings(users),
                    getAdminReadingStats(users),
                    getAdminReadingProgress(users),
                    getAdminSpeakingStats(users),
                    getAdminSpeakingSessions(users),
                    getAdminListeningStats(users),
                    getAdminListeningProgress(users),
                    getAdminVocab(users)
                ]);
                setPerfStats(ps);
                setMistakes(m);
                setWritings(w);
                setReadingStats(rs);
                setReadingProg(rp);
                setSpeakStats(ss);
                setSpeakSessions(ses);
                setListeningStats(ls);
                setListeningProg(lp);
                setVocab(v);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <div style={{ padding: '2rem' }}>YÃ¼kleniyor...</div>;

    // Aggregate stats globally
    const aggPerfStats = perfStats.reduce((acc, curr) => {
        acc.totalAnswered += curr.stat.totalAnswered || 0;
        acc.totalCorrect += curr.stat.totalCorrect || 0;
        acc.totalIncorrect += curr.stat.totalIncorrect || 0;
        // Merge category Breakdown (simplistic for now)
        curr.stat.categoryBreakdown.forEach(c => {
            let e = acc.categoryBreakdown.find(x => x.category === c.category);
            if (e) { e.totalMistakes += c.totalMistakes; e.recentMistakes += c.recentMistakes; }
            else { acc.categoryBreakdown.push({ ...c }); }
        });
        return acc;
    }, { totalAnswered: 0, totalCorrect: 0, totalIncorrect: 0, categoryBreakdown: [], weakestAreas: [], strongestAreas: [] } as PerformanceStats);

    const aggReadingStats = readingStats.reduce((acc, curr) => {
        acc.totalPassagesCompleted += curr.stat.totalPassagesCompleted || 0;
        acc.totalQuestionsAnswered += curr.stat.totalQuestionsAnswered || 0;
        acc.totalCorrect += curr.stat.totalCorrect || 0;
        return acc;
    }, { totalPassagesCompleted: 0, totalQuestionsAnswered: 0, totalCorrect: 0, averageScore: 0, passagesByDifficulty: {}, questionTypePerformance: {} as any } as ReadingStats);
    if (aggReadingStats.totalQuestionsAnswered > 0) {
        aggReadingStats.averageScore = Math.round((aggReadingStats.totalCorrect / aggReadingStats.totalQuestionsAnswered) * 100);
    }

    const aggSpeakStats = speakStats.reduce((acc, curr) => {
        acc.totalSessions += curr.stat.totalSessions || 0;
        return acc;
    }, { totalSessions: 0 } as SpeakingStats);

    const aggListenStats = listeningStats.reduce((acc, curr) => {
        acc.totalTestsCompleted += curr.stat.totalTestsCompleted || 0;
        acc.totalQuestionsAnswered += curr.stat.totalQuestionsAnswered || 0;
        acc.totalCorrect += curr.stat.totalCorrect || 0;
        return acc;
    }, { totalTestsCompleted: 0, totalQuestionsAnswered: 0, totalCorrect: 0, averageScore: 0, testsBySection: {}, testsByDifficulty: {}, questionTypePerformance: {} as any } as ListeningStats);

    const totalSessions =
        (aggPerfStats.totalAnswered > 0 ? 1 : 0) +
        writings.length +
        readingProg.filter(p => p.completedAt).length +
        aggSpeakStats.totalSessions +
        aggListenStats.totalTestsCompleted;

    return (
        <div className="activity-dashboard">

            {/* â”€â”€ Overview strip â”€â”€ */}
            <div className="act-overview">
                <StatPill label="SÄ±nav Sorusu" value={aggPerfStats.totalAnswered} />
                <StatPill label="DoÄŸru" value={aggPerfStats.totalCorrect} accent />
                <StatPill label="Yazma" value={writings.length} />
                <StatPill label="Okuma TamamlandÄ±" value={readingProg.filter(p => p.completedAt).length} />
                <StatPill label="KonuÅŸma SeansÄ±" value={aggSpeakStats.totalSessions} />
                <StatPill label="Dinleme Testi" value={aggListenStats.totalTestsCompleted} />
                <StatPill label="Kelime KasasÄ±" value={vocab.length} />
                <StatPill label="Toplam Etkinlik" value={totalSessions} accent />
            </div>

            {/* â”€â”€ Grammar / Exam â”€â”€ */}
            <SectionCard icon={<BarChart3 size={20} />} title="Gramer & SÄ±nav PerformansÄ±" color="blue">
                {aggPerfStats.totalAnswered === 0 ? (
                    <EmptyState label="HenÃ¼z sÄ±nav sorusu Ã§Ã¶zÃ¼lmemiÅŸ." />
                ) : (
                    <>
                        <div className="act-pills-row">
                            <StatPill label="Cevaplanan" value={aggPerfStats.totalAnswered} />
                            <StatPill label="DoÄŸru" value={aggPerfStats.totalCorrect} accent />
                            <StatPill label="YanlÄ±ÅŸ" value={aggPerfStats.totalIncorrect} />
                            <StatPill label="BaÅŸarÄ± %" value={pct(aggPerfStats.totalCorrect, aggPerfStats.totalAnswered)} accent />
                        </div>

                        {aggPerfStats.categoryBreakdown.length > 0 && (
                            <>
                                <h4 className="act-sub-title">Kategori KÄ±rÄ±lÄ±mÄ± (YanlÄ±ÅŸa GÃ¶re)</h4>
                                <div className="act-table-wrap">
                                    <table className="act-table">
                                        <thead>
                                            <tr><th>Kategori</th><th>YanlÄ±ÅŸ</th><th>Son 7 gÃ¼n</th></tr>
                                        </thead>
                                        <tbody>
                                            {aggPerfStats.categoryBreakdown.slice(0, 10).map(c => (
                                                <tr key={c.category}>
                                                    <td>{GRAMMAR_CATEGORY_LABELS[c.category] || c.category}</td>
                                                    <td><span className="badge-wrong">{c.totalMistakes}</span></td>
                                                    <td>{c.recentMistakes > 0 ? <span className="badge-recent">{c.recentMistakes}</span> : 'â€”'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        {mistakes.length > 0 && (
                            <>
                                <h4 className="act-sub-title">Son YanlÄ±ÅŸlar</h4>
                                <div className="act-table-wrap">
                                    <table className="act-table">
                                        <thead>
                                            <tr><th>KullanÄ±cÄ±</th><th>Soru (kÄ±sa)</th><th>SeÃ§ilen</th><th>DoÄŸru</th><th>Tarih</th></tr>
                                        </thead>
                                        <tbody>
                                            {mistakes.slice(0, 15).map(m => (
                                                <tr key={m.id}>
                                                    <td title={m.userEmail} className="act-truncate" style={{ maxWidth: '100px' }}>{m.userEmail}</td><td title={m.questionText} className="act-truncate">{m.questionText.slice(0, 60)}{m.questionText.length > 60 ? 'â€¦' : ''}</td>
                                                    <td><span className="badge-wrong">{m.selectedAnswer}</span></td>
                                                    <td><span className="badge-correct">{m.correctAnswer}</span></td>
                                                    <td className="act-date">{fmt(m.timestamp)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </>
                )}
            </SectionCard>

            {/* â”€â”€ Writing â”€â”€ */}
            <SectionCard icon={<PenLine size={20} />} title="Yazma PratiÄŸi" color="purple">
                {writings.length === 0 ? (
                    <EmptyState label="HenÃ¼z yazma egzersizi yapÄ±lmamÄ±ÅŸ." />
                ) : (
                    <>
                        <div className="act-pills-row">
                            <StatPill label="Toplam GÃ¶nderi" value={writings.length} />
                            <StatPill label="Ort. Kelime" value={
                                Math.round(writings.reduce((s, w) => s + (w.wordCount || 0), 0) / writings.length)
                            } accent />
                            <StatPill label="AI Geri Bildirim" value={writings.filter(w => w.feedback).length} />
                        </div>
                        <div className="act-table-wrap">
                            <table className="act-table">
                                <thead>
                                    <tr><th>KullanÄ±cÄ±</th><th>BaÅŸlÄ±k</th><th>Kelime</th><th>Gramer</th><th>Puan</th><th>Tarih</th></tr>
                                </thead>
                                <tbody>
                                    {writings.slice(0, 20).map(w => (
                                        <tr key={w.id}>
                                            <td title={w.userEmail} className="act-truncate" style={{ maxWidth: '100px' }}>{w.userEmail}</td><td>{w.promptTitle || 'Serbest Yazma'}</td>
                                            <td>{w.wordCount || 'â€”'}</td>
                                            <td>{w.feedback?.grammarScore != null ? <span className="badge-score">G:{w.feedback.grammarScore}</span> : 'â€”'}</td>
                                            <td>{w.feedback?.overallScore != null ? <span className="badge-score">{w.feedback.overallScore}/100</span> : 'â€”'}</td>
                                            <td className="act-date">{fmt(w.submittedAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </SectionCard>

            {/* â”€â”€ Reading â”€â”€ */}
            <SectionCard icon={<FileText size={20} />} title="Okuma Anlama" color="green">
                {aggReadingStats.totalQuestionsAnswered === 0 ? (
                    <EmptyState label="HenÃ¼z okuma egzersizi yapÄ±lmamÄ±ÅŸ." />
                ) : (
                    <>
                        <div className="act-pills-row">
                            <StatPill label="ParÃ§a TamamlandÄ±" value={aggReadingStats.totalPassagesCompleted} />
                            <StatPill label="Soru CevaplandÄ±" value={aggReadingStats.totalQuestionsAnswered} />
                            <StatPill label="Ort. BaÅŸarÄ±" value={`${aggReadingStats.averageScore}%`} accent />
                        </div>

                        {readingProg.filter(p => p.completedAt).length > 0 && (
                            <>
                                <h4 className="act-sub-title">Tamamlanan Okumalar</h4>
                                <div className="act-table-wrap">
                                    <table className="act-table">
                                        <thead>
                                            <tr><th>KullanÄ±cÄ±</th><th>ParÃ§a ID</th><th>Puan</th><th>Tarih</th></tr>
                                        </thead>
                                        <tbody>
                                            {readingProg.filter(p => p.completedAt).slice(0, 10).map(p => (
                                                <tr key={p.passageId}>
                                                    <td title={p.userEmail} className="act-truncate" style={{ maxWidth: '100px' }}>{p.userEmail}</td><td>{p.passageId}</td>
                                                    <td>{p.score != null ? <span className="badge-score">{p.score}%</span> : 'â€”'}</td>
                                                    <td className="act-date">{fmt(p.completedAt)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        {false && (
                            <>
                                <h4 className="act-sub-title">Soru TÃ¼rÃ¼ PerformansÄ±</h4>
                                <div className="act-table-wrap">
                                    <table className="act-table">
                                        <thead>
                                            <tr><th>TÃ¼r</th><th>DoÄŸru</th><th>Toplam</th><th>%</th></tr>
                                        </thead>
                                        <tbody>
                                            {([] as any[]).map(([type, d]) => (
                                                <tr key={type}>
                                                    <td>{type}</td>
                                                    <td>{d.correct}</td>
                                                    <td>{d.total}</td>
                                                    <td><span className="badge-score">{pct(d.correct, d.total)}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </>
                )}
            </SectionCard>

            {/* â”€â”€ Speaking â”€â”€ */}
            <SectionCard icon={<Mic size={20} />} title="KonuÅŸma PratiÄŸi (IELTS)" color="orange">
                {aggSpeakStats.totalSessions === 0 ? (
                    <EmptyState label="HenÃ¼z konuÅŸma seansÄ± yapÄ±lmamÄ±ÅŸ." />
                ) : (
                    <>
                        <div className="act-pills-row">
                            <StatPill label="Toplam Seans" value={aggSpeakStats.totalSessions} />
                            <StatPill label="Ort. Band" value={'â€”'} accent />
                            <StatPill label="AkÄ±cÄ±lÄ±k" value={'â€”'} />
                            <StatPill label="Gramer" value={'â€”'} />
                            <StatPill label="Telaffuz" value={'â€”'} />
                        </div>

                        {speakSessions.length > 0 && (
                            <>
                                <h4 className="act-sub-title">Son Seanslar</h4>
                                <div className="act-table-wrap">
                                    <table className="act-table">
                                        <thead>
                                            <tr><th>KullanÄ±cÄ±</th><th>BÃ¶lÃ¼m</th><th>Soru</th><th>Band</th><th>SÃ¼re</th><th>Tarih</th></tr>
                                        </thead>
                                        <tbody>
                                            {speakSessions.slice(0, 15).map(s => (
                                                <tr key={s.id}>
                                                    <td title={s.userEmail} className="act-truncate" style={{ maxWidth: '100px' }}>{s.userEmail}</td><td>{s.question?.section?.replace('section', 'BÃ¶lÃ¼m ') || 'â€”'}</td>
                                                    <td className="act-truncate" title={s.question?.questionText}>{(s.question?.questionText || '').slice(0, 50)}{(s.question?.questionText || '').length > 50 ? 'â€¦' : ''}</td>
                                                    <td>{s.feedback?.overallBandScore ? <span className="badge-score">{s.feedback.overallBandScore}</span> : 'â€”'}</td>
                                                    <td>{s.duration ? `${Math.round(s.duration / 60)}dk` : 'â€”'}</td>
                                                    <td className="act-date">{fmt(s.startedAt)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </>
                )}
            </SectionCard>

            {/* â”€â”€ Listening â”€â”€ */}
            <SectionCard icon={<Headphones size={20} />} title="Dinleme PratiÄŸi (IELTS)" color="teal">
                {aggListenStats.totalTestsCompleted === 0 ? (
                    <EmptyState label="HenÃ¼z dinleme testi yapÄ±lmamÄ±ÅŸ." />
                ) : (
                    <>
                        <div className="act-pills-row">
                            <StatPill label="Test TamamlandÄ±" value={aggListenStats.totalTestsCompleted} />
                            <StatPill label="Soru CevaplandÄ±" value={aggListenStats.totalQuestionsAnswered} />
                            <StatPill label="Ort. BaÅŸarÄ±" value={`${aggListenStats.averageScore}%`} accent />
                        </div>

                        {listeningProg.filter(p => p.completedAt).length > 0 && (
                            <>
                                <h4 className="act-sub-title">Tamamlanan Testler</h4>
                                <div className="act-table-wrap">
                                    <table className="act-table">
                                        <thead>
                                            <tr><th>KullanÄ±cÄ±</th><th>Test ID</th><th>Puan</th><th>Tarih</th></tr>
                                        </thead>
                                        <tbody>
                                            {listeningProg.filter(p => p.completedAt).slice(0, 10).map(p => (
                                                <tr key={p.testId}>
                                                    <td title={p.userEmail} className="act-truncate" style={{ maxWidth: '100px' }}>{p.userEmail}</td><td>{p.testId}</td>
                                                    <td>{p.score != null ? <span className="badge-score">{p.score}%</span> : 'â€”'}</td>
                                                    <td className="act-date">{fmt(p.completedAt)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        {false && (
                            <>
                                <h4 className="act-sub-title">Soru TÃ¼rÃ¼ PerformansÄ±</h4>
                                <div className="act-table-wrap">
                                    <table className="act-table">
                                        <thead>
                                            <tr><th>TÃ¼r</th><th>DoÄŸru</th><th>Toplam</th><th>%</th></tr>
                                        </thead>
                                        <tbody>
                                            {([] as any[]).map(([type, d]) => (
                                                <tr key={type}>
                                                    <td>{type}</td>
                                                    <td>{d.correct}</td>
                                                    <td>{d.total}</td>
                                                    <td><span className="badge-score">{pct(d.correct, d.total)}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </>
                )}
            </SectionCard>


            {/* â”€â”€ Vocabulary â”€â”€ */}
            <SectionCard icon={<BookMarked size={20} />} title="Kelime KasasÄ±" color="pink">
                {vocab.length === 0 ? (
                    <EmptyState label="HenÃ¼z kelime kasasÄ±na kelime eklenmemiÅŸ." />
                ) : (
                    <>
                        <div className="act-pills-row">
                            <StatPill label="Toplam Kelime" value={vocab.length} accent />
                        </div>
                        <div className="act-table-wrap">
                            <table className="act-table">
                                <thead>
                                    <tr><th>Kelime</th><th>Eklenme Tarihi</th></tr>
                                </thead>
                                <tbody>
                                    {vocab.slice(0, 30).map(w => (
                                        <tr key={w.id}>
                                            <td><strong>{w.word}</strong></td>
                                            <td className="act-date">{fmt(w.addedAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {vocab.length > 30 && <p className="act-more">ve {vocab.length - 30} kelime dahaâ€¦</p>}
                        </div>
                    </>
                )}
            </SectionCard>
        </div>
    );
};

