import React, { useState } from 'react';
import { Check, X, Loader2, ChevronDown, ChevronUp, BookPlus, Headphones } from 'lucide-react';
import { Question, UserAnswer } from '../types';
import { extractVocabularyWords } from '../services/openaiService';
import { VoiceTutor } from './VoiceTutor';

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  userAnswer: UserAnswer | undefined;
  onAnswer: (questionId: number, answer: string) => void;
  onAddToVault: (word: string, questionContext: string, questionId: number) => void;
  vocabWordsInVault: string[];
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionIndex,
  userAnswer,
  onAnswer,
  onAddToVault,
  vocabWordsInVault
}) => {
  const [showExplanation, setShowExplanation] = useState(true);
  const [showVocabOptions, setShowVocabOptions] = useState(false);
  const [showVoiceTutor, setShowVoiceTutor] = useState(false);

  const hasAnswered = userAnswer !== undefined;
  const isCorrect = userAnswer?.isCorrect;
  const isLoading = userAnswer?.isLoading;

  // Get vocabulary words for vocab vault feature
  const vocabWords = extractVocabularyWords(question);

  // Determine difficulty badge color
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'Starter': return 'difficulty-starter';
      case 'Elementary': return 'difficulty-elementary';
      case 'Pre-Intermediate': return 'difficulty-preint';
      case 'Intermediate': return 'difficulty-int';
      case 'Upper Intermediate': return 'difficulty-upperint';
      case 'Advanced': return 'difficulty-advanced';
      case 'Proficiency': return 'difficulty-proficiency';
      default: return '';
    }
  };

  return (
    <div className={`question-card ${hasAnswered ? (isCorrect ? 'correct' : 'incorrect') : ''}`}>
      <div className="question-header">
        <span className="question-number">Soru {questionIndex + 1}</span>
        {question.difficulty && (
          <span className={`difficulty-badge ${getDifficultyColor(question.difficulty)}`}>
            {question.difficulty}
          </span>
        )}
        {hasAnswered && (
          <span className={`answer-indicator ${isCorrect ? 'correct' : 'incorrect'}`}>
            {isCorrect ? <Check size={20} /> : <X size={20} />}
          </span>
        )}
      </div>

      <p className="question-text">{question.questionText}</p>

      <div className="options-container">
        {question.options.map(option => {
          const isSelected = userAnswer?.selectedAnswer === option.letter;
          const isCorrectOption = option.letter === question.correctAnswer;

          let optionClass = 'option-button';
          if (hasAnswered) {
            if (isCorrectOption) {
              optionClass += ' correct-option';
            } else if (isSelected && !isCorrect) {
              optionClass += ' wrong-option';
            }
          }
          if (isSelected) {
            optionClass += ' selected';
          }

          return (
            <button
              key={option.letter}
              className={optionClass}
              onClick={() => !hasAnswered && onAnswer(question.id, option.letter)}
              disabled={hasAnswered}
            >
              <span className="option-letter">{option.letter}</span>
              <span className="option-text">{option.text}</span>
              {hasAnswered && isCorrectOption && (
                <Check size={18} className="option-icon correct" />
              )}
              {hasAnswered && isSelected && !isCorrect && (
                <X size={18} className="option-icon wrong" />
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation Section */}
      {hasAnswered && !isCorrect && (
        <div className="explanation-section">
          <div className="explanation-header">
            <button
              className="explanation-toggle"
              onClick={() => setShowExplanation(!showExplanation)}
            >
              <span>Açıklama</span>
              {showExplanation ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {/* Voice Tutor Button */}
            {!isLoading && userAnswer?.explanation && (
              <button
                className="voice-tutor-btn"
                onClick={() => setShowVoiceTutor(true)}
                title="Sesli açıklama al ve soru sor"
              >
                <Headphones size={18} />
                <span>Sesli Öğretmen</span>
              </button>
            )}
          </div>

          {showExplanation && (
            <div className="explanation-content">
              {isLoading ? (
                <div className="loading-explanation">
                  <Loader2 size={24} className="spinner" />
                  <span>Açıklama hazırlanıyor...</span>
                </div>
              ) : (
                <div className="explanation-text">
                  {userAnswer?.explanation?.split('\n').map((line, idx) => (
                    <p key={idx}>{line}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vocab Vault Option */}
          {vocabWords.length > 0 && (
            <div className="vocab-section">
              <button
                className="vocab-toggle"
                onClick={() => setShowVocabOptions(!showVocabOptions)}
              >
                <BookPlus size={18} />
                <span>Kelime Kasasına Ekle</span>
                {showVocabOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showVocabOptions && (
                <div className="vocab-options">
                  {vocabWords.map(word => {
                    const isInVault = vocabWordsInVault.includes(word.toLowerCase());
                    return (
                      <button
                        key={word}
                        className={`vocab-word-btn ${isInVault ? 'in-vault' : ''}`}
                        onClick={() => !isInVault && onAddToVault(
                          word,
                          question.questionText,
                          question.id
                        )}
                        disabled={isInVault}
                      >
                        <span>{word}</span>
                        {isInVault ? (
                          <Check size={14} />
                        ) : (
                          <BookPlus size={14} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Voice Tutor Modal */}
      {showVoiceTutor && userAnswer?.explanation && (
        <VoiceTutor
          isOpen={showVoiceTutor}
          onClose={() => setShowVoiceTutor(false)}
          questionText={question.questionText}
          explanation={userAnswer.explanation}
          studentAnswer={userAnswer.selectedAnswer}
          correctAnswer={question.correctAnswer}
        />
      )}
    </div>
  );
};
