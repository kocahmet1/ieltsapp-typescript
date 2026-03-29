"use strict";
const state = {
    practiceSet: null,
    practiceId: null,
    currentUser: null,
    activeTab: 'mh',
    fitbResults: new Map(),
    tfngResults: new Map(),
    lastSavedScores: {
        fitb: null,
        tfng: null,
        mh: null,
    },
};
function byId(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Missing DOM element: ${id}`);
    }
    return element;
}
const elements = {
    registrationSection: byId('registrationSection'),
    loginSection: byId('loginSection'),
    progressSection: byId('progressSection'),
    practiceArea: byId('practiceArea'),
    passage: byId('passage'),
    questions: byId('questions'),
    tfngQuestionsContainer: byId('tfngQuestionsContainer'),
    mhHeadingsList: byId('mhHeadingsList'),
    mhQuestionArea: byId('mhQuestionArea'),
    mhResults: byId('mhResults'),
    mhCheckAnswersBtn: byId('mhCheckAnswersBtn'),
    fitbTab: byId('fitbTab'),
    tfngTab: byId('tfngTab'),
    mhTab: byId('mhTab'),
    fitbQuestions: byId('fitbQuestions'),
    tfngQuestions: byId('tfngQuestions'),
    mhQuestions: byId('mhQuestions'),
    fitbSummary: byId('fitbSummary'),
    tfngSummary: byId('tfngSummary'),
    generateBtn: byId('generateBtn'),
    generateModeSelect: byId('generateModeSelect'),
    loading: byId('loading'),
    apiKeyToggleBtn: byId('apiKeyToggleBtn'),
    apiKeySection: byId('apiKeySection'),
    apiKeyInput: byId('apiKeyInput'),
    saveApiKeyBtn: byId('saveApiKeyBtn'),
    apiKeyStatus: byId('apiKeyStatus'),
    registerForm: byId('registerForm'),
    registerUsername: byId('registerUsername'),
    registerPassword: byId('registerPassword'),
    registerMessage: byId('registerMessage'),
    loginForm: byId('loginForm'),
    loginUsername: byId('loginUsername'),
    loginPassword: byId('loginPassword'),
    loginMessage: byId('loginMessage'),
    authNav: byId('authNav'),
    loginNavBtn: byId('loginNavBtn'),
    registerNavBtn: byId('registerNavBtn'),
    progressNavBtn: byId('progressNavBtn'),
    logoutNavBtn: byId('logoutNavBtn'),
    currentUserDisplay: byId('currentUserDisplay'),
    progressTableBody: byId('progressTableBody'),
    noProgressMessage: byId('noProgressMessage'),
    translationModal: byId('translationModal'),
    translatedWord: byId('translatedWord'),
    closeTranslation: byId('closeTranslation'),
    shareUrlContainer: byId('shareUrlContainer'),
};
initialize().catch((error) => {
    console.error(error);
    setLoadingMessage('Failed to initialize the app.');
});
async function initialize() {
    bindEvents();
    loadSavedApiKey();
    updateAuthUi({ isLoggedIn: false });
    const url = new URL(window.location.href);
    const practiceId = url.searchParams.get('id');
    await checkLoginStatus();
    await fetchExistingPracticeSet(practiceId);
    showPanel('practice');
}
function bindEvents() {
    elements.generateBtn.addEventListener('click', () => {
        void generatePracticeSet();
    });
    elements.apiKeyToggleBtn.addEventListener('click', toggleApiKeySection);
    elements.saveApiKeyBtn.addEventListener('click', saveApiKey);
    elements.closeTranslation.addEventListener('click', hideTranslationModal);
    elements.passage.addEventListener('mouseup', (event) => {
        void handlePassageSelection(event);
    });
    document.addEventListener('click', (event) => {
        if (!elements.translationModal.contains(event.target) && event.target !== elements.passage) {
            hideTranslationModal();
        }
    });
    elements.fitbTab.addEventListener('click', () => switchTab('fitb'));
    elements.tfngTab.addEventListener('click', () => switchTab('tfng'));
    elements.mhTab.addEventListener('click', () => switchTab('mh'));
    elements.mhCheckAnswersBtn.addEventListener('click', checkMatchingHeadingAnswers);
    elements.loginNavBtn.addEventListener('click', () => showPanel('login'));
    elements.registerNavBtn.addEventListener('click', () => showPanel('register'));
    elements.progressNavBtn.addEventListener('click', () => {
        showPanel('progress');
        void fetchAndDisplayProgress();
    });
    elements.logoutNavBtn.addEventListener('click', () => {
        void logoutUser();
    });
    elements.registerForm.addEventListener('submit', (event) => {
        event.preventDefault();
        void registerUser();
    });
    elements.loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        void loginUser();
    });
}
function showPanel(panel) {
    const panels = {
        practice: null,
        login: elements.loginSection,
        register: elements.registrationSection,
        progress: elements.progressSection,
    };
    elements.loginSection.style.display = 'none';
    elements.registrationSection.style.display = 'none';
    elements.progressSection.style.display = 'none';
    if (panel === 'practice') {
        if (state.practiceSet) {
            elements.practiceArea.classList.remove('hidden');
        }
        return;
    }
    elements.practiceArea.classList.add('hidden');
    panels[panel]?.style.setProperty('display', 'block');
}
function updateAuthUi(loginState) {
    if (loginState.isLoggedIn && loginState.user) {
        state.currentUser = loginState.user;
        elements.loginNavBtn.style.display = 'none';
        elements.registerNavBtn.style.display = 'none';
        elements.logoutNavBtn.style.display = 'inline-block';
        elements.progressNavBtn.style.display = 'inline-block';
        elements.currentUserDisplay.textContent = `Welcome, ${loginState.user.username}`;
        elements.currentUserDisplay.style.display = 'inline-block';
    }
    else {
        state.currentUser = null;
        elements.loginNavBtn.style.display = 'inline-block';
        elements.registerNavBtn.style.display = 'inline-block';
        elements.logoutNavBtn.style.display = 'none';
        elements.progressNavBtn.style.display = 'none';
        elements.currentUserDisplay.textContent = '';
        elements.currentUserDisplay.style.display = 'none';
    }
}
async function checkLoginStatus() {
    const response = await fetch('/api/current_user', { credentials: 'same-origin' });
    const data = (await response.json());
    updateAuthUi(data);
}
async function registerUser() {
    const username = elements.registerUsername.value.trim();
    const password = elements.registerPassword.value.trim();
    if (!username || !password) {
        setStatus(elements.registerMessage, 'Please fill in all fields.', 'error');
        return;
    }
    const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'same-origin',
    });
    const payload = await response.json();
    if (response.ok) {
        elements.registerForm.reset();
        setStatus(elements.registerMessage, payload.message ?? 'Registration successful.', 'success');
    }
    else {
        setStatus(elements.registerMessage, payload.message ?? 'Registration failed.', 'error');
    }
}
async function loginUser() {
    const username = elements.loginUsername.value.trim();
    const password = elements.loginPassword.value.trim();
    if (!username || !password) {
        setStatus(elements.loginMessage, 'Please fill in all fields.', 'error');
        return;
    }
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'same-origin',
    });
    const payload = await response.json();
    if (response.ok) {
        updateAuthUi({ isLoggedIn: true, user: payload.user });
        elements.loginForm.reset();
        setStatus(elements.loginMessage, payload.message ?? 'Login successful.', 'success');
        showPanel('practice');
    }
    else {
        setStatus(elements.loginMessage, payload.message ?? 'Login failed.', 'error');
    }
}
async function logoutUser() {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    updateAuthUi({ isLoggedIn: false });
    showPanel('practice');
}
function toggleApiKeySection() {
    elements.apiKeySection.classList.toggle('hidden');
}
function loadSavedApiKey() {
    const apiKey = window.localStorage.getItem('geminiApiKey');
    if (apiKey) {
        elements.apiKeyStatus.textContent = 'Custom API key is set and will be sent with requests.';
        elements.apiKeyStatus.className = 'api-key-status success';
    }
    else {
        elements.apiKeyStatus.textContent = 'No custom API key saved. The server will use its default key if configured.';
        elements.apiKeyStatus.className = 'api-key-status';
    }
}
function saveApiKey() {
    const apiKey = elements.apiKeyInput.value.trim();
    if (!apiKey) {
        window.localStorage.removeItem('geminiApiKey');
        elements.apiKeyStatus.textContent = 'Saved API key removed.';
        elements.apiKeyStatus.className = 'api-key-status';
        elements.apiKeyInput.value = '';
        return;
    }
    if (apiKey.length < 20) {
        elements.apiKeyStatus.textContent = 'That key looks too short to be valid.';
        elements.apiKeyStatus.className = 'api-key-status error';
        return;
    }
    window.localStorage.setItem('geminiApiKey', apiKey);
    elements.apiKeyInput.value = '';
    elements.apiKeyStatus.textContent = 'Custom API key saved.';
    elements.apiKeyStatus.className = 'api-key-status success';
}
function currentGeneratorMode() {
    return elements.generateModeSelect.value === 'mixed_fitb_tfng' ? 'mixed_fitb_tfng' : 'matching_headings';
}
async function generatePracticeSet() {
    clearHighlights();
    state.fitbResults.clear();
    state.tfngResults.clear();
    state.lastSavedScores = { fitb: null, tfng: null, mh: null };
    setLoadingHtml(`
    <p>Starting generation process...</p>
    <p class="small">This can take a while because the passage and questions are generated on demand.</p>
  `);
    elements.generateBtn.disabled = true;
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey: window.localStorage.getItem('geminiApiKey') ?? '',
                question_type: currentGeneratorMode(),
            }),
            credentials: 'same-origin',
        });
        const payload = await response.json();
        if (!response.ok || !payload.job_id) {
            throw new Error(payload.error ?? 'Failed to start generation.');
        }
        const practiceSet = await pollJobStatus(payload.job_id);
        if (!practiceSet) {
            throw new Error('The generation job did not complete in time.');
        }
        displayPracticeSet(practiceSet);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown generation failure.';
        setLoadingHtml(`<p style="color: #b42318;">${escapeHtml(message)}</p>`);
    }
    finally {
        elements.generateBtn.disabled = false;
    }
}
async function pollJobStatus(jobId) {
    const startedAt = Date.now();
    const maxDuration = 180000;
    const interval = 2000;
    while (Date.now() - startedAt < maxDuration) {
        const progress = Math.min(((Date.now() - startedAt) / maxDuration) * 100, 100);
        setLoadingHtml(`
      <p>Generating practice set...</p>
      <p class="small">Elapsed ${Math.floor((Date.now() - startedAt) / 1000)}s</p>
      <div class="progress-container">
        <div class="progress-bar" style="width:${progress}%;"></div>
      </div>
    `);
        const response = await fetch(`/api/job-status?job_id=${encodeURIComponent(jobId)}`, {
            credentials: 'same-origin',
        });
        if (response.ok) {
            const payload = await response.json();
            if (payload.status === 'completed' && payload.practice_set) {
                return payload.practice_set;
            }
            if (payload.status === 'failed') {
                throw new Error(payload.error ?? 'Generation failed.');
            }
        }
        await sleep(interval);
    }
    return null;
}
async function fetchExistingPracticeSet(practiceId) {
    const query = practiceId ? `?id=${encodeURIComponent(practiceId)}` : '';
    const response = await fetch(`/api/practice-set${query}`, { credentials: 'same-origin' });
    if (!response.ok) {
        return;
    }
    const practiceSet = await response.json();
    displayPracticeSet(practiceSet);
}
function displayPracticeSet(practiceSet) {
    state.practiceSet = practiceSet;
    state.practiceId = practiceSet.id;
    state.fitbResults.clear();
    state.tfngResults.clear();
    state.lastSavedScores = { fitb: null, tfng: null, mh: null };
    elements.fitbSummary.className = 'answer-result hidden';
    elements.fitbSummary.textContent = '';
    elements.tfngSummary.className = 'answer-result hidden';
    elements.tfngSummary.textContent = '';
    elements.mhResults.className = 'mh-results answer-result hidden';
    elements.mhResults.textContent = '';
    elements.questions.innerHTML = '';
    elements.tfngQuestionsContainer.innerHTML = '';
    elements.mhHeadingsList.innerHTML = '';
    elements.mhQuestionArea.innerHTML = '';
    hideTranslationModal();
    renderPassage(practiceSet.passage);
    renderShareUrl(practiceSet.shareUrl ?? '');
    const questionType = resolvePracticeSetType(practiceSet);
    if (questionType === 'matching_headings') {
        renderMatchingHeadings(practiceSet);
        switchTab('mh');
    }
    else {
        renderMixedQuestions(practiceSet);
        switchTab('fitb');
    }
    showPanel('practice');
    elements.practiceArea.classList.remove('hidden');
    elements.loading.classList.add('hidden');
}
function resolvePracticeSetType(practiceSet) {
    if (practiceSet.paragraphs) {
        return 'matching_headings';
    }
    return 'mixed_fitb_tfng';
}
function renderShareUrl(shareUrl) {
    if (!shareUrl) {
        elements.shareUrlContainer.innerHTML = '';
        return;
    }
    elements.shareUrlContainer.className = 'share-url-container';
    elements.shareUrlContainer.innerHTML = `
    <p>Share this practice set:</p>
    <div class="share-url-box">
      <input type="text" readonly value="${escapeAttribute(shareUrl)}" class="share-url-input" />
      <button class="btn copy-btn" type="button">Copy</button>
    </div>
  `;
    const input = elements.shareUrlContainer.querySelector('.share-url-input');
    const button = elements.shareUrlContainer.querySelector('.copy-btn');
    if (!input || !button) {
        return;
    }
    button.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(input.value);
            button.textContent = 'Copied!';
            window.setTimeout(() => {
                button.textContent = 'Copy';
            }, 1500);
        }
        catch {
            input.select();
            document.execCommand('copy');
        }
    });
}
function renderPassage(passage) {
    const paragraphs = passage.split(/\n\s*\n/).filter((p) => p.trim());
    elements.passage.innerHTML = paragraphs.map((p) => `<p>${escapeHtml(p.trim())}</p>`).join('');
}
function renderMixedQuestions(practiceSet) {
    const fitbQuestions = practiceSet.questions.filter((question) => question.question_type === 'FITB');
    const tfngQuestions = practiceSet.questions.filter((question) => question.question_type === 'TFNG');
    for (const question of fitbQuestions) {
        elements.questions.appendChild(createFitbQuestionElement(question, fitbQuestions.length));
    }
    for (const question of tfngQuestions) {
        elements.tfngQuestionsContainer.appendChild(createTfngQuestionElement(question, tfngQuestions.length));
    }
}
function renderMatchingHeadings(practiceSet) {
    const headingsMarkup = [
        '<p><strong>Instructions:</strong> Match the headings below to the correct paragraphs in the passage.</p>',
        '<ul>',
        ...practiceSet.headings.map((heading) => `<li><strong>${escapeHtml(heading.id)}.</strong> ${escapeHtml(heading.text)}</li>`),
        '</ul>',
    ].join('');
    elements.mhHeadingsList.innerHTML = headingsMarkup;
    for (const paragraph of practiceSet.paragraphs) {
        const wrapper = document.createElement('div');
        wrapper.className = 'mh-paragraph-selection question-item';
        const label = document.createElement('label');
        label.textContent = `Paragraph ${paragraph.id}`;
        label.htmlFor = `mh-${paragraph.id}`;
        const select = document.createElement('select');
        select.id = `mh-${paragraph.id}`;
        select.dataset.paragraphId = paragraph.id;
        select.innerHTML = [
            '<option value="">Select a heading...</option>',
            ...practiceSet.headings.map((heading) => `<option value="${escapeAttribute(heading.id)}">${escapeHtml(heading.id)}. ${escapeHtml(heading.text)}</option>`),
        ].join('');
        select.addEventListener('change', () => {
            select.classList.remove('correct', 'incorrect');
            elements.mhResults.classList.add('hidden');
        });
        wrapper.append(label, select);
        elements.mhQuestionArea.appendChild(wrapper);
    }
}
function createFitbQuestionElement(question, totalQuestions) {
    const container = document.createElement('div');
    container.className = 'question-item';
    container.dataset.questionId = String(question.id);
    const questionText = document.createElement('p');
    questionText.className = 'question-text';
    questionText.textContent = question.question;
    const answerInput = document.createElement('input');
    answerInput.type = 'text';
    answerInput.className = 'answer-input';
    answerInput.placeholder = 'Your answer...';
    answerInput.dataset.correctAnswer = question.answer;
    answerInput.addEventListener('input', () => {
        result.className = 'answer-result hidden';
        result.textContent = '';
    });
    const actions = document.createElement('div');
    actions.className = 'question-actions';
    if (question.source_sentence) {
        const revealButton = document.createElement('button');
        revealButton.type = 'button';
        revealButton.className = 'btn secondary';
        revealButton.textContent = 'Related Sentence';
        revealButton.addEventListener('click', () => {
            highlightPassageFragment(question.source_sentence ?? '');
        });
        actions.appendChild(revealButton);
    }
    const checkButton = document.createElement('button');
    checkButton.type = 'button';
    checkButton.className = 'btn';
    checkButton.textContent = 'Check Answer';
    checkButton.addEventListener('click', () => {
        const isCorrect = normalizeText(answerInput.value) === normalizeText(question.answer);
        const questionId = String(question.id);
        state.fitbResults.set(questionId, isCorrect);
        result.textContent = isCorrect ? 'Correct!' : 'Incorrect. Try again.';
        result.className = `answer-result ${isCorrect ? 'correct' : 'incorrect'}`;
        updateScoreSummary('fitb', totalQuestions);
    });
    actions.appendChild(checkButton);
    const result = document.createElement('div');
    result.className = 'answer-result hidden';
    container.append(questionText, answerInput, actions, result);
    return container;
}
function createTfngQuestionElement(question, totalQuestions) {
    const container = document.createElement('div');
    container.className = 'question-item';
    container.dataset.questionId = String(question.id);
    const statement = document.createElement('p');
    statement.className = 'question-text';
    statement.textContent = question.statement;
    const options = document.createElement('div');
    options.className = 'tfng-options';
    const result = document.createElement('div');
    result.className = 'answer-result hidden';
    ['True', 'False', 'Not Given'].forEach((option) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tfng-option';
        button.textContent = option;
        button.addEventListener('click', () => {
            options.querySelectorAll('.tfng-option').forEach((candidate) => {
                candidate.classList.remove('selected', 'correct', 'incorrect');
            });
            button.classList.add('selected');
            const isCorrect = option === question.answer;
            state.tfngResults.set(String(question.id), isCorrect);
            if (isCorrect) {
                button.classList.add('correct');
                result.textContent = 'Correct!';
                result.className = 'answer-result correct';
            }
            else {
                button.classList.add('incorrect');
                result.textContent = `Incorrect. The answer is ${question.answer}.`;
                result.className = 'answer-result incorrect';
            }
            updateScoreSummary('tfng', totalQuestions);
        });
        options.appendChild(button);
    });
    const actions = document.createElement('div');
    actions.className = 'question-actions';
    if (question.relevant_passage) {
        const highlightButton = document.createElement('button');
        highlightButton.type = 'button';
        highlightButton.className = 'btn secondary';
        highlightButton.textContent = 'Highlight Passage';
        highlightButton.addEventListener('click', () => {
            highlightPassageFragment(question.relevant_passage ?? '', true);
        });
        actions.appendChild(highlightButton);
    }
    container.append(statement, options, actions, result);
    return container;
}
function updateScoreSummary(kind, totalQuestions) {
    const results = kind === 'fitb' ? state.fitbResults : state.tfngResults;
    const summary = kind === 'fitb' ? elements.fitbSummary : elements.tfngSummary;
    const correct = Array.from(results.values()).filter(Boolean).length;
    const answered = results.size;
    summary.textContent = `Score: ${correct}/${totalQuestions} (${answered}/${totalQuestions} answered)`;
    summary.className = 'answer-result';
    if (answered >= totalQuestions && totalQuestions > 0) {
        void saveProgress(kind, `${correct}/${totalQuestions}`);
    }
}
function checkMatchingHeadingAnswers() {
    if (!state.practiceSet || resolvePracticeSetType(state.practiceSet) !== 'matching_headings') {
        return;
    }
    const practiceSet = state.practiceSet;
    const selects = Array.from(elements.mhQuestionArea.querySelectorAll('select[data-paragraph-id]'));
    let correctCount = 0;
    for (const select of selects) {
        const paragraphId = select.dataset.paragraphId;
        const selectedValue = select.value;
        const correctValue = paragraphId ? practiceSet.answers[paragraphId] : undefined;
        select.classList.remove('correct', 'incorrect');
        if (!paragraphId || !selectedValue) {
            continue;
        }
        if (selectedValue === correctValue) {
            correctCount += 1;
            select.classList.add('correct');
        }
        else {
            select.classList.add('incorrect');
        }
    }
    const total = practiceSet.paragraphs.length;
    elements.mhResults.textContent = `You matched ${correctCount} out of ${total} headings correctly.`;
    elements.mhResults.className = 'mh-results answer-result';
    void saveProgress('mh', `${correctCount}/${total}`);
}
async function saveProgress(kind, score) {
    if (!state.currentUser || !state.practiceId) {
        return;
    }
    if (state.lastSavedScores[kind] === score) {
        return;
    }
    const payload = {
        practice_set_id: state.practiceId,
    };
    if (kind === 'fitb') {
        payload.score_fitb = score;
    }
    if (kind === 'tfng') {
        payload.score_tfng = score;
    }
    if (kind === 'mh') {
        payload.score_mh = score;
    }
    const response = await fetch('/api/save_progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin',
    });
    if (response.ok) {
        state.lastSavedScores[kind] = score;
    }
}
async function fetchAndDisplayProgress() {
    elements.progressTableBody.innerHTML = '';
    elements.noProgressMessage.style.display = 'none';
    const response = await fetch('/api/get_progress', { credentials: 'same-origin' });
    if (!response.ok) {
        elements.progressTableBody.innerHTML = '<tr><td colspan="5" style="padding: 12px; color: #b42318; text-align: center;">Failed to load progress.</td></tr>';
        return;
    }
    const records = await response.json();
    if (records.length === 0) {
        elements.noProgressMessage.style.display = 'block';
        return;
    }
    for (const record of records) {
        const row = elements.progressTableBody.insertRow();
        row.insertCell().textContent = record.date_attempted ?? '-';
        row.insertCell().textContent = record.practice_set_id ?? '-';
        row.insertCell().textContent = record.score_fitb ?? '-';
        row.insertCell().textContent = record.score_tfng ?? '-';
        row.insertCell().textContent = record.score_mh ?? '-';
    }
}
function switchTab(tab) {
    state.activeTab = tab;
    elements.fitbTab.classList.toggle('active', tab === 'fitb');
    elements.tfngTab.classList.toggle('active', tab === 'tfng');
    elements.mhTab.classList.toggle('active', tab === 'mh');
    elements.fitbQuestions.classList.toggle('active', tab === 'fitb');
    elements.tfngQuestions.classList.toggle('active', tab === 'tfng');
    elements.mhQuestions.classList.toggle('active', tab === 'mh');
}
function clearHighlights() {
    if (state.practiceSet) {
        renderPassage(state.practiceSet.passage);
    }
}
function highlightPassageFragment(fragment, allowFuzzy = false) {
    if (!state.practiceSet) {
        return;
    }
    const passage = state.practiceSet.passage;
    if (passage.includes(fragment)) {
        applyHighlight(fragment);
        return;
    }
    if (!allowFuzzy) {
        return;
    }
    const words = fragment.split(/\s+/).filter((word) => word.length > 4);
    const sentences = passage.split(/(?<=[.!?])\s+/);
    let bestSentence = '';
    let bestScore = 0;
    for (const sentence of sentences) {
        let score = 0;
        for (const word of words) {
            if (sentence.toLowerCase().includes(word.toLowerCase())) {
                score += 1;
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestSentence = sentence;
        }
    }
    if (bestSentence) {
        applyHighlight(bestSentence);
        return;
    }
    applyHighlight(fragment.slice(0, 120));
}
function applyHighlight(fragment) {
    if (!state.practiceSet) {
        return;
    }
    const passage = state.practiceSet.passage;
    const index = passage.indexOf(fragment);
    if (index === -1) {
        return;
    }
    const before = passage.slice(0, index);
    const highlighted = fragment;
    const after = passage.slice(index + fragment.length);
    const raw = `${escapeHtml(before)}<mark-hl>${escapeHtml(highlighted)}</mark-hl>${escapeHtml(after)}`;
    const paragraphs = raw.split(/\n\s*\n/).filter((p) => p.trim());
    const html = paragraphs.map((p) => {
        const withHighlight = p.trim().replace('<mark-hl>', '<span class="highlight">').replace('</mark-hl>', '</span>');
        return `<p>${withHighlight}</p>`;
    }).join('');
    elements.passage.innerHTML = html;
    elements.passage.querySelector('.highlight')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function handlePassageSelection(event) {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() ?? '';
    if (!selectedText || selectedText.length > 500) {
        return;
    }
    elements.translatedWord.textContent = 'Çevriliyor...';
    positionTranslationModal(event);
    try {
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                word: selectedText,
                apiKey: window.localStorage.getItem('geminiApiKey') ?? '',
            }),
            credentials: 'same-origin',
        });
        const payload = await response.json();
        if (!response.ok) {
            throw new Error(payload.error ?? 'Translation failed.');
        }
        const isSentence = selectedText.length > 40;
        if (isSentence) {
            elements.translatedWord.textContent = payload.translation ?? '';
        }
        else {
            elements.translatedWord.textContent = `${selectedText}: ${payload.translation ?? ''}`;
        }
        positionTranslationModal(event);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Translation failed.';
        elements.translatedWord.textContent = message;
    }
}
function positionTranslationModal(event) {
    const selection = window.getSelection();
    const rect = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).getBoundingClientRect() : null;
    const mouseEvent = event;
    const left = rect?.left ?? mouseEvent.clientX;
    const top = rect?.bottom ?? mouseEvent.clientY;
    elements.translationModal.style.display = 'block';
    elements.translationModal.style.left = `${left}px`;
    elements.translationModal.style.top = `${top + 8}px`;
}
function hideTranslationModal() {
    elements.translationModal.style.display = 'none';
}
function setStatus(element, message, variant) {
    element.textContent = message;
    element.className = `auth-message ${variant}`;
}
function setLoadingHtml(html) {
    elements.loading.innerHTML = html;
    elements.loading.classList.remove('hidden');
}
function setLoadingMessage(message) {
    setLoadingHtml(`<p>${escapeHtml(message)}</p>`);
}
function normalizeText(value) {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
}
function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}
function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
function escapeAttribute(value) {
    return escapeHtml(value).replaceAll('`', '&#96;');
}
