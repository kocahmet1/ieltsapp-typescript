import OpenAI from 'openai';
import { toFile } from 'openai/uploads';

const VALID_CATEGORIES = [
  'past_perfect', 'present_perfect', 'past_simple', 'present_simple',
  'future_tenses', 'continuous_tenses', 'prepositions', 'articles',
  'vocabulary', 'phrasal_verbs', 'conditionals', 'modal_verbs',
  'gerunds_infinitives', 'passive_voice', 'relative_clauses',
  'reported_speech', 'conjunctions', 'idioms_expressions', 'collocations',
  'comparatives_superlatives', 'subject_verb_agreement', 'pronouns',
  'word_order', 'quantifiers', 'other'
];

const REALTIME_MODEL = 'gpt-4o-realtime-preview-2024-12-17';

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw createHttpError(503, 'OpenAI API key not configured on server. Set OPENAI_API_KEY before using AI features.');
  }

  return new OpenAI({ apiKey });
}

function normalizeCategory(category) {
  return VALID_CATEGORIES.includes(category) ? category : 'other';
}

function getDefaultFeedback(message) {
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

function getDefaultSpeakingFeedback(message, transcript) {
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

function parseJsonContent(content) {
  if (!content) {
    return null;
  }

  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function getExplanation(question, selectedAnswer, correctAnswer) {
  try {
    const openai = getOpenAIClient();

    const optionsText = (question?.options || [])
      .map((opt) => `${opt.letter}) ${opt.text}`)
      .join('\n');

    const selectedOptionText = question?.options?.find((option) => option.letter === selectedAnswer)?.text || selectedAnswer;
    const correctOptionText = question?.options?.find((option) => option.letter === correctAnswer)?.text || correctAnswer;

    const prompt = `Sen bir İngilizce öğretmenisin. Bir öğrenci aşağıdaki soruyu yanlış cevapladı.

**Soru (İngilizce):**
${question?.questionText || ''}

**Seçenekler:**
${optionsText}

**Öğrencinin cevabı:** ${selectedAnswer}) ${selectedOptionText}
**Doğru cevap:** ${correctAnswer}) ${correctOptionText}

Lütfen aşağıdaki JSON formatında yanıt ver:

{
  "grammarCategory": "<CATEGORY>",
  "explanation": "<EXPLANATION>"
}

**grammarCategory** alanı için SADECE aşağıdaki değerlerden BİRİNİ seç:
- past_perfect
- present_perfect
- past_simple
- present_simple
- future_tenses
- continuous_tenses
- prepositions
- articles
- vocabulary
- phrasal_verbs
- conditionals
- modal_verbs
- gerunds_infinitives
- passive_voice
- relative_clauses
- reported_speech
- conjunctions
- idioms_expressions
- collocations
- comparatives_superlatives
- subject_verb_agreement
- pronouns
- word_order
- quantifiers
- other

**explanation** alanında Türkçe olarak, samimi ve öğretici bir açıklama yaz. Önce hatanın nedenini açıkla, sonra doğru cevabı anlat, ardından kuralı öğret ve 2-3 örnek cümle ver.

SADECE JSON formatında yanıt ver.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Sen sıcakkanlı ve deneyimli bir İngilizce öğretmenisin. Türkçe açıklama yap, sadece İngilizce kelimeler ve örnekler İngilizce kalsın. Yanıtını yalnızca JSON ver.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    const parsed = parseJsonContent(content);

    if (!parsed) {
      return {
        explanation: content || 'Açıklama oluşturulamadı.',
        grammarCategory: 'other'
      };
    }

    return {
      explanation: parsed.explanation || 'Açıklama oluşturulamadı.',
      grammarCategory: normalizeCategory(parsed.grammarCategory)
    };
  } catch (error) {
    console.error('Error getting explanation:', error);

    if (error instanceof Error && /not configured/i.test(error.message)) {
      return {
        explanation: 'OpenAI henüz sunucuda yapılandırılmamış. Render ortam değişkenlerine OPENAI_API_KEY ekleyin.',
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

export async function getWritingFeedback(text, promptTitle) {
  try {
    const openai = getOpenAIClient();

    const prompt = `You are an expert English language teacher and proofreader. A student has written the following English text. Your job is to find WORD-LEVEL errors: individual misspelled, misused, missing, or extra words.

${promptTitle ? `**Writing Topic:** ${promptTitle}\n\n` : ''}**Student's Text:**
${text}

## CRITICAL ANALYSIS INSTRUCTIONS

You MUST follow this systematic process:

1. Read the entire text first to understand context and intent.
2. Go through the text word by word.
3. For each word, check spelling, verb form, subject-verb agreement, articles, prepositions, pronouns, capitalization, and missing or extra words.
4. Each error must be 1-3 words maximum.
5. Do not report style issues or full sentence rewrites.
6. Do not skip any word-level error.

## RESPONSE FORMAT

Respond ONLY with valid JSON in this exact format:

{
  "overallScore": <0-100 overall score>,
  "grammarScore": <0-100 grammar score>,
  "vocabularyScore": <0-100 vocabulary score>,
  "structureScore": <0-100 structure score>,
  "errors": [
    {
      "text": "<exact erroneous text>",
      "startIndex": <character start position>,
      "endIndex": <character end position>,
      "suggestion": "<corrected version>",
      "explanation": "<Türkçe açıklama>",
      "category": "<category>"
    }
  ],
  "suggestions": ["<Türkçe öneri 1>", "<Türkçe öneri 2>", "<Türkçe öneri 3>"],
  "correctedText": "<complete corrected text>",
  "summary": "<Türkçe kısa özet>"
}

category must be one of: ${VALID_CATEGORIES.join(', ')}

Respond ONLY with valid JSON.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a meticulous English language expert and proofreader. You analyze text systematically and return only JSON. Explanations must be in Turkish.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 16000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      const refusal = response.choices[0]?.message?.refusal;
      const finishReason = response.choices[0]?.finish_reason;
      return getDefaultFeedback(refusal || `Geri bildirim oluşturulamadı. (Sebep: ${finishReason || 'bilinmiyor'})`);
    }

    const parsed = parseJsonContent(content);
    if (!parsed) {
      return getDefaultFeedback('Geri bildirim ayrıştırılamadı.');
    }

    const errors = (parsed.errors || []).map((err) => ({
      text: err.text || '',
      startIndex: typeof err.startIndex === 'number' ? err.startIndex : 0,
      endIndex: typeof err.endIndex === 'number' ? err.endIndex : 0,
      suggestion: err.suggestion || '',
      explanation: err.explanation || '',
      category: normalizeCategory(err.category),
      errorLevel: 'surface'
    }));

    return {
      overallScore: Math.min(100, Math.max(0, parsed.overallScore || 50)),
      grammarScore: Math.min(100, Math.max(0, parsed.grammarScore || 50)),
      vocabularyScore: Math.min(100, Math.max(0, parsed.vocabularyScore || 50)),
      structureScore: Math.min(100, Math.max(0, parsed.structureScore || 50)),
      errors,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      correctedText: parsed.correctedText || text,
      summary: parsed.summary || 'Geri bildirim özeti oluşturulamadı.'
    };
  } catch (error) {
    console.error('Error getting writing feedback:', error);

    if (error instanceof Error && /not configured/i.test(error.message)) {
      return getDefaultFeedback('OpenAI henüz sunucuda yapılandırılmamış. Render ortam değişkenlerine OPENAI_API_KEY ekleyin.');
    }

    return getDefaultFeedback(
      error instanceof Error
        ? `Geri bildirim alınırken hata oluştu: ${error.message}`
        : 'Geri bildirim alınırken bir hata oluştu. Lütfen tekrar deneyin.'
    );
  }
}

export async function getMetaWritingFeedback(text) {
  try {
    const openai = getOpenAIClient();

    const prompt = `You are an expert English writing coach specializing in style, fluency, and naturalness. A student has written the following English text. Your job is to find HIGHER-LEVEL issues that go beyond spelling and basic grammar.

**Student's Text:**
${text}

Focus only on awkward phrasing, L1 interference, register, transitions, sentence structure, redundancy, weak word choices, unclear references, logical flow, and collocation issues.

Respond ONLY with valid JSON:
{
  "metaErrors": [
    {
      "text": "<exact problematic text>",
      "startIndex": <character start position>,
      "endIndex": <character end position>,
      "suggestion": "<improved version>",
      "explanation": "<Türkçe açıklama>",
      "category": "<vocabulary|collocations|word_order|conjunctions|other>"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert English writing style coach. Focus on higher-level writing quality, explain in Turkish, and return only JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 8000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    const parsed = parseJsonContent(content);
    if (!parsed) {
      return [];
    }

    return (parsed.metaErrors || []).map((err) => ({
      text: err.text || '',
      startIndex: typeof err.startIndex === 'number' ? err.startIndex : 0,
      endIndex: typeof err.endIndex === 'number' ? err.endIndex : 0,
      suggestion: err.suggestion || '',
      explanation: err.explanation || '',
      category: normalizeCategory(err.category),
      errorLevel: 'meta'
    }));
  } catch (error) {
    console.error('Error getting meta writing feedback:', error);
    return [];
  }
}

export async function getFullWritingFeedback(text, promptTitle) {
  const [surfaceFeedback, metaErrors] = await Promise.all([
    getWritingFeedback(text, promptTitle),
    getMetaWritingFeedback(text)
  ]);

  return {
    ...surfaceFeedback,
    errors: [...surfaceFeedback.errors, ...metaErrors]
  };
}

export async function transcribeAudio({ buffer, mimeType, filename }) {
  const openai = getOpenAIClient();

  const file = await toFile(buffer, filename || 'recording.webm', {
    type: mimeType || 'audio/webm'
  });

  const response = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'en',
    response_format: 'text'
  });

  return response;
}

export async function generateSpeech(text, voice = 'nova') {
  const openai = getOpenAIClient();

  const response = await openai.audio.speech.create({
    model: 'tts-1',
    voice,
    input: text,
    response_format: 'mp3'
  });

  return Buffer.from(await response.arrayBuffer());
}

export async function analyzeSpeaking(transcript, question) {
  try {
    const openai = getOpenAIClient();

    const sectionContext = question?.section === 'section1'
      ? 'Bu IELTS Speaking Bölüm 1 sorusudur. Kısa, doğal ve akıcı cevaplar beklenir (15-30 saniye).'
      : question?.section === 'section2'
        ? 'Bu IELTS Speaking Bölüm 2 sorusudur. 1-2 dakikalık detaylı bir konuşma beklenir.'
        : 'Bu IELTS Speaking Bölüm 3 sorusudur. Soyut fikirler ve derinlemesine tartışma beklenir (30-60 saniye).';

    const prompt = `Sen deneyimli bir IELTS Speaking sınav değerlendiricisisin. Bir öğrencinin konuşmasını değerlendir.

**Soru:**
${question?.questionText || ''}

${question?.cueCardPoints ? `**Cue Card Maddeleri:**\n${question.cueCardPoints.map((point, index) => `${index + 1}. ${point}`).join('\n')}\n` : ''}
**Bağlam:**
${sectionContext}

**Öğrencinin Cevabı (Transkript):**
"${transcript}"

Lütfen aşağıdaki JSON formatında değerlendirme yap:
{
  "overallBandScore": <1-9>,
  "fluencyScore": <1-9>,
  "vocabularyScore": <1-9>,
  "grammarScore": <1-9>,
  "pronunciationScore": <1-9>,
  "corrections": [
    {
      "original": "<hatalı ifade>",
      "corrected": "<düzeltilmiş hali>",
      "explanation": "<Türkçe açıklama>",
      "type": "<grammar|vocabulary|pronunciation|fluency>"
    }
  ],
  "suggestions": ["<Türkçe öneri 1>", "<Türkçe öneri 2>", "<Türkçe öneri 3>"],
  "summary": "<Türkçe özet>",
  "modelAnswer": "<Band 7-8 örnek cevap - İngilizce>"
}

SADECE JSON formatında yanıt ver.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Sen deneyimli bir IELTS Speaking sınav değerlendiricisisin. Türkçe açıklama ver, JSON dışında hiçbir şey yazma.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2500,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    const parsed = parseJsonContent(content);

    if (!parsed) {
      return getDefaultSpeakingFeedback('Değerlendirme ayrıştırılamadı.', transcript);
    }

    const corrections = (parsed.corrections || []).map((correction) => ({
      original: correction.original || '',
      corrected: correction.corrected || '',
      explanation: correction.explanation || '',
      type: ['grammar', 'vocabulary', 'pronunciation', 'fluency'].includes(correction.type)
        ? correction.type
        : 'grammar'
    }));

    return {
      overallBandScore: Math.min(9, Math.max(1, parsed.overallBandScore || 5)),
      fluencyScore: Math.min(9, Math.max(1, parsed.fluencyScore || 5)),
      vocabularyScore: Math.min(9, Math.max(1, parsed.vocabularyScore || 5)),
      grammarScore: Math.min(9, Math.max(1, parsed.grammarScore || 5)),
      pronunciationScore: Math.min(9, Math.max(1, parsed.pronunciationScore || 5)),
      transcript,
      corrections,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      summary: parsed.summary || 'Değerlendirme özeti oluşturulamadı.',
      modelAnswer: parsed.modelAnswer
    };
  } catch (error) {
    console.error('Error analyzing speaking:', error);

    if (error instanceof Error && /not configured/i.test(error.message)) {
      return getDefaultSpeakingFeedback('OpenAI henüz sunucuda yapılandırılmamış. Render ortam değişkenlerine OPENAI_API_KEY ekleyin.', transcript);
    }

    return getDefaultSpeakingFeedback(
      error instanceof Error ? `Değerlendirme hatası: ${error.message}` : 'Değerlendirme alınırken hata oluştu.',
      transcript
    );
  }
}

export async function createRealtimeSession(config) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw createHttpError(503, 'OpenAI API key not configured on server. Set OPENAI_API_KEY before using voice tutor.');
  }

  const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: REALTIME_MODEL,
      voice: config.voice,
      instructions: config.instructions,
      input_audio_transcription: config.inputAudioTranscription ? { model: 'whisper-1' } : undefined,
      turn_detection: config.turnDetection || {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
      }
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw createHttpError(response.status, `Failed to create realtime session: ${details || response.statusText}`);
  }

  return response.json();
}
