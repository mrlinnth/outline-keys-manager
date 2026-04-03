# Outline Key Manager

A self-hosted web app to manage Outline VPN server keys. Supports creating, deleting, and migrating keys across servers.

## Features

- **Create Key** — create a single named key on any Outline server and get its access URL
- **Delete Key** — delete a key by name from any Outline server
- **Migrate Keys** — fetch all key names from a source server and batch-create them on a destination server (useful when resetting a VPS to get a new IP)
  - Handle duplicate key names automatically (adds `_2`, `_3`, etc. suffixes)
  - View results with success/failure breakdown
  - Retry failed keys
- Mobile-responsive PWA

## Prerequisites

- Docker and Docker Compose installed

## Quick Start

```bash
docker-compose up -d
```

Access the app at `http://localhost:3000`

## Development Setup

### Backend

```bash
cd backend
npm install
npm run dev
```

The backend runs on port 3000.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on port 5173, with API proxy to `http://localhost:3000`.

## Usage

### Create Key

1. Paste the server JSON from Outline Manager
2. Enter a key name
3. Click **Create Key** — the access URL is shown on success

### Delete Key

1. Paste the server JSON from Outline Manager
2. Enter the name of the key to delete
3. Click **Delete Key**

### Migrate Keys

1. **Connect to Source Server** — paste the server JSON and fetch all key names
2. **Connect to Destination Server** — paste the new server JSON and create keys with the same names
3. **View Results** — see which keys were created successfully, copy access URLs, retry failures

## Notes

- Outline servers use self-signed certificates, so the app bypasses SSL verification
- The app does not persist data — refreshing the page resets everything
- If key creation succeeds but naming fails, the key ID is included in the error for manual fixing

## Tech Stack

- **Frontend**: React + Vite, PWA
- **Backend**: Node.js + Express
- **Deployment**: Single Docker container
