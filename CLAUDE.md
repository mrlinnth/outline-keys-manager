# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Backend:**

```bash
cd backend && npm install
npm run dev      # dev with --watch (auto-restart)
npm start        # production
```

**Frontend:**

```bash
cd frontend && npm install
npm run dev      # Vite dev server on :5173, proxies /api → :3000
npm run build    # outputs to frontend/dist/
```

**Docker:**

```bash
docker build -t outline-key-manager .
docker-compose up -d
# App at http://localhost:3000
```

No test runner is configured. See AGENTS.md for manual test cases.

## Architecture

Single Docker container: Express serves both the API and the React build (`frontend/dist/`) in production. In development, Vite dev server (`npm run dev` in `frontend/`) proxies `/api/*` to the Express backend on port 3000.

**Data flow:**

1. User pastes Outline server JSON → `ServerForm` validates and extracts `apiUrl`
2. Frontend calls `POST /api/keys/list` → backend proxies to Outline API
3. User pastes destination server JSON → frontend calls `POST /api/keys/create` per key
4. `App.jsx` handles all state: `step` drives UI between `source → destination → results`

**Key constraints:**

- Outline servers use self-signed certs → backend uses `https.Agent({ rejectUnauthorized: false })` via native `https.request` (not `fetch`, which doesn't support custom agents without a polyfill)
- Creating a named key requires two API calls: POST to create, then PUT to rename. If rename fails, treat as failure and include the key ID in the error
- Duplicate name handling: before each batch, fetch existing names, then find `name`, `name_2`, `name_3`, etc. using a Set that accumulates as keys are created within the same batch
- All state lives in React — no localStorage, no persistence across page refreshes (intentional)

**Backend** (`backend/src/server.js`): Two endpoints — `/api/keys/list` and `/api/keys/create`. Uses ESM (`"type": "module"`).

**Frontend** (`frontend/src/`): `App.jsx` owns all state and logic. Components are presentational: `ServerForm`, `KeyList`, `Results`.

**Results format:** Markdown inside `<pre>` blocks. If `finalName ≠ name`, show `**original** (created as: final)`. Users select-all and copy the output.
