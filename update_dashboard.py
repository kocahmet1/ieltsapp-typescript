import os

filepath = 'src/components/ActivityDashboard.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_imports = """import {
    getAllUsers, getAdminPerformanceStats, getAdminMistakes, getAdminWritings, getAdminReadingStats, getAdminReadingProgress, getAdminSpeakingStats, getAdminSpeakingSessions, getAdminListeningStats, getAdminListeningProgress, getAdminVocab, AdminUserData
} from '../services/adminService';
import {
    PerformanceStats, MistakeRecord, WritingSubmission, ReadingProgress, ReadingStats, SpeakingSession, SpeakingStats, ListeningProgress, ListeningStats, VocabWord
} from '../types';"""

content = content.replace("""import {
    getPerformanceStats,
    getMistakeRecords,
    getWritingSubmissions,
    getAllReadingProgress,
    getReadingStats,
    getSpeakingStats,
    getSpeakingSessions,
    getListeningStats,
    getAllListeningProgress,
    getLocalVocabWords,
} from '../services/localStorageService';""", new_imports)

old_body = """export const ActivityDashboard: React.FC = () => {
    // Load all data once on render
    const perfStats = getPerformanceStats();
    const mistakes = getMistakeRecords();
    const writings = getWritingSubmissions();
    const readingStats = getReadingStats();
    const readingProg = getAllReadingProgress();
    const speakStats = getSpeakingStats();
    const speakSessions = getSpeakingSessions();
    const listeningStats = getListeningStats();
    const listeningProg = getAllListeningProgress();
    const vocab = getLocalVocabWords();

    const totalSessions =
        (perfStats.totalAnswered > 0 ? 1 : 0) +
        writings.length +
        readingProg.filter(p => p.completedAt).length +
        speakStats.totalSessions +
        listeningStats.totalTestsCompleted;"""

new_body = """export const ActivityDashboard: React.FC = () => {
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

    if (loading) return <div style={{padding: '2rem'}}>Yükleniyor...</div>;

    // Aggregate stats globally
    const aggPerfStats = perfStats.reduce((acc, curr) => {
        acc.totalAnswered += curr.stat.totalAnswered || 0;
        acc.totalCorrect += curr.stat.totalCorrect || 0;
        acc.totalIncorrect += curr.stat.totalIncorrect || 0;
        // Merge category Breakdown (simplistic for now)
        curr.stat.categoryBreakdown.forEach(c => {
           let e = acc.categoryBreakdown.find(x => x.category === c.category);
           if (e) { e.totalMistakes += c.totalMistakes; e.recentMistakes += c.recentMistakes; }
           else { acc.categoryBreakdown.push({...c}); }
        });
        return acc;
    }, { totalAnswered: 0, totalCorrect: 0, totalIncorrect: 0, categoryBreakdown: [] } as PerformanceStats);

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
        aggListenStats.totalTestsCompleted;"""

content = content.replace(old_body, new_body)

content = content.replace("""<StatPill label="Sınav Sorusu" value={perfStats.totalAnswered} />""", """<StatPill label="Sınav Sorusu" value={aggPerfStats.totalAnswered} />""")
content = content.replace("""<StatPill label="Doğru" value={perfStats.totalCorrect} accent />""", """<StatPill label="Doğru" value={aggPerfStats.totalCorrect} accent />""")

content = content.replace("""<StatPill label="Konuşma Seansı" value={speakStats.totalSessions} />""", """<StatPill label="Konuşma Seansı" value={aggSpeakStats.totalSessions} />""")
content = content.replace("""<StatPill label="Dinleme Testi" value={listeningStats.totalTestsCompleted} />""", """<StatPill label="Dinleme Testi" value={aggListenStats.totalTestsCompleted} />""")

# Grammar
content = content.replace("""{perfStats.totalAnswered === 0 ? (""", """{aggPerfStats.totalAnswered === 0 ? (""")
content = content.replace("""<StatPill label="Cevaplanan" value={perfStats.totalAnswered} />""", """<StatPill label="Cevaplanan" value={aggPerfStats.totalAnswered} />""")
content = content.replace("""<StatPill label="Doğru" value={perfStats.totalCorrect} accent />""", """<StatPill label="Doğru" value={aggPerfStats.totalCorrect} accent />""")
content = content.replace("""<StatPill label="Yanlış" value={perfStats.totalIncorrect} />""", """<StatPill label="Yanlış" value={aggPerfStats.totalIncorrect} />""")
content = content.replace("""value={pct(perfStats.totalCorrect, perfStats.totalAnswered)}""", """value={pct(aggPerfStats.totalCorrect, aggPerfStats.totalAnswered)}""")
content = content.replace("""{perfStats.categoryBreakdown.length > 0 && (""", """{aggPerfStats.categoryBreakdown.length > 0 && (""")
content = content.replace("""{perfStats.categoryBreakdown.slice(0, 10).map(c => (""", """{aggPerfStats.categoryBreakdown.slice(0, 10).map(c => (""")

# table updates
content = content.replace("""<tr><th>Soru (kısa)</th><th>Seçilen</th><th>Doğru</th><th>Tarih</th></tr>""", """<tr><th>Kullanıcı</th><th>Soru (kısa)</th><th>Seçilen</th><th>Doğru</th><th>Tarih</th></tr>""")
content = content.replace("""<td title={m.questionText} className="act-truncate">""", """<td title={m.userEmail} className="act-truncate" style={{maxWidth: '100px'}}>{m.userEmail}</td><td title={m.questionText} className="act-truncate">""")

content = content.replace("""<tr><th>Başlık</th><th>Kelime</th><th>Gramer</th><th>Puan</th><th>Tarih</th></tr>""", """<tr><th>Kullanıcı</th><th>Başlık</th><th>Kelime</th><th>Gramer</th><th>Puan</th><th>Tarih</th></tr>""")
content = content.replace("""<td>{w.promptTitle || 'Serbest Yazma'}</td>""", """<td title={w.userEmail} className="act-truncate" style={{maxWidth: '100px'}}>{w.userEmail}</td><td>{w.promptTitle || 'Serbest Yazma'}</td>""")

content = content.replace("""{readingStats.totalQuestionsAnswered === 0 ? (""", """{aggReadingStats.totalQuestionsAnswered === 0 ? (""")
content = content.replace("""<StatPill label="Parça Tamamlandı" value={readingStats.totalPassagesCompleted} />""", """<StatPill label="Parça Tamamlandı" value={aggReadingStats.totalPassagesCompleted} />""")
content = content.replace("""<StatPill label="Soru Cevaplandı" value={readingStats.totalQuestionsAnswered} />""", """<StatPill label="Soru Cevaplandı" value={aggReadingStats.totalQuestionsAnswered} />""")
content = content.replace("""value={`${readingStats.averageScore}%`}""", """value={`${aggReadingStats.averageScore}%`}""")

content = content.replace("""<tr><th>Parça ID</th><th>Puan</th><th>Tarih</th></tr>""", """<tr><th>Kullanıcı</th><th>Parça ID</th><th>Puan</th><th>Tarih</th></tr>""")
content = content.replace("""<td>{p.passageId}</td>""", """<td title={p.userEmail} className="act-truncate" style={{maxWidth: '100px'}}>{p.userEmail}</td><td>{p.passageId}</td>""")

# speaking
content = content.replace("""{speakStats.totalSessions === 0 ? (""", """{aggSpeakStats.totalSessions === 0 ? (""")
content = content.replace("""<StatPill label="Toplam Seans" value={speakStats.totalSessions} />""", """<StatPill label="Toplam Seans" value={aggSpeakStats.totalSessions} />""")
content = content.replace("""value={speakStats.averageBandScore || '—'}""", """value={'—'}""")
content = content.replace("""value={speakStats.averageFluencyScore || '—'}""", """value={'—'}""")
content = content.replace("""value={speakStats.averageGrammarScore || '—'}""", """value={'—'}""")
content = content.replace("""value={speakStats.averagePronunciationScore || '—'}""", """value={'—'}""")

content = content.replace("""<tr><th>Bölüm</th><th>Soru</th><th>Band</th><th>Süre</th><th>Tarih</th></tr>""", """<tr><th>Kullanıcı</th><th>Bölüm</th><th>Soru</th><th>Band</th><th>Süre</th><th>Tarih</th></tr>""")
content = content.replace("""<td>{s.question?.section?.replace('section', 'Bölüm ') || '—'}</td>""", """<td title={s.userEmail} className="act-truncate" style={{maxWidth: '100px'}}>{s.userEmail}</td><td>{s.question?.section?.replace('section', 'Bölüm ') || '—'}</td>""")

# listening
content = content.replace("""{listeningStats.totalTestsCompleted === 0 ? (""", """{aggListenStats.totalTestsCompleted === 0 ? (""")
content = content.replace("""<StatPill label="Test Tamamlandı" value={listeningStats.totalTestsCompleted} />""", """<StatPill label="Test Tamamlandı" value={aggListenStats.totalTestsCompleted} />""")
content = content.replace("""<StatPill label="Soru Cevaplandı" value={listeningStats.totalQuestionsAnswered} />""", """<StatPill label="Soru Cevaplandı" value={aggListenStats.totalQuestionsAnswered} />""")
content = content.replace("""value={`${listeningStats.averageScore}%`}""", """value={`${aggListenStats.averageScore}%`}""")

content = content.replace("""<tr><th>Test ID</th><th>Puan</th><th>Tarih</th></tr>""", """<tr><th>Kullanıcı</th><th>Test ID</th><th>Puan</th><th>Tarih</th></tr>""")
content = content.replace("""<td>{p.testId}</td>""", """<td title={p.userEmail} className="act-truncate" style={{maxWidth: '100px'}}>{p.userEmail}</td><td>{p.testId}</td>""")

# vocab
content = content.replace("""<tr><th>Soru Bağlamı</th><th>Tarih</th></tr>""", """<tr><th>Kullanıcı</th><th>Soru Bağlamı</th><th>Tarih</th></tr>""")
content = content.replace("""<td>{v.questionContext || '—'}</td>""", """<td title={v.userEmail} className="act-truncate" style={{maxWidth: '100px'}}>{v.userEmail}</td><td>{v.questionContext || '—'}</td>""")

# remove Object.keys(readingStats.questionTypePerformance) since aggregating is annoying and this is just an MVP
content = content.replace("""{Object.keys(readingStats.questionTypePerformance).length > 0 && (""", """{false && (""")
content = content.replace("""{Object.keys(listeningStats.questionTypePerformance).length > 0 && (""", """{false && (""")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
