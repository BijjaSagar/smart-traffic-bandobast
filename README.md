# Smart Bandobast System (SBS)

A digital command platform for police bandobast (event deployment) management — live duty
posts on a map, geofenced attendance, one-tap officer SOS, and a real-time command dashboard.
Built to replace paper duty charts and radio-only coordination with a connected system.

This repo covers **Phase 1** of the proposal: digital duty chart, live command map, geofenced
attendance, and one-tap panic/SOS with real-time updates. Later phases (crowd heatmap, traffic
diversion engine, WhatsApp citizen bot, multi-agency dashboard) plug into the same data model.

## Structure

```
backend/    Node.js + Express + TypeScript + Drizzle ORM + PostgreSQL + Socket.io
frontend/   React + Vite + TypeScript + Tailwind + MapLibre GL
```

## Quick start (local)

### 1. Backend
```bash
cd backend
cp .env.example .env      # fill in DATABASE_URL, JWT_SECRET
npm install
npm run db:push           # push schema to Postgres
npm run db:seed           # creates a demo admin + officer + sample event
npm run dev                # http://localhost:4000
```

### 2. Frontend
```bash
cd frontend
cp .env.example .env      # set VITE_API_URL=http://localhost:4000
npm install
npm run dev                # http://localhost:5173
```

Demo login (after seed): `admin@sbs.local` / `Admin@123` (Commander) and
`officer@sbs.local` / `Officer@123` (Field Officer).

## Deploying

### Backend → Railway
1. Create a new Railway project → **Deploy from GitHub repo**, root directory `backend/`.
2. Add a **PostgreSQL** plugin — Railway sets `DATABASE_URL` automatically.
3. Set env vars: `JWT_SECRET`, `CORS_ORIGIN` (your Vercel frontend URL), `NODE_ENV=production`.
4. Railway runs `npm install && npm run build && npm start` (see `backend/railway.json`).
5. After first deploy, run `npm run db:push` once (Railway shell or a one-off deploy) to create tables.

### Frontend → Vercel
1. Import the repo into Vercel, root directory `frontend/`.
2. Framework preset: Vite. Build command `npm run build`, output `dist`.
3. Env var: `VITE_API_URL` = your Railway backend URL (e.g. `https://sbs-backend.up.railway.app`).
4. Deploy.

## Data model (Phase 1)

- **events** — a bandobast event (yatra, VIP visit, festival) with venue + time window
- **posts** — a picket / barricade / checkpoint / medical post, with lat/lng + geofence radius
- **post_assignments** — which officer is assigned to which post, for which shift
- **attendance** — geofenced check-in records against a post assignment
- **sos_alerts** — panic-button alerts with GPS location, ack/resolve lifecycle

## Real-time events (Socket.io, room = `event:<eventId>`)

- `attendance:update` — officer checked in/out
- `sos:new`, `sos:ack`, `sos:resolved` — SOS lifecycle
- `post:update` — post/roster status changed

## Roadmap beyond Phase 1

See the proposal document (`Smart-Bandobast-System-Proposal.docx`) for the full 12-module
vision: AI deployment planner, crowd-density heatmap, dynamic traffic diversion (reusing the
PravahOS/MargAI fusion engine), green-corridor automation, digital nakabandi/QR checks, the
WhatsApp citizen advisory bot, and the multi-agency command dashboard.
