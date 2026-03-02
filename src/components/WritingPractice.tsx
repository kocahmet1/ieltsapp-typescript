import React, { useState, useEffect, useMemo } from 'react';
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
  RotateCcw
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

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setViewMode('write');
      setSelectedPrompt(null);
      setWritingText('');
      setCurrentFeedback(null);
      setSelectedSubmission(null);
      setIsVoiceTutorOpen(false);
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
  };

  // Handle new writing
  const handleNewWriting = () => {
    setViewMode('write');
    setSelectedPrompt(null);
    setWritingText('');
    setCurrentFeedback(null);
    setSelectedSubmission(null);
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

  // Render highlighted text with errors
  const renderHighlightedText = (text: string, errors: GrammarError[]) => {
    if (!errors || errors.length === 0) {
      return <p className="original-text">{text}</p>;
    }

    // Sort errors by start index
    const sortedErrors = [...errors].sort((a, b) => a.startIndex - b.startIndex);

    const elements: React.JSX.Element[] = [];
    let lastIndex = 0;

    sortedErrors.forEach((error, idx) => {
      // Add text before error
      if (error.startIndex > lastIndex) {
        elements.push(
          <span key={`text-${idx}`}>
            {text.slice(lastIndex, error.startIndex)}
          </span>
        );
      }

      // Add error highlight
      elements.push(
        <span
          key={`error-${idx}`}
          className="error-highlight"
          title={`${error.explanation}\nÖnerilen: ${error.suggestion}`}
        >
          {error.text}
          <span className="error-tooltip">
            <strong>{GRAMMAR_CATEGORY_LABELS[error.category]}</strong>
            <span className="tooltip-suggestion">→ {error.suggestion}</span>
          </span>
        </span>
      );

      lastIndex = error.endIndex;
    });

    // Add remaining text
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
      <div className="writing-practice-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="writing-header">
          <div className="writing-title">
            <PenLine size={24} />
            <h2>Yazma Pratiği</h2>
          </div>
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

        {/* Content */}
        <div className="writing-content">
          {/* Write Mode */}
          {viewMode === 'write' && (
            <div className="write-mode">
              {/* OpenAI Warning */}
              {!isOpenAIConfigured && (
                <div className="api-warning">
                  <AlertCircle size={20} />
                  <span>OpenAI API yapılandırılmamış. Geri bildirim almak için API anahtarını ayarlayın.</span>
                </div>
              )}

              {/* Prompt Selector */}
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
                      onClick={() => {
                        setSelectedPrompt(null);
                        setShowPromptSelector(false);
                      }}
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
                        onClick={() => {
                          setSelectedPrompt(prompt);
                          setShowPromptSelector(false);
                        }}
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

              {/* Selected Prompt Info */}
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

              {/* Writing Area */}
              <div className="writing-area">
                <textarea
                  value={writingText}
                  onChange={e => setWritingText(e.target.value)}
                  placeholder="İngilizce yazınızı buraya yazın..."
                  disabled={isSubmitting}
                />
                <div className="writing-footer">
                  <div className="word-count">
                    <span className={wordLimitStatus?.type || ''}>
                      {wordCount} kelime
                    </span>
                    {wordLimitStatus && (
                      <span className={`word-status ${wordLimitStatus.type}`}>
                        {wordLimitStatus.message}
                      </span>
                    )}
                  </div>
                  <button
                    className="submit-btn"
                    onClick={handleSubmit}
                    disabled={!writingText.trim() || isSubmitting || !isOpenAIConfigured}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="spinner" />
                        <span>Analiz ediliyor...</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>Gönder ve Analiz Et</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Result Mode */}
          {viewMode === 'result' && currentFeedback && (
            <div className="result-mode">
              {/* Score Cards */}
              <div className="score-cards">
                <div className="score-card main">
                  <Award size={32} style={{ color: getScoreColor(currentFeedback.overallScore) }} />
                  <div className="score-info">
                    <span
                      className="score-value"
                      style={{ color: getScoreColor(currentFeedback.overallScore) }}
                    >
                      {currentFeedback.overallScore}
                    </span>
                    <span className="score-label">Genel Puan</span>
                  </div>
                </div>
                <div className="score-card">
                  <div className="score-mini">
                    <span
                      className="score-value"
                      style={{ color: getScoreColor(currentFeedback.grammarScore) }}
                    >
                      {currentFeedback.grammarScore}
                    </span>
                    <span className="score-label">Dilbilgisi</span>
                  </div>
                </div>
                <div className="score-card">
                  <div className="score-mini">
                    <span
                      className="score-value"
                      style={{ color: getScoreColor(currentFeedback.vocabularyScore) }}
                    >
                      {currentFeedback.vocabularyScore}
                    </span>
                    <span className="score-label">Kelime</span>
                  </div>
                </div>
                <div className="score-card">
                  <div className="score-mini">
                    <span
                      className="score-value"
                      style={{ color: getScoreColor(currentFeedback.structureScore) }}
                    >
                      {currentFeedback.structureScore}
                    </span>
                    <span className="score-label">Yapı</span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="feedback-summary">
                <h3>
                  <Sparkles size={20} />
                  Özet Değerlendirme
                </h3>
                <p>{currentFeedback.summary}</p>
              </div>

              {/* Original Text with Errors */}
              <div className="text-analysis">
                <h3>
                  <FileText size={20} />
                  Metin Analizi
                  {currentFeedback.errors.length > 0 && (
                    <span className="error-count">{currentFeedback.errors.length} hata bulundu</span>
                  )}
                </h3>
                <div className="text-box original">
                  {renderHighlightedText(writingText, currentFeedback.errors)}
                </div>
              </div>

              {/* Error List */}
              {currentFeedback.errors.length > 0 && (
                <div className="error-list">
                  <h3>
                    <AlertCircle size={20} />
                    Hatalar ve Düzeltmeler
                  </h3>
                  {currentFeedback.errors.map((error, idx) => (
                    <div key={idx} className="error-item">
                      <div className="error-header">
                        <span className="error-num">#{idx + 1}</span>
                        <span className="error-category">
                          {GRAMMAR_CATEGORY_LABELS[error.category]}
                        </span>
                      </div>
                      <div className="error-content">
                        <div className="error-comparison">
                          <span className="error-wrong">
                            <X size={14} />
                            {error.text}
                          </span>
                          <span className="error-arrow">→</span>
                          <span className="error-correct">
                            <CheckCircle size={14} />
                            {error.suggestion}
                          </span>
                        </div>
                        <p className="error-explanation">{error.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Corrected Text */}
              {currentFeedback.correctedText && (
                <div className="corrected-text-section">
                  <h3>
                    <CheckCircle size={20} />
                    Düzeltilmiş Metin
                  </h3>
                  <div className="text-box corrected">
                    <p>{currentFeedback.correctedText}</p>
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {currentFeedback.suggestions.length > 0 && (
                <div className="suggestions-section">
                  <h3>
                    <Target size={20} />
                    Geliştirme Önerileri
                  </h3>
                  <ul className="suggestions-list">
                    {currentFeedback.suggestions.map((suggestion, idx) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="result-actions">
                <button
                  className="voice-tutor-btn"
                  onClick={() => setIsVoiceTutorOpen(true)}
                  title="Sesli geri bildirim al"
                >
                  <Sparkles size={18} />
                  <span>Sesli Öğretmen</span>
                </button>
                <button className="new-writing-btn" onClick={handleNewWriting}>
                  <RotateCcw size={18} />
                  <span>Yeni Yazı Yaz</span>
                </button>
              </div>
            </div>
          )}

          {/* History Mode */}
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
                          <button
                            className="view-btn"
                            onClick={() => handleViewSubmission(submission)}
                          >
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

      {currentFeedback && isVoiceTutorOpen && (
        <VoiceTutor
          isOpen={isVoiceTutorOpen}
          onClose={() => setIsVoiceTutorOpen(false)}
          mode="writing"
          writingPrompt={selectedPrompt?.title}
          originalText={writingText}
          correctedText={currentFeedback.correctedText}
          feedbackSummary={currentFeedback.summary}
          feedbackErrors={currentFeedback.errors}
          autoStart={true}
        />
      )}
    </div>
  );
};

