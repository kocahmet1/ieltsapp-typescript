# IELTS App TypeScript Rewrite

This folder contains a TypeScript rewrite of the original Flask + vanilla JS IELTS app.

## Stack

- TypeScript client in `client/main.ts`
- TypeScript Node server in `server/server.ts`
- File-based persistence in `data/`
- Gemini REST API integration for generation and translation

## Run

1. Copy `.env.example` to `.env`
2. Set `GEMINI_API_KEY`
3. Build:
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
