import { Question, GrammarCategory, WritingFeedback, GrammarError, SpeakingFeedback, SpeakingQuestion } from '../types';

const VALID_CATEGORIES: GrammarCategory[] = [
  'past_perfect', 'present_perfect', 'past_simple', 'present_simple',
  'future_tenses', 'continuous_tenses', 'prepositions', 'articles',
  'vocabulary', 'phrasal_verbs', 'conditionals', 'modal_verbs',
  'gerunds_infinitives', 'passive_voice', 'relative_clauses',
  'reported_speech', 'conjunctions', 'idioms_expressions', 'collocations',
  'comparatives_superlatives', 'subject_verb_agreement', 'pronouns',
  'word_order', 'quantifiers', 'other'
];

const API_BASE = '/api/openai';

export interface ExplanationResponse {
  explanation: string;
  grammarCategory: GrammarCategory;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json() as { error?: string; message?: string };
    return data.error || data.message || response.statusText;
  } catch {
    return response.statusText || 'Request failed.';
  }
}

async function apiJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

function isMissingServerKey(error: unknown): boolean {
  return error instanceof Error && /OPENAI_API_KEY|not configured/i.test(error.message);
}

function normalizeCategory(category: GrammarCategory): GrammarCategory {
  return VALID_CATEGORIES.includes(category) ? category : 'other';
}

export async function getExplanation(
  question: Question,
  selectedAnswer: string,
  correctAnswer: string
): Promise<ExplanationResponse> {
  try {
    const response = await apiJson<ExplanationResponse>('/explanation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ question, selectedAnswer, correctAnswer })
    });

    return {
      explanation: response.explanation || 'Açıklama oluşturulamadı.',
      grammarCategory: normalizeCategory(response.grammarCategory)
    };
  } catch (error) {
    console.error('Error getting explanation:', error);

    if (isMissingServerKey(error)) {
      return {
        explanation: 'OpenAI sunucuda yapılandırılmamış. Render ortam değişkenlerine OPENAI_API_KEY ekleyin.',
        grammarCategory: 'other'
      };
    }

    return {
      explanation: error instanceof Error
        ? `Açıklama alınırken hata oluştu: ${error.message}`
        : 'Açıklama alınırken bir hata oluştu. Lütfen tekrar deneyin.',
      grammarCategory: 'other'
    };
  }
}

export function extractVocabularyWords(question: Question): string[] {
  const questionWords = question.questionText
    .replace(/_+/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && /^[a-zA-Z]+$/.test(word));

  const optionWords = question.options
    .map(opt => opt.text)
    .filter(text => text.length > 2 && /^[a-zA-Z\s]+$/.test(text));

  const allWords = [...questionWords, ...optionWords];
  const uniqueWords = [...new Set(allWords.map(word => word.toLowerCase()))];

  return uniqueWords.filter(word => {
    const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'will', 'more', 'when', 'who', 'call', 'find', 'each', 'from', 'their', 'there', 'this', 'that', 'with', 'they', 'were', 'said', 'what', 'your'];
    return !commonWords.includes(word);
  });
}

export async function getWritingFeedback(
  text: string,
  promptTitle?: string
): Promise<WritingFeedback> {
  try {
    return await apiJson<WritingFeedback>('/writing-feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text, promptTitle })
    });
  } catch (error) {
    console.error('Error getting writing feedback:', error);

    if (isMissingServerKey(error)) {
      return getDefaultFeedback('OpenAI sunucuda yapılandırılmamış. Render ortam değişkenlerine OPENAI_API_KEY ekleyin.');
    }

    return getDefaultFeedback(
      error instanceof Error
        ? `Geri bildirim alınırken hata oluştu: ${error.message}`
        : 'Geri bildirim alınırken bir hata oluştu. Lütfen tekrar deneyin.'
    );
  }
}

function getDefaultFeedback(message: string): WritingFeedback {
  return {
    overallScore: 0,
    grammarScore: 0,
    vocabularyScore: 0,
    structureScore: 0,
    errors: [],
    suggestions: [message],
    correctedText: '',
    summary: message
  };
}

export async function getMetaWritingFeedback(text: string): Promise<GrammarError[]> {
  try {
    return await apiJson<GrammarError[]>('/meta-writing-feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
  } catch (error) {
    console.error('Error getting meta writing feedback:', error);
    return [];
  }
}

export async function getFullWritingFeedback(
  text: string,
  promptTitle?: string
): Promise<WritingFeedback> {
  try {
    return await apiJson<WritingFeedback>('/full-writing-feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text, promptTitle })
    });
  } catch (error) {
    console.error('Error getting full writing feedback:', error);

    if (isMissingServerKey(error)) {
      return getDefaultFeedback('OpenAI sunucuda yapılandırılmamış. Render ortam değişkenlerine OPENAI_API_KEY ekleyin.');
    }

    return getDefaultFeedback(
      error instanceof Error
        ? `Geri bildirim alınırken hata oluştu: ${error.message}`
        : 'Geri bildirim alınırken bir hata oluştu. Lütfen tekrar deneyin.'
    );
  }
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const response = await fetch(`${API_BASE}/transcribe`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    return response.text();
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error('Ses kaydı metne çevrilemedi. Lütfen tekrar deneyin.');
  }
}

export async function generateSpeech(
  text: string,
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'
): Promise<ArrayBuffer> {
  try {
    const response = await fetch(`${API_BASE}/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text, voice })
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    return response.arrayBuffer();
  } catch (error) {
    console.error('Error generating speech:', error);
    throw new Error('Ses oluşturulamadı. Lütfen tekrar deneyin.');
  }
}

export async function analyzeSpeaking(
  transcript: string,
  question: SpeakingQuestion
): Promise<SpeakingFeedback> {
  try {
    return await apiJson<SpeakingFeedback>('/speaking-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ transcript, question })
    });
  } catch (error) {
    console.error('Error analyzing speaking:', error);

    if (isMissingServerKey(error)) {
      return getDefaultSpeakingFeedback('OpenAI sunucuda yapılandırılmamış. Render ortam değişkenlerine OPENAI_API_KEY ekleyin.', transcript);
    }

    return getDefaultSpeakingFeedback(
      error instanceof Error ? `Değerlendirme hatası: ${error.message}` : 'Değerlendirme alınırken hata oluştu.',
      transcript
    );
  }
}

function getDefaultSpeakingFeedback(message: string, transcript: string): SpeakingFeedback {
  return {
    overallBandScore: 0,
    fluencyScore: 0,
    vocabularyScore: 0,
    grammarScore: 0,
    pronunciationScore: 0,
    transcript,
    corrections: [],
    suggestions: [message],
    summary: message
  };
}

export function generateVoiceFeedbackText(feedback: SpeakingFeedback): string {
  const bandText = feedback.overallBandScore >= 7 ? 'Excellent performance!' :
    feedback.overallBandScore >= 6 ? 'Good job!' :
      feedback.overallBandScore >= 5 ? 'Nice effort, keep practicing!' :
        'Keep practicing, you can improve!';

  let text = `${bandText} Your overall band score is ${feedback.overallBandScore}. `;
  text += `Fluency: ${feedback.fluencyScore}, Vocabulary: ${feedback.vocabularyScore}, `;
  text += `Grammar: ${feedback.grammarScore}, Pronunciation: ${feedback.pronunciationScore}. `;

  if (feedback.corrections.length > 0) {
    text += `I noticed ${feedback.corrections.length} area${feedback.corrections.length > 1 ? 's' : ''} for improvement. `;
  }

  if (feedback.suggestions.length > 0) {
    text += `Here's a tip: ${feedback.suggestions[0]}`;
  }

  return text;
}
