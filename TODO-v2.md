# Outline Key Manager v2 — Implementation Checklist

## Overview

v2 redesigns the UI from a tab-based 3-page flow into a single-page dashboard with two persistent sections: **Current Server** and **New Server**.

### What's new

- **Single page** — no tabs; both sections always visible
- **Auto-load** — table populates automatically when valid server JSON is entered (debounced)
- **Keys table** — columns: Key Name, Usage (real data from Outline metrics API), Actions
- **Inline actions** — Copy Access Key (to clipboard), Remove (with confirm dialog)
- **Inline key creation** — name input + Create button above the table
- **Simplified migration** — "Migrate All Keys" button in New Server section; no step flow

### User workflow

1. Paste Current Server JSON → table auto-loads keys with usage data
2. Optionally: create a key inline or remove keys inline
3. Paste New Server JSON → click "Migrate All Keys" → view results

### Tech stack

Same as v1: React (Vite) frontend + Node.js/Express backend, single Docker container.

---

## Project Structure (v2)

```
outline-keys-manager/
├── frontend/
│   └── src/
│       ├── App.jsx                          ← rewrite (single page)
│       ├── index.css                        ← update styles
│       └── components/
│           ├── CurrentServer.jsx            ← new
│           ├── KeyTable.jsx                 ← new
│           ├── NewServer.jsx                ← new
│           └── MigrateResults.jsx           ← new (based on Results.jsx)
├── backend/
│   └── src/
│       └── server.js                        ← add /api/keys/transfer endpoint
└── TODO-v2.md
```

Old components to delete after new ones are in place:
`ServerForm.jsx`, `KeyList.jsx`, `Results.jsx`, `CreateKeyPage.jsx`,
`DeleteKeyPage.jsx`, `ExportForm.jsx`, `CreateForm.jsx`, `MigrateKeysPage.jsx`

---

## Phase 1: Backend — Add Usage/Transfer Endpoint

### Task 1: Add `POST /api/keys/transfer` endpoint

**File:** `backend/src/server.js`

**Requirements:**

- [x] Add endpoint after the existing `/api/keys/delete` handler
- [x] Validate `apiUrl` is present in request body; return 400 if missing
- [x] Call `GET {apiUrl}/metrics/transfer` using the existing `makeHttpsRequest` utility
- [x] On success: return the Outline API response as-is
- [x] On error: return `{ "error": "error message" }` with status 500

**Outline API response shape:**

```json
{
  "bytesTransferredByUserId": {
    "0": 104857600,
    "1": 209715200
  }
}
```

Keys are access key `id` values (strings). The frontend joins this with the keys list.

- [x] Verify existing endpoints (`/list`, `/create`, `/delete`) are unchanged

---

## Phase 2: App.jsx — Single-Page Skeleton

### Task 2: Rewrite App.jsx

**File:** `frontend/src/App.jsx`

**Requirements:**

- [x] Remove all tab state (`activePage`) and tab bar JSX
- [x] State to lift here:
  - `currentApiUrl` (string | null) — extracted apiUrl from current server JSON
  - `currentKeys` (array) — `[{ id, name, accessUrl, usageBytes }]`
- [x] Render structure:
  ```jsx
  <div className="container">
    <h1>Outline Manager</h1>
    <CurrentServer
      onKeysLoaded={(apiUrl, keys) => {
        setCurrentApiUrl(apiUrl);
        setCurrentKeys(keys);
      }}
    />
    <hr />
    <NewServer sourceApiUrl={currentApiUrl} sourceKeys={currentKeys} />
  </div>
  ```
- [x] No other logic in App.jsx — all section logic lives in child components

---

## Phase 3: CurrentServer.jsx — JSON Input, Auto-Load, Create Key

### Task 3: Create `CurrentServer.jsx`

**File:** `frontend/src/components/CurrentServer.jsx`

**State:**

| Variable          | Type         | Initial |
| ----------------- | ------------ | ------- |
| `jsonInput`       | string       | `''`    |
| `validationError` | string\|null | `null`  |
| `apiUrl`          | string\|null | `null`  |
| `keys`            | array        | `[]`    |
| `loading`         | boolean      | `false` |
| `fetchError`      | string\|null | `null`  |
| `newKeyName`      | string       | `''`    |
| `createLoading`   | boolean      | `false` |
| `createError`     | string\|null | `null`  |

**Behavior:**

- [x] Textarea `onChange`:
  - Attempt `JSON.parse(value)`
  - If invalid JSON: set `validationError = 'Invalid JSON'`, set `apiUrl = null`
  - If valid but no `apiUrl` field: set `validationError = 'Missing apiUrl field'`, set `apiUrl = null`
  - If `apiUrl` doesn't start with `https://`: set `validationError = 'apiUrl must start with https://'`, set `apiUrl = null`
  - If all valid: clear `validationError`, set `apiUrl` to extracted value

- [x] `useEffect` watching `apiUrl`:
  - If `apiUrl` is null: do nothing
  - If `apiUrl` is set: wait 400ms (debounce), then trigger `fetchKeys()`
  - Clear debounce timer on cleanup

- [x] `fetchKeys()` function:
  - Set `loading = true`, clear `fetchError`
  - Call `POST /api/keys/list` and `POST /api/keys/transfer` **in parallel** using `Promise.all`
  - Merge: for each key in `listData.accessKeys`, look up `transferData.bytesTransferredByUserId[key.id]` (default 0)
  - Merged shape: `{ id, name, accessUrl, usageBytes }`
  - Call prop `onKeysLoaded(apiUrl, mergedKeys)`
  - Set `keys = mergedKeys`
  - On any error: set `fetchError` to error message
  - Set `loading = false`

- [ ] Render structure:

  ```
  <section>
    <h2>Current Server</h2>
    <textarea placeholder='{"apiUrl":"https://...","certSha256":"..."}' />
    {validationError && <p className="error">{validationError}</p>}
    {fetchError && <p className="error">{fetchError}</p>}
    {loading && <p>Loading keys...</p>}

    <div className="create-key-row">
      <input placeholder="Enter Key Name" value={newKeyName} />
      <button disabled={!apiUrl || createLoading || !newKeyName.trim()}>
        {createLoading ? 'Creating...' : 'Create New Key'}
      </button>
    </div>
    {createError && <p className="error">{createError}</p>}

    <KeyTable keys={keys} apiUrl={apiUrl} onKeysChanged={fetchKeys} />
  </section>
  ```

- [x] Create Key button `onClick`:
  - Set `createLoading = true`, clear `createError`
  - Call `POST /api/keys/create` with `{ apiUrl, name: newKeyName.trim() }`
  - On success: clear `newKeyName`, call `fetchKeys()` to refresh table
  - On error: set `createError`
  - Set `createLoading = false`

---

## Phase 4: KeyTable.jsx — Table with Actions

### Task 4: Create `KeyTable.jsx`

**File:** `frontend/src/components/KeyTable.jsx`

**Props:**

| Prop            | Type         | Description                             |
| --------------- | ------------ | --------------------------------------- |
| `keys`          | array        | `[{ id, name, accessUrl, usageBytes }]` |
| `apiUrl`        | string\|null | Current server apiUrl                   |
| `onKeysChanged` | function     | Called after remove; triggers re-fetch  |

**State:**

| Variable       | Type         | Initial                                  |
| -------------- | ------------ | ---------------------------------------- |
| `busyKeyId`    | string\|null | `null` — id of key with in-flight action |
| `copyFeedback` | string\|null | `null` — id of key showing "Copied!"     |
| `actionError`  | string\|null | `null`                                   |

**Requirements:**

- [x] Always render the table structure (even with empty `keys`):

  ```html
  <table>
    <thead>
      <tr>
        <th>Key Name</th>
        <th>Usage</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {keys.map(key =>
      <tr>
        ...
      </tr>
      )}
    </tbody>
  </table>
  ```

- [x] Usage formatting helper `formatBytes(bytes)`:
  - `0` → `'0 B'`
  - `< 1024` → `'{n} B'`
  - `< 1024²` → `'{n.x} KB'`
  - `< 1024³` → `'{n.x} MB'`
  - else → `'{n.x} GB'`
  - Round to 1 decimal place

- [x] **Copy Access Key** button:
  - On click: `navigator.clipboard.writeText(key.accessUrl)`
  - After copy: set `copyFeedback = key.id`, clear it after 1500ms
  - Button text: `copyFeedback === key.id ? 'Copied!' : 'Copy Access Key'`
  - Disabled while `busyKeyId === key.id`

- [x] **Remove** button:
  - On click: `window.confirm(\`Remove key "${key.name}"?\`)` — return if user cancels
  - Set `busyKeyId = key.id`, clear `actionError`
  - Call `POST /api/keys/delete` with `{ apiUrl, name: key.name }`
  - On success: call `onKeysChanged()`
  - On error: set `actionError`
  - Set `busyKeyId = null`

- [x] Show `actionError` below the table if set

- [x] All action buttons disabled when `!apiUrl`

---

## Phase 5: NewServer.jsx — Migration Target

### Task 5: Create `NewServer.jsx`

**File:** `frontend/src/components/NewServer.jsx`

**Props:**

| Prop           | Type         | Description                                   |
| -------------- | ------------ | --------------------------------------------- |
| `sourceApiUrl` | string\|null | Current server apiUrl (for display/info only) |
| `sourceKeys`   | array        | `[{ id, name, accessUrl, usageBytes }]`       |

**State:**

| Variable          | Type         | Initial |
| ----------------- | ------------ | ------- |
| `jsonInput`       | string       | `''`    |
| `validationError` | string\|null | `null`  |
| `destApiUrl`      | string\|null | `null`  |
| `loading`         | boolean      | `false` |
| `results`         | array\|null  | `null`  |

**Requirements:**

- [x] Same JSON textarea + validation logic as `CurrentServer.jsx`
  - Validate on `onChange`: valid JSON, has `apiUrl`, starts with `https://`
  - No auto-fetch — this section only acts on button click

- [x] "Migrate All Keys" button:
  - Disabled when: `!destApiUrl` OR `sourceKeys.length === 0` OR `loading`
  - Text: `loading ? 'Migrating...' : 'Migrate All Keys'`

- [x] On "Migrate All Keys" click — `handleMigrate()`:
  1. Set `loading = true`, `results = null`
  2. Fetch existing keys on destination: `POST /api/keys/list` with `{ apiUrl: destApiUrl }`
  3. Build `existingNames` Set from `listData.accessKeys.map(k => k.name)`
  4. For each `sourceKey` in `sourceKeys`:
     - Determine `finalName`: start with `sourceKey.name`; if in Set, try `name_2`, `name_3`, etc.
     - Add `finalName` to Set (prevents within-batch collisions)
     - Call `POST /api/keys/create` with `{ apiUrl: destApiUrl, name: finalName }`
     - Append to results array:
       - Success: `{ name: sourceKey.name, finalName, status: 'success', accessUrl, error: null }`
       - Failure: `{ name: sourceKey.name, finalName, status: 'failed', accessUrl: null, error: msg }`
  5. Set `results` to collected array
  6. Set `loading = false`

- [x] When `results` is set: render `<MigrateResults>` instead of (or below) the button

- [x] `onStartOver` for `MigrateResults`: reset `results = null`, `jsonInput = ''`, `destApiUrl = null`

- [x] Render structure:
  ```
  <section>
    <h2>New Server</h2>
    <textarea ... />
    {validationError && <p className="error">{validationError}</p>}
    <button onClick={handleMigrate} disabled={...}>Migrate All Keys</button>
    {results && <MigrateResults results={results} onStartOver={...} />}
  </section>
  ```

---

## Phase 6: MigrateResults.jsx

### Task 6: Create `MigrateResults.jsx`

**File:** `frontend/src/components/MigrateResults.jsx`

This is a renamed, lightly adapted version of v1's `Results.jsx`.

**Props:**

| Prop          | Type     | Description                                       |
| ------------- | -------- | ------------------------------------------------- |
| `results`     | array    | `[{ name, finalName, status, accessUrl, error }]` |
| `onStartOver` | function | Reset NewServer state                             |
| `onRetry`     | function | Called with array of failed key names             |
| `loading`     | boolean  | True during retry                                 |

**Requirements:**

- [x] Summary line: `"X succeeded, Y failed"`
- [x] Successes section: format each as markdown in a `<pre>` block:
  - Same name: `**key-name**\naccessUrl`
  - Different name: `**original-name** (created as: final-name)\naccessUrl`
- [x] Failures section: show key name + error message for each failure
- [x] "Retry Failed Keys" button — only if failures exist; disabled when `loading`
  - On click: call `onRetry(failedNames)`
  - Text: `loading ? 'Retrying...' : 'Retry Failed Keys'`
- [x] "Start Over" button — always visible; calls `onStartOver()`

**Note:** `NewServer.jsx` must implement the retry handler:

- Collect failed names from results
- Re-fetch destination keys (to refresh existing names set)
- Run the same duplicate-suffix + create loop for failed names only
- Merge: keep previous successes, replace failures with new results

---

## Phase 7: Styling

### Task 7: Update `index.css`

**File:** `frontend/src/index.css`

**Remove:**

- [x] `.tab-bar`, `.tab`, `.tab.active` styles (no longer used)

**Add:**

- [x] Section heading styles:

  ```css
  section h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }
  ```

- [x] Table styles:

  ```css
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
  }
  th {
    text-align: left;
    padding: 0.5rem;
    border-bottom: 2px solid #dee2e6;
    font-size: 0.85rem;
    color: #666;
  }
  td {
    padding: 0.5rem;
    border-bottom: 1px solid #f0f0f0;
    vertical-align: middle;
  }
  tr:last-child td {
    border-bottom: none;
  }
  ```

- [x] Action button styles (small, inline):

  ```css
  .btn-action {
    font-size: 0.8rem;
    padding: 0.2rem 0.5rem;
    margin-left: 0.4rem;
  }
  .btn-remove {
    color: #dc3545;
    border-color: #dc3545;
    background: transparent;
  }
  .btn-remove:hover:not(:disabled) {
    background: #dc3545;
    color: #fff;
  }
  .btn-copy.copied {
    color: #28a745;
    border-color: #28a745;
  }
  ```

- [x] Create key row (inline input + button):

  ```css
  .create-key-row {
    display: flex;
    gap: 0.5rem;
    margin: 1rem 0 0.5rem;
  }
  .create-key-row input {
    flex: 1;
  }
  ```

- [x] `hr` divider between sections: `margin: 2rem 0; border: none; border-top: 1px solid #dee2e6;`

- [x] Disabled state for "Migrate All Keys": covered by existing `button:disabled` rule

- [x] Keep: container, form, textarea, error, result-box, `<pre>`, button base styles

---

## Phase 8: Cleanup

### Task 8: Delete old components

After verifying the app runs correctly:

- [ ] Delete `frontend/src/components/ServerForm.jsx`
- [ ] Delete `frontend/src/components/KeyList.jsx`
- [ ] Delete `frontend/src/components/Results.jsx`
- [ ] Delete `frontend/src/components/CreateKeyPage.jsx`
- [ ] Delete `frontend/src/components/DeleteKeyPage.jsx`
- [ ] Delete `frontend/src/components/ExportForm.jsx`
- [ ] Delete `frontend/src/components/CreateForm.jsx`
- [ ] Delete `frontend/src/components/MigrateKeysPage.jsx`

---

## Testing Checklist

### Backend

- [ ] `POST /api/keys/transfer` returns usage data from valid Outline server
- [ ] `POST /api/keys/transfer` returns `{ error }` with 400 if `apiUrl` missing
- [ ] `POST /api/keys/transfer` returns `{ error }` with 500 on connection failure
- [ ] Existing `/list`, `/create`, `/delete` endpoints unchanged and still working

### Current Server section

- [ ] Pasting valid JSON auto-fetches keys within ~400ms (no button needed)
- [ ] Invalid JSON shows validation error; no fetch triggered
- [ ] Missing `apiUrl` field shows validation error
- [ ] Non-https `apiUrl` shows validation error
- [ ] Keys table shows headers immediately (before JSON entered)
- [ ] Keys table populates with correct names and usage after load
- [ ] Usage column shows human-readable values (KB/MB/GB)
- [ ] Loading indicator shows during fetch
- [ ] Fetch error shown if server unreachable
- [ ] Create New Key button disabled when no apiUrl or empty name
- [ ] Creating a key refreshes the table with the new key
- [ ] Create error shown if creation fails

### KeyTable actions

- [ ] "Copy Access Key" writes `ss://` URL to clipboard
- [ ] "Copied!" feedback appears on clicked button, disappears after 1.5s
- [ ] "Remove" shows `window.confirm` dialog before deleting
- [ ] Confirming removes key and refreshes table
- [ ] Cancelling does nothing
- [ ] Remove error shown inline if deletion fails
- [ ] All buttons disabled during in-flight request for that key

### New Server section

- [ ] JSON validation works same as Current Server
- [ ] "Migrate All Keys" disabled until valid destApiUrl AND sourceKeys.length > 0
- [ ] Migrate fetches destination keys first, then creates all source key names
- [ ] Duplicate handling: source "alice" + existing dest "alice" → creates "alice_2"
- [ ] Within-batch duplicates handled: two source keys "bob" → "bob" and "bob_2"
- [ ] Results show success/failure breakdown
- [ ] Failures show retry button; retry only processes failed keys
- [ ] "Start Over" resets New Server section

### Integration

- [ ] Full workflow: load current server → see keys → enter new server → migrate → view results
- [ ] App starts fresh on page refresh (no state persistence)
- [ ] Mobile layout at 375px: table scrollable horizontally, inputs full-width

### Docker

- [ ] `docker-compose up -d` builds and starts successfully
- [ ] App accessible at `http://localhost:3000`
- [ ] All API endpoints reachable through Docker

---

## Implementation Notes

### Auto-fetch debounce

Use a `useRef` to hold the debounce timer. Clear it in the `useEffect` cleanup and whenever `apiUrl` changes. This prevents a stale fetch from firing if the user quickly edits the JSON.

```js
const debounceRef = useRef(null);
useEffect(() => {
  if (!apiUrl) return;
  clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(fetchKeys, 400);
  return () => clearTimeout(debounceRef.current);
}, [apiUrl]);
```

### Parallel fetch for list + transfer

```js
const [listRes, transferRes] = await Promise.all([
  fetch('/api/keys/list', { method: 'POST', ... }),
  fetch('/api/keys/transfer', { method: 'POST', ... }),
]);
```

If transfer fails (some Outline versions may not support metrics), fall back to `usageBytes = 0` for all keys rather than failing the whole load.

### Duplicate-suffix algorithm (same as v1)

```js
const usedNames = new Set(existingKeys.map((k) => k.name));

for (const name of sourceNames) {
  let finalName = name;
  let suffix = 2;
  while (usedNames.has(finalName)) {
    finalName = `${name}_${suffix}`;
    suffix++;
  }
  usedNames.add(finalName); // reserve before next iteration
  // ... create key with finalName
}
```

### Outline API reference

**List keys:** `GET {apiUrl}/access-keys`
**Transfer stats:** `GET {apiUrl}/metrics/transfer`
**Create key:** `POST {apiUrl}/access-keys`
**Rename key:** `PUT {apiUrl}/access-keys/{id}/name` with `{ "name": "..." }` → 204
**Delete key:** `DELETE {apiUrl}/access-keys/{id}` → 204
