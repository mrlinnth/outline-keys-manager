# Outline Key Manager

A self-hosted web app to manage Outline VPN server keys. When you reset your Outline VPS to get a new IP, you need to recreate all keys with the same names. This app automates that process.

## Features

- Connect to old Outline server and fetch all key names
- Connect to new Outline server and batch create keys with same names
- Handle duplicate key names automatically (adds _2, _3, etc. suffixes)
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

### Backend Development

```bash
cd backend
npm install
npm run dev
```

The backend will run on port 3000.

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on port 5173, with API proxy to `http://localhost:3000`.

## Usage

1. **Connect to Source Server**
   - Paste the server JSON from Outline Manager
   - The app will fetch all key names from the old server

2. **Connect to Destination Server**
   - Paste the new server JSON from Outline Manager
   - The app will create keys with the same names
   - Duplicate names will get suffixes (_2, _3, etc.)

3. **View Results**
   - See which keys were created successfully
   - Copy the access URLs for the new keys
   - Retry failed keys if needed

## Notes

- Outline servers use self-signed certificates, so the app bypasses SSL verification
- The app does not persist data - refreshing the page resets everything
- If key creation succeeds but naming fails, the key ID is included in the error for manual fixing

## Tech Stack

- **Frontend**: React + Vite, PWA
- **Backend**: Node.js + Express
- **Deployment**: Single Docker container
