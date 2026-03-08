import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Mic,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Clock,
  History,
  Target,
  BookOpen,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  BarChart3,
  Trash2
} from 'lucide-react';
import {
  SpeakingQuestion,
  SpeakingSession,
  SpeakingFeedback,
  SpeakingStats,
  IELTSSpeakingSection,
  IELTS_SECTION_LABELS,
  IELTS_SECTION_DESCRIPTIONS
} from '../types';
import { getQuestionsBySection } from '../data/speakingQuestions';
import { transcribeAudio, analyzeSpeaking, generateSpeech, generateVoiceFeedbackText } from '../services/openaiService';
import {
  getSpeakingSessions,
  saveSpeakingSession,
  deleteSpeakingSession,
  getSpeakingStats,
  updateSpeakingStats,
  clearTrackingData
} from '../services/firebaseUserService';
import { useAuth } from '../contexts/AuthContext';

interface SpeakingPracticeProps {
  isOpen: boolean;
  onClose: () => void;
  isOpenAIConfigured: boolean;
}

type ViewMode = 'practice' | 'history' | 'stats';
type RecordingState = 'idle' | 'preparing' | 'recording' | 'processing' | 'complete';

export function SpeakingPractice({ isOpen, onClose, isOpenAIConfigured }: SpeakingPracticeProps) {
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('practice');
  const [selectedSection, setSelectedSection] = useState<IELTSSpeakingSection>('section1');

  // Question state
  const [currentQuestion, setCurrentQuestion] = useState<SpeakingQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);

  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [preparationTime, setPreparationTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Feedback state
  const [feedback, setFeedback] = useState<SpeakingFeedback | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSpeakingFeedback, setIsSpeakingFeedback] = useState(false);
  const [voiceFeedbackEnabled, setVoiceFeedbackEnabled] = useState(true);

  // Session state
  const [_currentSession, setCurrentSession] = useState<SpeakingSession | null>(null);
  const [sessions, setSessions] = useState<SpeakingSession[]>([]);
  const [stats, setStats] = useState<SpeakingStats>({
    totalSessions: 0,
    averageBandScore: 0,
    averageFluencyScore: 0,
    averageVocabularyScore: 0,
    averageGrammarScore: 0,
    averagePronunciationScore: 0,
    sessionsBySection: { section1: 0, section2: 0, section3: 0 } as any,
    recentSessions: []
  });

  const { user } = useAuth();

  // History state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const feedbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load sessions on mount or when user changes
  useEffect(() => {
    if (isOpen && user) {
      loadSessions();
      loadStats();
      loadRandomQuestion();
    } else if (isOpen && !user) {
      setSessions([]);
      setStats({
        totalSessions: 0,
        averageBandScore: 0,
        averageFluencyScore: 0,
        averageVocabularyScore: 0,
        averageGrammarScore: 0,
        averagePronunciationScore: 0,
        sessionsBySection: { section1: 0, section2: 0, section3: 0 } as any,
        recentSessions: []
      });
      loadRandomQuestion();
    }
  }, [isOpen, selectedSection, user]);

  const loadSessions = async () => {
    if (!user) return;
    try {
      const allSessions = await getSpeakingSessions();
      setSessions(allSessions);
    } catch (e) {
      console.error(e);
    }
  };

  const loadStats = async () => {
    if (!user) return;
    try {
      const newStats = await getSpeakingStats();
      setStats(newStats);
    } catch (e) {
      console.error(e);
    }
  };

  const loadRandomQuestion = useCallback(() => {
    const questions = getQuestionsBySection(selectedSection);
    if (questions.length > 0) {
      const randomIndex = Math.floor(Math.random() * questions.length);
      setCurrentQuestion(questions[randomIndex]);
      setQuestionIndex(randomIndex);
    }
  }, [selectedSection]);

  const loadNextQuestion = () => {
    const questions = getQuestionsBySection(selectedSection);
    const nextIndex = (questionIndex + 1) % questions.length;
    setCurrentQuestion(questions[nextIndex]);
    setQuestionIndex(nextIndex);
    resetRecordingState();
  };

  const loadPrevQuestion = () => {
    const questions = getQuestionsBySection(selectedSection);
    const prevIndex = questionIndex === 0 ? questions.length - 1 : questionIndex - 1;
    setCurrentQuestion(questions[prevIndex]);
    setQuestionIndex(prevIndex);
    resetRecordingState();
  };

  const resetRecordingState = () => {
    setRecordingState('idle');
    setRecordingTime(0);
    setPreparationTime(0);
    setAudioBlob(null);
    setAudioUrl(null);
    setFeedback(null);
    setCurrentSession(null);
    if (timerRef.current) clearInterval(timerRef.current);
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
  };

  // Start preparation timer (for Section 2)
  const startPreparation = () => {
    if (!currentQuestion) return;

    setRecordingState('preparing');
    const prepTime = currentQuestion.preparationTime || 60;
    setPreparationTime(prepTime);

    prepTimerRef.current = setInterval(() => {
      setPreparationTime(prev => {
        if (prev <= 1) {
          if (prepTimerRef.current) clearInterval(prepTimerRef.current);
          // Auto-start recording after preparation
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecordingState('recording');
      setRecordingTime(0);

      // Start recording timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Mikrofon erişimi sağlanamadı. Lütfen tarayıcı izinlerini kontrol edin.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setRecordingState('complete');
    }
  };

  // Play/pause recorded audio
  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Handle audio end
  const handleAudioEnd = () => {
    setIsPlaying(false);
  };

  // Submit for analysis
  const submitForAnalysis = async () => {
    if (!audioBlob || !currentQuestion || !isOpenAIConfigured) return;

    setIsAnalyzing(true);
    setRecordingState('processing');

    try {
      // Transcribe audio
      const transcript = await transcribeAudio(audioBlob);

      if (!transcript || transcript.trim().length === 0) {
        throw new Error('Ses kaydı metne çevrilemedi. Lütfen daha yüksek sesle konuşmayı deneyin.');
      }

      // Analyze speaking
      const speakingFeedback = await analyzeSpeaking(transcript, currentQuestion);
      setFeedback(speakingFeedback);

      // Save session
      const sessionData: Omit<SpeakingSession, 'id'> = {
        questionId: currentQuestion.id,
        question: currentQuestion,
        audioUrl: audioUrl || undefined,
        feedback: speakingFeedback,
        duration: recordingTime,
        startedAt: new Date(),
        completedAt: new Date()
      };

      const sessionId = await saveSpeakingSession(sessionData);
      if (sessionId) {
        const newSession = { ...sessionData, id: sessionId };
        setCurrentSession(newSession as SpeakingSession);
        if (selectedSection) {
          await updateSpeakingStats(selectedSection, {
            overall: speakingFeedback.overallBandScore,
            fluency: speakingFeedback.fluencyScore,
            vocab: speakingFeedback.vocabularyScore,
            grammar: speakingFeedback.grammarScore,
            pronunciation: speakingFeedback.pronunciationScore
          });
        }
        await loadSessions();
        await loadStats();
      }

      // Generate voice feedback if enabled
      if (voiceFeedbackEnabled && speakingFeedback.overallBandScore > 0) {
        playVoiceFeedback(speakingFeedback);
      }

    } catch (error) {
      console.error('Error analyzing speaking:', error);
      setFeedback({
        overallBandScore: 0,
        fluencyScore: 0,
        vocabularyScore: 0,
        grammarScore: 0,
        pronunciationScore: 0,
        transcript: '',
        corrections: [],
        suggestions: [error instanceof Error ? error.message : 'Analiz yapılırken bir hata oluştu.'],
        summary: 'Analiz tamamlanamadı.'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Play voice feedback
  const playVoiceFeedback = async (feedback: SpeakingFeedback) => {
    if (!voiceFeedbackEnabled) return;

    try {
      setIsSpeakingFeedback(true);
      const feedbackText = generateVoiceFeedbackText(feedback);
      const audioBuffer = await generateSpeech(feedbackText, 'nova');

      const blob = new Blob([audioBuffer], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);

      if (feedbackAudioRef.current) {
        feedbackAudioRef.current.src = url;
        feedbackAudioRef.current.play();
        feedbackAudioRef.current.onended = () => {
          setIsSpeakingFeedback(false);
          URL.revokeObjectURL(url);
        };
      }
    } catch (error) {
      console.error('Error playing voice feedback:', error);
      setIsSpeakingFeedback(false);
    }
  };

  // Stop voice feedback
  const stopVoiceFeedback = () => {
    if (feedbackAudioRef.current) {
      feedbackAudioRef.current.pause();
      feedbackAudioRef.current.currentTime = 0;
      setIsSpeakingFeedback(false);
    }
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get band score color
  const getBandScoreColor = (score: number): string => {
    if (score >= 7) return 'var(--accent-green)';
    if (score >= 5.5) return 'var(--accent-yellow)';
    if (score >= 4) return 'var(--accent-orange)';
    return 'var(--accent-red)';
  };

  // Handle section change
  const handleSectionChange = (section: IELTSSpeakingSection) => {
    setSelectedSection(section);
    resetRecordingState();
  };

  // Delete session
  const handleDeleteSession = async (sessionId: string) => {
    if (deleteConfirmId === sessionId) {
      await deleteSpeakingSession(sessionId);
      await loadSessions();
      await loadStats();
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(sessionId);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  // Clear all data
  const handleClearData = async () => {
    if (confirm('Tüm konuşma pratik verilerini silmek istediğinizden emin misiniz?')) {
      await clearTrackingData();
      await loadSessions();
      await loadStats();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="speaking-overlay">
      <div className="speaking-panel">
        {/* Header */}
        <div className="speaking-header">
          <div className="speaking-title">
            <Mic size={24} />
            <h2>IELTS Konuşma Pratiği</h2>
          </div>

          <div className="speaking-header-actions">
            <button
              className={`mode-btn ${viewMode === 'practice' ? 'active' : ''}`}
              onClick={() => setViewMode('practice')}
            >
              <Target size={18} />
              <span>Pratik</span>
            </button>
            <button
              className={`mode-btn ${viewMode === 'history' ? 'active' : ''}`}
              onClick={() => setViewMode('history')}
            >
              <History size={18} />
              <span>Geçmiş</span>
              {sessions.length > 0 && <span className="badge">{sessions.length}</span>}
            </button>
            <button
              className={`mode-btn ${viewMode === 'stats' ? 'active' : ''}`}
              onClick={() => setViewMode('stats')}
            >
              <BarChart3 size={18} />
              <span>İstatistik</span>
            </button>
          </div>

          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="speaking-content">
          {/* API Warning */}
          {!isOpenAIConfigured && (
            <div className="api-warning">
              <AlertTriangle size={20} />
              <span>OpenAI API yapılandırılmamış. Ses analizi ve geri bildirim için API anahtarı gereklidir.</span>
            </div>
          )}

          {viewMode === 'practice' && (
            <div className="practice-mode">
              {/* Section Selector */}
              <div className="section-selector">
                <label>Bölüm Seçin:</label>
                <div className="section-buttons">
                  {(['section1', 'section2', 'section3'] as IELTSSpeakingSection[]).map(section => (
                    <button
                      key={section}
                      className={`section-btn ${selectedSection === section ? 'active' : ''}`}
                      onClick={() => handleSectionChange(section)}
                    >
                      <span className="section-num">
                        {section === 'section1' ? '1' : section === 'section2' ? '2' : '3'}
                      </span>
                      <span className="section-label">
                        {section === 'section1' ? 'Tanışma' : section === 'section2' ? 'Cue Card' : 'Tartışma'}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="section-description">
                  {IELTS_SECTION_DESCRIPTIONS[selectedSection]}
                </p>
              </div>

              {/* Question Card */}
              {currentQuestion && (
                <div className="question-card-speaking">
                  <div className="question-card-header">
                    <span className="topic-badge">{currentQuestion.topic}</span>
                    <span className={`difficulty-badge difficulty-${currentQuestion.difficulty}`}>
                      {currentQuestion.difficulty === 'easy' ? 'Kolay' :
                        currentQuestion.difficulty === 'medium' ? 'Orta' : 'Zor'}
                    </span>
                    {currentQuestion.speakingTime && (
                      <span className="time-badge">
                        <Clock size={14} />
                        {formatTime(currentQuestion.speakingTime)}
                      </span>
                    )}
                  </div>

                  <div className="question-text-speaking">
                    {currentQuestion.questionText}
                  </div>

                  {/* Cue Card Points (Section 2) */}
                  {currentQuestion.cueCardPoints && (
                    <div className="cue-card-points">
                      <h4>Konuşmanızda şunları içerin:</h4>
                      <ul>
                        {currentQuestion.cueCardPoints.map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Follow-up Questions (Section 1 & 3) */}
                  {currentQuestion.followUpQuestions && currentQuestion.followUpQuestions.length > 0 && (
                    <div className="follow-up-questions">
                      <h4>Takip Soruları:</h4>
                      <ul>
                        {currentQuestion.followUpQuestions.map((q, idx) => (
                          <li key={idx}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Question Navigation */}
                  <div className="question-nav-speaking">
                    <button onClick={loadPrevQuestion} disabled={recordingState === 'recording'}>
                      <ChevronLeft size={20} />
                      <span>Önceki</span>
                    </button>
                    <button onClick={loadRandomQuestion} disabled={recordingState === 'recording'}>
                      <RefreshCw size={18} />
                      <span>Rastgele</span>
                    </button>
                    <button onClick={loadNextQuestion} disabled={recordingState === 'recording'}>
                      <span>Sonraki</span>
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}

              {/* Recording Section */}
              <div className="recording-section">
                {/* Preparation Timer (Section 2) */}
                {recordingState === 'preparing' && (
                  <div className="preparation-timer">
                    <div className="prep-icon">
                      <Clock size={32} />
                    </div>
                    <h3>Hazırlık Süresi</h3>
                    <div className="prep-time">{formatTime(preparationTime)}</div>
                    <p>Notlarınızı hazırlayın. Kayıt otomatik başlayacak.</p>
                    <button
                      className="skip-prep-btn"
                      onClick={() => {
                        if (prepTimerRef.current) clearInterval(prepTimerRef.current);
                        startRecording();
                      }}
                    >
                      Hazırlığı Atla
                    </button>
                  </div>
                )}

                {/* Recording Controls */}
                {recordingState !== 'preparing' && (
                  <div className="recording-controls">
                    {recordingState === 'idle' && (
                      <>
                        {selectedSection === 'section2' ? (
                          <button
                            className="record-btn start"
                            onClick={startPreparation}
                            disabled={!isOpenAIConfigured}
                          >
                            <Clock size={24} />
                            <span>Hazırlığı Başlat (1 dk)</span>
                          </button>
                        ) : (
                          <button
                            className="record-btn start"
                            onClick={startRecording}
                            disabled={!isOpenAIConfigured}
                          >
                            <Mic size={24} />
                            <span>Kaydı Başlat</span>
                          </button>
                        )}
                      </>
                    )}

                    {recordingState === 'recording' && (
                      <div className="recording-active">
                        <div className="recording-indicator">
                          <div className="pulse-ring"></div>
                          <Mic size={32} className="mic-icon" />
                        </div>
                        <div className="recording-time">{formatTime(recordingTime)}</div>
                        <p className="recording-hint">Konuşmanızı kayıt ediyoruz...</p>
                        <button
                          className="record-btn stop"
                          onClick={stopRecording}
                        >
                          <Square size={20} />
                          <span>Kaydı Durdur</span>
                        </button>
                      </div>
                    )}

                    {recordingState === 'complete' && !feedback && (
                      <div className="recording-complete">
                        <div className="playback-controls">
                          <button
                            className="playback-btn"
                            onClick={togglePlayback}
                          >
                            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                          </button>
                          <span className="recording-duration">
                            Kayıt süresi: {formatTime(recordingTime)}
                          </span>
                        </div>

                        <div className="action-buttons">
                          <button
                            className="analyze-btn"
                            onClick={submitForAnalysis}
                            disabled={isAnalyzing}
                          >
                            {isAnalyzing ? (
                              <>
                                <Loader2 size={20} className="spinner" />
                                <span>Analiz Ediliyor...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles size={20} />
                                <span>AI ile Analiz Et</span>
                              </>
                            )}
                          </button>

                          <button
                            className="retry-btn"
                            onClick={resetRecordingState}
                          >
                            <RefreshCw size={18} />
                            <span>Tekrar Dene</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {recordingState === 'processing' && (
                      <div className="processing-state">
                        <Loader2 size={48} className="spinner" />
                        <h3>Konuşmanız Analiz Ediliyor</h3>
                        <p>Ses kaydınız metne çevriliyor ve değerlendiriliyor...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Feedback Section */}
              {feedback && feedback.overallBandScore > 0 && (
                <div className="feedback-section">
                  {/* Score Overview */}
                  <div className="score-overview">
                    <div className="main-score">
                      <div
                        className="score-circle"
                        style={{ background: `conic-gradient(${getBandScoreColor(feedback.overallBandScore)} ${feedback.overallBandScore * 11.11}%, var(--bg-tertiary) 0)` }}
                      >
                        <div className="score-inner">
                          <span className="score-value">{feedback.overallBandScore}</span>
                          <span className="score-label">Band</span>
                        </div>
                      </div>
                    </div>

                    <div className="sub-scores">
                      <div className="sub-score">
                        <span className="sub-label">Akıcılık</span>
                        <span className="sub-value" style={{ color: getBandScoreColor(feedback.fluencyScore) }}>
                          {feedback.fluencyScore}
                        </span>
                      </div>
                      <div className="sub-score">
                        <span className="sub-label">Kelime</span>
                        <span className="sub-value" style={{ color: getBandScoreColor(feedback.vocabularyScore) }}>
                          {feedback.vocabularyScore}
                        </span>
                      </div>
                      <div className="sub-score">
                        <span className="sub-label">Dilbilgisi</span>
                        <span className="sub-value" style={{ color: getBandScoreColor(feedback.grammarScore) }}>
                          {feedback.grammarScore}
                        </span>
                      </div>
                      <div className="sub-score">
                        <span className="sub-label">Telaffuz</span>
                        <span className="sub-value" style={{ color: getBandScoreColor(feedback.pronunciationScore) }}>
                          {feedback.pronunciationScore}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Voice Feedback Toggle */}
                  <div className="voice-feedback-controls">
                    <button
                      className={`voice-toggle ${voiceFeedbackEnabled ? 'enabled' : ''}`}
                      onClick={() => setVoiceFeedbackEnabled(!voiceFeedbackEnabled)}
                    >
                      {voiceFeedbackEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                      <span>Sesli Geri Bildirim</span>
                    </button>

                    {isSpeakingFeedback && (
                      <button className="stop-voice-btn" onClick={stopVoiceFeedback}>
                        <Square size={16} />
                        <span>Durdur</span>
                      </button>
                    )}

                    {!isSpeakingFeedback && voiceFeedbackEnabled && feedback.overallBandScore > 0 && (
                      <button
                        className="play-feedback-btn"
                        onClick={() => playVoiceFeedback(feedback)}
                      >
                        <Play size={16} />
                        <span>Geri Bildirimi Dinle</span>
                      </button>
                    )}
                  </div>

                  {/* Transcript */}
                  <div className="transcript-section">
                    <h3>
                      <MessageSquare size={18} />
                      Söyledikleriniz
                    </h3>
                    <div className="transcript-text">
                      {feedback.transcript || 'Transkript oluşturulamadı.'}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="summary-section">
                    <h3>
                      <BookOpen size={18} />
                      Genel Değerlendirme
                    </h3>
                    <p>{feedback.summary}</p>
                  </div>

                  {/* Corrections */}
                  {feedback.corrections && feedback.corrections.length > 0 && (
                    <div className="corrections-section">
                      <h3>
                        <XCircle size={18} />
                        Düzeltmeler ({feedback.corrections.length})
                      </h3>
                      <div className="corrections-list">
                        {feedback.corrections.map((correction, idx) => (
                          <div key={idx} className="correction-item">
                            <div className="correction-header">
                              <span className={`correction-type type-${correction.type}`}>
                                {correction.type === 'grammar' ? 'Dilbilgisi' :
                                  correction.type === 'vocabulary' ? 'Kelime' :
                                    correction.type === 'pronunciation' ? 'Telaffuz' : 'Akıcılık'}
                              </span>
                            </div>
                            <div className="correction-content">
                              <div className="correction-comparison">
                                <span className="original">"{correction.original}"</span>
                                <span className="arrow">→</span>
                                <span className="corrected">"{correction.corrected}"</span>
                              </div>
                              <p className="correction-explanation">{correction.explanation}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {feedback.suggestions && feedback.suggestions.length > 0 && (
                    <div className="suggestions-section">
                      <h3>
                        <CheckCircle2 size={18} />
                        Öneriler
                      </h3>
                      <ul className="suggestions-list">
                        {feedback.suggestions.map((suggestion, idx) => (
                          <li key={idx}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Model Answer */}
                  {feedback.modelAnswer && (
                    <div className="model-answer-section">
                      <h3>
                        <Sparkles size={18} />
                        Örnek Cevap (Band 7-8)
                      </h3>
                      <div className="model-answer-text">
                        {feedback.modelAnswer}
                      </div>
                    </div>
                  )}

                  {/* Try Again */}
                  <div className="feedback-actions">
                    <button
                      className="try-again-btn"
                      onClick={resetRecordingState}
                    >
                      <RefreshCw size={18} />
                      <span>Bu Soruyu Tekrar Dene</span>
                    </button>
                    <button
                      className="next-question-btn"
                      onClick={loadNextQuestion}
                    >
                      <span>Sonraki Soru</span>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* Error State */}
              {feedback && feedback.overallBandScore === 0 && (
                <div className="error-feedback">
                  <AlertTriangle size={32} />
                  <h3>Analiz Tamamlanamadı</h3>
                  <p>{feedback.summary}</p>
                  <button onClick={resetRecordingState}>
                    <RefreshCw size={18} />
                    <span>Tekrar Dene</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {viewMode === 'history' && (
            <div className="history-mode">
              {sessions.length === 0 ? (
                <div className="empty-history">
                  <History size={48} />
                  <h3>Henüz kayıt yok</h3>
                  <p>Konuşma pratiği yaptıkça kayıtlarınız burada görünecek.</p>
                  <button onClick={() => setViewMode('practice')}>
                    <Mic size={18} />
                    <span>Pratik Yap</span>
                  </button>
                </div>
              ) : (
                <div className="history-list-speaking">
                  {sessions.map(session => (
                    <div key={session.id} className="history-item-speaking">
                      <div className="history-item-header">
                        <div className="history-item-info">
                          <span className="section-tag">{IELTS_SECTION_LABELS[session.question.section].split(' - ')[0]}</span>
                          <span className="topic-tag">{session.question.topic}</span>
                        </div>
                        {session.feedback && session.feedback.overallBandScore > 0 && (
                          <div
                            className="history-score"
                            style={{ color: getBandScoreColor(session.feedback.overallBandScore) }}
                          >
                            Band {session.feedback.overallBandScore}
                          </div>
                        )}
                      </div>

                      <div className="history-question-text">
                        {session.question.questionText}
                      </div>

                      <div className="history-item-meta">
                        <span className="history-date">
                          <Clock size={14} />
                          {new Date(session.startedAt).toLocaleDateString('tr-TR')}
                        </span>
                        <span className="history-duration">
                          {formatTime(session.duration)}
                        </span>
                      </div>

                      <div className="history-item-actions">
                        <button
                          className={`delete-btn ${deleteConfirmId === session.id ? 'confirm' : ''}`}
                          onClick={() => handleDeleteSession(session.id)}
                        >
                          <Trash2 size={16} />
                          <span>{deleteConfirmId === session.id ? 'Onayla' : 'Sil'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === 'stats' && (
            <div className="stats-mode">
              {stats.totalSessions === 0 ? (
                <div className="empty-stats">
                  <BarChart3 size={48} />
                  <h3>Henüz istatistik yok</h3>
                  <p>Konuşma pratiği yaptıkça performans istatistikleriniz burada görünecek.</p>
                  <button onClick={() => setViewMode('practice')}>
                    <Mic size={18} />
                    <span>Pratik Yap</span>
                  </button>
                </div>
              ) : (
                <div className="stats-content">
                  {/* Overall Stats */}
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon">
                        <Target size={24} />
                      </div>
                      <div className="stat-info">
                        <span className="stat-value">{stats.totalSessions}</span>
                        <span className="stat-label">Toplam Pratik</span>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon band-icon" style={{ background: getBandScoreColor(stats.averageBandScore) }}>
                        <span>{stats.averageBandScore}</span>
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Ortalama Band</span>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon fluency-icon">
                        <span>{stats.averageFluencyScore}</span>
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Ortalama Akıcılık</span>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon vocab-icon">
                        <span>{stats.averageVocabularyScore}</span>
                      </div>
                      <div className="stat-info">
                        <span className="stat-label">Ortalama Kelime</span>
                      </div>
                    </div>
                  </div>

                  {/* Section Breakdown */}
                  <div className="section-breakdown">
                    <h3>Bölüm Dağılımı</h3>
                    <div className="section-bars">
                      {(['section1', 'section2', 'section3'] as IELTSSpeakingSection[]).map(section => {
                        const count = stats.sessionsBySection[section] || 0;
                        const percentage = stats.totalSessions > 0 ? (count / stats.totalSessions) * 100 : 0;
                        return (
                          <div key={section} className="section-bar-item">
                            <div className="section-bar-label">
                              <span>{IELTS_SECTION_LABELS[section].split(' - ')[0]}</span>
                              <span>{count} pratik</span>
                            </div>
                            <div className="section-bar">
                              <div
                                className="section-bar-fill"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Score Breakdown */}
                  <div className="score-breakdown">
                    <h3>Puan Dağılımı</h3>
                    <div className="score-bars">
                      {[
                        { label: 'Akıcılık', value: stats.averageFluencyScore },
                        { label: 'Kelime', value: stats.averageVocabularyScore },
                        { label: 'Dilbilgisi', value: stats.averageGrammarScore },
                        { label: 'Telaffuz', value: stats.averagePronunciationScore }
                      ].map(item => (
                        <div key={item.label} className="score-bar-item">
                          <div className="score-bar-label">
                            <span>{item.label}</span>
                            <span style={{ color: getBandScoreColor(item.value) }}>{item.value}</span>
                          </div>
                          <div className="score-bar">
                            <div
                              className="score-bar-fill"
                              style={{
                                width: `${(item.value / 9) * 100}%`,
                                background: getBandScoreColor(item.value)
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Clear Data */}
                  <div className="clear-data-section">
                    <button
                      className="clear-data-btn"
                      onClick={handleClearData}
                    >
                      <Trash2 size={16} />
                      <span>Tüm Verileri Temizle</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden audio elements */}
      <audio
        ref={audioRef}
        src={audioUrl || ''}
        onEnded={handleAudioEnd}
        style={{ display: 'none' }}
      />
      <audio
        ref={feedbackAudioRef}
        style={{ display: 'none' }}
      />
    </div>
  );
}

