# AGENTS.md

## Project Overview

Outline Key Manager is a self-hosted web app that automates recreating VPN keys when a user resets their Outline VPS to get a new IP.

**User Workflow:**
1. Connect to old (source) server → fetch all key names
2. Connect to new (destination) server → batch create keys with same names
3. View results with success/failure breakdown, retry failures

## Tech Stack

- **Frontend:** React (Vite), single-page PWA, mobile responsive
- **Backend:** Node.js + Express, proxy to Outline API
- **Deployment:** Single Docker container, Express serves React build

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

## Development Commands

**Backend Development:**
```bash
cd backend
npm install
npm run dev  # Runs with --watch flag
```

**Frontend Development:**
```bash
cd frontend
npm install
npm run dev
```

**Docker:**
```bash
docker build -t outline-key-manager .
docker-compose up -d
```

Access at `http://localhost:3000`

## Key Implementation Details

### SSL Verification Bypass
Outline servers use self-signed certificates. **Must disable SSL verification** for all Outline API requests.

**Backend:**
- Use custom HTTPS agent with `rejectUnauthorized: false`
- Node's native fetch doesn't support `agent` option directly
- Use `node-fetch` package or native `https.request`

### Two-Step Key Creation
Creating a key and naming it are separate API calls:

1. **POST** to `{apiUrl}/access-keys` → creates key with auto-generated name
2. **PUT** to `{apiUrl}/access-keys/{id}/name` → renames the key

If step 1 succeeds but step 2 fails, treat as **failure** and include the key ID in error message so user can manually rename it.

### Duplicate Name Handling
When creating keys on destination server, handle existing names with suffixes:

- Check if name exists on destination
- If exists, try `{name}_2`, `{name}_3`, etc. until finding unused name
- Add used name to Set after each key creation (prevents duplicates within same batch)

**Example:**
- Existing: `alice`, `alice_2`, `bob`
- Creating: `alice`, `bob`, `charlie`
- Results: `alice_3`, `bob_2`, `charlie`

### Batch Processing
Process all keys even if some fail. Do not stop on first error.

## Important Patterns

### Error Handling
- Surface **full error messages** from Outline API
- Do not sanitize or simplify error messages
- Users need complete details for debugging connection issues

### Loading States
- Change button text: "Loading...", "Connecting...", "Retrying..."
- No spinner components needed
- Keep it simple

### State Management
- No localStorage
- All state in React
- Refreshing the page resets everything (intentional)

### Results Display
- Use markdown format inside `<pre>` block:
  ```
  **key-name**
  ```
  ss://base64encodedstring@server:port#key-name
  ```
- If `finalName` differs from original `name`, show both: `**original-name** (created as: final-name)`
- Users select-all and copy

## API Endpoints

### Backend: List Keys
`POST /api/keys/list`

Request:
```json
{
  "apiUrl": "https://148.230.103.143:54617/2zR9DLA8nOQiwHvuQDfV0A"
}
```

Returns Outline API response as-is on success, `{ "error": "message" }` with status 500 on failure.

### Backend: Create Key
`POST /api/keys/create`

Request:
```json
{
  "apiUrl": "https://148.230.103.143:54617/2zR9DLA8nOQiwHvuQDfV0A",
  "name": "alice"
}
```

Returns key object with `id`, `name`, `accessUrl` on success, `{ "error": "message" }` with status 500 on failure.

## Outline API Reference

### Server JSON Format
From Outline Manager:
```json
{
  "apiUrl": "https://148.230.103.143:54617/2zR9DLA8nOQiwHvuQDfV0A",
  "certSha256": "2DC2247D1A0A6F9B857D4955AF731EC3CB29F04F5C278BA51531628C184971EF"
}
```

`apiUrl` contains full management URL with access token as path segment. `certSha256` is ignored (SSL verification disabled).

### List Access Keys
```
GET {apiUrl}/access-keys
```

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

## Testing Guidance

### Backend Tests
- `POST /api/keys/list` returns keys from valid Outline server
- `POST /api/keys/list` returns error for invalid server/credentials
- `POST /api/keys/list` returns error when apiUrl missing
- `POST /api/keys/create` creates key and sets name correctly
- `POST /api/keys/create` returns error for invalid server/credentials
- `POST /api/keys/create` returns error when apiUrl or name missing
- SSL bypass works (no certificate errors with Outline servers)

### Frontend Tests
- Source server form validates JSON input (valid JSON, has apiUrl, https prefix)
- Source server form shows error on invalid JSON
- Source server form shows error on failed connection
- Fetched keys display with correct count
- Destination server form validates JSON input
- Batch creation processes all keys (doesn't stop on error)
- Duplicate names get correct suffix (`_2`, `_3`, etc.)
- Suffix check continues until finding available name
- Results show successes in correct markdown format
- Results show failures with full error details
- Results show original name and final name when different
- Retry button only appears when there are failures
- Retry only processes failed keys
- Retry re-checks for duplicates on destination
- Retry merges results correctly (keeps old successes)
- Start Over resets all state
- Loading states disable buttons and show feedback
- Mobile layout works on small screens (test at 375px width)

### Docker Tests
- `docker build -t outline-key-manager .` completes without errors
- `docker-compose up` starts the container
- App accessible at `http://localhost:3000`
- Static files (React app) load correctly
- API endpoints work through the container

### Integration Tests
- Full workflow: fetch from source → create on destination → view results
- Retry workflow: create some failures → retry → verify only failures retried
- Duplicate handling: create key, then create same name → verify suffix added

## Additional Resources

- Full implementation details: `TODO.md`
- Docker configuration: `docker-compose.yml`, `Dockerfile`
