# Outline Key Manager - Implementation Checklist

## Overview

A self-hosted web app to manage Outline VPN server keys. When a user resets their Outline VPS to get a new IP, they need to recreate all keys with the same names. This app automates that process.

### User Workflow

1. Connect to old (source) server → fetch all key names
2. Connect to new (destination) server → batch create keys with same names
3. View results with success/failure breakdown, retry failures

### Tech Stack

- Frontend: React (Vite), single page PWA, mobile responsive
- Backend: Node.js + Express, proxy to Outline API
- Deployment: Single Docker container, Express serves React build

---

## Project Structure

```
outline-key-manager/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ServerForm.jsx
│   │   │   ├── KeyList.jsx
│   │   │   └── Results.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── public/
│   │   └── manifest.json
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── src/
│   │   └── server.js
│   └── package.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Backend Tasks

### Task 1: Initialize Node.js Project

Create `backend/package.json`:

```json
{
  "name": "outline-key-manager-backend",
  "version": "1.0.0",
  "type": "module",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

- [ ] Create the file
- [ ] Run `npm install` in backend folder

---

### Task 2: Create Express Server

Create `backend/src/server.js`:

**Requirements:**

- [ ] Import express
- [ ] Create app instance
- [ ] Parse JSON request bodies with `express.json()`
- [ ] Get port from `PORT` env variable, default to 3000
- [ ] In production (`NODE_ENV === 'production'`), serve static files from `../frontend/dist`
- [ ] In production, add catch-all route that serves `index.html` for client-side routing
- [ ] Start server and log the port

---

### Task 3: Create List Keys Endpoint

**Endpoint:** `POST /api/keys/list`

**Purpose:** Fetch all keys from an Outline server

**Request body:**
```json
{
  "apiUrl": "https://148.230.103.143:54617/2zR9DLA8nOQiwHvuQDfV0A"
}
```

The `apiUrl` contains the full management URL including the access token path.

**Implementation:**

- [ ] Validate that `apiUrl` is present in request body
- [ ] Construct URL: `{apiUrl}/access-keys`
- [ ] Make GET request using Node's native fetch
- [ ] Disable SSL verification (see Task 5)
- [ ] On success: return JSON response as-is
- [ ] On error: return `{ "error": "error message here" }` with status 500

---

### Task 4: Create Key Endpoint

**Endpoint:** `POST /api/keys/create`

**Purpose:** Create a single key on an Outline server

**Request body:**
```json
{
  "apiUrl": "https://148.230.103.143:54617/2zR9DLA8nOQiwHvuQDfV0A",
  "name": "alice"
}
```

**Implementation:**

- [ ] Validate that `apiUrl` and `name` are present
- [ ] Step 1: Create key
  - POST to `{apiUrl}/access-keys`
  - Disable SSL verification
  - Parse response to get the new key's `id`
- [ ] Step 2: Rename key
  - PUT to `{apiUrl}/access-keys/{id}/name`
  - Request body: `{ "name": "alice" }`
  - Content-Type: `application/json`
- [ ] On success: return the key object with `id`, `name`, `accessUrl`
- [ ] On error (either step): return `{ "error": "error message here" }` with status 500

**Important:** If key creation succeeds but rename fails, treat as failure. Include the created key ID in the error message so user can manually fix.

---

### Task 5: SSL Verification Bypass

Outline servers use self-signed certificates. Browsers and Node.js reject these by default.

**Implementation:**

- [ ] Create a custom HTTPS agent that disables certificate verification
- [ ] Use this agent for all fetch requests to the Outline API

**Code pattern:**
```javascript
import https from 'https';

const agent = new https.Agent({
  rejectUnauthorized: false
});

// Use in fetch calls:
fetch(url, { 
  method: 'GET',
  agent: agent 
});
```

**Note:** Node's native fetch does not support the `agent` option directly. You have two options:

Option A: Use `node-fetch` package (add to dependencies)
Option B: Use Node's native `https.request` directly

Choose one approach and apply consistently.

- [ ] Add comment in code explaining why SSL verification is disabled

---

## Frontend Tasks

### Task 6: Initialize React Project

**Using Vite:**

```bash
cd frontend
npm create vite@latest . -- --template react
npm install
```

- [ ] Create Vite React project
- [ ] Remove unnecessary boilerplate files (App.css, assets folder, etc.)
- [ ] Keep only: `main.jsx`, `App.jsx`, `index.css`

---

### Task 7: Configure Vite Proxy

Create/update `frontend/vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
```

- [ ] Configure proxy to forward `/api` requests to backend during development

---

### Task 8: Create App Component State

In `frontend/src/App.jsx`:

**State variables:**

- [ ] `sourceServer` - object `{ apiUrl }` or `null`
- [ ] `destinationServer` - object `{ apiUrl }` or `null`
- [ ] `keyNames` - array of strings, initially empty `[]`
- [ ] `results` - array of objects `{ name, finalName, status, accessUrl, error }`, initially empty `[]`
- [ ] `step` - string: `'source'` | `'destination'` | `'results'`
- [ ] `loading` - boolean, initially `false`
- [ ] `error` - string or `null`, for displaying errors

---

### Task 9: Create ServerForm Component

Create `frontend/src/components/ServerForm.jsx`:

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `title` | string | Form title ("Source Server" or "Destination Server") |
| `onSubmit` | function | Called with `{ apiUrl }` when form submitted |
| `loading` | boolean | Disables form when true |

**Requirements:**

- [ ] Single textarea field for server JSON:
  - Label: "Server JSON" or "Paste server info"
  - Placeholder: `{"apiUrl":"https://...","certSha256":"..."}`
  - User pastes the full JSON from Outline Manager
- [ ] Submit button
  - Text: "Connect" (or "Connecting..." when loading)
  - Disabled when loading
- [ ] Form validation:
  - Field required
  - Must be valid JSON
  - Must contain `apiUrl` property
  - `apiUrl` must start with `https://`
  - Show validation error if invalid
- [ ] Prevent default form submission
- [ ] Parse JSON and call `onSubmit` with `{ apiUrl }` on valid submission
- [ ] Note: `certSha256` from the JSON is ignored (we disable SSL verification anyway)

---

### Task 10: Create KeyList Component

Create `frontend/src/components/KeyList.jsx`:

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `keyNames` | string[] | Array of key names |
| `onContinue` | function | Called when user clicks Continue |

**Requirements:**

- [ ] Display count: "Found X keys"
- [ ] List all key names in a scrollable container (max-height with overflow-y: auto)
- [ ] "Continue" button to proceed to destination step
- [ ] If no keys found, show message and still allow continuing

---

### Task 11: Create Results Component

Create `frontend/src/components/Results.jsx`:

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `results` | object[] | Array of `{ name, finalName, status, accessUrl, error }` |
| `onRetry` | function | Called with array of failed key names |
| `loading` | boolean | Shows loading state during retry |

**Requirements:**

- [ ] Show summary at top: "X succeeded, Y failed"
- [ ] Split results into successes and failures
- [ ] For successes, display in markdown format inside a `<pre>` block:
  ```
  **key-name**
  ```
  ss://...
  ```
  ```
  - If `finalName` differs from original `name`, show both: `**original-name** (created as: final-name)`
- [ ] For failures, show:
  - Key name
  - Full error message
- [ ] If any failures exist, show "Retry Failed Keys" button
  - Button disabled when loading
  - Button text: "Retrying..." when loading
- [ ] "Start Over" button to reset app (always visible)

---

### Task 12: Implement Source Server Step

In `App.jsx`:

**When step is 'source':**

- [ ] Render ServerForm with title "Source Server"
- [ ] On form submit:
  1. Set loading to true, clear any previous error
  2. Call `POST /api/keys/list` with server details
  3. On success:
     - Extract key names from response (`response.accessKeys.map(k => k.name)`)
     - Store in `keyNames` state
     - Store server details in `sourceServer` state
     - Move to 'destination' step
  4. On error:
     - Display error message
     - Stay on 'source' step
  5. Set loading to false

---

### Task 13: Implement Destination Server Step

In `App.jsx`:

**When step is 'destination':**

- [ ] Render KeyList component showing fetched key names
- [ ] Render ServerForm with title "Destination Server"
- [ ] On form submit:
  1. Set loading to true, clear any previous error
  2. Store server details in `destinationServer` state
  3. Call batch creation function (Task 14)

---

### Task 14: Implement Batch Key Creation

Create a function `createKeys(serverDetails, namesToCreate)`:

**Steps:**

1. [ ] Fetch existing keys from destination server
   - Call `POST /api/keys/list`
   - Build a Set of existing key names
2. [ ] For each name in `namesToCreate`:
   - [ ] Determine final name (handle duplicates):
     - If name not in Set, use as-is
     - If name in Set, try `{name}_2`, `{name}_3`, etc. until finding unused name
   - [ ] Call `POST /api/keys/create` with the final name
   - [ ] Add the used name to the Set (prevents duplicates within same batch)
   - [ ] Store result:
     - On success: `{ name, finalName, status: 'success', accessUrl, error: null }`
     - On failure: `{ name, finalName, status: 'failed', accessUrl: null, error: errorMessage }`
3. [ ] After all keys processed:
   - Store results in `results` state
   - Move to 'results' step
   - Set loading to false

**Important:** Process all keys even if some fail. Do not stop on first error.

---

### Task 15: Implement Retry Logic

In `App.jsx`:

**Retry handler:**

- [ ] Receive array of failed key names from Results component
- [ ] Set loading to true
- [ ] Re-fetch existing keys from destination (to catch any new duplicates)
- [ ] Run batch creation only for failed names
- [ ] Merge new results with previous successes:
  - Keep all previous successes
  - Replace failed entries with new results (success or still failed)
- [ ] Update `results` state
- [ ] Set loading to false

---

### Task 16: Implement Start Over

In `App.jsx`:

**Reset handler:**

- [ ] Reset all state to initial values:
  - `sourceServer`: null
  - `destinationServer`: null
  - `keyNames`: []
  - `results`: []
  - `step`: 'source'
  - `loading`: false
  - `error`: null

---

### Task 17: Styling

Update `frontend/src/index.css`:

**Requirements:**

- [ ] CSS reset / normalize
- [ ] Mobile-first responsive design
- [ ] Container:
  - Max-width: 600px
  - Centered on desktop
  - Padding on mobile
- [ ] Form styling:
  - Stacked labels and inputs
  - Full-width inputs on mobile
  - Visible focus states
- [ ] Button styling:
  - Clear primary button style
  - Disabled state (reduced opacity, no pointer)
- [ ] Key list:
  - Scrollable container, max-height ~300px
  - Each name on its own line
- [ ] Results:
  - Monospace font for access URLs
  - `<pre>` block for markdown output
  - Clear visual separation between successes and failures
  - Error messages in red or distinct color
- [ ] Loading state:
  - Cursor: wait on body when loading
- [ ] Error messages:
  - Red/distinct color
  - Clear visibility

---

### Task 18: PWA Setup

**Create `frontend/public/manifest.json`:**

```json
{
  "name": "Outline Key Manager",
  "short_name": "Keys",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1a1a1a",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Update `frontend/index.html`:**

- [ ] Add viewport meta tag: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- [ ] Add theme-color meta tag: `<meta name="theme-color" content="#1a1a1a">`
- [ ] Link manifest: `<link rel="manifest" href="/manifest.json">`
- [ ] Add apple-touch-icon link if icons provided

**Icons:**

- [ ] Create or generate simple icons (192x192 and 512x512 PNG)
- [ ] Place in `frontend/public/`

---

## Docker Tasks

### Task 19: Create Dockerfile

Create `Dockerfile` in project root:

```dockerfile
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/src ./src
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "src/server.js"]
```

- [ ] Create the Dockerfile
- [ ] Verify it uses multi-stage build

---

### Task 20: Create docker-compose.yml

Create `docker-compose.yml` in project root:

```yaml
services:
  app:
    build: .
    container_name: outline-key-manager
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
```

- [ ] Create the file
- [ ] This format works with Dockge

---

### Task 21: Create README

Create `README.md` in project root:

**Sections to include:**

- [ ] Project title and brief description
- [ ] Features list
- [ ] Prerequisites (Docker)
- [ ] Quick start instructions:
  ```bash
  docker-compose up -d
  ```
- [ ] Access URL: `http://localhost:3000`
- [ ] Development setup instructions:
  ```bash
  # Terminal 1: Backend
  cd backend && npm install && npm run dev
  
  # Terminal 2: Frontend
  cd frontend && npm install && npm run dev
  ```
- [ ] Note about Outline API and self-signed certificates

---

## Testing Checklist

### Backend Tests

- [ ] `POST /api/keys/list` returns keys from valid Outline server
- [ ] `POST /api/keys/list` returns error for invalid server/credentials
- [ ] `POST /api/keys/list` returns error when apiUrl missing
- [ ] `POST /api/keys/create` creates key and sets name correctly
- [ ] `POST /api/keys/create` returns error for invalid server/credentials
- [ ] `POST /api/keys/create` returns error when apiUrl or name missing
- [ ] SSL bypass works (no certificate errors with Outline servers)

### Frontend Tests

- [ ] Source server form validates JSON input (valid JSON, has apiUrl, https prefix)
- [ ] Source server form shows error on invalid JSON
- [ ] Source server form shows error on failed connection
- [ ] Fetched keys display with correct count
- [ ] Destination server form validates JSON input
- [ ] Batch creation processes all keys (doesn't stop on error)
- [ ] Duplicate names get correct suffix (`_2`, `_3`, etc.)
- [ ] Suffix check continues until finding available name
- [ ] Results show successes in correct markdown format
- [ ] Results show failures with full error details
- [ ] Results show original name and final name when different
- [ ] Retry button only appears when there are failures
- [ ] Retry only processes failed keys
- [ ] Retry re-checks for duplicates on destination
- [ ] Retry merges results correctly (keeps old successes)
- [ ] Start Over resets all state
- [ ] Loading states disable buttons and show feedback
- [ ] Mobile layout works on small screens (test at 375px width)

### Docker Tests

- [ ] `docker build -t outline-key-manager .` completes without errors
- [ ] `docker-compose up` starts the container
- [ ] App accessible at `http://localhost:3000`
- [ ] Static files (React app) load correctly
- [ ] API endpoints work through the container

### Integration Tests

- [ ] Full workflow: fetch from source → create on destination → view results
- [ ] Retry workflow: create some failures → retry → verify only failures retried
- [ ] Duplicate handling: create key, then create same name → verify suffix added

---

## Implementation Notes

### Error Handling

Always surface the full error from the Outline API. Do not sanitize or simplify error messages. Users need complete details for debugging connection issues.

### No Loading Spinners

Keep it simple. Replace button text with "Loading..." or "Connecting..." during async operations. No need for spinner components.

### No localStorage

All state lives in React. Refreshing the page resets everything. This is intentional per requirements.

### Markdown Output Format

The exact format for each successful key:

```
**key-name**
```
ss://base64encodedstring@server:port#key-name
```
```

Use a `<pre>` tag in the Results component. Users will select-all and copy.

### Outline API Quirk

Creating a key and naming it are two separate API calls:

1. POST to create key (returns key with auto-generated name)
2. PUT to rename key

If step 1 succeeds but step 2 fails, the key exists with a default name. Treat this as a failure and include the key ID in the error message so the user can manually rename it in Outline Manager.

### Duplicate Suffix Logic Example

Existing keys on destination: `alice`, `alice_2`, `bob`

Creating keys: `alice`, `bob`, `charlie`

Result:
- `alice` → checks `alice` (exists) → checks `alice_2` (exists) → uses `alice_3`
- `bob` → checks `bob` (exists) → uses `bob_2`
- `charlie` → checks `charlie` (not exists) → uses `charlie`

After each key is created, add the used name to the Set before processing the next key.

---

## Outline API Reference

### Server JSON Format

From Outline Manager, you get a JSON like this:

```json
{
  "apiUrl": "https://148.230.103.143:54617/2zR9DLA8nOQiwHvuQDfV0A",
  "certSha256": "2DC2247D1A0A6F9B857D4955AF731EC3CB29F04F5C278BA51531628C184971EF"
}
```

The `apiUrl` contains the full management URL including the access token as a path segment. The `certSha256` is for certificate pinning but we ignore it since we disable SSL verification.

### List Access Keys

```
GET {apiUrl}/access-keys
```

Example: `GET https://148.230.103.143:54617/2zR9DLA8nOQiwHvuQDfV0A/access-keys`

Response:
```json
{
  "accessKeys": [
    {
      "id": "0",
      "name": "my-key",
      "password": "...",
      "port": 12345,
      "method": "chacha20-ietf-poly1305",
      "accessUrl": "ss://base64...#my-key"
    }
  ]
}
```

### Create Access Key

```
POST {apiUrl}/access-keys
```

Response:
```json
{
  "id": "1",
  "name": "",
  "password": "...",
  "port": 12345,
  "method": "chacha20-ietf-poly1305",
  "accessUrl": "ss://base64..."
}
```

### Rename Access Key

```
PUT {apiUrl}/access-keys/{id}/name
Content-Type: application/json

{
  "name": "new-name"
}
```

Response: 204 No Content on success

