# Product Requirements Document
Generated: 2026-06-28
Confirmed by developer: yes

## Overview
Outline Key Manager is a self-hosted web app for managing Outline VPN access keys. It helps a user recreate key sets after replacing a server, while also supporting day-to-day key creation and deletion.

## Problem
When an Outline server is reset or replaced, users need a fast way to recreate the same key set without manually handling each key through the Outline API. The app removes that repetitive work and keeps the full API error detail for debugging connection issues.

## Target Users
People who self-host Outline VPN servers, especially users resetting or replacing a VPS and needing to preserve client key names.

## Core Features

### Create Key
**Scope:** Create a single named key on any connected Outline server and return its access URL. The app uses the existing two-step create then rename flow and surfaces full API errors when either step fails.
**Dependencies:** None
**Priority:** 1

### Delete Key
**Scope:** Delete one key by name from any connected Outline server. The app resolves the key from the current server key list, confirms the action, and deletes the key by ID.
**Dependencies:** None
**Priority:** 1

### Delete All Keys
**Scope:** From the current server view, delete every key currently listed on the connected Outline server after an explicit destructive confirmation. The app should continue through the full batch even if individual deletes fail, and show which deletions failed.
**Dependencies:** Delete Key
**Priority:** 2

### Migrate Keys
**Scope:** Fetch all key names from a source server and batch-create them on a destination server. The app should automatically suffix duplicate names, process the whole batch even when some keys fail, show a success/failure breakdown, and allow retrying failures.
**Dependencies:** Create Key
**Priority:** 1

## Out of Scope
- User accounts or authentication
- Persistent storage
- Undo, recycle bin, or soft delete
- Background jobs or queues
- Multi-user collaboration
- Any server-side database for key state
- Framework or runtime upgrades as part of this feature

## Success Criteria
A user can connect to an Outline server, create keys, delete one key, delete all keys, and migrate keys without manual API work. The app preserves full Outline error details, handles duplicate names during migration, and keeps working even when some batch operations fail.

## References
- `README.md`
- `TODO-v1.md`
- `TODO-v2.md`
- `backend/src/server.js`
- `frontend/src/components/CurrentServer.jsx`
- `frontend/src/components/KeyTable.jsx`
- `frontend/src/components/NewServer.jsx`
- `frontend/src/components/MigrateResults.jsx`
