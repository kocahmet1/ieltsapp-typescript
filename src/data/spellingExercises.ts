import { SpellingExercise } from '../types/spellingForge';

// Helper to scramble letters deterministically but differently from the original
const scramble = (word: string): string[] => {
  const letters = word.toUpperCase().split('');
  // Simple Fisher-Yates with a twist: guarantee at least 2 positions differ
  for (let i = letters.length - 1; i > 0; i -= 1) {
    const j = (i * 7 + 3) % (i + 1);
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  // If it ended up the same, just reverse
  if (letters.join('') === word.toUpperCase()) {
    letters.reverse();
  }
  return letters;
};

export const spellingExercises: SpellingExercise[] = [
  // ═══════════════════════════════════════
  //  MISSING LETTERS  (~12 exercises)
  // ═══════════════════════════════════════
  {
    id: 'sp-ml-1',
    type: 'missing_letters',
    level: 'starter',
    category: 'daily_life',
    word: 'beautiful',
    maskedWord: 'b_a_t_f_l',
    turkishHint: 'güzel'
  },
  {
    id: 'sp-ml-2',
    type: 'missing_letters',
    level: 'elementary',
    category: 'academic',
    word: 'necessary',
    maskedWord: 'n_c_ss_ry',
    turkishHint: 'gerekli'
  },
  {
    id: 'sp-ml-3',
    type: 'missing_letters',
    level: 'starter',
    category: 'daily_life',
    word: 'different',
    maskedWord: 'd_ff_r_nt',
    turkishHint: 'farklı'
  },
  {
    id: 'sp-ml-4',
    type: 'missing_letters',
    level: 'elementary',
    category: 'academic',
    word: 'important',
    maskedWord: '_mp_rt_nt',
    turkishHint: 'önemli'
  },
  {
    id: 'sp-ml-5',
    type: 'missing_letters',
    level: 'elementary',
    category: 'academic',
    word: 'environment',
    maskedWord: 'env_r_nm_nt',
    turkishHint: 'çevre'
  },
  {
    id: 'sp-ml-6',
    type: 'missing_letters',
    level: 'pre_intermediate',
    category: 'academic',
    word: 'government',
    maskedWord: 'g_v_rnm_nt',
    turkishHint: 'hükümet'
  },
  {
    id: 'sp-ml-7',
    type: 'missing_letters',
    level: 'starter',
    category: 'school',
    word: 'Wednesday',
    maskedWord: 'W_dn_sd_y',
    turkishHint: 'Çarşamba'
  },
  {
    id: 'sp-ml-8',
    type: 'missing_letters',
    level: 'elementary',
    category: 'daily_life',
    word: 'restaurant',
    maskedWord: 'r_st_ur_nt',
    turkishHint: 'restoran'
  },
  {
    id: 'sp-ml-9',
    type: 'missing_letters',
    level: 'starter',
    category: 'daily_life',
    word: 'because',
    maskedWord: 'b_c_ _se',
    turkishHint: 'çünkü'
  },
  {
    id: 'sp-ml-10',
    type: 'missing_letters',
    level: 'pre_intermediate',
    category: 'academic',
    word: 'knowledge',
    maskedWord: 'kn_wl_dg_',
    turkishHint: 'bilgi'
  },
  {
    id: 'sp-ml-11',
    type: 'missing_letters',
    level: 'elementary',
    category: 'school',
    word: 'February',
    maskedWord: 'F_br_ _ry',
    turkishHint: 'Şubat'
  },
  {
    id: 'sp-ml-12',
    type: 'missing_letters',
    level: 'pre_intermediate',
    category: 'academic',
    word: 'opportunity',
    maskedWord: 'opp_rt_n_ty',
    turkishHint: 'fırsat'
  },

  // ═══════════════════════════════════════
  //  UNSCRAMBLE  (~10 exercises)
  // ═══════════════════════════════════════
  {
    id: 'sp-us-1',
    type: 'unscramble',
    level: 'starter',
    category: 'school',
    word: 'school',
    scrambledLetters: scramble('school'),
    turkishHint: 'okul'
  },
  {
    id: 'sp-us-2',
    type: 'unscramble',
    level: 'elementary',
    category: 'academic',
    word: 'language',
    scrambledLetters: scramble('language'),
    turkishHint: 'dil'
  },
  {
    id: 'sp-us-3',
    type: 'unscramble',
    level: 'elementary',
    category: 'daily_life',
    word: 'together',
    scrambledLetters: scramble('together'),
    turkishHint: 'birlikte'
  },
  {
    id: 'sp-us-4',
    type: 'unscramble',
    level: 'pre_intermediate',
    category: 'academic',
    word: 'education',
    scrambledLetters: scramble('education'),
    turkishHint: 'eğitim'
  },
  {
    id: 'sp-us-5',
    type: 'unscramble',
    level: 'starter',
    category: 'daily_life',
    word: 'friend',
    scrambledLetters: scramble('friend'),
    turkishHint: 'arkadaş'
  },
  {
    id: 'sp-us-6',
    type: 'unscramble',
    level: 'elementary',
    category: 'daily_life',
    word: 'daughter',
    scrambledLetters: scramble('daughter'),
    turkishHint: 'kız çocuk'
  },
  {
    id: 'sp-us-7',
    type: 'unscramble',
    level: 'pre_intermediate',
    category: 'technology',
    word: 'computer',
    scrambledLetters: scramble('computer'),
    turkishHint: 'bilgisayar'
  },
  {
    id: 'sp-us-8',
    type: 'unscramble',
    level: 'elementary',
    category: 'nature',
    word: 'weather',
    scrambledLetters: scramble('weather'),
    turkishHint: 'hava durumu'
  },
  {
    id: 'sp-us-9',
    type: 'unscramble',
    level: 'pre_intermediate',
    category: 'health',
    word: 'medicine',
    scrambledLetters: scramble('medicine'),
    turkishHint: 'ilaç'
  },
  {
    id: 'sp-us-10',
    type: 'unscramble',
    level: 'starter',
    category: 'daily_life',
    word: 'people',
    scrambledLetters: scramble('people'),
    turkishHint: 'insanlar'
  },

  // ═══════════════════════════════════════
  //  TURKISH → ENGLISH  (~15 exercises)
  // ═══════════════════════════════════════
  {
    id: 'sp-te-1',
    type: 'turkish_to_english',
    level: 'starter',
    category: 'daily_life',
    turkishWord: 'güzel',
    englishWord: 'beautiful',
    exampleSentence: 'The garden is beautiful in spring.'
  },
  {
    id: 'sp-te-2',
    type: 'turkish_to_english',
    level: 'elementary',
    category: 'academic',
    turkishWord: 'gerekli',
    englishWord: 'necessary',
    exampleSentence: 'Sleep is necessary for good health.'
  },
  {
    id: 'sp-te-3',
    type: 'turkish_to_english',
    level: 'elementary',
    category: 'daily_life',
    turkishWord: 'çevre',
    englishWord: 'environment',
    exampleSentence: 'We must protect the environment.'
  },
  {
    id: 'sp-te-4',
    type: 'turkish_to_english',
    level: 'starter',
    category: 'school',
    turkishWord: 'sınıf arkadaşı',
    englishWord: 'classmate',
    exampleSentence: 'My classmate helped me with my homework.'
  },
  {
    id: 'sp-te-5',
    type: 'turkish_to_english',
    level: 'pre_intermediate',
    category: 'academic',
    turkishWord: 'hükümet',
    englishWord: 'government',
    exampleSentence: 'The government announced new education policies.'
  },
  {
    id: 'sp-te-6',
    type: 'turkish_to_english',
    level: 'elementary',
    category: 'daily_life',
    turkishWord: 'komşu',
    englishWord: 'neighbour',
    acceptedAnswers: ['neighbor'],
    exampleSentence: 'Our neighbour has a large garden.'
  },
  {
    id: 'sp-te-7',
    type: 'turkish_to_english',
    level: 'starter',
    category: 'food',
    turkishWord: 'kahvaltı',
    englishWord: 'breakfast',
    exampleSentence: 'I always have breakfast before school.'
  },
  {
    id: 'sp-te-8',
    type: 'turkish_to_english',
    level: 'pre_intermediate',
    category: 'academic',
    turkishWord: 'başarı',
    englishWord: 'success',
    exampleSentence: 'Hard work is the key to success.'
  },
  {
    id: 'sp-te-9',
    type: 'turkish_to_english',
    level: 'elementary',
    category: 'health',
    turkishWord: 'hastane',
    englishWord: 'hospital',
    exampleSentence: 'She works at the hospital near our house.'
  },
  {
    id: 'sp-te-10',
    type: 'turkish_to_english',
    level: 'starter',
    category: 'daily_life',
    turkishWord: 'aile',
    englishWord: 'family',
    exampleSentence: 'My family goes camping every summer.'
  },
  {
    id: 'sp-te-11',
    type: 'turkish_to_english',
    level: 'pre_intermediate',
    category: 'technology',
    turkishWord: 'bilgi',
    englishWord: 'knowledge',
    exampleSentence: 'Knowledge is power.'
  },
  {
    id: 'sp-te-12',
    type: 'turkish_to_english',
    level: 'elementary',
    category: 'travel',
    turkishWord: 'havalimanı',
    englishWord: 'airport',
    exampleSentence: 'We arrived at the airport two hours early.'
  },
  {
    id: 'sp-te-13',
    type: 'turkish_to_english',
    level: 'pre_intermediate',
    category: 'academic',
    turkishWord: 'deneyim',
    englishWord: 'experience',
    exampleSentence: 'Travel gives you valuable experience.'
  },
  {
    id: 'sp-te-14',
    type: 'turkish_to_english',
    level: 'elementary',
    category: 'daily_life',
    turkishWord: 'mutfak',
    englishWord: 'kitchen',
    exampleSentence: 'She is cooking in the kitchen.'
  },
  {
    id: 'sp-te-15',
    type: 'turkish_to_english',
    level: 'pre_intermediate',
    category: 'academic',
    turkishWord: 'araştırma',
    englishWord: 'research',
    exampleSentence: 'The scientist published her research last week.'
  },

  // ═══════════════════════════════════════
  //  CONTEXTUAL GAP  (~15 exercises)
  // ═══════════════════════════════════════
  {
    id: 'sp-cg-1',
    type: 'contextual_gap',
    level: 'starter',
    category: 'nature',
    sentence: 'The ___ is very cold in December.',
    missingWord: 'weather',
    turkishHint: 'hava durumu'
  },
  {
    id: 'sp-cg-2',
    type: 'contextual_gap',
    level: 'elementary',
    category: 'school',
    sentence: 'My ___ gave us a lot of homework today.',
    missingWord: 'teacher',
    turkishHint: 'öğretmen'
  },
  {
    id: 'sp-cg-3',
    type: 'contextual_gap',
    level: 'elementary',
    category: 'daily_life',
    sentence: 'She always forgets her ___ at home.',
    missingWord: 'umbrella',
    turkishHint: 'şemsiye'
  },
  {
    id: 'sp-cg-4',
    type: 'contextual_gap',
    level: 'pre_intermediate',
    category: 'academic',
    sentence: 'The ___ of the country is growing fast.',
    missingWord: 'population',
    turkishHint: 'nüfus'
  },
  {
    id: 'sp-cg-5',
    type: 'contextual_gap',
    level: 'starter',
    category: 'food',
    sentence: 'We had ___ and eggs for breakfast.',
    missingWord: 'sausage',
    acceptedAnswers: ['sausages'],
    turkishHint: 'sosis'
  },
  {
    id: 'sp-cg-6',
    type: 'contextual_gap',
    level: 'elementary',
    category: 'daily_life',
    sentence: 'He lost his ___ and cannot open the door.',
    missingWord: 'key',
    acceptedAnswers: ['keys'],
    turkishHint: 'anahtar'
  },
  {
    id: 'sp-cg-7',
    type: 'contextual_gap',
    level: 'pre_intermediate',
    category: 'academic',
    sentence: 'Reading books improves your ___.',
    missingWord: 'vocabulary',
    turkishHint: 'kelime hazinesi'
  },
  {
    id: 'sp-cg-8',
    type: 'contextual_gap',
    level: 'starter',
    category: 'daily_life',
    sentence: 'Please turn off the ___ before you leave.',
    missingWord: 'light',
    acceptedAnswers: ['lights'],
    turkishHint: 'ışık'
  },
  {
    id: 'sp-cg-9',
    type: 'contextual_gap',
    level: 'elementary',
    category: 'travel',
    sentence: 'Our ___ to London was delayed by two hours.',
    missingWord: 'flight',
    turkishHint: 'uçuş'
  },
  {
    id: 'sp-cg-10',
    type: 'contextual_gap',
    level: 'pre_intermediate',
    category: 'health',
    sentence: 'The doctor gave me a ___ for the medicine.',
    missingWord: 'prescription',
    turkishHint: 'reçete'
  },
  {
    id: 'sp-cg-11',
    type: 'contextual_gap',
    level: 'starter',
    category: 'school',
    sentence: 'The students are writing an ___ about pollution.',
    missingWord: 'essay',
    turkishHint: 'kompozisyon'
  },
  {
    id: 'sp-cg-12',
    type: 'contextual_gap',
    level: 'elementary',
    category: 'daily_life',
    sentence: 'I need to buy some ___ from the supermarket.',
    missingWord: 'vegetables',
    turkishHint: 'sebze'
  },
  {
    id: 'sp-cg-13',
    type: 'contextual_gap',
    level: 'pre_intermediate',
    category: 'technology',
    sentence: 'The ___ crashed and I lost all my files.',
    missingWord: 'computer',
    turkishHint: 'bilgisayar'
  },
  {
    id: 'sp-cg-14',
    type: 'contextual_gap',
    level: 'elementary',
    category: 'nature',
    sentence: 'We walked through the ___ and saw many animals.',
    missingWord: 'forest',
    turkishHint: 'orman'
  },
  {
    id: 'sp-cg-15',
    type: 'contextual_gap',
    level: 'pre_intermediate',
    category: 'academic',
    sentence: 'This ___ will help you understand the topic better.',
    missingWord: 'explanation',
    turkishHint: 'açıklama'
  },

  // ═══════════════════════════════════════
  //  LISTEN & SPELL  (~10 exercises)
  // ═══════════════════════════════════════
  {
    id: 'sp-ls-1',
    type: 'listen_and_spell',
    level: 'starter',
    category: 'daily_life',
    word: 'beautiful',
    turkishHint: 'güzel',
    exampleSentence: 'What a beautiful day!'
  },
  {
    id: 'sp-ls-2',
    type: 'listen_and_spell',
    level: 'elementary',
    category: 'academic',
    word: 'environment',
    turkishHint: 'çevre',
    exampleSentence: 'We should protect the environment.'
  },
  {
    id: 'sp-ls-3',
    type: 'listen_and_spell',
    level: 'pre_intermediate',
    category: 'academic',
    word: 'government',
    turkishHint: 'hükümet'
  },
  {
    id: 'sp-ls-4',
    type: 'listen_and_spell',
    level: 'starter',
    category: 'school',
    word: 'Wednesday',
    turkishHint: 'Çarşamba'
  },
  {
    id: 'sp-ls-5',
    type: 'listen_and_spell',
    level: 'elementary',
    category: 'daily_life',
    word: 'restaurant',
    turkishHint: 'restoran'
  },
  {
    id: 'sp-ls-6',
    type: 'listen_and_spell',
    level: 'pre_intermediate',
    category: 'academic',
    word: 'necessary',
    turkishHint: 'gerekli'
  },
  {
    id: 'sp-ls-7',
    type: 'listen_and_spell',
    level: 'elementary',
    category: 'daily_life',
    word: 'different',
    turkishHint: 'farklı'
  },
  {
    id: 'sp-ls-8',
    type: 'listen_and_spell',
    level: 'pre_intermediate',
    category: 'academic',
    word: 'opportunity',
    turkishHint: 'fırsat'
  },
  {
    id: 'sp-ls-9',
    type: 'listen_and_spell',
    level: 'starter',
    category: 'daily_life',
    word: 'together',
    turkishHint: 'birlikte'
  },
  {
    id: 'sp-ls-10',
    type: 'listen_and_spell',
    level: 'elementary',
    category: 'health',
    word: 'medicine',
    turkishHint: 'ilaç'
  },

  // ═══════════════════════════════════════
  //  SPOT THE ERROR  (~12 exercises)
  // ═══════════════════════════════════════
  {
    id: 'sp-se-1',
    type: 'spot_the_error',
    level: 'starter',
    category: 'daily_life',
    sentence: 'I recieved your letter yesterday.',
    incorrectWord: 'recieved',
    correctWord: 'received'
  },
  {
    id: 'sp-se-2',
    type: 'spot_the_error',
    level: 'elementary',
    category: 'school',
    sentence: 'She is very intrested in science.',
    incorrectWord: 'intrested',
    correctWord: 'interested'
  },
  {
    id: 'sp-se-3',
    type: 'spot_the_error',
    level: 'elementary',
    category: 'daily_life',
    sentence: 'We had a wonderfull holiday last summer.',
    incorrectWord: 'wonderfull',
    correctWord: 'wonderful'
  },
  {
    id: 'sp-se-4',
    type: 'spot_the_error',
    level: 'pre_intermediate',
    category: 'academic',
    sentence: 'The goverment decided to build new schools.',
    incorrectWord: 'goverment',
    correctWord: 'government'
  },
  {
    id: 'sp-se-5',
    type: 'spot_the_error',
    level: 'starter',
    category: 'daily_life',
    sentence: 'My freind is coming to visit tomorrow.',
    incorrectWord: 'freind',
    correctWord: 'friend'
  },
  {
    id: 'sp-se-6',
    type: 'spot_the_error',
    level: 'elementary',
    category: 'daily_life',
    sentence: 'The childern are playing in the garden.',
    incorrectWord: 'childern',
    correctWord: 'children'
  },
  {
    id: 'sp-se-7',
    type: 'spot_the_error',
    level: 'pre_intermediate',
    category: 'academic',
    sentence: 'This is a very importent decision for our future.',
    incorrectWord: 'importent',
    correctWord: 'important'
  },
  {
    id: 'sp-se-8',
    type: 'spot_the_error',
    level: 'elementary',
    category: 'daily_life',
    sentence: 'He bought a new dictionery for English class.',
    incorrectWord: 'dictionery',
    correctWord: 'dictionary'
  },
  {
    id: 'sp-se-9',
    type: 'spot_the_error',
    level: 'pre_intermediate',
    category: 'academic',
    sentence: 'Reading is necesary for improving your vocabulary.',
    incorrectWord: 'necesary',
    correctWord: 'necessary'
  },
  {
    id: 'sp-se-10',
    type: 'spot_the_error',
    level: 'starter',
    category: 'school',
    sentence: 'The libary closes at six o\'clock.',
    incorrectWord: 'libary',
    correctWord: 'library'
  },
  {
    id: 'sp-se-11',
    type: 'spot_the_error',
    level: 'elementary',
    category: 'daily_life',
    sentence: 'We need to go to the suppermarket after school.',
    incorrectWord: 'suppermarket',
    correctWord: 'supermarket'
  },
  {
    id: 'sp-se-12',
    type: 'spot_the_error',
    level: 'pre_intermediate',
    category: 'health',
    sentence: 'Regular excercise is important for your health.',
    incorrectWord: 'excercise',
    correctWord: 'exercise'
  }
];
