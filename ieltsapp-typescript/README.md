# IELTS App TypeScript Rewrite

This folder contains a TypeScript rewrite of the original Flask + vanilla JS IELTS app.

## Stack

- TypeScript client in `client/main.ts`
- TypeScript Node server in `server/server.ts`
- File-based persistence in `data/`
- OpenAI Chat Completions API integration (gpt-5.6-luna) for generation, PDF import and translation

## Run

1. Copy `.env.example` to `.env`
2. Set `OPENAI_API_KEY` (models and reasoning effort are configurable, see `.env.example`)
3. Install dependencies and build:
   - `npm.cmd install`
   - `npm.cmd run build`
4. Start:
   - `npm.cmd start`
5. Open:
   - `http://localhost:5080`

## Notes

- Auth uses a signed cookie session.
- Users, progress, jobs, and practice sets are stored as JSON files under `data/`.
- The client supports:
  - registration/login/logout
  - progress history
  - mixed FITB + TFNG generation
  - matching headings generation
  - passage highlighting
  - word translation to Turkish
  - shareable practice set URLs
  - importing an existing reading from a PDF (passage + True/False/Not Given, completion and matching-headings questions; other question types are listed as skipped)
