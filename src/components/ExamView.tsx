import { useRef } from 'react';
import { ChevronUp, BarChart3, RefreshCw } from 'lucide-react';
import { Exam, UserAnswer } from '../types';
import { QuestionCard } from './QuestionCard';

interface ExamViewProps {
  exam: Exam;
  userAnswers: Map<number, UserAnswer>;
  onAnswer: (questionId: number, answer: string) => void;
  onAddToVault: (word: string, questionContext: string, questionId: number) => void;
  onResetExam: () => void;
  vocabWordsInVault: string[];
}

export const ExamView = ({
  exam,
  userAnswers,
  onAnswer,
  onAddToVault,
  onResetExam,
  vocabWordsInVault
}: ExamViewProps) => {
  const topRef = useRef<HTMLDivElement>(null);

  // Calculate stats
  const totalAnswered = userAnswers.size;
  const correctCount = Array.from(userAnswers.values()).filter(a => a.isCorrect).length;
  const incorrectCount = totalAnswered - correctCount;
  const percentage = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Group questions by difficulty
  const questionsByDifficulty = exam.questions.reduce((acc, q) => {
    const diff = q.difficulty || 'Unknown';
    if (!acc[diff]) acc[diff] = [];
    acc[diff].push(q);
    return acc;
  }, {} as Record<string, typeof exam.questions>);

  const difficultyOrder = [
    'Starter', 'Elementary', 'Pre-Intermediate', 'Intermediate',
    'Upper Intermediate', 'Advanced', 'Proficiency'
  ];

  return (
    <div className="exam-view" ref={topRef}>
      {/* Sticky Stats Bar */}
      <div className="stats-bar">
        <div className="stats-content">
          <div className="stat-item">
            <BarChart3 size={18} />
            <span className="stat-label">İlerleme:</span>
            <span className="stat-value">{totalAnswered} / {exam.questions.length}</span>
          </div>
          <div className="stat-item correct">
            <span className="stat-label">Doğru:</span>
            <span className="stat-value">{correctCount}</span>
          </div>
          <div className="stat-item incorrect">
            <span className="stat-label">Yanlış:</span>
            <span className="stat-value">{incorrectCount}</span>
          </div>
          <div className="stat-item percentage">
            <span className="stat-label">Başarı:</span>
            <span className="stat-value">%{percentage}</span>
          </div>
          {totalAnswered > 0 && (
            <button className="reset-btn" onClick={onResetExam} title="Sınavı Sıfırla">
              <RefreshCw size={16} />
              <span>Sıfırla</span>
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="progress-bar">
          <div
            className="progress-correct"
            style={{ width: `${(correctCount / exam.questions.length) * 100}%` }}
          />
          <div
            className="progress-incorrect"
            style={{ width: `${(incorrectCount / exam.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Exam Header */}
      <div className="exam-header">
        <h1>{exam.name}</h1>
        {exam.description && <p className="exam-description">{exam.description}</p>}
      </div>

      {/* Questions grouped by difficulty */}
      <div className="questions-container">
        {difficultyOrder.map(difficulty => {
          const questions = questionsByDifficulty[difficulty];
          if (!questions || questions.length === 0) return null;

          return (
            <div key={difficulty} className="difficulty-section">
              <h2 className="difficulty-header">{difficulty}</h2>
              <div className="questions-grid">
                {questions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    questionIndex={exam.questions.indexOf(question)}
                    userAnswer={userAnswers.get(question.id)}
                    onAnswer={onAnswer}
                    onAddToVault={onAddToVault}
                    vocabWordsInVault={vocabWordsInVault}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scroll to top button */}
      <button className="scroll-to-top" onClick={scrollToTop}>
        <ChevronUp size={24} />
      </button>
    </div>
  );
};


