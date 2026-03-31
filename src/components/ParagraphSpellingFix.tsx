import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { CheckCircle, ChevronLeft, RotateCcw, Sparkles, Volume2 } from 'lucide-react';
import { getCharacterDiff } from '../services/spellingForgeService';
import { GrammarError } from '../types';
import '../spelling-forge.css';

// ─── Types ───

interface CharTile {
  /** The character for this tile position (from the CORRECT word) */
  correctChar: string;
  /** What the student originally typed (for 'wrong'), empty for 'missing' */
  originalChar: string;
  /** Tile status from char diff */
  status: 'correct' | 'wrong' | 'missing' | 'extra';
  /** Whether student has fixed this tile */
  fixed: boolean;
  /** Current value in the input */
  currentValue: string;
}

interface MisspelledWord {
  /** The original misspelled text */
  original: string;
  /** The correct spelling */
  correct: string;
  /** The AI's explanation in Turkish */
  explanation: string;
  /** Letter tiles for interactive correction */
  tiles: CharTile[];
  /** Whether all tiles are correctly filled */
  isCompleted: boolean;
}

interface TextSegment {
  type: 'text' | 'misspelled';
  content: string; // for plain text
  wordIndex?: number; // index into misspelledWords array
}

interface ParagraphSpellingFixProps {
  originalText: string;
  errors: GrammarError[];
  onComplete: (stats: { totalWords: number; fixedWords: number; attempts: number }) => void;
  onBack: () => void;
}

// ─── Helpers ───

/**
 * Detect if an error is a spelling error (single word misspelled → single word correction)
 * vs a grammar rewrite (phrase-level changes).
 */
function isSpellingError(error: GrammarError): boolean {
  const text = error.text.trim();
  const suggestion = error.suggestion.trim();
  // Must be a single word (no spaces)
  if (text.includes(' ') || suggestion.includes(' ')) return false;
  // Must actually differ
  if (text.toLowerCase() === suggestion.toLowerCase()) return false;
  // Text and suggestion should be similar length (spelling error, not a word replacement)
  const lenRatio = Math.min(text.length, suggestion.length) / Math.max(text.length, suggestion.length);
  if (lenRatio < 0.4) return false;
  return true;
}

/**
 * Rebuild tiles with correct char mapping by walking the diff and correct word in parallel.
 * (See buildTilesAligned below — this comment is kept for clarity.)
 */

/**
 * Rebuild tiles with correct char mapping by walking the diff and correct word in parallel.
 */
function buildTilesAligned(misspelled: string, correct: string): CharTile[] {
  const diff = getCharacterDiff(misspelled, correct);

  let correctIdx = 0;
  return diff.map((entry) => {
    switch (entry.status) {
      case 'correct':
        correctIdx++;
        return {
          correctChar: entry.char,
          originalChar: entry.char,
          status: 'correct' as const,
          fixed: true,
          currentValue: entry.char
        };
      case 'wrong': {
        const cChar = correct[correctIdx] || entry.char;
        correctIdx++;
        return {
          correctChar: cChar,
          originalChar: entry.char,
          status: 'wrong' as const,
          fixed: false,
          currentValue: entry.char
        };
      }
      case 'missing': {
        const cChar = correct[correctIdx] || entry.char;
        correctIdx++;
        return {
          correctChar: cChar,
          originalChar: '',
          status: 'missing' as const,
          fixed: false,
          currentValue: ''
        };
      }
      case 'extra':
        // Extra chars don't correspond to correct word positions
        return {
          correctChar: '',
          originalChar: entry.char,
          status: 'extra' as const,
          fixed: true,
          currentValue: entry.char
        };
    }
  });
}

// ─── Component ───

export function ParagraphSpellingFix({
  originalText,
  errors,
  onComplete,
  onBack
}: ParagraphSpellingFixProps) {
  // Filter to spelling-only surface errors
  const spellingErrors = useMemo(
    () => errors.filter((e) => e.errorLevel === 'surface' && isSpellingError(e)),
    [errors]
  );

  // Build misspelled word data
  const [misspelledWords, setMisspelledWords] = useState<MisspelledWord[]>(() =>
    spellingErrors.map((err) => {
      const tiles = buildTilesAligned(err.text.trim(), err.suggestion.trim());
      return {
        original: err.text.trim(),
        correct: err.suggestion.trim(),
        explanation: err.explanation,
        tiles,
        isCompleted: false
      };
    })
  );

  const [totalAttempts, setTotalAttempts] = useState(0);
  const [isAllComplete, setIsAllComplete] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const tileRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const completedCount = misspelledWords.filter((w) => w.isCompleted).length;

  // Build segments: tokenize original text, replacing misspelled words with interactive tiles
  const segments = useMemo<TextSegment[]>(() => {
    if (spellingErrors.length === 0) return [{ type: 'text', content: originalText }];

    const result: TextSegment[] = [];
    const usedErrorIndexes = new Set<number>();

    // Sort errors by startIndex for sequential processing
    const sortedErrors = spellingErrors
      .map((err, idx) => ({ err, idx }))
      .sort((a, b) => {
        const aStart = typeof a.err.startIndex === 'number' ? a.err.startIndex : originalText.indexOf(a.err.text);
        const bStart = typeof b.err.startIndex === 'number' ? b.err.startIndex : originalText.indexOf(b.err.text);
        return aStart - bStart;
      });

    let pos = 0;
    for (const { err, idx } of sortedErrors) {
      if (usedErrorIndexes.has(idx)) continue;

      // Find the misspelled text in the remaining part
      const errText = err.text.trim();
      let foundPos = originalText.indexOf(errText, pos);

      // Case-insensitive fallback
      if (foundPos === -1) {
        foundPos = originalText.toLowerCase().indexOf(errText.toLowerCase(), pos);
      }

      if (foundPos === -1) continue;

      usedErrorIndexes.add(idx);

      // Add text before this error
      if (foundPos > pos) {
        result.push({ type: 'text', content: originalText.slice(pos, foundPos) });
      }

      // Add misspelled word segment
      result.push({ type: 'misspelled', content: errText, wordIndex: idx });

      pos = foundPos + errText.length;
    }

    // Add remaining text
    if (pos < originalText.length) {
      result.push({ type: 'text', content: originalText.slice(pos) });
    }

    return result;
  }, [originalText, spellingErrors]);

  // Handle tile input
  const handleTileInput = useCallback(
    (wordIndex: number, tileIndex: number, value: string) => {
      setMisspelledWords((prev) => {
        const next = [...prev];
        const word = { ...next[wordIndex] };
        const tiles = [...word.tiles];
        const tile = { ...tiles[tileIndex] };

        const inputChar = value.slice(-1); // take last char typed
        tile.currentValue = inputChar;
        tile.fixed = inputChar.toLowerCase() === tile.correctChar.toLowerCase();

        tiles[tileIndex] = tile;
        word.tiles = tiles;

        // Check if whole word is complete
        const editableTiles = tiles.filter((t) => t.status === 'wrong' || t.status === 'missing');
        word.isCompleted = editableTiles.every((t) => t.fixed);

        next[wordIndex] = word;
        return next;
      });

      setTotalAttempts((a) => a + 1);

      // Auto-advance to next editable tile
      const word = misspelledWords[wordIndex];
      const inputChar = value.slice(-1);
      const tile = word.tiles[tileIndex];

      if (inputChar.toLowerCase() === tile.correctChar.toLowerCase()) {
        // Find next editable tile in this word
        let nextTile = -1;
        for (let t = tileIndex + 1; t < word.tiles.length; t++) {
          if (
            (word.tiles[t].status === 'wrong' || word.tiles[t].status === 'missing') &&
            !word.tiles[t].fixed
          ) {
            nextTile = t;
            break;
          }
        }

        if (nextTile !== -1) {
          const ref = tileRefs.current.get(`${wordIndex}-${nextTile}`);
          setTimeout(() => ref?.focus(), 50);
        } else {
          // Find next word's first editable tile
          for (let w = wordIndex + 1; w < misspelledWords.length; w++) {
            if (misspelledWords[w].isCompleted) continue;
            const firstEditable = misspelledWords[w].tiles.findIndex(
              (t) => (t.status === 'wrong' || t.status === 'missing') && !t.fixed
            );
            if (firstEditable !== -1) {
              const ref = tileRefs.current.get(`${w}-${firstEditable}`);
              setTimeout(() => ref?.focus(), 50);
              break;
            }
          }
        }
      }
    },
    [misspelledWords]
  );

  // Check completion
  useEffect(() => {
    if (misspelledWords.length > 0 && misspelledWords.every((w) => w.isCompleted)) {
      setIsAllComplete(true);
    }
  }, [misspelledWords]);

  // TTS for word hint
  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Reset all
  const handleReset = () => {
    setMisspelledWords(
      spellingErrors.map((err) => {
        const tiles = buildTilesAligned(err.text.trim(), err.suggestion.trim());
        return {
          original: err.text.trim(),
          correct: err.suggestion.trim(),
          explanation: err.explanation,
          tiles,
          isCompleted: false
        };
      })
    );
    setTotalAttempts(0);
    setIsAllComplete(false);
  };

  // ─── Render ───

  if (spellingErrors.length === 0) {
    return (
      <div className="psf-container">
        <div className="psf-empty">
          <CheckCircle size={48} />
          <h3>Yazım hatası bulunamadı!</h3>
          <p>Bu paragrafta düzeltilecek yazım hatası yok. Harika! 🎉</p>
          <button type="button" className="sf-primary-btn" onClick={onBack}>
            <ChevronLeft size={16} />
            <span>Geri Dön</span>
          </button>
        </div>
      </div>
    );
  }

  if (isAllComplete) {
    return (
      <div className="psf-container">
        <div className="psf-success">
          <div className="psf-success-icon">🎉</div>
          <h3>Tebrikler!</h3>
          <p>Tüm yazım hatalarını başarıyla düzelttiniz!</p>

          <div className="psf-success-stats">
            <div className="psf-stat-card">
              <span className="psf-stat-value">{misspelledWords.length}</span>
              <span className="psf-stat-label">Düzeltilen Kelime</span>
            </div>
            <div className="psf-stat-card">
              <span className="psf-stat-value">{totalAttempts}</span>
              <span className="psf-stat-label">Toplam Deneme</span>
            </div>
            <div className="psf-stat-card">
              <span className="psf-stat-value">
                {Math.round(
                  (misspelledWords.reduce(
                    (sum, w) => sum + w.tiles.filter((t) => t.status === 'wrong' || t.status === 'missing').length,
                    0
                  ) /
                    Math.max(totalAttempts, 1)) *
                    100
                )}
                %
              </span>
              <span className="psf-stat-label">Verimlilik</span>
            </div>
          </div>

          <div className="psf-success-words">
            <h4>Düzelttiğiniz Kelimeler:</h4>
            <div className="psf-word-list">
              {misspelledWords.map((w, i) => (
                <div key={i} className="psf-word-item">
                  <span className="psf-word-wrong">{w.original}</span>
                  <span className="psf-word-arrow">→</span>
                  <span className="psf-word-correct">{w.correct}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="psf-success-actions">
            <button type="button" className="sf-secondary-btn" onClick={handleReset}>
              <RotateCcw size={16} />
              <span>Tekrar Dene</span>
            </button>
            <button
              type="button"
              className="sf-primary-btn"
              onClick={() =>
                onComplete({
                  totalWords: misspelledWords.length,
                  fixedWords: completedCount,
                  attempts: totalAttempts
                })
              }
            >
              <CheckCircle size={16} />
              <span>Tamamlandı</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="psf-container">
      {/* Header */}
      <div className="psf-header">
        <button type="button" className="sf-back-btn" onClick={onBack}>
          <ChevronLeft size={16} />
          <span>Geri</span>
        </button>
        <div className="psf-progress">
          <Sparkles size={18} />
          <span>Yazımını Düzelt</span>
          <span className="psf-progress-count">
            {completedCount} / {misspelledWords.length} düzeltildi
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="psf-progress-bar">
        <div
          className="psf-progress-fill"
          style={{ width: `${(completedCount / misspelledWords.length) * 100}%` }}
        />
      </div>

      {/* Instructions */}
      <div className="psf-instructions">
        <span className="psf-instr-dot red" /> Kırmızı kutular: yanlış harf — doğru harfi yazın
        <span className="psf-instr-dot empty" /> Boş kutular: eksik harf — harfi ekleyin
      </div>

      {/* Paragraph */}
      <div className="psf-paragraph">
        {segments.map((seg, segIdx) => {
          if (seg.type === 'text') {
            return (
              <span key={`seg-${segIdx}`} className="psf-text">
                {seg.content}
              </span>
            );
          }

          // Misspelled word — render as tiles
          const wordIdx = seg.wordIndex!;
          const word = misspelledWords[wordIdx];
          if (!word) return null;

          return (
            <span
              key={`seg-${segIdx}`}
              className={`psf-word ${word.isCompleted ? 'completed' : ''}`}
              title={word.explanation}
            >
              {word.tiles.map((tile, tileIdx) => {
                if (tile.status === 'extra') {
                  return (
                    <span key={tileIdx} className="psf-tile extra">
                      {tile.originalChar}
                    </span>
                  );
                }

                if (tile.status === 'correct') {
                  return (
                    <span key={tileIdx} className="psf-tile correct">
                      {tile.correctChar}
                    </span>
                  );
                }

                // Editable tile (wrong or missing)
                const isFixed = tile.fixed;
                return (
                  <input
                    key={tileIdx}
                    ref={(el) => {
                      if (el) tileRefs.current.set(`${wordIdx}-${tileIdx}`, el);
                    }}
                    className={`psf-tile editable ${tile.status} ${isFixed ? 'fixed' : ''}`}
                    type="text"
                    maxLength={2}
                    value={isFixed ? tile.correctChar : tile.currentValue}
                    onChange={(e) => handleTileInput(wordIdx, tileIdx, e.target.value)}
                    disabled={isFixed}
                    autoComplete="off"
                    spellCheck={false}
                  />
                );
              })}

              {/* Hint button for completed words or speaker */}
              {!word.isCompleted && (
                <button
                  type="button"
                  className={`psf-hint-btn ${isSpeaking ? 'speaking' : ''}`}
                  onClick={() => handleSpeak(word.correct)}
                  title="Doğru telaffuzu dinle"
                >
                  <Volume2 size={14} />
                </button>
              )}

              {word.isCompleted && <span className="psf-word-check">✓</span>}
            </span>
          );
        })}
      </div>

      {/* Word explanations for reference */}
      <div className="psf-explanations">
        <h4>Yazım Hataları Listesi</h4>
        {misspelledWords.map((word, idx) => (
          <div key={idx} className={`psf-explanation-item ${word.isCompleted ? 'done' : ''}`}>
            <div className="psf-explanation-header">
              <span className="psf-explanation-num">#{idx + 1}</span>
              <span className="psf-explanation-wrong">{word.original}</span>
              <span className="psf-explanation-arrow">→</span>
              <span className="psf-explanation-correct">{word.correct}</span>
              {word.isCompleted && <CheckCircle size={16} className="psf-explanation-check" />}
            </div>
            <p className="psf-explanation-text">{word.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
