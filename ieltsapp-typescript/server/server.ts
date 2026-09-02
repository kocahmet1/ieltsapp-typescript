// @ts-nocheck
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');

const projectRoot = path.resolve(__dirname, '..', '..');
const clientRoot = path.join(projectRoot, 'client');
const builtClientRoot = path.join(projectRoot, 'build', 'client');
const dataRoot = path.join(projectRoot, 'data');
const practiceSetsDir = path.join(dataRoot, 'practice-sets');
const jobsDir = path.join(dataRoot, 'jobs');
const usersFile = path.join(dataRoot, 'users.json');
const progressFile = path.join(dataRoot, 'progress.json');
const stateFile = path.join(dataRoot, 'state.json');
const envFile = path.join(projectRoot, '.env');
const SESSION_COOKIE = 'ielts_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

loadEnvFile(envFile);

const DEFAULT_OPENAI_MODEL = 'gpt-5.6-luna';
const MAX_IMPORT_PDF_BYTES = 25 * 1024 * 1024;

const config = {
  port: Number(process.env.PORT || 5080),
  sessionSecret: process.env.SESSION_SECRET || 'development-session-secret',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
  openaiGenerationModel: process.env.OPENAI_GENERATION_MODEL || DEFAULT_OPENAI_MODEL,
  openaiGenerationReasoning: process.env.OPENAI_GENERATION_REASONING_EFFORT || 'high',
  openaiImportModel: process.env.OPENAI_IMPORT_MODEL || process.env.OPENAI_GENERATION_MODEL || DEFAULT_OPENAI_MODEL,
  openaiImportReasoning: process.env.OPENAI_IMPORT_REASONING_EFFORT || 'high',
  openaiTranslationModel: process.env.OPENAI_TRANSLATION_MODEL || DEFAULT_OPENAI_MODEL,
  openaiTranslationReasoning: process.env.OPENAI_TRANSLATION_REASONING_EFFORT || 'none',
};

ensureDirectory(dataRoot);
ensureDirectory(practiceSetsDir);
ensureDirectory(jobsDir);
ensureJsonFile(usersFile, []);
ensureJsonFile(progressFile, []);
ensureJsonFile(stateFile, { latestPracticeSetId: null });

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || `localhost:${config.port}`}`);

  try {
    if (req.method === 'GET' && requestUrl.pathname === '/') {
      return sendFile(res, path.join(clientRoot, 'index.html'));
    }
    if (req.method === 'GET' && requestUrl.pathname === '/styles.css') {
      return sendFile(res, path.join(clientRoot, 'styles.css'));
    }
    if (req.method === 'GET' && requestUrl.pathname === '/main.js') {
      return sendFile(res, path.join(builtClientRoot, 'main.js'));
    }
    if (req.method === 'GET' && requestUrl.pathname === '/favicon.ico') {
      res.writeHead(204);
      return res.end();
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/register') {
      return await handleRegister(req, res);
    }
    if (req.method === 'POST' && requestUrl.pathname === '/api/login') {
      return await handleLogin(req, res);
    }
    if (req.method === 'POST' && requestUrl.pathname === '/api/logout') {
      return handleLogout(res);
    }
    if (req.method === 'GET' && requestUrl.pathname === '/api/current_user') {
      return handleCurrentUser(req, res);
    }
    if (req.method === 'POST' && requestUrl.pathname === '/api/save_progress') {
      return await handleSaveProgress(req, res);
    }
    if (req.method === 'GET' && requestUrl.pathname === '/api/get_progress') {
      return handleGetProgress(req, res);
    }
    if (req.method === 'POST' && requestUrl.pathname === '/api/generate') {
      return await handleGenerate(req, res, requestUrl);
    }
    if (req.method === 'POST' && requestUrl.pathname === '/api/ingest') {
      return await handleIngest(req, res, requestUrl);
    }
    if (req.method === 'GET' && requestUrl.pathname === '/api/job-status') {
      return handleJobStatus(res, requestUrl);
    }
    if (req.method === 'GET' && requestUrl.pathname === '/api/practice-set') {
      return handlePracticeSet(res, requestUrl);
    }
    if (req.method === 'GET' && requestUrl.pathname === '/api/practice-sets') {
      return handleListPracticeSets(res);
    }
    if (req.method === 'POST' && requestUrl.pathname === '/api/translate') {
      return await handleTranslate(req, res);
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: error instanceof Error ? error.message : 'Unexpected server error' });
  }
});

server.listen(config.port, () => {
  console.log(`IELTS TypeScript app running at http://localhost:${config.port}`);
});

async function handleRegister(req, res) {
  const body = await readJsonBody(req);
  const username = String(body.username || '').trim();
  const password = String(body.password || '').trim();

  if (!username || !password) {
    return sendJson(res, 400, { message: 'Username and password cannot be empty' });
  }

  const users = readJson(usersFile, []);
  if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
    return sendJson(res, 409, { message: 'Username already taken' });
  }

  const user = {
    id: nextNumericId(users),
    username,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeJson(usersFile, users);
  sendJson(res, 201, { message: 'User registered successfully' });
}

async function handleLogin(req, res) {
  const body = await readJsonBody(req);
  const username = String(body.username || '').trim();
  const password = String(body.password || '').trim();

  if (!username || !password) {
    return sendJson(res, 400, { message: 'Username and password required' });
  }

  const users = readJson(usersFile, []);
  const user = users.find((candidate) => candidate.username.toLowerCase() === username.toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return sendJson(res, 401, { message: 'Invalid credentials' });
  }

  const token = createSessionToken(user.id);
  sendJson(res, 200, { message: 'Login successful', user: { username: user.username } }, {
    'Set-Cookie': formatCookie(SESSION_COOKIE, token, SESSION_MAX_AGE_SECONDS),
  });
}

function handleLogout(res) {
  sendJson(res, 200, { message: 'Logout successful' }, {
    'Set-Cookie': formatCookie(SESSION_COOKIE, '', 0),
  });
}

function handleCurrentUser(req, res) {
  const user = getCurrentUser(req);
  if (!user) {
    return sendJson(res, 200, { isLoggedIn: false });
  }
  sendJson(res, 200, { isLoggedIn: true, user: { username: user.username } });
}

async function handleSaveProgress(req, res) {
  const user = requireCurrentUser(req, res);
  if (!user) {
    return;
  }

  const body = await readJsonBody(req);
  const practiceSetId = String(body.practice_set_id || '').trim();
  if (!practiceSetId) {
    return sendJson(res, 400, { message: 'Practice set ID is required' });
  }

  const progress = readJson(progressFile, []);
  const existing = progress.find((record) => record.user_id === user.id && record.practice_set_id === practiceSetId);
  const dateAttempted = formatDate(new Date());

  if (existing) {
    if (body.score_fitb !== undefined) existing.score_fitb = body.score_fitb;
    if (body.score_tfng !== undefined) existing.score_tfng = body.score_tfng;
    if (body.score_mh !== undefined) existing.score_mh = body.score_mh;
    existing.date_attempted = dateAttempted;
  } else {
    progress.push({
      id: nextNumericId(progress),
      user_id: user.id,
      practice_set_id: practiceSetId,
      score_fitb: body.score_fitb ?? null,
      score_tfng: body.score_tfng ?? null,
      score_mh: body.score_mh ?? null,
      date_attempted: dateAttempted,
    });
  }

  writeJson(progressFile, progress);
  sendJson(res, 200, { message: 'Progress saved successfully' });
}

function handleGetProgress(req, res) {
  const user = requireCurrentUser(req, res);
  if (!user) {
    return;
  }

  const progress = readJson(progressFile, [])
    .filter((record) => record.user_id === user.id)
    .sort((left, right) => String(right.date_attempted).localeCompare(String(left.date_attempted)));

  sendJson(res, 200, progress.map((record) => ({
    practice_set_id: record.practice_set_id,
    score_fitb: record.score_fitb ?? null,
    score_tfng: record.score_tfng ?? null,
    score_mh: record.score_mh ?? null,
    date_attempted: record.date_attempted ?? null,
  })));
}

async function handleGenerate(req, res, requestUrl) {
  const body = await readJsonBody(req);
  const questionType = body.question_type === 'matching_headings' ? 'matching_headings' : 'mixed_fitb_tfng';
  const apiKey = String(body.openaiApiKey || body.apiKey || '').trim() || config.openaiApiKey;
  if (!apiKey) {
    return sendJson(res, 500, { error: 'No OpenAI API key available. Please set one in API Key Settings.' });
  }

  const jobId = crypto.randomUUID();
  const jobStatus = {
    id: jobId,
    status: 'pending',
    created_at: new Date().toISOString(),
    practice_set_id: null,
    error: null,
  };
  saveJobStatus(jobId, jobStatus);

  const protocol = String(req.headers['x-forwarded-proto'] || requestUrl.protocol.replace(':', '') || 'http');
  const host = String(req.headers.host || `localhost:${config.port}`);
  const baseUrl = `${protocol}://${host}`;

  void generatePracticeJob({ jobId, apiKey, questionType, baseUrl });
  sendJson(res, 200, { job_id: jobId, status: 'pending' });
}

function handleJobStatus(res, requestUrl) {
  const jobId = requestUrl.searchParams.get('job_id');
  if (!jobId) {
    return sendJson(res, 400, { error: 'No job ID provided' });
  }

  const jobStatus = loadJobStatus(jobId);
  if (!jobStatus) {
    return sendJson(res, 404, { error: 'Job not found' });
  }

  if (jobStatus.status === 'completed' && jobStatus.practice_set_id) {
    const practiceSet = loadPracticeSet(jobStatus.practice_set_id);
    if (practiceSet) {
      return sendJson(res, 200, { ...jobStatus, practice_set: practiceSet });
    }
  }

  sendJson(res, 200, jobStatus);
}

function handlePracticeSet(res, requestUrl) {
  const state = readJson(stateFile, { latestPracticeSetId: null });
  const practiceSetId = requestUrl.searchParams.get('id') || state.latestPracticeSetId;
  if (!practiceSetId) {
    return sendJson(res, 404, { error: 'No practice set has been generated yet' });
  }

  const practiceSet = loadPracticeSet(practiceSetId);
  if (!practiceSet) {
    return sendJson(res, 404, { error: 'Practice set not found' });
  }

  const protocol = String(requestUrl.protocol || 'http:').replace(':', '');
  const baseUrl = `${protocol}://${requestUrl.host}`;
  sendJson(res, 200, { ...practiceSet, shareUrl: `${baseUrl}/?id=${practiceSetId}` });
}

function handleListPracticeSets(res) {
  const files = fs.readdirSync(practiceSetsDir).filter((f) => f.endsWith('.json'));
  const items = [];

  for (const file of files) {
    const practiceSet = readJson(path.join(practiceSetsDir, file), null);
    if (!practiceSet || !practiceSet.id) continue;

    const passagePreview = (practiceSet.passage || '').replace(/\n+/g, ' ').slice(0, 200);
    items.push({
      id: practiceSet.id,
      question_type: practiceSet.question_type || 'mixed_fitb_tfng',
      source: practiceSet.source || 'generated',
      title: practiceSet.title || null,
      created_at: practiceSet.created_at || null,
      passage_preview: passagePreview,
    });
  }

  items.sort((a, b) => {
    const dateA = a.created_at || '';
    const dateB = b.created_at || '';
    return dateB.localeCompare(dateA);
  });

  sendJson(res, 200, items);
}

async function handleTranslate(req, res) {
  const body = await readJsonBody(req);
  const word = String(body.word || '').trim();
  const apiKey = String(body.openaiApiKey || '').trim() || config.openaiApiKey;

  if (!word) {
    return sendJson(res, 400, { error: 'No word provided' });
  }
  if (!apiKey) {
    return sendJson(res, 500, { error: 'No OpenAI API key available. Please set one in API Key Settings.' });
  }

  const isSentence = word.split(/\s+/).length > 5;
  const systemPrompt = isSentence
    ? 'You are a translator. Translate the given English text to Turkish. Return only the Turkish translation, nothing else.'
    : 'You are a translator. Translate the given English word to Turkish. If the word has multiple common meanings, give the top 2-3 separated by commas. Return only the Turkish translation(s), nothing else.';

  try {
    const translation = await callOpenAiChat({
      apiKey: apiKey,
      model: config.openaiTranslationModel,
      reasoningEffort: config.openaiTranslationReasoning,
      systemPrompt,
      userMessage: word,
      temperature: 0.2,
      maxTokens: isSentence ? 1200 : 400,
    });

    sendJson(res, 200, { word, translation: translation.trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Translation failed';
    if (message.includes('429')) {
      return sendJson(res, 429, { error: 'API kota sınırına ulaşıldı. Lütfen birkaç saniye bekleyip tekrar deneyin.' });
    }
    sendJson(res, 500, { error: message });
  }
}

function isReasoningModel(model) {
  return /^(o\d|gpt-5)/i.test(String(model || ''));
}

async function callOpenAiChat({ apiKey, model, systemPrompt, userMessage, messages, temperature, maxTokens, responseFormat, reasoningEffort }) {
  const payload = {
    model,
    messages: messages || [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_completion_tokens: maxTokens,
  };
  if (isReasoningModel(model)) {
    // Reasoning models (o-series, gpt-5 family) take a reasoning_effort and reject non-default temperatures.
    if (reasoningEffort) {
      payload.reasoning_effort = reasoningEffort;
    }
  } else if (typeof temperature === 'number') {
    payload.temperature = temperature;
  }
  if (responseFormat) {
    payload.response_format = responseFormat;
  }

  const response = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed with ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const text = choice?.message?.content || '';
  if (!text) {
    if (choice?.finish_reason === 'length') {
      throw new Error('OpenAI stopped before producing any text (token limit reached). Please try again.');
    }
    throw new Error('OpenAI returned no text output.');
  }
  if (choice?.finish_reason === 'length') {
    throw new Error('OpenAI output was cut off by the token limit. Please try again.');
  }
  return text;
}

async function generatePracticeJob({ jobId, apiKey, questionType, baseUrl }) {
  try {
    const prompt = questionType === 'matching_headings' ? matchingHeadingsPrompt() : mixedPrompt();
    const text = await callOpenAiChat({
      apiKey,
      model: config.openaiGenerationModel,
      reasoningEffort: config.openaiGenerationReasoning,
      systemPrompt: 'You are an expert IELTS Academic Reading test writer. Respond with a single valid JSON object and nothing else.',
      userMessage: prompt,
      temperature: 0.7,
      maxTokens: 32000,
      responseFormat: { type: 'json_object' },
    });

    const practiceSet = extractJsonObject(text);
    const practiceId = crypto.randomUUID();
    practiceSet.id = practiceId;
    practiceSet.created_at = new Date().toISOString();
    practiceSet.question_type = practiceSet.question_type || questionType;
    practiceSet.shareUrl = `${baseUrl}/?id=${practiceId}`;

    savePracticeSet(practiceId, practiceSet);
    writeJson(stateFile, { latestPracticeSetId: practiceId });
    saveJobStatus(jobId, {
      id: jobId,
      status: 'completed',
      created_at: new Date().toISOString(),
      practice_set_id: practiceId,
      error: null,
    });
  } catch (error) {
    console.error(error);
    let message = error instanceof Error ? error.message : 'Generation failed';
    if (message.includes('429')) {
      message = 'API kota sınırına ulaşıldı. Lütfen birkaç saniye bekleyip tekrar deneyin.';
    }
    saveJobStatus(jobId, {
      id: jobId,
      status: 'failed',
      created_at: new Date().toISOString(),
      practice_set_id: null,
      error: message,
    });
  }
}

async function handleIngest(req, res, requestUrl) {
  let body;
  try {
    body = await readJsonBody(req, { maxBytes: Math.ceil(MAX_IMPORT_PDF_BYTES * 1.4) + 65536 });
  } catch (error) {
    if (error && error.code === 'BODY_TOO_LARGE') {
      return sendJson(res, 413, { error: `The PDF is too large. Maximum size is ${Math.round(MAX_IMPORT_PDF_BYTES / (1024 * 1024))} MB.` });
    }
    throw error;
  }

  const apiKey = String(body.openaiApiKey || '').trim() || config.openaiApiKey;
  if (!apiKey) {
    return sendJson(res, 500, { error: 'No OpenAI API key available. Please set one in API Key Settings.' });
  }

  const filename = sanitizeFilename(body.filename);
  const fileData = String(body.file_data || '');
  const base64Match = /^data:application\/pdf;base64,([A-Za-z0-9+/=\s]+)$/.exec(fileData);
  if (!base64Match) {
    return sendJson(res, 400, { error: 'Please upload a PDF file.' });
  }
  const pdfBytes = Buffer.from(base64Match[1], 'base64');
  if (pdfBytes.length < 8 || pdfBytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
    return sendJson(res, 400, { error: 'That file does not look like a valid PDF.' });
  }
  if (pdfBytes.length > MAX_IMPORT_PDF_BYTES) {
    return sendJson(res, 413, { error: `The PDF is too large. Maximum size is ${Math.round(MAX_IMPORT_PDF_BYTES / (1024 * 1024))} MB.` });
  }

  const jobId = crypto.randomUUID();
  saveJobStatus(jobId, {
    id: jobId,
    kind: 'import',
    status: 'pending',
    created_at: new Date().toISOString(),
    practice_set_id: null,
    error: null,
  });

  const protocol = String(req.headers['x-forwarded-proto'] || requestUrl.protocol.replace(':', '') || 'http');
  const host = String(req.headers.host || `localhost:${config.port}`);
  const baseUrl = `${protocol}://${host}`;

  void importPracticeJob({ jobId, apiKey, filename, fileData: `data:application/pdf;base64,${pdfBytes.toString('base64')}`, baseUrl });
  sendJson(res, 200, { job_id: jobId, status: 'pending' });
}

async function importPracticeJob({ jobId, apiKey, filename, fileData, baseUrl }) {
  try {
    const text = await callOpenAiChat({
      apiKey,
      model: config.openaiImportModel,
      reasoningEffort: config.openaiImportReasoning,
      messages: [
        { role: 'system', content: IMPORT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'file', file: { filename, file_data: fileData } },
            { type: 'text', text: importInstructions() },
          ],
        },
      ],
      maxTokens: 32000,
      responseFormat: {
        type: 'json_schema',
        json_schema: { name: 'imported_reading', strict: true, schema: IMPORT_SCHEMA },
      },
    });

    const extracted = extractJsonObject(text);
    const practiceSet = buildImportedPracticeSet(extracted, filename);
    const practiceId = crypto.randomUUID();
    practiceSet.id = practiceId;
    practiceSet.created_at = new Date().toISOString();
    practiceSet.shareUrl = `${baseUrl}/?id=${practiceId}`;

    savePracticeSet(practiceId, practiceSet);
    writeJson(stateFile, { latestPracticeSetId: practiceId });
    saveJobStatus(jobId, {
      id: jobId,
      kind: 'import',
      status: 'completed',
      created_at: new Date().toISOString(),
      practice_set_id: practiceId,
      error: null,
    });
  } catch (error) {
    console.error(error);
    let message = error instanceof Error ? error.message : 'Import failed';
    if (message.includes('429')) {
      message = 'API kota sınırına ulaşıldı. Lütfen birkaç saniye bekleyip tekrar deneyin.';
    }
    saveJobStatus(jobId, {
      id: jobId,
      kind: 'import',
      status: 'failed',
      created_at: new Date().toISOString(),
      practice_set_id: null,
      error: message,
    });
  }
}

const IMPORT_SYSTEM_PROMPT = 'You are an expert IELTS Academic Reading examiner who converts printed reading tests into structured data. You transcribe passages faithfully, never paraphrase or translate them, and you follow the JSON schema exactly.';

const IMPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'passage', 'has_answer_key', 'questions', 'matching_headings', 'skipped_questions', 'notes'],
  properties: {
    title: { type: 'string', description: 'Title of the reading passage as printed, or a short descriptive title if none is printed.' },
    passage: { type: 'string', description: 'The complete passage text transcribed verbatim, paragraphs separated by one blank line. If paragraphs are labelled (A, B, C...), start each paragraph with its label followed by a space.' },
    has_answer_key: { type: 'boolean', description: 'true if the PDF contains an answer key for these questions.' },
    questions: {
      type: 'array',
      description: 'Every True/False/Not Given, Yes/No/Not Given, completion and short-answer item, in printed order.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['number', 'question_type', 'question', 'answer', 'source_sentence'],
        properties: {
          number: { type: 'string', description: 'The question number as printed, e.g. "7".' },
          question_type: { type: 'string', enum: ['FITB', 'TFNG'] },
          question: { type: 'string', description: 'FITB: a self-contained sentence with the gap written as ______ (include the summary heading or context needed to make it unambiguous). TFNG: the statement.' },
          answer: { type: 'string', description: 'FITB: the exact word(s) from the passage that fill the gap. TFNG: exactly "True", "False" or "Not Given" (Yes = True, No = False).' },
          source_sentence: { type: 'string', description: 'The passage sentence that supports the answer, copied verbatim. Empty string for Not Given.' },
        },
      },
    },
    matching_headings: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['paragraphs', 'headings', 'answers'],
      description: 'The "choose the correct heading for each paragraph" task, or null if the PDF has none.',
      properties: {
        paragraphs: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'content'],
            properties: {
              id: { type: 'string', description: 'Paragraph label as printed, e.g. "A".' },
              content: { type: 'string', description: 'The paragraph text verbatim (without the label).' },
            },
          },
        },
        headings: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['id', 'text'],
            properties: {
              id: { type: 'string', description: 'Heading numeral as printed, e.g. "iv".' },
              text: { type: 'string' },
            },
          },
        },
        answers: {
          type: 'array',
          description: 'One entry per paragraph that is asked about (skip paragraphs given as examples).',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['paragraph_id', 'heading_id'],
            properties: {
              paragraph_id: { type: 'string' },
              heading_id: { type: 'string' },
            },
          },
        },
      },
    },
    skipped_questions: {
      type: 'array',
      description: 'Question groups that cannot be converted (multiple choice, matching information/features/sentence endings, diagram or map labelling, etc.).',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['numbers', 'type', 'reason'],
        properties: {
          numbers: { type: 'string', description: 'Question numbers, e.g. "27-31".' },
          type: { type: 'string', description: 'Short type name, e.g. "multiple choice".' },
          reason: { type: 'string' },
        },
      },
    },
    notes: { type: 'string', description: 'Anything the user should know (illegible parts, assumptions made). Empty string if nothing.' },
  },
};

function importInstructions() {
  return `The attached PDF contains one IELTS-style reading passage with its questions (and possibly an answer key). Convert it to the JSON schema.

Rules:
1. passage: transcribe the passage verbatim, only repairing line-break hyphenation and spacing artefacts from the PDF. Keep every paragraph and separate paragraphs with one blank line. If paragraphs are labelled A, B, C..., keep the label at the start of each paragraph.
2. questions: convert
   - True/False/Not Given and Yes/No/Not Given items to TFNG (Yes = True, No = False; keep "Not Given").
   - Sentence completion, summary/note/table/flow-chart completion and short-answer questions to FITB. Produce one FITB item per gap, written as a self-contained sentence with the gap as ______ and enough surrounding words to be unambiguous. The answer must be the exact word(s) from the passage, respecting the word limit printed in the instructions.
   - Do NOT convert multiple choice, matching information, matching features, matching sentence endings, diagram/map/plan labelling or any other type; list those groups in skipped_questions with their question numbers and type.
3. matching_headings: fill it in only if the PDF has a "choose the correct heading" task: every paragraph that has a question (label + verbatim text), every heading option (numeral + text) and the answers. Otherwise use null.
4. Answers: use the answer key when the PDF contains one and set has_answer_key to true. If there is no answer key, solve the questions yourself with great care using only the passage and set has_answer_key to false.
5. Keep the printed question numbers in "number". Keep the passage in its original language. Return JSON only.`;
}

function buildImportedPracticeSet(extracted, filename) {
  const passage = normalizePassage(String(extracted.passage || ''));
  if (passage.split(/\s+/).filter(Boolean).length < 80) {
    throw new Error('Could not find a reading passage in the PDF (the extracted text is too short).');
  }

  const skipped = (Array.isArray(extracted.skipped_questions) ? extracted.skipped_questions : [])
    .map(normalizeSkippedGroup)
    .filter(Boolean);
  const questions = [];
  const usedIds = new Set();
  const rawQuestions = Array.isArray(extracted.questions) ? extracted.questions : [];
  rawQuestions.forEach((raw, index) => {
    const result = normalizeImportedQuestion(raw, index, usedIds);
    if (result.question) {
      questions.push(result.question);
    } else if (result.skipped) {
      skipped.push(result.skipped);
    }
  });

  const headings = normalizeMatchingHeadings(extracted.matching_headings);
  if (headings.error) {
    skipped.push({ numbers: '', type: 'matching headings', reason: headings.error });
  }

  if (questions.length === 0 && !headings.data) {
    const found = skipped.length > 0 ? ` The PDF only contained: ${skipped.map((group) => group.type).join(', ')}.` : '';
    throw new Error(`No supported questions (True/False/Not Given, completion or short answer, matching headings) were found in the PDF.${found}`);
  }

  const practiceSet = {
    id: null,
    question_type: 'imported',
    source: 'pdf',
    title: String(extracted.title || '').trim().slice(0, 200) || filename.replace(/\.pdf$/i, ''),
    source_filename: filename,
    passage,
    questions,
    answers_inferred: extracted.has_answer_key === false,
    skipped_questions: skipped,
    import_notes: String(extracted.notes || '').trim().slice(0, 1000) || null,
  };
  if (headings.data) {
    Object.assign(practiceSet, headings.data);
  }
  return practiceSet;
}

function normalizePassage(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

function normalizeImportedQuestion(raw, index, usedIds) {
  const number = String(raw?.number ?? '').trim();
  const type = String(raw?.question_type ?? '').trim().toUpperCase();
  const questionText = String(raw?.question ?? '').replace(/\s+/g, ' ').trim();
  const answerText = String(raw?.answer ?? '').replace(/\s+/g, ' ').trim();
  const sourceSentence = String(raw?.source_sentence ?? '').replace(/\s+/g, ' ').trim();
  const label = number || String(index + 1);

  if (!questionText || !answerText) {
    return { skipped: { numbers: label, type: type === 'TFNG' ? 'true/false/not given' : 'completion', reason: 'The question or its answer was missing.' } };
  }

  let id = label;
  while (usedIds.has(id)) {
    id = `${id}b`;
  }
  usedIds.add(id);

  if (type === 'TFNG') {
    const answer = normalizeTfngAnswer(answerText);
    if (!answer) {
      return { skipped: { numbers: label, type: 'true/false/not given', reason: `Unrecognised answer "${answerText}".` } };
    }
    return { question: { id, question_type: 'TFNG', statement: questionText, answer, relevant_passage: answer === 'Not Given' ? '' : sourceSentence } };
  }

  if (type === 'FITB') {
    const question = /_{2,}/.test(questionText) ? questionText : `${questionText} ______`;
    return { question: { id, question_type: 'FITB', question, answer: answerText, source_sentence: sourceSentence } };
  }

  return { skipped: { numbers: label, type: type.toLowerCase() || 'unknown', reason: 'Unsupported question type.' } };
}

function normalizeTfngAnswer(value) {
  const normalized = value.toLowerCase().replace(/[^a-z]/g, '');
  if (normalized === 'true' || normalized === 'yes' || normalized === 't' || normalized === 'y') return 'True';
  if (normalized === 'false' || normalized === 'no' || normalized === 'f' || normalized === 'n') return 'False';
  if (normalized === 'notgiven' || normalized === 'ng') return 'Not Given';
  return null;
}

function normalizeSkippedGroup(raw) {
  const type = String(raw?.type ?? '').replace(/\s+/g, ' ').trim();
  if (!type) return null;
  return {
    numbers: String(raw?.numbers ?? '').trim(),
    type,
    reason: String(raw?.reason ?? '').trim(),
  };
}

function normalizeMatchingHeadings(raw) {
  if (!raw || typeof raw !== 'object') {
    return { data: null };
  }
  const headings = (Array.isArray(raw.headings) ? raw.headings : [])
    .map((heading) => ({ id: String(heading?.id ?? '').trim(), text: String(heading?.text ?? '').replace(/\s+/g, ' ').trim() }))
    .filter((heading) => heading.id && heading.text);
  const headingIds = new Set(headings.map((heading) => heading.id));
  const answers = {};
  for (const pair of Array.isArray(raw.answers) ? raw.answers : []) {
    const paragraphId = String(pair?.paragraph_id ?? '').trim();
    const headingId = String(pair?.heading_id ?? '').trim();
    if (paragraphId && headingIds.has(headingId)) {
      answers[paragraphId] = headingId;
    }
  }
  const paragraphs = (Array.isArray(raw.paragraphs) ? raw.paragraphs : [])
    .map((paragraph) => ({ id: String(paragraph?.id ?? '').trim(), content: String(paragraph?.content ?? '').replace(/\s+/g, ' ').trim() }))
    .filter((paragraph) => paragraph.id && paragraph.content && answers[paragraph.id]);

  if (headings.length < 2 || paragraphs.length < 2) {
    if (headings.length === 0 && paragraphs.length === 0) {
      return { data: null };
    }
    return { data: null, error: 'The matching-headings task could not be read completely, so it was left out.' };
  }
  const keptIds = new Set(paragraphs.map((paragraph) => paragraph.id));
  for (const key of Object.keys(answers)) {
    if (!keptIds.has(key)) delete answers[key];
  }
  return { data: { paragraphs, headings, answers } };
}

function sanitizeFilename(value) {
  const base = String(value || '').split(/[\\/]/).pop().replace(/\p{Cc}/gu, '').trim().slice(0, 120);
  if (!base) return 'reading.pdf';
  return /\.pdf$/i.test(base) ? base : `${base}.pdf`;
}

function mixedPrompt() {
  return `Generate an IELTS Academic reading practice set as JSON.

Return a JSON object with:
- passage: a reading passage of 800-1000 words. Separate each paragraph with a blank line (two newlines \\n\\n). The passage must have at least 4 clearly separated paragraphs.
- questions: an array with 10 items.
- question_type: exactly \"mixed_fitb_tfng\".

Questions 1-5 must be FITB items with:
- id
- question_type: \"FITB\"
- question
- answer
- source_sentence

Questions 6-10 must be TFNG items with:
- id
- question_type: \"TFNG\"
- statement
- answer (must be exactly \"True\", \"False\", or \"Not Given\")
- relevant_passage

Important constraints:
- FITB questions must paraphrase the source, while answers remain exact words or short phrases from the passage.
- relevant_passage must be copied exactly from the passage.
- Return JSON only.`;
}

function matchingHeadingsPrompt() {
  return `Generate an IELTS Matching Headings reading practice set as JSON.

Return a JSON object with:
- passage: a 600-900 word passage. Separate each paragraph with a blank line (two newlines \\n\\n). The passage must have at least 3 clearly separated paragraphs.
- paragraphs: an array of 3 to 5 paragraph objects with id and content.
- headings: an array with 2 or 3 more headings than paragraphs. Each heading needs id and text.
- answers: an object mapping paragraph ids to heading ids.
- question_type: exactly \"matching_headings\".

Use paragraph ids like A, B, C and heading ids like i, ii, iii.
Return JSON only.`;
}

function extractJsonObject(text) {
  let candidate = text.trim();
  if (candidate.includes('```json')) {
    candidate = candidate.split('```json')[1].split('```')[0].trim();
  } else if (candidate.includes('```')) {
    candidate = candidate.split('```')[1].split('```')[0].trim();
  }

  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    candidate = candidate.slice(firstBrace, lastBrace + 1);
  }

  return JSON.parse(candidate);
}

function savePracticeSet(practiceId, practiceSet) {
  writeJson(path.join(practiceSetsDir, `${practiceId}.json`), practiceSet);
}

function loadPracticeSet(practiceId) {
  const file = path.join(practiceSetsDir, `${practiceId}.json`);
  if (!fs.existsSync(file)) {
    return null;
  }
  return readJson(file, null);
}

function saveJobStatus(jobId, status) {
  writeJson(path.join(jobsDir, `${jobId}.json`), status);
}

function loadJobStatus(jobId) {
  const file = path.join(jobsDir, `${jobId}.json`);
  if (!fs.existsSync(file)) {
    return null;
  }
  return readJson(file, null);
}

function requireCurrentUser(req, res) {
  const user = getCurrentUser(req);
  if (!user) {
    sendJson(res, 401, { message: 'Authentication required' });
    return null;
  }
  return user;
}

function getCurrentUser(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[SESSION_COOKIE];
  if (!token) {
    return null;
  }

  const session = verifySessionToken(token);
  if (!session || Date.now() > session.expiresAt) {
    return null;
  }

  const users = readJson(usersFile, []);
  return users.find((user) => user.id === session.userId) || null;
}

function createSessionToken(userId) {
  const payload = {
    userId,
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', config.sessionSecret).update(encoded).digest('hex');
  return `${encoded}.${signature}`;
}

function verifySessionToken(token) {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) {
    return null;
  }

  const expected = crypto.createHmac('sha256', config.sessionSecret).update(encoded).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedValue) {
  const [salt, hash] = String(storedValue).split(':');
  if (!salt || !hash) {
    return false;
  }
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(hash));
}

function parseCookies(cookieHeader) {
  const cookies = {};
  cookieHeader.split(';').forEach((entry) => {
    const [rawName, ...rest] = entry.trim().split('=');
    if (!rawName) {
      return;
    }
    cookies[rawName] = decodeURIComponent(rest.join('='));
  });
  return cookies;
}

function formatCookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`;
}

function readJsonBody(req, options = {}) {
  const maxBytes = options.maxBytes || 2 * 1024 * 1024;
  return new Promise((resolve, reject) => {
    const chunks = [];
    let received = 0;
    let tooLarge = false;
    req.on('data', (chunk) => {
      received += chunk.length;
      if (received > maxBytes) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) {
        const error = new Error('Request body too large');
        error.code = 'BODY_TOO_LARGE';
        reject(error);
        return;
      }
      if (received === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders,
  });
  res.end(body);
}

function sendFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    return sendJson(res, 404, { error: 'File not found' });
  }

  const body = fs.readFileSync(filePath);
  res.writeHead(200, {
    'Content-Type': mimeTypeFor(filePath),
    'Content-Length': body.length,
  });
  res.end(body);
}

function mimeTypeFor(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function ensureJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    writeJson(filePath, fallback);
  }
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function nextNumericId(collection) {
  const max = collection.reduce((currentMax, item) => Math.max(currentMax, Number(item.id || 0)), 0);
  return max + 1;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

