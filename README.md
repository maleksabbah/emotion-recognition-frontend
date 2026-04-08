# Feeler Frontend

A Next.js 14 frontend for the Multi-Stream Emotion Recognition platform.

## Pages

- `/` — landing page
- `/auth` — login / register
- `/upload` — upload an image for analysis
- `/live` — live webcam mode (WebSocket streaming)
- `/sessions` — archive of past analyses

## Setup

```bash
npm install
cp .env.local.example .env.local
# edit .env.local to point to your gateway
npm run dev
```

Opens on `http://localhost:3000`.

## Build for production

```bash
npm run build
npm start
```

## Environment variables

- `NEXT_PUBLIC_API_URL` — Gateway REST base (default `http://localhost:8000/api`)
- `NEXT_PUBLIC_WS_URL` — Gateway WebSocket base (default `ws://localhost:8000/ws`)

## Docker

```bash
docker build -t feeler-frontend .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://your-gateway.com/api \
  -e NEXT_PUBLIC_WS_URL=wss://your-gateway.com/ws \
  feeler-frontend
```

## API contract expected from the Gateway

Auth (`/api/auth/*`):
- `POST /register` `{email, username, password}` → user object
- `POST /login` `{email, password}` → `{access_token, refresh_token, expires_in}`
- `POST /refresh` `{refresh_token}` → `{access_token, refresh_token}`
- `GET /me` → current user

Upload (`/api/upload/*`):
- `POST /request` `{filename, content_type, size}` → `{upload_url, session_id, s3_key}`
- `POST /complete` `{session_id, s3_key}` → `{session_id, ...}`

Sessions (`/api/sessions/*`):
- `GET /` → list of sessions
- `GET /{id}/status` → session with `state` or `status` field, optional `progress` 0-100, emotion result
- `GET /{id}/download` → download URL

WebSocket (`/ws/live`):
- Query param: `token=<access_token>`
- Client sends binary JPEG frames
- Server sends JSON `{emotion, confidence, ...}` per frame
