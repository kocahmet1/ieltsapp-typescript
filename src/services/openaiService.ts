import OpenAI from 'openai';
import { Question, GrammarCategory, WritingFeedback, GrammarError } from '../types';

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
  });
};

// Valid grammar categories for classification
const VALID_CATEGORIES: GrammarCategory[] = [
  'past_perfect', 'present_perfect', 'past_simple', 'present_simple',
  'future_tenses', 'continuous_tenses', 'prepositions', 'articles',
  'vocabulary', 'phrasal_verbs', 'conditionals', 'modal_verbs',
  'gerunds_infinitives', 'passive_voice', 'relative_clauses',
  'reported_speech', 'conjunctions', 'idioms_expressions', 'collocations',
  'comparatives_superlatives', 'subject_verb_agreement', 'pronouns',
  'word_order', 'quantifiers', 'other'
];

// Response type for explanation with category
export interface ExplanationResponse {
  explanation: string;
  grammarCategory: GrammarCategory;
}

export async function getExplanation(
  question: Question,
  selectedAnswer: string,
  correctAnswer: string
): Promise<ExplanationResponse> {
  try {
    const openai = getOpenAIClient();

    // Format the question for the prompt
    const optionsText = question.options
      .map(opt => `${opt.letter}) ${opt.text}`)
      .join('\n');

    const selectedOptionText = question.options.find(o => o.letter === selectedAnswer)?.text || selectedAnswer;
    const correctOptionText = question.options.find(o => o.letter === correctAnswer)?.text || correctAnswer;

    const prompt = `Sen bir İngilizce öğretmenisin. Bir öğrenci aşağıdaki soruyu yanlış cevapladı. 

**Soru (İngilizce):**
${question.questionText}

**Seçenekler:**
${optionsText}

**Öğrencinin cevabı:** ${selectedAnswer}) ${selectedOptionText}
**Doğru cevap:** ${correctAnswer}) ${correctOptionText}

Lütfen aşağıdaki JSON formatında yanıt ver:

{
  "grammarCategory": "<CATEGORY>",
  "explanation": "<EXPLANATION>"
}

**grammarCategory** alanı için SADECE aşağıdaki değerlerden BİRİNİ seç (sorunun ana konusuna göre):
- past_perfect (Past Perfect - had + V3)
- present_perfect (Present Perfect - have/has + V3)
- past_simple (Past Simple - V2)
- present_simple (Present Simple)
- future_tenses (Future - will, going to)
- continuous_tenses (Continuous/Progressive tenses)
- prepositions (Edatlar - in, on, at, etc.)
- articles (Articles - a, an, the)
- vocabulary (Kelime bilgisi / Word choice)
- phrasal_verbs (Phrasal Verbs - get up, look after, etc.)
- conditionals (Conditionals - If clauses)
- modal_verbs (Modal Verbs - can, could, must, etc.)
- gerunds_infinitives (Gerunds & Infinitives - -ing / to + verb)
- passive_voice (Passive Voice)
- relative_clauses (Relative Clauses - who, which, that)
- reported_speech (Reported Speech)
- conjunctions (Conjunctions - and, but, because, etc.)
- idioms_expressions (Idioms & Expressions)
- collocations (Collocations - word combinations)
- comparatives_superlatives (Comparatives & Superlatives)
- subject_verb_agreement (Subject-Verb Agreement)
- pronouns (Pronouns)
- word_order (Word Order)
- quantifiers (Quantifiers - some, any, much, many)
- other (Diğer)

**explanation** alanında Türkçe olarak, öğrenciyle birebir konuşur gibi samimi ve destekleyici bir dil kullan. Sanki karşında oturan bir öğrenciye açıklıyormuş gibi yaz. Şu yapıyı takip et:

1. **Hatanın sebebi:** "Burada senin cevabın yanlış olmasının sebebi şu..." veya "Şimdi bakalım, sen nerede hata yaptın..." gibi samimi bir giriş yap. Öğrencinin seçtiği cevabın neden bu bağlamda uygun olmadığını açıkla.

2. **Doğru cevap:** "Doğru cevap şu olmalıydı çünkü..." veya "Aslında burada ... kullanman gerekiyordu, şöyle düşün..." gibi açıkla.

3. **Konu açıklaması:** "Bu konuyu biraz açayım sana..." veya "Şimdi bu kuralı bir hatırlayalım..." diyerek ilgili gramer konusunu veya kelime kullanımını öğret.

4. **Örnekler:** "Birkaç örnek vereyim, daha iyi anlaşılsın..." diyerek 2-3 örnek cümle ver (İngilizce cümleler, parantez içinde Türkçe çevirileriyle birlikte).

ÖNEMLİ: Resmi başlıklar (1., 2., 3., 4. veya **Neden...**) KULLANMA. Bunun yerine paragraflar halinde, doğal bir konuşma akışı içinde yaz. Sanki bir arkadaşına veya öğrencine sohbet ederek anlatıyormuş gibi samimi ol.

SADECE JSON formatında yanıt ver, başka bir şey yazma.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Sen sıcakkanlı ve deneyimli bir İngilizce öğretmenisin. Öğrencilerle birebir çalışıyor ve onlarla samimi bir dil kullanıyorsun. Sanki karşında oturan öğrencine konuşur gibi açıklama yap - resmi değil, arkadaşça ve destekleyici ol. Yanıtlarını SADECE istenen JSON formatında ver. Açıklamalarını Türkçe yap, sadece İngilizce kelimeler, terimler ve örnek cümleler İngilizce olsun.'
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

    if (!content) {
      return {
        explanation: 'Açıklama oluşturulamadı.',
        grammarCategory: 'other'
      };
    }

    try {
      const parsed = JSON.parse(content);
      const category = VALID_CATEGORIES.includes(parsed.grammarCategory)
        ? parsed.grammarCategory
        : 'other';

      return {
        explanation: parsed.explanation || 'Açıklama oluşturulamadı.',
        grammarCategory: category
      };
    } catch {
      // If JSON parsing fails, return the content as explanation
      return {
        explanation: content,
        grammarCategory: 'other'
      };
    }
  } catch (error) {
    console.error('Error getting explanation:', error);
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return {
          explanation: 'OpenAI API anahtarı yapılandırılmamış. Lütfen .env dosyasında VITE_OPENAI_API_KEY değerini ayarlayın.',
          grammarCategory: 'other'
        };
      }
      return {
        explanation: `Açıklama alınırken hata oluştu: ${error.message}`,
        grammarCategory: 'other'
      };
    }
    return {
      explanation: 'Açıklama alınırken bir hata oluştu. Lütfen tekrar deneyin.',
      grammarCategory: 'other'
    };
  }
}

// Extract vocabulary words from a question (for vocab vault feature)
export function extractVocabularyWords(question: Question): string[] {
  // Extract words from question text (words in blanks or key vocabulary)
  const questionWords = question.questionText
    .replace(/_+/g, '') // Remove blanks
    .split(/\s+/)
    .filter(word => word.length > 3 && /^[a-zA-Z]+$/.test(word));

  // Extract words from options
  const optionWords = question.options
    .map(opt => opt.text)
    .filter(text => text.length > 2 && /^[a-zA-Z\s]+$/.test(text));

  // Combine unique words
  const allWords = [...questionWords, ...optionWords];
  const uniqueWords = [...new Set(allWords.map(w => w.toLowerCase()))];

  return uniqueWords.filter(word => {
    // Filter out very common words
    const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'will', 'more', 'when', 'who', 'been', 'call', 'find', 'each', 'from', 'their', 'there', 'this', 'that', 'with', 'they', 'were', 'said', 'what', 'your'];
    return !commonWords.includes(word);
  });
}

// ===================================
// Writing Practice - AI Feedback
// ===================================

export async function getWritingFeedback(
  text: string,
  promptTitle?: string
): Promise<WritingFeedback> {
  try {
    const openai = getOpenAIClient();

    const prompt = `You are an expert English language teacher and proofreader. A student has written the following English text. Your job is to find WORD-LEVEL errors: individual misspelled, misused, missing, or extra words.

${promptTitle ? `**Writing Topic:** ${promptTitle}\n\n` : ''}**Student's Text:**
${text}

## CRITICAL ANALYSIS INSTRUCTIONS

You MUST follow this systematic process:

1. **Read the ENTIRE text first** to understand context and intent.
2. **Go through the text WORD BY WORD.**
3. For EACH word, check ONLY the following:
   - Spelling errors (typos, commonly confused words like their/there/they're, its/it's)
   - Wrong verb form (tense errors on individual verbs: "provide" → "provides", "says" → "say")
   - Subject-verb agreement errors (on individual verbs)
   - Wrong or missing articles (a/an/the)
   - Wrong or missing prepositions (in/on/at/to/for/with/by)
   - Wrong pronoun or wrong word form
   - Capitalization errors
   - Missing or extra individual words

4. **EACH ERROR must be 1-3 words maximum.** Do NOT flag entire phrases or sentences — only the specific wrong word(s).
5. **DO NOT report style issues, awkward phrasing, or sentence restructuring** — those are handled separately.
6. **DO NOT SKIP ANY word-level error.** Even a single wrong letter matters.
7. **DO NOT STOP EARLY.** Check from the FIRST word to the LAST word.

## RESPONSE FORMAT

Respond ONLY with valid JSON in this exact format:

{
  "overallScore": <0-100 overall score>,
  "grammarScore": <0-100 grammar score>,
  "vocabularyScore": <0-100 vocabulary/word choice score>,
  "structureScore": <0-100 sentence structure and organization score>,
  "errors": [
    {
      "text": "<the exact erroneous text from the original>",
      "startIndex": <character start position in original text>,
      "endIndex": <character end position in original text>,
      "suggestion": "<corrected version>",
      "explanation": "<Türkçe açıklama - neden yanlış ve nasıl düzeltilmeli>",
      "category": "<category from the list below>"
    }
  ],
  "suggestions": [
    "<Türkçe genel öneri 1>",
    "<Türkçe genel öneri 2>",
    "<Türkçe genel öneri 3>"
  ],
  "correctedText": "<the COMPLETE corrected version of the entire text>",
  "summary": "<Türkçe kısa özet - öğrencinin güçlü ve zayıf yönleri>"
}

**category** field must be ONE of these values:
past_perfect, present_perfect, past_simple, present_simple, future_tenses, continuous_tenses, prepositions, articles, vocabulary, phrasal_verbs, conditionals, modal_verbs, gerunds_infinitives, passive_voice, relative_clauses, reported_speech, conjunctions, idioms_expressions, collocations, comparatives_superlatives, subject_verb_agreement, pronouns, word_order, quantifiers, other

## IMPORTANT RULES:
1. List EVERY error individually - do NOT group or merge errors
2. startIndex and endIndex must be exact character positions in the original text
3. Explanations must be in Turkish (except English terms and examples)
4. Provide at least 3 general suggestions
5. Score fairly and constructively
6. Write the corrected text COMPLETELY - do not truncate
7. DOUBLE-CHECK: After listing all errors, re-read the original text one more time to make sure you haven't missed anything

Respond ONLY with valid JSON, nothing else.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a meticulous English language expert and proofreader. You NEVER skip errors. You analyze text systematically, sentence by sentence, and catch every single mistake — no matter how small. You are thorough, precise, and exhaustive in your analysis. Your explanations are in Turkish, but English terms and example sentences remain in English. Respond ONLY in the requested JSON format.'
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
      console.error('Writing feedback: No content in response', { refusal, finishReason, response: response.choices[0] });
      return getDefaultFeedback(refusal || `Geri bildirim oluşturulamadı. (Sebep: ${finishReason || 'bilinmiyor'})`);
    }

    try {
      const parsed = JSON.parse(content);

      // Validate and sanitize errors
      const errors: GrammarError[] = (parsed.errors || []).map((err: GrammarError) => ({
        text: err.text || '',
        startIndex: typeof err.startIndex === 'number' ? err.startIndex : 0,
        endIndex: typeof err.endIndex === 'number' ? err.endIndex : 0,
        suggestion: err.suggestion || '',
        explanation: err.explanation || '',
        category: VALID_CATEGORIES.includes(err.category) ? err.category : 'other',
        errorLevel: 'surface' as const
      }));

      return {
        overallScore: Math.min(100, Math.max(0, parsed.overallScore || 50)),
        grammarScore: Math.min(100, Math.max(0, parsed.grammarScore || 50)),
        vocabularyScore: Math.min(100, Math.max(0, parsed.vocabularyScore || 50)),
        structureScore: Math.min(100, Math.max(0, parsed.structureScore || 50)),
        errors,
        suggestions: parsed.suggestions || [],
        correctedText: parsed.correctedText || text,
        summary: parsed.summary || 'Geri bildirim özeti oluşturulamadı.'
      };
    } catch {
      return getDefaultFeedback('Geri bildirim ayrıştırılamadı.');
    }
  } catch (error) {
    console.error('Error getting writing feedback:', error);
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return getDefaultFeedback('OpenAI API anahtarı yapılandırılmamış. Lütfen .env dosyasında VITE_OPENAI_API_KEY değerini ayarlayın.');
      }
      return getDefaultFeedback(`Geri bildirim alınırken hata oluştu: ${error.message}`);
    }
    return getDefaultFeedback('Geri bildirim alınırken bir hata oluştu. Lütfen tekrar deneyin.');
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

// ===================================
// Meta-Level Writing Analysis (Style, Phrasing, Structure)
// ===================================

export async function getMetaWritingFeedback(
  text: string
): Promise<GrammarError[]> {
  try {
    const openai = getOpenAIClient();

    const prompt = `You are an expert English writing coach specializing in style, fluency, and naturalness. A student has written the following English text. Your job is to find HIGHER-LEVEL issues that go beyond spelling and basic grammar.

**Student's Text:**
${text}

## WHAT TO LOOK FOR

Focus ONLY on these meta-level issues (do NOT report spelling or basic grammar errors):

1. **Awkward/Unnatural phrasing** — Sentences that a native speaker would never write that way
   - Example: "If thinking that way they are kind of right" → "If we think about it that way, they have a point"
2. **L1 interference** — Sentence structures that come from the student's native language but sound wrong in English
3. **Register/Tone issues** — Mixing formal and informal language inappropriately (e.g., "kind of" in an essay)
4. **Missing or weak transitions** — Abrupt topic changes without proper connecting words
5. **Sentence structure problems** — Run-on sentences, sentence fragments, overly long sentences
6. **Redundancy and wordiness** — Unnecessarily repetitive or verbose phrases
7. **Weak word choices** — Using vague or imprecise words where stronger alternatives exist
8. **Unclear references** — Ambiguous pronouns or unclear antecedents
9. **Logical flow issues** — Arguments that don't connect well or lack coherence
10. **Collocation errors** — Word combinations that are grammatically possible but unnatural

## RESPONSE FORMAT

Respond ONLY with valid JSON:

{
  "metaErrors": [
    {
      "text": "<the exact problematic text from the original>",
      "startIndex": <character start position>,
      "endIndex": <character end position>,
      "suggestion": "<improved version>",
      "explanation": "<Türkçe açıklama - neden doğal değil ve nasıl düzeltilmeli>",
      "category": "<category from: vocabulary, collocations, word_order, conjunctions, other>"
    }
  ]
}

## RULES:
1. Do NOT report spelling mistakes or basic grammar errors (those are handled separately)
2. Focus on sentence-level and paragraph-level issues
3. The "text" field must contain the EXACT text from the original
4. Explanations in Turkish, examples in English
5. Be thorough — check every sentence for naturalness

Respond ONLY with valid JSON.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert English writing style coach. You focus on higher-level writing quality: naturalness, fluency, style, and coherence. You do NOT report spelling or basic grammar errors. Your explanations are in Turkish. Respond ONLY in JSON format.'
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
    if (!content) return [];

    try {
      const parsed = JSON.parse(content);
      return (parsed.metaErrors || []).map((err: GrammarError) => ({
        text: err.text || '',
        startIndex: typeof err.startIndex === 'number' ? err.startIndex : 0,
        endIndex: typeof err.endIndex === 'number' ? err.endIndex : 0,
        suggestion: err.suggestion || '',
        explanation: err.explanation || '',
        category: VALID_CATEGORIES.includes(err.category) ? err.category : 'other',
        errorLevel: 'meta' as const
      }));
    } catch {
      console.error('Meta feedback: JSON parse error');
      return [];
    }
  } catch (error) {
    console.error('Error getting meta writing feedback:', error);
    return []; // Meta errors are non-critical, don't fail the whole analysis
  }
}

// ===================================
// Full Writing Analysis (Surface + Meta)
// ===================================

export async function getFullWritingFeedback(
  text: string,
  promptTitle?: string
): Promise<WritingFeedback> {
  // Run both analyses in parallel
  const [surfaceFeedback, metaErrors] = await Promise.all([
    getWritingFeedback(text, promptTitle),
    getMetaWritingFeedback(text)
  ]);

  // Merge meta errors into the feedback
  return {
    ...surfaceFeedback,
    errors: [...surfaceFeedback.errors, ...metaErrors]
  };
}

// ===================================
// Speaking Practice - AI Functions
// ===================================

import { SpeakingFeedback, SpeakingCorrection, SpeakingQuestion } from '../types';

/**
 * Transcribe audio using OpenAI Whisper API
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    const openai = getOpenAIClient();

    // Convert blob to file
    const audioFile = new File([audioBlob], 'recording.webm', {
      type: audioBlob.type || 'audio/webm'
    });

    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
      response_format: 'text'
    });

    return response;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error('Ses kaydı metne çevrilemedi. Lütfen tekrar deneyin.');
  }
}

/**
 * Generate speech from text using OpenAI TTS API
 */
export async function generateSpeech(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'): Promise<ArrayBuffer> {
  try {
    const openai = getOpenAIClient();

    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice,
      input: text,
      response_format: 'mp3'
    });

    return await response.arrayBuffer();
  } catch (error) {
    console.error('Error generating speech:', error);
    throw new Error('Ses oluşturulamadı. Lütfen tekrar deneyin.');
  }
}

/**
 * Analyze speaking response and provide IELTS-style feedback
 */
export async function analyzeSpeaking(
  transcript: string,
  question: SpeakingQuestion
): Promise<SpeakingFeedback> {
  try {
    const openai = getOpenAIClient();

    const sectionContext = question.section === 'section1'
      ? 'Bu IELTS Speaking Bölüm 1 sorusudur. Kısa, doğal ve akıcı cevaplar beklenir (15-30 saniye).'
      : question.section === 'section2'
        ? 'Bu IELTS Speaking Bölüm 2 (Cue Card) sorusudur. 1-2 dakikalık detaylı bir konuşma beklenir.'
        : 'Bu IELTS Speaking Bölüm 3 sorusudur. Soyut fikirler ve derinlemesine tartışma beklenir (30-60 saniye).';

    const prompt = `Sen deneyimli bir IELTS Speaking sınav değerlendiricisisin. Bir öğrencinin konuşmasını değerlendir.

**Soru:**
${question.questionText}

${question.cueCardPoints ? `**Cue Card Maddeleri:**\n${question.cueCardPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n` : ''}

**Bağlam:**
${sectionContext}

**Öğrencinin Cevabı (Transkript):**
"${transcript}"

Lütfen aşağıdaki JSON formatında değerlendirme yap:

{
  "overallBandScore": <1-9 arası IELTS band puanı, 0.5'lik artışlarla>,
  "fluencyScore": <1-9 arası akıcılık puanı>,
  "vocabularyScore": <1-9 arası kelime bilgisi puanı>,
  "grammarScore": <1-9 arası dilbilgisi puanı>,
  "pronunciationScore": <1-9 arası telaffuz puanı - transkriptten tahmin>,
  "corrections": [
    {
      "original": "<hatalı ifade>",
      "corrected": "<düzeltilmiş hali>",
      "explanation": "<Türkçe açıklama>",
      "type": "<grammar|vocabulary|pronunciation|fluency>"
    }
  ],
  "suggestions": [
    "<Türkçe öneri 1>",
    "<Türkçe öneri 2>",
    "<Türkçe öneri 3>"
  ],
  "summary": "<Türkçe genel değerlendirme özeti - güçlü ve zayıf yönler>",
  "modelAnswer": "<Bu soruya Band 7-8 seviyesinde örnek bir cevap - İngilizce>"
}

**IELTS Değerlendirme Kriterleri:**
- Fluency & Coherence: Akıcılık, tutarlılık, bağlaç kullanımı
- Lexical Resource: Kelime çeşitliliği, doğru kelime seçimi
- Grammatical Range & Accuracy: Dilbilgisi çeşitliliği ve doğruluğu
- Pronunciation: Telaffuz netliği (transkriptten tahmin edilebilir hatalar)

**Önemli:**
- Gerçekçi ve yapıcı geri bildirim ver
- Band puanları için IELTS standartlarını kullan
- En az 3-5 düzeltme ve öneri ver
- Türkçe açıklamalar ver (İngilizce örnekler hariç)

SADECE JSON formatında yanıt ver.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Sen deneyimli bir IELTS Speaking sınav değerlendiricisisin. IELTS değerlendirme kriterlerini iyi biliyorsun ve adil, yapıcı geri bildirimler veriyorsun. Yanıtlarını SADECE istenen JSON formatında ver.'
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

    if (!content) {
      return getDefaultSpeakingFeedback('Değerlendirme oluşturulamadı.', transcript);
    }

    try {
      const parsed = JSON.parse(content);

      const corrections: SpeakingCorrection[] = (parsed.corrections || []).map((c: SpeakingCorrection) => ({
        original: c.original || '',
        corrected: c.corrected || '',
        explanation: c.explanation || '',
        type: ['grammar', 'vocabulary', 'pronunciation', 'fluency'].includes(c.type) ? c.type : 'grammar'
      }));

      return {
        overallBandScore: Math.min(9, Math.max(1, parsed.overallBandScore || 5)),
        fluencyScore: Math.min(9, Math.max(1, parsed.fluencyScore || 5)),
        vocabularyScore: Math.min(9, Math.max(1, parsed.vocabularyScore || 5)),
        grammarScore: Math.min(9, Math.max(1, parsed.grammarScore || 5)),
        pronunciationScore: Math.min(9, Math.max(1, parsed.pronunciationScore || 5)),
        transcript,
        corrections,
        suggestions: parsed.suggestions || [],
        summary: parsed.summary || 'Değerlendirme özeti oluşturulamadı.',
        modelAnswer: parsed.modelAnswer
      };
    } catch {
      return getDefaultSpeakingFeedback('Değerlendirme ayrıştırılamadı.', transcript);
    }
  } catch (error) {
    console.error('Error analyzing speaking:', error);
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return getDefaultSpeakingFeedback('OpenAI API anahtarı yapılandırılmamış.', transcript);
      }
      return getDefaultSpeakingFeedback(`Değerlendirme hatası: ${error.message}`, transcript);
    }
    return getDefaultSpeakingFeedback('Değerlendirme alınırken hata oluştu.', transcript);
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

/**
 * Generate a summary feedback message for voice output
 */
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
