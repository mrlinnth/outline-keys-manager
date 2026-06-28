# Project Constraints
Generated: 2026-06-28
Confirmed by developer: yes

## Project
Self-hosted web app for Outline VPN key management. The app runs as a single Docker container, with Express serving the built React frontend in production.

## Stack & Versions

| Package / Framework | Version | Notes |
|---|---|---|
| React | 18.2.0 | Current pinned frontend dependency |
| React DOM | 18.2.0 | Keep in lockstep with React |
| Vite | 5.0.8 | Current pinned frontend build tool |
| @vitejs/plugin-react | 4.2.1 | Current pinned Vite React plugin |
| Express | 4.18.2 | Current backend framework dependency |
| Node.js | 20-alpine | Current Docker base image in `Dockerfile` |

## Language Standards

- **JavaScript**: ES modules (`type: module`), function components, React hooks, no TypeScript
- **Node.js**: use native `https.request` plus a custom HTTPS agent for Outline API calls; do not rely on `fetch` agent behavior
- **CSS**: plain CSS in `frontend/src/index.css`

## Coding Conventions

- Backend handlers stay thin: validate input, call Outline, return JSON
- Reuse the existing `makeHttpsRequest` helper for all Outline API traffic
- Disable SSL verification for Outline requests because servers use self-signed certificates
- Surface raw Outline API error messages; do not sanitize away useful details
- Process batch work sequentially and keep going after individual failures
- Keep all client state in React; do not add localStorage or persisted client state
- Prefer simple loading text and confirm dialogs over heavier UI patterns
- For destructive bulk actions, reuse the current server list/delete flow unless there is a clear reason to add a new backend route

## Verification

Command: `docker compose up -d`
Expected: the container builds and starts successfully, and the app is reachable at `http://localhost:3000`

If a plan file specifies its own verification, use that instead for those tasks.

## Explicit Exclusions

- No TypeScript conversion
- No authentication or user management
- No persistent database
- No queue or worker system
- No localStorage
- No framework upgrade as part of the Delete All feature

## Plan File Format

Plan files live in `ai/plans/<feature-name>/`, sorted by filename.

Tasks use this heading format:
### Task [N.N]: [Title]

When a task is completed, append ` [DONE]` to the heading:
### Task [N.N]: [Title] [DONE]
