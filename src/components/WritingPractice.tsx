import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  PenLine,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Award,
  Target,
  Sparkles,
  History,
  RotateCcw,
  ArrowLeft
} from 'lucide-react';
import {
  WritingSubmission,
  WritingPrompt,
  WritingFeedback,
  GrammarError,
  GRAMMAR_CATEGORY_LABELS
} from '../types';
import { VoiceTutor } from './VoiceTutor';

interface WritingPracticeProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: WritingSubmission[];
  prompts: WritingPrompt[];
  onSubmitWriting: (text: string, promptId?: string, promptTitle?: string) => Promise<WritingFeedback | null>;
  onDeleteSubmission: (submissionId: string) => void;
  isOpenAIConfigured: boolean;
}

type ViewMode = 'write' | 'history' | 'result';

export const WritingPractice = ({
  isOpen,
  onClose,
  submissions,
  prompts,
  onSubmitWriting,
  onDeleteSubmission,
  isOpenAIConfigured
}: WritingPracticeProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('write');
  const [selectedPrompt, setSelectedPrompt] = useState<WritingPrompt | null>(null);
  const [writingText, setWritingText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<WritingFeedback | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<WritingSubmission | null>(null);
  const [showPromptSelector, setShowPromptSelector] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isVoiceTutorOpen, setIsVoiceTutorOpen] = useState(false);
  const [mobileShowVoice, setMobileShowVoice] = useState(false);
  const [focusedErrorIndex, setFocusedErrorIndex] = useState<number>(-1);

  // Handle focus_error from VoiceTutor — move avatar to the discussed error
  const handleFocusError = useCallback((errorIndex: number) => {
    setFocusedErrorIndex(errorIndex);

    // Find the error element and scroll it into view
    const errorEl = document.querySelector(`[data-error-index="${errorIndex}"]`);
    if (errorEl) {
      errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setViewMode('write');
      setSelectedPrompt(null);
      setWritingText('');
      setCurrentFeedback(null);
      setSelectedSubmission(null);
      setIsVoiceTutorOpen(false);
      setMobileShowVoice(false);
    }
  }, [isOpen]);

  // Word count calculation
  const wordCount = useMemo(() => {
    if (!writingText.trim()) return 0;
    return writingText.trim().split(/\s+/).filter(w => w.length > 0).length;
  }, [writingText]);

  // Check word limit status
  const wordLimitStatus = useMemo(() => {
    if (!selectedPrompt) return null;
    const { minWords, maxWords } = selectedPrompt;

    if (minWords && wordCount < minWords) {
      return { type: 'warning', message: `En az ${minWords} kelime gerekli (${minWords - wordCount} eksik)` };
    }
    if (maxWords && wordCount > maxWords) {
      return { type: 'error', message: `En fazla ${maxWords} kelime (${wordCount - maxWords} fazla)` };
    }
    if (minWords && maxWords) {
      return { type: 'success', message: `${minWords}-${maxWords} kelime aralığında` };
    }
    return null;
  }, [selectedPrompt, wordCount]);

  // Handle submit
  const handleSubmit = async () => {
    if (!writingText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const feedback = await onSubmitWriting(
        writingText,
        selectedPrompt?.id,
        selectedPrompt?.title || 'Serbest Yazı'
      );

      if (feedback) {
        setCurrentFeedback(feedback);
        setViewMode('result');
        setIsVoiceTutorOpen(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle view submission from history
  const handleViewSubmission = (submission: WritingSubmission) => {
    setSelectedSubmission(submission);
    setCurrentFeedback(submission.feedback || null);
    setWritingText(submission.originalText);
    setViewMode('result');
    setIsVoiceTutorOpen(true);
  };

  // Handle new writing
  const handleNewWriting = () => {
    setViewMode('write');
    setSelectedPrompt(null);
    setWritingText('');
    setCurrentFeedback(null);
    setSelectedSubmission(null);
    setIsVoiceTutorOpen(false);
  };

  // Handle delete
  const handleDelete = (submissionId: string) => {
    if (confirmDelete === submissionId) {
      onDeleteSubmission(submissionId);
      setConfirmDelete(null);
      if (selectedSubmission?.id === submissionId) {
        handleNewWriting();
      }
    } else {
      setConfirmDelete(submissionId);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--accent-green)';
    if (score >= 60) return 'var(--accent-yellow)';
    if (score >= 40) return 'var(--accent-orange)';
    return 'var(--accent-red)';
  };

  // Meta underline color palette — cycles through these for visual distinction
  const META_COLORS = ['#a371f7', '#2dd4bf', '#f97316', '#ec4899', '#3b82f6', '#eab308'];

  // Render highlighted text with errors - uses text matching for robustness
  const renderHighlightedText = (text: string, errors: GrammarError[]) => {
    if (!errors || errors.length === 0) {
      return <p className="original-text">{text}</p>;
    }

    // Find positions for each error via text matching
    type Region = { start: number; end: number; error: GrammarError };
    const allRegions: Region[] = [];
    const usedRanges: Set<string> = new Set();

    for (const error of errors) {
      if (!error.text || error.text.trim() === '') continue;

      const searchText = error.text;
      let bestIndex = -1;
      const suggestedStart = typeof error.startIndex === 'number' ? error.startIndex : 0;

      // Search for all occurrences
      const occurrences: number[] = [];
      let searchFrom = 0;
      while (searchFrom < text.length) {
        const idx = text.indexOf(searchText, searchFrom);
        if (idx === -1) break;
        occurrences.push(idx);
        searchFrom = idx + 1;
      }

      // Case-insensitive fallback
      if (occurrences.length === 0) {
        const lowerText = text.toLowerCase();
        const lowerSearch = searchText.toLowerCase();
        searchFrom = 0;
        while (searchFrom < lowerText.length) {
          const idx = lowerText.indexOf(lowerSearch, searchFrom);
          if (idx === -1) break;
          occurrences.push(idx);
          searchFrom = idx + 1;
        }
      }

      if (occurrences.length > 0) {
        let minDist = Infinity;
        for (const occ of occurrences) {
          const rangeKey = `${occ}-${occ + searchText.length}`;
          if (!usedRanges.has(rangeKey)) {
            const dist = Math.abs(occ - suggestedStart);
            if (dist < minDist) {
              minDist = dist;
              bestIndex = occ;
            }
          }
        }
      }

      if (bestIndex !== -1) {
        const rangeKey = `${bestIndex}-${bestIndex + searchText.length}`;
        usedRanges.add(rangeKey);
        allRegions.push({ start: bestIndex, end: bestIndex + searchText.length, error });
      }
    }

    // Separate surface and meta regions
    const surfaceRegions = allRegions.filter(r => r.error.errorLevel === 'surface');
    const metaRegions = allRegions.filter(r => r.error.errorLevel === 'meta');

    // Sort surface regions and remove same-level overlaps
    surfaceRegions.sort((a, b) => a.start - b.start);
    const filteredSurface: Region[] = [];
    for (const region of surfaceRegions) {
      const last = filteredSurface[filteredSurface.length - 1];
      if (!last || region.start >= last.end) {
        filteredSurface.push(region);
      }
    }

    // For meta regions: split them around surface regions so they don't overlap
    metaRegions.sort((a, b) => a.start - b.start);
    const filteredMeta: Region[] = [];
    for (const meta of metaRegions) {
      // Check if any surface region overlaps this meta region
      let hasOverlap = false;
      for (const surface of filteredSurface) {
        if (surface.start < meta.end && surface.end > meta.start) {
          hasOverlap = true;
          break;
        }
      }
      if (!hasOverlap) {
        // No overlap — keep as is
        const last = filteredMeta[filteredMeta.length - 1];
        if (!last || meta.start >= last.end) {
          filteredMeta.push(meta);
        }
      }
      // If overlaps with surface, skip it from rendering (it's still in the meta error cards)
    }

    // Merge all regions sorted by position
    const allFiltered = [...filteredSurface, ...filteredMeta].sort((a, b) => a.start - b.start);

    // Track meta color index for cycling
    let metaColorIdx = 0;

    // Build highlighted elements
    const elements: React.JSX.Element[] = [];
    let lastIndex = 0;

    allFiltered.forEach((region, idx) => {
      if (region.start > lastIndex) {
        elements.push(
          <span key={`text-${idx}`}>
            {text.slice(lastIndex, region.start)}
          </span>
        );
      }

      if (region.error.errorLevel === 'meta') {
        const color = META_COLORS[metaColorIdx % META_COLORS.length];
        metaColorIdx++;
        elements.push(
          <span
            key={`error-${idx}`}
            className="error-highlight-meta"
            style={{ borderBottomColor: color }}
            title={`${region.error.explanation}\nÖnerilen: ${region.error.suggestion}`}
          >
            {text.slice(region.start, region.end)}
            <span className="error-tooltip" style={{ borderColor: color }}>
              <strong>{GRAMMAR_CATEGORY_LABELS[region.error.category]}</strong>
              <span className="tooltip-suggestion">→ {region.error.suggestion}</span>
            </span>
          </span>
        );
      } else {
        elements.push(
          <span
            key={`error-${idx}`}
            className="error-highlight"
            title={`${region.error.explanation}\nÖnerilen: ${region.error.suggestion}`}
          >
            {text.slice(region.start, region.end)}
            <span className="error-tooltip">
              <strong>{GRAMMAR_CATEGORY_LABELS[region.error.category]}</strong>
              <span className="tooltip-suggestion">→ {region.error.suggestion}</span>
            </span>
          </span>
        );
      }

      lastIndex = region.end;
    });

    if (lastIndex < text.length) {
      elements.push(
        <span key="text-end">{text.slice(lastIndex)}</span>
      );
    }

    return <p className="highlighted-text">{elements}</p>;
  };

  if (!isOpen) return null;

  return (
    <div className="writing-practice-overlay" onClick={onClose}>
      <div className="writing-practice-split" onClick={e => e.stopPropagation()}>

        {/* ===== LEFT PANEL — Voice Tutor ===== */}
        <div className={`writing-left-panel ${isVoiceTutorOpen ? 'voice-active' : ''} ${mobileShowVoice ? 'mobile-show' : 'mobile-hide'}`}>

          <div className="writing-left-header">
            <div className="writing-left-logo">
              <Sparkles size={20} className="sparkle-icon" />
              <span>Sesli Öğretmen</span>
            </div>
            {/* Mobile back button */}
            <button
              className="mobile-back-btn"
              onClick={() => setMobileShowVoice(false)}
              aria-label="Geri dön"
            >
              <ArrowLeft size={20} />
              <span>Geri</span>
            </button>
          </div>

          {isVoiceTutorOpen && currentFeedback ? (
            <div className="writing-voice-tutor-inline">
              <VoiceTutor
                isOpen={true}
                onClose={() => setIsVoiceTutorOpen(false)}
                mode="writing"
                writingPrompt={selectedPrompt?.title}
                originalText={writingText}
                correctedText={currentFeedback.correctedText}
                feedbackSummary={currentFeedback.summary}
                feedbackErrors={currentFeedback.errors}
                autoStart={true}
                inline={true}
                onFocusError={handleFocusError}
              />
            </div>
          ) : (
            <div className="writing-voice-placeholder">
              <div className="voice-placeholder-avatar">
                <svg viewBox="0 0 200 200" className="placeholder-face">
                  <defs>
                    <radialGradient id="bgGrad" cx="50%" cy="40%" r="60%">
                      <stop offset="0%" stopColor="#2a1f3d" />
                      <stop offset="100%" stopColor="#0d1117" />
                    </radialGradient>
                  </defs>
                  <circle cx="100" cy="100" r="90" fill="url(#bgGrad)" stroke="#a371f7" strokeWidth="2" opacity="0.6" />
                  {/* Glow ring */}
                  <circle cx="100" cy="100" r="90" fill="none" stroke="#a371f7" strokeWidth="1" opacity="0.3" />
                  {/* Eyes */}
                  <circle cx="72" cy="88" r="14" fill="#1c2128" stroke="#a371f7" strokeWidth="1.5" />
                  <circle cx="128" cy="88" r="14" fill="#1c2128" stroke="#a371f7" strokeWidth="1.5" />
                  <circle cx="72" cy="88" r="7" fill="#a371f7" opacity="0.9" />
                  <circle cx="128" cy="88" r="7" fill="#a371f7" opacity="0.9" />
                  <circle cx="75" cy="85" r="3" fill="white" opacity="0.8" />
                  <circle cx="131" cy="85" r="3" fill="white" opacity="0.8" />
                  {/* Smile */}
                  <path d="M 78 118 Q 100 132 122 118" stroke="#a371f7" strokeWidth="3" fill="none" strokeLinecap="round" />
                </svg>
              </div>
              <p className="voice-placeholder-text">
                {viewMode === 'write'
                  ? 'Yazınızı tamamlayıp gönderin'
                  : 'Sesli öğretmen hazırlanıyor...'}
              </p>
              <div className="voice-placeholder-steps">
                <div className={`step-item ${viewMode !== 'write' ? 'done' : 'active'}`}>
                  <span className="step-icon">✍️</span>
                  <span>Yaz</span>
                </div>
                <span className="step-arrow">→</span>
                <div className={`step-item ${isVoiceTutorOpen ? 'active' : ''}`}>
                  <span className="step-icon">🎓</span>
                  <span>Sesli Analiz</span>
                </div>
              </div>
              {viewMode === 'result' && !isVoiceTutorOpen && currentFeedback && (
                <button
                  className="activate-voice-btn"
                  onClick={() => setIsVoiceTutorOpen(true)}
                >
                  <Sparkles size={16} />
                  Sesli Öğretmeni Başlat
                </button>
              )}
            </div>
          )}
        </div>

        {/* ===== RIGHT PANEL — Writing Content ===== */}
        <div className={`writing-right-panel ${mobileShowVoice ? 'mobile-hide' : ''}`}>

          {/* Header */}
          <div className="writing-header">
            <div className="writing-title">
              <PenLine size={24} />
              <h2>Yazma Pratiği</h2>
            </div>

            {/* Mini floating avatar — visible on mobile when voice is active but panel is hidden */}
            {isVoiceTutorOpen && !mobileShowVoice && (
              <button
                className="mini-avatar-btn"
                onClick={() => setMobileShowVoice(true)}
                title="Sesli Öğretmeni Aç"
              >
                <div className="mini-avatar-glow" />
                <svg viewBox="0 0 200 200" className="mini-avatar-face">
                  <defs>
                    <radialGradient id="miniBg" cx="50%" cy="40%" r="60%">
                      <stop offset="0%" stopColor="#2a1f3d" />
                      <stop offset="100%" stopColor="#0d1117" />
                    </radialGradient>
                  </defs>
                  <circle cx="100" cy="100" r="95" fill="url(#miniBg)" stroke="#a371f7" strokeWidth="3" />
                  {/* Eyes */}
                  <circle cx="72" cy="85" r="12" fill="#1c2128" stroke="#a371f7" strokeWidth="1.5" />
                  <circle cx="128" cy="85" r="12" fill="#1c2128" stroke="#a371f7" strokeWidth="1.5" />
                  <circle cx="72" cy="85" r="6" fill="#a371f7" opacity="0.9">
                    <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="128" cy="85" r="6" fill="#a371f7" opacity="0.9">
                    <animate attributeName="r" values="5;7;5" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="75" cy="82" r="2.5" fill="white" opacity="0.8" />
                  <circle cx="131" cy="82" r="2.5" fill="white" opacity="0.8" />
                  {/* Animated mouth */}
                  <ellipse cx="100" cy="125" rx="18" ry="8" fill="#a371f7" opacity="0.7">
                    <animate attributeName="ry" values="5;12;8;12;5" dur="0.8s" repeatCount="indefinite" />
                    <animate attributeName="rx" values="16;20;18;20;16" dur="0.8s" repeatCount="indefinite" />
                  </ellipse>
                </svg>
              </button>
            )}

            <div className="writing-header-actions">
              <button
                className={`mode-btn ${viewMode === 'write' ? 'active' : ''}`}
                onClick={handleNewWriting}
              >
                <PenLine size={18} />
                <span>Yeni Yazı</span>
              </button>
              <button
                className={`mode-btn ${viewMode === 'history' ? 'active' : ''}`}
                onClick={() => setViewMode('history')}
              >
                <History size={18} />
                <span>Geçmiş</span>
                {submissions.length > 0 && (
                  <span className="badge">{submissions.length}</span>
                )}
              </button>
            </div>
            <button className="close-btn" onClick={onClose}>
              <X size={24} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="writing-content">

            {/* ── WRITE MODE ── */}
            {viewMode === 'write' && (
              <div className="write-mode">
                {!isOpenAIConfigured && (
                  <div className="api-warning">
                    <AlertCircle size={20} />
                    <span>OpenAI API yapılandırılmamış. Geri bildirim almak için API anahtarını ayarlayın.</span>
                  </div>
                )}

                <div className="prompt-selector-container">
                  <button
                    className="prompt-selector-trigger"
                    onClick={() => setShowPromptSelector(!showPromptSelector)}
                  >
                    <FileText size={18} />
                    <span className="prompt-label">
                      {selectedPrompt ? selectedPrompt.title : 'Konu seçin veya serbest yazın'}
                    </span>
                    {showPromptSelector ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>

                  {showPromptSelector && (
                    <div className="prompt-dropdown">
                      <button
                        className={`prompt-option ${!selectedPrompt ? 'selected' : ''}`}
                        onClick={() => { setSelectedPrompt(null); setShowPromptSelector(false); }}
                      >
                        <Sparkles size={18} />
                        <div className="prompt-option-content">
                          <span className="prompt-name">Serbest Yazı</span>
                          <span className="prompt-desc">İstediğiniz konuda yazın</span>
                        </div>
                      </button>
                      {prompts.map(prompt => (
                        <button
                          key={prompt.id}
                          className={`prompt-option ${selectedPrompt?.id === prompt.id ? 'selected' : ''}`}
                          onClick={() => { setSelectedPrompt(prompt); setShowPromptSelector(false); }}
                        >
                          <Target size={18} />
                          <div className="prompt-option-content">
                            <span className="prompt-name">{prompt.title}</span>
                            <span className="prompt-desc">{prompt.description}</span>
                            <div className="prompt-meta">
                              <span className="prompt-level">{prompt.targetLevel}</span>
                              {prompt.minWords && prompt.maxWords && (
                                <span className="prompt-words">{prompt.minWords}-{prompt.maxWords} kelime</span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedPrompt && (
                  <div className="prompt-info">
                    <h3>{selectedPrompt.title}</h3>
                    <p>{selectedPrompt.description}</p>
                    <div className="prompt-requirements">
                      <span className="level-badge">{selectedPrompt.targetLevel}</span>
                      {selectedPrompt.minWords && (
                        <span className="word-requirement">Min: {selectedPrompt.minWords} kelime</span>
                      )}
                      {selectedPrompt.maxWords && (
                        <span className="word-requirement">Max: {selectedPrompt.maxWords} kelime</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="writing-area">
                  <textarea
                    value={writingText}
                    onChange={e => setWritingText(e.target.value)}
                    placeholder="İngilizce yazınızı buraya yazın..."
                    disabled={isSubmitting}
                  />
                  <div className="writing-footer">
                    <div className="word-count">
                      <span className={wordLimitStatus?.type || ''}>{wordCount} kelime</span>
                      {wordLimitStatus && (
                        <span className={`word-status ${wordLimitStatus.type}`}>{wordLimitStatus.message}</span>
                      )}
                    </div>
                    <button
                      className="submit-btn"
                      onClick={handleSubmit}
                      disabled={!writingText.trim() || isSubmitting || !isOpenAIConfigured}
                    >
                      {isSubmitting ? (
                        <><Loader2 size={18} className="spinner" /><span>Analiz ediliyor...</span></>
                      ) : (
                        <><Send size={18} /><span>Gönder ve Analiz Et</span></>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── RESULT MODE ── */}
            {viewMode === 'result' && currentFeedback && (
              <div className="result-mode">
                <div className="score-cards">
                  <div className="score-card main">
                    <Award size={32} style={{ color: getScoreColor(currentFeedback.overallScore) }} />
                    <div className="score-info">
                      <span className="score-value" style={{ color: getScoreColor(currentFeedback.overallScore) }}>
                        {currentFeedback.overallScore}
                      </span>
                      <span className="score-label">Genel Puan</span>
                    </div>
                  </div>
                  <div className="score-card">
                    <div className="score-mini">
                      <span className="score-value" style={{ color: getScoreColor(currentFeedback.grammarScore) }}>
                        {currentFeedback.grammarScore}
                      </span>
                      <span className="score-label">Dilbilgisi</span>
                    </div>
                  </div>
                  <div className="score-card">
                    <div className="score-mini">
                      <span className="score-value" style={{ color: getScoreColor(currentFeedback.vocabularyScore) }}>
                        {currentFeedback.vocabularyScore}
                      </span>
                      <span className="score-label">Kelime</span>
                    </div>
                  </div>
                  <div className="score-card">
                    <div className="score-mini">
                      <span className="score-value" style={{ color: getScoreColor(currentFeedback.structureScore) }}>
                        {currentFeedback.structureScore}
                      </span>
                      <span className="score-label">Yapı</span>
                    </div>
                  </div>
                </div>

                <div className="feedback-summary">
                  <h3><Sparkles size={20} />Özet Değerlendirme</h3>
                  <p>{currentFeedback.summary}</p>
                </div>

                <div className="text-analysis">
                  <h3>
                    <FileText size={20} />
                    Yazım ve Dilbilgisi
                    {currentFeedback.errors.filter(e => e.errorLevel === 'surface').length > 0 && (
                      <span className="error-count">{currentFeedback.errors.filter(e => e.errorLevel === 'surface').length} hata bulundu</span>
                    )}
                  </h3>
                  <div className="text-box original">
                    {renderHighlightedText(writingText, currentFeedback.errors.filter(e => e.errorLevel === 'surface'))}
                  </div>
                </div>

                {currentFeedback.errors.filter(e => e.errorLevel === 'meta').length > 0 && (
                  <div className="text-analysis">
                    <h3>
                      <Sparkles size={20} />
                      Stil ve Doğallık
                      <span className="meta-error-count">{currentFeedback.errors.filter(e => e.errorLevel === 'meta').length} stil hatası</span>
                    </h3>
                    <div className="text-box original">
                      {renderHighlightedText(writingText, currentFeedback.errors.filter(e => e.errorLevel === 'meta'))}
                    </div>
                  </div>
                )}

                {currentFeedback.errors.filter(e => e.errorLevel === 'surface').length > 0 && (
                  <div className="error-list">
                    <h3><AlertCircle size={20} />Hatalar ve Düzeltmeler</h3>
                    {currentFeedback.errors.filter(e => e.errorLevel === 'surface').map((error, idx) => (
                      <div
                        key={idx}
                        className={`error-item ${focusedErrorIndex === idx ? 'active-error' : ''}`}
                        data-error-index={idx}
                      >
                        <div className="error-header">
                          <span className="error-num">#{idx + 1}</span>
                          <span className="error-category">{GRAMMAR_CATEGORY_LABELS[error.category]}</span>
                        </div>
                        <div className="error-content">
                          <div className="error-comparison">
                            <span className="error-wrong"><X size={14} />{error.text}</span>
                            <span className="error-arrow">→</span>
                            <span className="error-correct"><CheckCircle size={14} />{error.suggestion}</span>
                          </div>
                          <p className="error-explanation">{error.explanation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {currentFeedback.errors.filter(e => e.errorLevel === 'meta').length > 0 && (
                  <div className="error-list meta-error-list">
                    <h3><Sparkles size={20} />Stil ve Yapı Hataları</h3>
                    {currentFeedback.errors.filter(e => e.errorLevel === 'meta').map((error, idx) => (
                      <div
                        key={`meta-${idx}`}
                        className="error-item meta-error-item"
                        data-error-index={`meta-${idx}`}
                      >
                        <div className="error-header meta-error-header">
                          <span className="error-num meta-num">#{idx + 1}</span>
                          <span className="error-category meta-category">{GRAMMAR_CATEGORY_LABELS[error.category]}</span>
                        </div>
                        <div className="error-content">
                          <div className="error-comparison">
                            <span className="error-wrong meta-wrong"><X size={14} />{error.text}</span>
                            <span className="error-arrow">→</span>
                            <span className="error-correct meta-correct"><CheckCircle size={14} />{error.suggestion}</span>
                          </div>
                          <p className="error-explanation">{error.explanation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {currentFeedback.correctedText && (
                  <div className="corrected-text-section">
                    <h3><CheckCircle size={20} />Düzeltilmiş Metin</h3>
                    <div className="text-box corrected">
                      <p>{currentFeedback.correctedText}</p>
                    </div>
                  </div>
                )}

                {currentFeedback.suggestions.length > 0 && (
                  <div className="suggestions-section">
                    <h3><Target size={20} />Geliştirme Önerileri</h3>
                    <ul className="suggestions-list">
                      {currentFeedback.suggestions.map((suggestion, idx) => (
                        <li key={idx}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="result-actions">
                  <button className="new-writing-btn" onClick={handleNewWriting}>
                    <RotateCcw size={18} />
                    <span>Yeni Yazı Yaz</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── HISTORY MODE ── */}
            {viewMode === 'history' && (
              <div className="history-mode">
                {submissions.length === 0 ? (
                  <div className="empty-history">
                    <BookOpen size={48} />
                    <h3>Henüz yazı yok</h3>
                    <p>Yazma pratiği yaparak geçmişinizi oluşturun.</p>
                    <button onClick={handleNewWriting}>
                      <PenLine size={18} />
                      <span>İlk Yazını Yaz</span>
                    </button>
                  </div>
                ) : (
                  <div className="history-list">
                    {submissions.map(submission => (
                      <div key={submission.id} className="history-item">
                        <div className="history-item-header">
                          <div className="history-item-info">
                            <h4>{submission.promptTitle || 'Serbest Yazı'}</h4>
                            <div className="history-item-meta">
                              <span className="history-date">
                                <Clock size={14} />
                                {formatDate(submission.submittedAt)}
                              </span>
                              <span className="history-words">{submission.wordCount} kelime</span>
                              {submission.feedback && (
                                <span
                                  className="history-score"
                                  style={{ color: getScoreColor(submission.feedback.overallScore) }}
                                >
                                  Puan: {submission.feedback.overallScore}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="history-item-actions">
                            <button className="view-btn" onClick={() => handleViewSubmission(submission)}>
                              Görüntüle
                            </button>
                            <button
                              className={`delete-btn ${confirmDelete === submission.id ? 'confirm' : ''}`}
                              onClick={() => handleDelete(submission.id)}
                            >
                              {confirmDelete === submission.id ? 'Emin misiniz?' : <Trash2 size={16} />}
                            </button>
                          </div>
                        </div>
                        <p className="history-item-preview">
                          {submission.originalText.length > 150
                            ? submission.originalText.substring(0, 150) + '...'
                            : submission.originalText}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
