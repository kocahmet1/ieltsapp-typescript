import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check, AlertCircle, Lightbulb, Award, RotateCcw, Headphones } from 'lucide-react';
import { GrammarTopic } from '../types/grammarLesson';
import { grammarLessons } from '../data/grammarLessons';
import { updateLessonProgress } from '../services/grammarLessonService';
import { VoiceTutor } from './VoiceTutor';

interface GrammarLessonViewProps {
    topic: GrammarTopic;
    onClose: () => void;
    onComplete: () => void;
}


type ViewMode = 'learn' | 'quiz-selection' | 'practice' | 'results';

const parseBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            const boldText = part.replace(/\*\*/g, '');
            const isGrammarTerm = boldText.includes(':') ||
                ['Form', 'Usage', 'Examples', 'Note', 'Remember', 'Signal Words'].some(word => boldText.startsWith(word));
            return (
                <strong
                    key={idx}
                    className={isGrammarTerm ? 'grammar-term' : 'highlight-text'}
                >
                    {boldText}
                </strong>
            );
        }
        return <span key={idx}>{part}</span>;
    });
};

export function GrammarLessonView({ topic, onClose, onComplete }: GrammarLessonViewProps) {
    const lesson = grammarLessons.find(l => l.topic === topic);
    const [viewMode, setViewMode] = useState<ViewMode>('learn');
    const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
    const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Map<number, string>>(new Map());
    const [showFeedback, setShowFeedback] = useState<Map<number, boolean>>(new Map());
    const [showHint, setShowHint] = useState<Map<number, boolean>>(new Map());
    const [activeSection, setActiveSection] = useState(0);
    const [showVoiceTutor, setShowVoiceTutor] = useState(false);

    if (!lesson) {
        return <div>Lesson not found</div>;
    }

    const handleAnswer = (exerciseId: number, answer: string) => {
        const newAnswers = new Map(userAnswers);
        newAnswers.set(exerciseId, answer);
        setUserAnswers(newAnswers);

        // Show feedback immediately
        const newFeedback = new Map(showFeedback);
        newFeedback.set(exerciseId, true);
        setShowFeedback(newFeedback);
    };

    const toggleHint = (exerciseId: number) => {
        const newHints = new Map(showHint);
        newHints.set(exerciseId, !newHints.get(exerciseId));
        setShowHint(newHints);
    };

    const handleCompleteLesson = () => {
        // Calculate results
        const exerciseResults = new Map<number, boolean>();
        lesson.exercises.forEach(ex => {
            const userAnswer = userAnswers.get(ex.id);
            const isCorrect = userAnswer === ex.correctAnswer;
            exerciseResults.set(ex.id, isCorrect);
        });

        // Save progress
        updateLessonProgress(topic, exerciseResults, true);

        setViewMode('results');
    };

    const handleRetry = () => {
        setUserAnswers(new Map());
        setShowFeedback(new Map());
        setShowHint(new Map());
        setCurrentExerciseIndex(0);
        setViewMode('quiz-selection');
    };

    const handleStartQuiz = (quizId: number) => {
        setSelectedQuizId(quizId);
        setCurrentExerciseIndex(0);
        setUserAnswers(new Map());
        setShowFeedback(new Map());
        setShowHint(new Map());
        setViewMode('practice');
    };

    const getFilteredExercises = () => {
        if (!selectedQuizId) return lesson.exercises;
        return lesson.exercises.filter(ex => ex.quizId === selectedQuizId);
    };

    const filteredExercises = getFilteredExercises();

    const calculateScore = () => {
        let correct = 0;
        filteredExercises.forEach(ex => {
            const userAnswer = userAnswers.get(ex.id);
            if (userAnswer === ex.correctAnswer) correct++;
        });
        return {
            correct,
            total: filteredExercises.length,
            percentage: Math.round((correct / filteredExercises.length) * 100)
        };
    };

    const currentExercise = filteredExercises[currentExerciseIndex];
    const nextExercise = () => {
        if (currentExerciseIndex < filteredExercises.length - 1) {
            setCurrentExerciseIndex(currentExerciseIndex + 1);
        }
    };
    const prevExercise = () => {
        if (currentExerciseIndex > 0) {
            setCurrentExerciseIndex(currentExerciseIndex - 1);
        }
    };

    const allExercisesAnswered = filteredExercises.every(ex => userAnswers.has(ex.id));

    // LEARN MODE
    if (viewMode === 'learn') {
        return (
            <div className="modal-overlay">
                <div className="modal-content grammar-lesson-view-modal">
                    <div className="modal-header">
                        <div className="modal-title">
                            <span className="lesson-icon-large">{lesson.icon}</span>
                            <div>
                                <h2>{lesson.title}</h2>
                                <p className="subtitle">{lesson.description}</p>
                            </div>
                        </div>
                        <button className="close-btn" onClick={onClose}>
                            <X size={24} />
                        </button>
                    </div>

                    <div className="lesson-content-wrapper">
                        {/* Section Tabs */}
                        <div className="lesson-tabs">
                            {lesson.sections.map((section, index) => (
                                <button
                                    key={index}
                                    className={`lesson-tab ${activeSection === index ? 'active' : ''}`}
                                    onClick={() => setActiveSection(index)}
                                >
                                    {section.title}
                                </button>
                            ))}
                            <button
                                className="lesson-tab practice-tab"
                                onClick={() => setViewMode('quiz-selection')}
                            >
                                🎯 Practice
                            </button>
                        </div>

                        {/* Section Content */}
                        <div className="lesson-section-content">
                            {lesson.sections[activeSection].type === 'theory' && (
                                <div className="theory-section">
                                    <h3>{lesson.sections[activeSection].title}</h3>
                                    <div className="theory-content">
                                        {(() => {
                                            const content = lesson.sections[activeSection].content || '';
                                            const lines = content.split('\n');
                                            const elements: React.ReactNode[] = [];
                                            let currentList: React.ReactNode[] = [];

                                            for (let i = 0; i < lines.length; i++) {
                                                const line = lines[i].trim();

                                                if (!line) {
                                                    if (currentList.length > 0) {
                                                        elements.push(<ul key={`list-${i}`} className="theory-list">{currentList}</ul>);
                                                        currentList = [];
                                                    }
                                                    continue;
                                                }

                                                // Handle Callouts
                                                if (line.startsWith('> [')) {
                                                    const typeMatch = line.match(/^> \[!(NOTE|TIP|WARNING|IMPORTANT)\]/);
                                                    if (typeMatch) {
                                                        const type = typeMatch[1].toLowerCase();
                                                        let calloutContent = [];
                                                        let j = i + 1;
                                                        while (j < lines.length && lines[j].startsWith('>')) {
                                                            calloutContent.push(lines[j].replace(/^>\s?/, ''));
                                                            j++;
                                                        }
                                                        i = j - 1; // Advance loop

                                                        const Icon = type === 'tip' ? Lightbulb :
                                                            type === 'warning' ? AlertCircle :
                                                                type === 'important' ? AlertCircle : Award;

                                                        elements.push(
                                                            <div key={`callout-${i}`} className={`callout-block callout-${type}`}>
                                                                <div className="callout-icon">
                                                                    <Icon size={20} />
                                                                </div>
                                                                <div className="callout-content">
                                                                    {calloutContent.map((l, idx) => (
                                                                        <p key={idx}>{parseBold(l)}</p>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                        continue;
                                                    }
                                                }

                                                // Handle Lists
                                                if (line.startsWith('- ')) {
                                                    const content = line.replace(/^- /, '');
                                                    currentList.push(<li key={`item-${i}`}>{parseBold(content)}</li>);
                                                    continue;
                                                } else if (currentList.length > 0) {
                                                    elements.push(<ul key={`list-${i}`} className="theory-list">{currentList}</ul>);
                                                    currentList = [];
                                                }

                                                // Handle Headings
                                                if (line.startsWith('**') && line.includes('**:')) {
                                                    elements.push(<h4 key={`h4-${i}`} className="theory-subheading">{line.replace(/\*\*/g, '')}</h4>);
                                                    continue;
                                                }

                                                // Regular Paragraph
                                                elements.push(<p key={`p-${i}`} className="theory-paragraph">{parseBold(line)}</p>);
                                            }

                                            // Cleanup remaining list
                                            if (currentList.length > 0) {
                                                elements.push(<ul key="list-end" className="theory-list">{currentList}</ul>);
                                            }

                                            return elements;
                                        })()}
                                    </div>
                                </div>
                            )}

                            {lesson.sections[activeSection].type === 'examples' && (
                                <div className="examples-section">
                                    <h3>{lesson.sections[activeSection].title}</h3>
                                    <div className="examples-list">
                                        {lesson.sections[activeSection].examples?.map((example, idx) => (
                                            <div key={idx} className="example-card">
                                                <div className="example-sentence">
                                                    {example.sentence}
                                                </div>
                                                {example.highlight && (
                                                    <div className="example-highlight">
                                                        <strong>Focus:</strong> {example.highlight}
                                                    </div>
                                                )}
                                                <div className="example-explanation">
                                                    {example.explanation}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {lesson.sections[activeSection].type === 'tips' && (
                                <div className="tips-section">
                                    <h3>{lesson.sections[activeSection].title}</h3>
                                    <div className="tips-list">
                                        {lesson.sections[activeSection].tips?.map((tip, idx) => (
                                            <div key={idx} className="tip-item">
                                                <Lightbulb size={18} />
                                                <span dangerouslySetInnerHTML={{ __html: tip }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Start Practice Button */}
                        <div className="lesson-actions">
                            <button
                                className="btn-primary btn-large"
                                onClick={() => setViewMode('quiz-selection')}
                            >
                                Start Practice
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // QUIZ SELECTION MODE
    if (viewMode === 'quiz-selection') {
        return (
            <div className="modal-overlay">
                <div className="modal-content grammar-lesson-view-modal">
                    <div className="modal-header">
                        <div className="modal-title">
                            <span className="lesson-icon-large">{lesson.icon}</span>
                            <div>
                                <h2>{lesson.title} - Select Quiz</h2>
                                <p className="subtitle">Choose a quiz to test your knowledge</p>
                            </div>
                        </div>
                        <button className="close-btn" onClick={onClose}>
                            <X size={24} />
                        </button>
                    </div>

                    <div className="quiz-selection-container">
                        <div className="quiz-grid">
                            {[1, 2, 3, 4].map((id) => {
                                const quizExercises = lesson.exercises.filter(ex => ex.quizId === id);
                                const isAvailable = quizExercises.length > 0;

                                return (
                                    <button
                                        key={id}
                                        className={`quiz-select-card ${!isAvailable ? 'disabled' : ''}`}
                                        onClick={() => isAvailable && handleStartQuiz(id)}
                                        disabled={!isAvailable}
                                    >
                                        <div className="quiz-number">{id}</div>
                                        <div className="quiz-info">
                                            <h3>Quiz {id}</h3>
                                            <p>{isAvailable ? `${quizExercises.length} Questions` : 'Coming Soon'}</p>
                                        </div>
                                        {isAvailable && <ChevronRight size={24} />}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="quiz-selection-actions">
                            <button className="btn-secondary" onClick={() => setViewMode('learn')}>
                                <ChevronLeft size={20} />
                                Back to Lesson
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // PRACTICE MODE
    if (viewMode === 'practice') {
        return (
            <div className="modal-overlay">
                <div className="modal-content grammar-lesson-view-modal">
                    <div className="modal-header">
                        <div className="modal-title">
                            <span className="lesson-icon-large">{lesson.icon}</span>
                            <div>
                                <h2>{lesson.title} - Quiz {selectedQuizId}</h2>
                                <p className="subtitle">Exercise {currentExerciseIndex + 1} of {filteredExercises.length}</p>
                            </div>
                        </div>
                        <button className="close-btn" onClick={onClose}>
                            <X size={24} />
                        </button>
                    </div>

                    <div className="practice-progress-bar">
                        <div
                            className="practice-progress-fill"
                            style={{ width: `${((currentExerciseIndex + 1) / filteredExercises.length) * 100}%` }}
                        />
                    </div>

                    <div className="exercise-wrapper">
                        {currentExercise && (
                            <div className="exercise-card">
                                <div className="exercise-header">
                                    <span className="exercise-type">
                                        {currentExercise.type.replace('-', ' ')}
                                    </span>
                                    <span className={`exercise-difficulty ${currentExercise.difficulty}`}>
                                        {currentExercise.difficulty}
                                    </span>
                                </div>

                                <div className="exercise-question">
                                    {currentExercise.question}
                                </div>

                                {/* Multiple Choice / Fill in Blank with options */}
                                {(currentExercise.type === 'multiple-choice' || currentExercise.type === 'fill-in-blank') && currentExercise.options && (
                                    <div className="exercise-options">
                                        {currentExercise.options.map((option, idx) => {
                                            const isSelected = userAnswers.get(currentExercise.id) === option;
                                            const answered = showFeedback.get(currentExercise.id);
                                            const isCorrect = option === currentExercise.correctAnswer;

                                            return (
                                                <button
                                                    key={idx}
                                                    className={`option-btn ${isSelected ? 'selected' : ''} ${answered && isCorrect ? 'correct' : ''} ${answered && isSelected && !isCorrect ? 'incorrect' : ''}`}
                                                    onClick={() => handleAnswer(currentExercise.id, option)}
                                                    disabled={answered}
                                                >
                                                    <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                                                    <span className="option-text">{option}</span>
                                                    {answered && isCorrect && <Check size={20} />}
                                                    {answered && isSelected && !isCorrect && <X size={20} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Error Correction */}
                                {currentExercise.type === 'error-correction' && (
                                    <div className="error-correction-input">
                                        <textarea
                                            placeholder="Type the corrected sentence..."
                                            value={userAnswers.get(currentExercise.id) || ''}
                                            onChange={(e) => handleAnswer(currentExercise.id, e.target.value)}
                                            rows={3}
                                        />
                                        {!showFeedback.get(currentExercise.id) && (
                                            <button
                                                className="btn-check-answer"
                                                onClick={() => {
                                                    const newFeedback = new Map(showFeedback);
                                                    newFeedback.set(currentExercise.id, true);
                                                    setShowFeedback(newFeedback);
                                                }}
                                                disabled={!userAnswers.get(currentExercise.id)}
                                            >
                                                Check Answer
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Feedback */}
                                {showFeedback.get(currentExercise.id) && (
                                    <div className={`exercise-feedback ${userAnswers.get(currentExercise.id) === currentExercise.correctAnswer ? 'correct' : 'incorrect'}`}>
                                        <div className="feedback-header">
                                            {userAnswers.get(currentExercise.id) === currentExercise.correctAnswer ? (
                                                <>
                                                    <Check size={24} />
                                                    <span>Correct!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <AlertCircle size={24} />
                                                    <span>Incorrect</span>
                                                    <button
                                                        className="voice-tutor-btn"
                                                        onClick={() => setShowVoiceTutor(true)}
                                                        title="Sesli açıklama al ve soru sor"
                                                    >
                                                        <Headphones size={18} />
                                                        <span>Sesli Öğretmen</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        <div className="feedback-content">
                                            <p><strong>Explanation:</strong> {currentExercise.explanation}</p>
                                            {userAnswers.get(currentExercise.id) !== currentExercise.correctAnswer && (
                                                <p><strong>Correct Answer:</strong> {currentExercise.correctAnswer}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Hint */}
                                {currentExercise.hint && !showFeedback.get(currentExercise.id) && (
                                    <div className="exercise-hint-wrapper">
                                        <button
                                            className="btn-hint"
                                            onClick={() => toggleHint(currentExercise.id)}
                                        >
                                            <Lightbulb size={18} />
                                            {showHint.get(currentExercise.id) ? 'Hide Hint' : 'Show Hint'}
                                        </button>
                                        {showHint.get(currentExercise.id) && (
                                            <div className="hint-content">
                                                {currentExercise.hint}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Voice Tutor Modal */}
                        {showVoiceTutor && currentExercise && userAnswers.get(currentExercise.id) !== currentExercise.correctAnswer && (
                            <VoiceTutor
                                isOpen={showVoiceTutor}
                                onClose={() => setShowVoiceTutor(false)}
                                questionText={currentExercise.question}
                                explanation={currentExercise.explanation}
                                studentAnswer={userAnswers.get(currentExercise.id) || ''}
                                correctAnswer={Array.isArray(currentExercise.correctAnswer) ? currentExercise.correctAnswer.join(', ') : currentExercise.correctAnswer}
                            />
                        )}

                        {/* Navigation */}
                        <div className="exercise-navigation">
                            <button
                                className="btn-nav"
                                onClick={prevExercise}
                                disabled={currentExerciseIndex === 0}
                            >
                                <ChevronLeft size={20} />
                                Previous
                            </button>

                            <span className="exercise-counter">
                                {currentExerciseIndex + 1} / {filteredExercises.length}
                            </span>

                            {currentExerciseIndex < filteredExercises.length - 1 ? (
                                <button
                                    className="btn-nav"
                                    onClick={nextExercise}
                                >
                                    Next
                                    <ChevronRight size={20} />
                                </button>
                            ) : (
                                <button
                                    className="btn-complete"
                                    onClick={handleCompleteLesson}
                                    disabled={!allExercisesAnswered}
                                >
                                    Complete Quiz
                                    <Award size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // RESULTS MODE
    const score = calculateScore();
    const passThreshold = 70;
    const passed = score.percentage >= passThreshold;

    return (
        <div className="modal-overlay">
            <div className="modal-content grammar-lesson-view-modal">
                <div className="modal-header">
                    <div className="modal-title">
                        <Award size={28} className={passed ? 'text-success' : 'text-warning'} />
                        <div>
                            <h2>Lesson Complete!</h2>
                            <p className="subtitle">{lesson.title}</p>
                        </div>
                    </div>
                    <button className="close-btn" onClick={() => { onComplete(); onClose(); }}>
                        <X size={24} />
                    </button>
                </div>

                <div className="results-wrapper">
                    <div className="results-score-circle">
                        <svg className="score-circle-svg" viewBox="0 0 200 200">
                            <circle
                                className="score-circle-bg"
                                cx="100"
                                cy="100"
                                r="90"
                            />
                            <circle
                                className="score-circle-fill"
                                cx="100"
                                cy="100"
                                r="90"
                                strokeDasharray={`${(score.percentage / 100) * 565} 565`}
                                style={{ stroke: passed ? '#4CAF50' : '#FF9800' }}
                            />
                        </svg>
                        <div className="score-circle-text">
                            <div className="score-percentage">{score.percentage}%</div>
                            <div className="score-fraction">{score.correct}/{score.total}</div>
                        </div>
                    </div>

                    <div className="results-message">
                        {passed ? (
                            <>
                                <h3 className="text-success">Great Job!</h3>
                                <p>You've successfully completed this lesson. Keep up the excellent work!</p>
                            </>
                        ) : (
                            <>
                                <h3 className="text-warning">Good Effort!</h3>
                                <p>You might want to review the material and try again. Practice makes perfect!</p>
                            </>
                        )}
                    </div>

                    <div className="results-actions">
                        <button className="btn-secondary" onClick={handleRetry}>
                            <RotateCcw size={20} />
                            Try Again
                        </button>
                        <button className="btn-primary" onClick={() => { onComplete(); onClose(); }}>
                            <Check size={20} />
                            Continue
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
