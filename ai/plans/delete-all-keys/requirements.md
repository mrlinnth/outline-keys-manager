# Delete All Keys

## Overview
Add a `Delete All` action to the current server view so a user can remove every access key from the connected Outline server in one operation.

This is a destructive, current-server-only feature. It should reuse the existing server JSON input, SSL-bypassing Outline API access, and inline loading/error patterns already present in the app.

## User Flows
- User pastes a valid current-server JSON payload and the app loads the current key list.
- User clicks `Delete All`, confirms the destructive action, and the app deletes every key currently on that server.
- The app shows a success/failure summary for the batch.
- After completion, the current key list refreshes so the table reflects the server state.

## API
- Add a backend bulk-delete endpoint that accepts `apiUrl` and deletes every access key returned by `GET {apiUrl}/access-keys`.
- Use the existing HTTPS helper and SSL bypass for all Outline API requests.
- Return a per-key result summary so the frontend can show which deletes succeeded and which failed.

## Business Rules and Edge Cases
- Only the current server section gets the `Delete All` action.
- Require an explicit browser confirmation before any deletion begins.
- Delete keys sequentially and continue after individual failures.
- If the key list is empty, disable the action or no-op with a clear UI state.
- If list retrieval fails, surface the raw error and do not attempt deletion.
- Keep the existing single-key delete flow unchanged.

## Acceptance Criteria
- A `Delete All` button appears in the current server area when a server is loaded.
- Clicking it asks for confirmation before any destructive action runs.
- The app deletes every key on the connected Outline server, not just the currently visible rows.
- The app continues past individual delete failures and shows full error details.
- The current server list refreshes after the batch completes.
- The feature works with the existing SSL-bypassed Outline API setup.

## Out of Scope
- Delete All for the destination server area
- Undo or restore after deletion
- Typed confirmation or multi-step destructive gating
- Background deletion jobs
- Any change to migration behavior
