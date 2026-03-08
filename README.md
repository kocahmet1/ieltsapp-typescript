# English Master

English learning app focused on IELTS and TOEFL practice. The app is built with React, TypeScript, Vite, and a small Node/Express server used for secure OpenAI API access in production.

## What changed for deployment

- OpenAI calls now go through the server, so `OPENAI_API_KEY` is never exposed in the browser.
- Render can run the whole app as one web service.
- `render.yaml` is included for blueprint-based deployment.
- `/api/health` and `/api/config` are available for Render and runtime checks.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
copy .env.example .env
```

3. Set your variables in `.env`:

```env
OPENAI_API_KEY=sk-your-openai-api-key
PORT=3001
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

Notes:
- `OPENAI_API_KEY` is server-only. Do not prefix it with `VITE_`.
- Firebase config values are safe to expose to the client, but they still need to match your Firebase project.

## Development

Run client and server together:

```bash
npm run dev
```

- Vite runs on `http://localhost:5173`
- The Express API runs on `http://localhost:3001`
- Vite proxies `/api` to the local server

## Production build

```bash
npm run build
npm start
```

The server serves the built frontend from `dist/` and exposes the API under `/api`.

## GitHub prep

Before pushing:
- Confirm `.env` is not committed.
- Commit `package-lock.json`, `render.yaml`, `server/`, and the frontend changes.
- Push the repo to GitHub.

## Deploy to Render

### Option 1: Blueprint deploy

1. Push this repo to GitHub.
2. In Render, choose `New +` -> `Blueprint`.
3. Select the repository.
4. Render will read [`render.yaml`](/C:/Users/Test1/english-learning-app/render.yaml).
5. Fill in the environment variables, especially `OPENAI_API_KEY`.

### Option 2: Manual web service

Use these settings:

- Runtime: `Node`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Health Check Path: `/api/health`

Set these environment variables in Render:

- `OPENAI_API_KEY`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Important security note

Do not put `OPENAI_API_KEY` in frontend code or in any `VITE_*` variable. Vite variables are bundled into the client and become public.
