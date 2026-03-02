import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Volume2,
  VolumeX,
  Loader2,
  AlertCircle,
  Sparkles,
  X
} from 'lucide-react';
import {
  RealtimeSession,
  createVoiceTutorSession,
  RealtimeMessage,
  RealtimeEvent,
  AudioData,
  createWritingTutorSession
} from '../services/realtimeService';
import { isMicrophonePermissionGranted } from '../services/microphoneService';
import { AvatarFaceCanvas } from './AvatarFaceCanvas';
import type { VisemeQueue } from '../services/visemeMapper';

interface VoiceTutorProps {
  isOpen: boolean;
  onClose: () => void;
  autoStart?: boolean; // Automatically start conversation when modal opens
  inline?: boolean; // Render without overlay wrapper (embedded mode)
  mode?: 'question' | 'writing';
  // Question mode props
  questionText?: string;
  explanation?: string;
  studentAnswer?: string;
  correctAnswer?: string;
  // Writing mode props
  writingPrompt?: string;
  originalText?: string;
  correctedText?: string;
  feedbackSummary?: string;
  feedbackErrors?: Array<{ text: string; suggestion: string; explanation: string; }>;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
type SpeakingState = 'idle' | 'ai_speaking' | 'user_speaking' | 'processing';

export const VoiceTutor: React.FC<VoiceTutorProps> = ({
  isOpen,
  onClose,
  autoStart = false, // Manual start - user clicks button
  inline = false,    // Embedded mode - no overlay
  mode = 'question',
  questionText,
  explanation,
  studentAnswer,
  correctAnswer,
  writingPrompt,
  originalText,
  correctedText,
  feedbackSummary,
  feedbackErrors
}) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [speakingState, setSpeakingState] = useState<SpeakingState>('idle');
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [aiVolume, setAiVolume] = useState(true);

  const sessionRef = useRef<RealtimeSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasAutoStartedRef = useRef(false);
  const isStartingRef = useRef(false);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.disconnect();
      }
    };
  }, []);

  // Handle events from the realtime session
  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    switch (event.type) {
      case 'connected':
        setConnectionState('connected');
        setError(null);
        break;

      case 'disconnected':
        setConnectionState('disconnected');
        setSpeakingState('idle');
        break;

      case 'speaking_started':
        setSpeakingState('ai_speaking');
        break;

      case 'speaking_stopped':
        setSpeakingState('idle');
        break;

      case 'user_speaking':
        setSpeakingState('user_speaking');
        break;

      case 'user_stopped_speaking':
        setSpeakingState('processing');
        break;

      case 'transcript':
        const transcriptData = event.data as { role: 'user' | 'assistant'; content: string };
        if (transcriptData) {
          setMessages(prev => [...prev, {
            role: transcriptData.role,
            content: transcriptData.content,
            timestamp: new Date()
          }]);
        }
        break;

      case 'error':
        console.error('Realtime error:', event.data);
        setError('Bağlantı hatası oluştu. Lütfen tekrar deneyin.');
        setConnectionState('error');
        break;
    }
  }, []);

  // Start the voice conversation
  const startConversation = useCallback(async () => {
    // Prevent multiple simultaneous starts
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    setConnectionState('connecting');
    setError(null);
    setMessages([]);

    try {
      let session: RealtimeSession;

      if (mode === 'writing') {
        session = createWritingTutorSession(
          writingPrompt,
          originalText || '',
          correctedText || '',
          feedbackSummary || '',
          feedbackErrors || []
        );
      } else {
        session = createVoiceTutorSession(
          questionText || '',
          explanation || '',
          studentAnswer || '',
          correctAnswer || ''
        );
      }

      session.on('all', handleRealtimeEvent);
      sessionRef.current = session;

      await session.connect();
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Ses bağlantısı kurulamadı. Mikrofon izinlerini kontrol edin.'
      );
      setConnectionState('error');
    } finally {
      isStartingRef.current = false;
    }
  }, [questionText, explanation, studentAnswer, correctAnswer, handleRealtimeEvent]);

  // Auto-start conversation when modal opens (only if permission is already granted)
  useEffect(() => {
    if (isOpen && autoStart && !hasAutoStartedRef.current && connectionState === 'disconnected' && !isStartingRef.current) {
      // Check if microphone permission is already granted
      if (isMicrophonePermissionGranted()) {
        hasAutoStartedRef.current = true;
        // Small delay to ensure modal is fully rendered
        const timer = setTimeout(() => {
          startConversation();
        }, 300);
        return () => clearTimeout(timer);
      }
      // If permission not granted, don't auto-start - show the button instead
    }

    // Reset auto-start flag when modal closes
    if (!isOpen) {
      hasAutoStartedRef.current = false;
    }
  }, [isOpen, autoStart, connectionState, startConversation]);

  // End the voice conversation
  const endConversation = () => {
    if (sessionRef.current) {
      sessionRef.current.disconnect();
      sessionRef.current = null;
    }
    setConnectionState('disconnected');
    setSpeakingState('idle');
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    // In a real implementation, we would mute the audio track
  };

  // Toggle AI volume
  const toggleAiVolume = () => {
    setAiVolume(!aiVolume);
    // In a real implementation, we would mute the AI audio output
  };

  // Handle close
  const handleClose = () => {
    endConversation();
    onClose();
  };

  // Get audio data callback for avatar face canvas
  const getAudioData = useCallback((): AudioData => {
    return sessionRef.current?.getAudioData() ?? { level: 0, low: 0, mid: 0, high: 0, isSpeaking: false };
  }, []);

  // Get viseme queue for phoneme-driven lip sync
  const getVisemeQueue = useCallback((): VisemeQueue | null => {
    return sessionRef.current?.getVisemeQueue() ?? null;
  }, []);

  // Get status message based on state
  const getStatusMessage = () => {
    switch (connectionState) {
      case 'connecting':
        return 'Bağlanıyor...';
      case 'connected':
        switch (speakingState) {
          case 'ai_speaking':
            return 'Öğretmen konuşuyor...';
          case 'user_speaking':
            return 'Sizi dinliyorum...';
          case 'processing':
            return 'İşleniyor...';
          default:
            return 'Konuşabilirsiniz';
        }
      case 'error':
        return 'Bağlantı hatası';
      default:
        return 'Bağlantı kesik';
    }
  };

  if (!isOpen) return null;

  // Inline (embedded) mode - no overlay wrapper
  if (inline) {
    return (
      <div className="voice-tutor-inline-wrapper">
        {/* Header */}
        <div className="voice-tutor-header" style={{ borderRadius: 0, background: 'transparent', borderBottom: '1px solid var(--border-primary)' }}>
          <div className="voice-tutor-title">
            <Sparkles size={20} className="sparkle-icon" />
            <h2>Sesli Öğretmen</h2>
          </div>
          <button className="close-btn" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {/* Main Content */}
        <div className="voice-tutor-content">
          <AvatarFaceCanvas
            connectionState={connectionState}
            speakingState={speakingState}
            getAudioData={connectionState === 'connected' ? getAudioData : null}
            getVisemeQueue={connectionState === 'connected' ? getVisemeQueue : null}
          />

          <div className="voice-status">
            <span className={`status-dot ${connectionState}`}></span>
            <span className="status-text">{getStatusMessage()}</span>
          </div>

          {error && (
            <div className="voice-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {messages.length > 0 && (
            <div className="voice-transcript">
              <h3>Konuşma</h3>
              <div className="transcript-messages">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`transcript-message ${msg.role}`}>
                    <span className="message-role">
                      {msg.role === 'assistant' ? '🎓 Öğretmen' : '👤 Sen'}
                    </span>
                    <p className="message-content">{msg.content}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {connectionState === 'disconnected' && !error && (
            <div className="voice-instructions">
              <h3>🎓 Sesli Öğretmen Hazır!</h3>
              <p className="voice-ready-text">
                Yazınızı sesli olarak analiz edeceğim.
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="voice-tutor-controls">
          {connectionState === 'connected' && (
            <>
              <button
                className={`control-btn mute-btn ${isMuted ? 'muted' : ''}`}
                onClick={toggleMute}
                title={isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              <button
                className={`control-btn volume-btn ${!aiVolume ? 'muted' : ''}`}
                onClick={toggleAiVolume}
                title={aiVolume ? 'Sesi Kapat' : 'Sesi Aç'}
              >
                {aiVolume ? <Volume2 size={24} /> : <VolumeX size={24} />}
              </button>
            </>
          )}
          {connectionState === 'connecting' ? (
            <button className="control-btn call-btn connecting" disabled>
              <Loader2 size={24} className="spinner" />
              <span>Bağlanıyor...</span>
            </button>
          ) : connectionState === 'connected' ? (
            <button className="control-btn call-btn end" onClick={endConversation}>
              <PhoneOff size={24} />
              <span>Konuşmayı Bitir</span>
            </button>
          ) : connectionState === 'error' ? (
            <button className="control-btn call-btn start" onClick={startConversation}>
              <Phone size={24} />
              <span>Tekrar Dene</span>
            </button>
          ) : (
            <button className="control-btn call-btn start" onClick={startConversation}>
              <Mic size={24} />
              <span>Mikrofonu Aç ve Başla</span>
            </button>
          )}
        </div>

        <div className="voice-tutor-tip">
          💡 "Neden yanlış?" veya "Daha basit açıklar mısın?" gibi sorular sorabilirsiniz.
        </div>
      </div>
    );
  }

  return (
    <div className="voice-tutor-overlay" onClick={handleClose}>
      <div className="voice-tutor-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="voice-tutor-header">
          <div className="voice-tutor-title">
            <Sparkles size={24} className="sparkle-icon" />
            <h2>Sesli Öğretmen</h2>
          </div>
          <button className="close-btn" onClick={handleClose}>
            <X size={24} />
          </button>
        </div>

        {/* Main Content */}
        <div className="voice-tutor-content">
          {/* Avatar Face (Canvas) */}
          <AvatarFaceCanvas
            connectionState={connectionState}
            speakingState={speakingState}
            getAudioData={connectionState === 'connected' ? getAudioData : null}
            getVisemeQueue={connectionState === 'connected' ? getVisemeQueue : null}
          />

          {/* Status */}
          <div className="voice-status">
            <span className={`status - dot ${connectionState} `}></span>
            <span className="status-text">{getStatusMessage()}</span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="voice-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Transcript */}
          {messages.length > 0 && (
            <div className="voice-transcript">
              <h3>Konuşma</h3>
              <div className="transcript-messages">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`transcript - message ${msg.role} `}
                  >
                    <span className="message-role">
                      {msg.role === 'assistant' ? '🎓 Öğretmen' : '👤 Sen'}
                    </span>
                    <p className="message-content">{msg.content}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* Show instructions when waiting for user to start */}
          {connectionState === 'disconnected' && !error && (
            <div className="voice-instructions">
              <h3>🎓 Sesli Öğretmen Hazır!</h3>
              <p className="voice-ready-text">
                Hatalı cevabınızı sesli olarak açıklayacağım ve sorularınızı yanıtlayacağım.
              </p>
              <ul>
                <li>📖 Hatanızı açıklayacağım</li>
                <li>❓ Takip soruları sorabilirsiniz</li>
                <li>🗣️ Mikrofona konuşarak soru sorun</li>
              </ul>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="voice-tutor-controls">
          {connectionState === 'connected' && (
            <>
              <button
                className={`control - btn mute - btn ${isMuted ? 'muted' : ''} `}
                onClick={toggleMute}
                title={isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>

              <button
                className={`control - btn volume - btn ${!aiVolume ? 'muted' : ''} `}
                onClick={toggleAiVolume}
                title={aiVolume ? 'Sesi Kapat' : 'Sesi Aç'}
              >
                {aiVolume ? <Volume2 size={24} /> : <VolumeX size={24} />}
              </button>
            </>
          )}

          {connectionState === 'connecting' ? (
            <button className="control-btn call-btn connecting" disabled>
              <Loader2 size={24} className="spinner" />
              <span>Bağlanıyor...</span>
            </button>
          ) : connectionState === 'connected' ? (
            <button
              className="control-btn call-btn end"
              onClick={endConversation}
            >
              <PhoneOff size={24} />
              <span>Konuşmayı Bitir</span>
            </button>
          ) : connectionState === 'error' ? (
            <button
              className="control-btn call-btn start"
              onClick={startConversation}
            >
              <Phone size={24} />
              <span>Tekrar Dene</span>
            </button>
          ) : (
            // Show start button - user needs to click once to grant microphone permission
            <button
              className="control-btn call-btn start"
              onClick={startConversation}
            >
              <Mic size={24} />
              <span>Mikrofonu Aç ve Başla</span>
            </button>
          )}
        </div>

        {/* Tip */}
        <div className="voice-tutor-tip">
          💡 İpucu: Öğretmene "Neden yanlış?" "Bunu daha basit açıklar mısın?" veya "Başka bir örnek verir misin?" gibi sorular sorabilirsiniz.
        </div>
      </div>
    </div>
  );
};

