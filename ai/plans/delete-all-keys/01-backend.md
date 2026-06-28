# Task Plan: Delete All Keys

## Summary
Implement a bulk-delete backend endpoint and wire a current-server `Delete All` action in the frontend.

## Implementation
### Task 1.1: Add bulk delete API [DONE]
- Add a new backend route for deleting all keys from one server.
- Reuse the existing `makeHttpsRequest` helper and SSL bypass agent.
- Fetch the current key list, delete each key sequentially by ID, and collect per-key success/failure results.
- Return a response shaped for the UI, including counts and error details.

### Task 1.2: Add the current-server Delete All control [DONE]
- Add a `Delete All` button in the current server area, near the existing key table/actions.
- Disable the button when no server is loaded or when the key list is empty.
- Require a confirm dialog before sending the request.
- Show loading text while the batch is running.

### Task 1.3: Render batch results and refresh state [DONE]
- Show a summary of deleted keys and failures after the batch completes.
- Preserve the full error message for each failed deletion.
- Refresh the current key list after the batch finishes so the table reflects server state.
- Keep the existing single-key create/delete and migrate flows unchanged.

## Test Plan
- Verify the backend endpoint deletes all keys on a server with multiple keys.
- Verify the backend continues after one delete failure and returns the failure detail.
- Verify the button is disabled when no keys are loaded.
- Verify confirm-cancel does not send any delete request.
- Verify the UI refreshes after the bulk delete completes.

## Assumptions
- The action applies only to the current server.
- A simple confirm dialog is acceptable for the destructive step.
- The app should keep using sequential network calls for safety and clarity.
