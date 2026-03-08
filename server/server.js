import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  analyzeSpeaking,
  createRealtimeSession,
  generateSpeech,
  getExplanation,
  getFullWritingFeedback,
  getMetaWritingFeedback,
  getWritingFeedback,
  transcribeAudio
} from './openaiApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function sendError(res, error) {
  console.error(error);

  const status = typeof error?.status === 'number' ? error.status : 500;
  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  res.status(status).json({ error: message });
}

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      sendError(res, error);
    }
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/config', (_req, res) => {
  res.json({
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY)
  });
});

app.post('/api/openai/explanation', asyncRoute(async (req, res) => {
  const { question, selectedAnswer, correctAnswer } = req.body || {};

  if (!question || !selectedAnswer || !correctAnswer) {
    throw createHttpError(400, 'question, selectedAnswer, and correctAnswer are required.');
  }

  res.json(await getExplanation(question, selectedAnswer, correctAnswer));
}));

app.post('/api/openai/writing-feedback', asyncRoute(async (req, res) => {
  const { text, promptTitle } = req.body || {};
  if (!text) {
    throw createHttpError(400, 'text is required.');
  }

  res.json(await getWritingFeedback(text, promptTitle));
}));

app.post('/api/openai/meta-writing-feedback', asyncRoute(async (req, res) => {
  const { text } = req.body || {};
  if (!text) {
    throw createHttpError(400, 'text is required.');
  }

  res.json(await getMetaWritingFeedback(text));
}));

app.post('/api/openai/full-writing-feedback', asyncRoute(async (req, res) => {
  const { text, promptTitle } = req.body || {};
  if (!text) {
    throw createHttpError(400, 'text is required.');
  }

  res.json(await getFullWritingFeedback(text, promptTitle));
}));

app.post('/api/openai/transcribe', upload.single('audio'), asyncRoute(async (req, res) => {
  if (!req.file) {
    throw createHttpError(400, 'audio file is required.');
  }

  const transcript = await transcribeAudio({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    filename: req.file.originalname || 'recording.webm'
  });

  res.type('text/plain').send(transcript);
}));

app.post('/api/openai/speech', asyncRoute(async (req, res) => {
  const { text, voice } = req.body || {};
  if (!text) {
    throw createHttpError(400, 'text is required.');
  }

  const audioBuffer = await generateSpeech(text, voice);
  res.setHeader('Content-Type', 'audio/mpeg');
  res.send(audioBuffer);
}));

app.post('/api/openai/speaking-analysis', asyncRoute(async (req, res) => {
  const { transcript, question } = req.body || {};
  if (!transcript || !question) {
    throw createHttpError(400, 'transcript and question are required.');
  }

  res.json(await analyzeSpeaking(transcript, question));
}));

app.post('/api/openai/realtime/session', asyncRoute(async (req, res) => {
  const { instructions, voice, inputAudioTranscription, turnDetection } = req.body || {};
  if (!instructions || !voice) {
    throw createHttpError(400, 'instructions and voice are required.');
  }

  const session = await createRealtimeSession({
    instructions,
    voice,
    inputAudioTranscription,
    turnDetection
  });

  res.json(session);
}));

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
