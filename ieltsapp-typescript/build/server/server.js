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
const config = {
    port: Number(process.env.PORT || 5080),
    sessionSecret: process.env.SESSION_SECRET || 'development-session-secret',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    generationModel: process.env.GEMINI_GENERATION_MODEL || 'gemini-2.5-flash',
    translationModel: process.env.GEMINI_TRANSLATION_MODEL || 'gemini-2.0-flash',
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
            return handleRegister(req, res);
        }
        if (req.method === 'POST' && requestUrl.pathname === '/api/login') {
            return handleLogin(req, res);
        }
        if (req.method === 'POST' && requestUrl.pathname === '/api/logout') {
            return handleLogout(res);
        }
        if (req.method === 'GET' && requestUrl.pathname === '/api/current_user') {
            return handleCurrentUser(req, res);
        }
        if (req.method === 'POST' && requestUrl.pathname === '/api/save_progress') {
            return handleSaveProgress(req, res);
        }
        if (req.method === 'GET' && requestUrl.pathname === '/api/get_progress') {
            return handleGetProgress(req, res);
        }
        if (req.method === 'POST' && requestUrl.pathname === '/api/generate') {
            return handleGenerate(req, res, requestUrl);
        }
        if (req.method === 'GET' && requestUrl.pathname === '/api/job-status') {
            return handleJobStatus(res, requestUrl);
        }
        if (req.method === 'GET' && requestUrl.pathname === '/api/practice-set') {
            return handlePracticeSet(res, requestUrl);
        }
        if (req.method === 'POST' && requestUrl.pathname === '/api/translate') {
            return handleTranslate(req, res);
        }
        sendJson(res, 404, { error: 'Not found' });
    }
    catch (error) {
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
        if (body.score_fitb !== undefined)
            existing.score_fitb = body.score_fitb;
        if (body.score_tfng !== undefined)
            existing.score_tfng = body.score_tfng;
        if (body.score_mh !== undefined)
            existing.score_mh = body.score_mh;
        existing.date_attempted = dateAttempted;
    }
    else {
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
    const apiKey = String(body.apiKey || '').trim() || config.geminiApiKey;
    if (!apiKey) {
        return sendJson(res, 500, { error: 'No Gemini API key available' });
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
async function handleTranslate(req, res) {
    const body = await readJsonBody(req);
    const word = String(body.word || '').trim();
    const apiKey = String(body.apiKey || '').trim() || config.geminiApiKey;
    if (!word) {
        return sendJson(res, 400, { error: 'No word provided' });
    }
    if (!apiKey) {
        return sendJson(res, 500, { error: 'No Gemini API key available' });
    }
    const prompt = `Translate the English word '${word}' to Turkish. Return only the Turkish translation.`;
    const text = await callGeminiText({
        apiKey,
        model: config.translationModel,
        prompt,
        generationConfig: {
            temperature: 0.2,
            topP: 0.95,
            maxOutputTokens: 50,
        },
    });
    sendJson(res, 200, { word, translation: text.trim() });
}
async function generatePracticeJob({ jobId, apiKey, questionType, baseUrl }) {
    try {
        const prompt = questionType === 'matching_headings' ? matchingHeadingsPrompt() : mixedPrompt();
        const text = await callGeminiText({
            apiKey,
            model: config.generationModel,
            prompt,
            generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
            },
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
    }
    catch (error) {
        console.error(error);
        saveJobStatus(jobId, {
            id: jobId,
            status: 'failed',
            created_at: new Date().toISOString(),
            practice_set_id: null,
            error: error instanceof Error ? error.message : 'Generation failed',
        });
    }
}
function mixedPrompt() {
    return `Generate an IELTS Academic reading practice set as JSON.

Return a JSON object with:
- passage: a reading passage of 800-1000 words.
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
- passage: a 600-900 word passage.
- paragraphs: an array of 3 to 5 paragraph objects with id and content.
- headings: an array with 2 or 3 more headings than paragraphs. Each heading needs id and text.
- answers: an object mapping paragraph ids to heading ids.
- question_type: exactly \"matching_headings\".

Use paragraph ids like A, B, C and heading ids like i, ii, iii.
Return JSON only.`;
}
async function callGeminiText({ apiKey, model, prompt, generationConfig }) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig,
        }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini request failed with ${response.status}: ${errorText}`);
    }
    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.map((part) => part.text || '').join('\n').trim();
    if (!text) {
        throw new Error('Gemini returned no text output.');
    }
    return text;
}
function extractJsonObject(text) {
    let candidate = text.trim();
    if (candidate.includes('```json')) {
        candidate = candidate.split('```json')[1].split('```')[0].trim();
    }
    else if (candidate.includes('```')) {
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
    }
    catch {
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
function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        req.on('end', () => {
            if (!body) {
                resolve({});
                return;
            }
            try {
                resolve(JSON.parse(body));
            }
            catch (error) {
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
    if (filePath.endsWith('.html'))
        return 'text/html; charset=utf-8';
    if (filePath.endsWith('.css'))
        return 'text/css; charset=utf-8';
    if (filePath.endsWith('.js'))
        return 'text/javascript; charset=utf-8';
    if (filePath.endsWith('.json'))
        return 'application/json; charset=utf-8';
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
    }
    catch {
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
