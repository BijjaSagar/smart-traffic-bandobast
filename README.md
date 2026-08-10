# Smart Bandobast System (SBS)

A digital command platform for police bandobast (event deployment) management — a live
duty chart on a map, geofenced attendance, one-tap officer SOS, multi-agency coordination,
and real-time command dashboards for traffic police, local police, fire and medical.
Built to replace paper duty charts, hand-drawn diagrams and radio-only coordination with
one connected system.

## Module status

| # | Module | Status |
|---|---|---|
| 1 | AI Deployment Planner | ✅ Built — suggests a duty chart from past events at the same venue |
| 2 | Live Digital Command Map | ✅ Built |
| 3 | Geofenced Attendance | ✅ Built — web + mobile |
| 4 | One-Tap SOS / Panic Button | ✅ Built — web + mobile |
| 5 | Crowd Density Heatmap | ⏳ Not started — needs a live camera/drone/crowd-density feed to consume |
| 6 | Dynamic Traffic Diversion Engine | ⏳ Scaffolded — Settings screen ready for a traffic provider key; the routes that use it aren't built yet |
| 7 | Green Corridor / VIP Movement | ✅ Built |
| 8 | Digital Nakabandi / Vehicle Watchlist | ✅ Built |
| 9 | WhatsApp Citizen Advisory Bot | ⏳ Scaffolded — Settings screen ready for WhatsApp credentials; bot logic not built yet |
| 10 | Multi-Agency Command Dashboard | ✅ Built — traffic/local police/fire/medical layers |
| 11 | After-Action Report | ✅ Built |
| 12 | Weather & Calendar Risk Scoring | ✅ Built — live forecast, no API key required |

Modules 6 and 9 are blocked only on credentials (a traffic-data provider key, and a
WhatsApp Business API account) — add them under **Settings** in the app once available
and those modules are the next thing to build. Module 5 needs an actual video/crowd-density
feed at a venue, which is a hardware/access question rather than a coding one.

## Structure

```
backend/    Node.js + Express + TypeScript + Drizzle ORM + PostgreSQL + Socket.io
frontend/   React + Vite + TypeScript + Tailwind + MapLibre GL   (control room / commander)
mobile/     Flutter + BLoC (feature-first)                       (field officer app)
```

All three talk to the same backend API — one source of truth, no duplicated logic between
the web command dashboard and the field app.

## Quick start (local)

### 1. Backend
```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET, and generate SETTINGS_ENCRYPTION_KEY:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm install
npm run db:push           # push schema to Postgres
npm run db:seed           # demo commander + multi-agency officers + a sample event
npm run dev                # http://localhost:4000
```

### 2. Frontend (web command dashboard)
```bash
cd frontend
cp .env.example .env      # set VITE_API_URL=http://localhost:4000
npm install
npm run dev                # http://localhost:5173
```

### 3. Mobile (Flutter field officer app)
```bash
cd mobile
flutter create --project-name smart_bandobast --org in.rhtechnology .   # generates android/ ios/ around lib/
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000              # 10.0.2.2 = Android emulator's localhost
```
See `mobile/README.md` for iOS location-permission setup and physical-device notes.

Demo logins (after seed): `admin@sbs.local` / `Admin@123` (Commander), plus one officer
per agency — `officer@sbs.local`, `localpolice@sbs.local`, `fire@sbs.local`,
`medical@sbs.local`, all `Officer@123`.

## Deploying

### Backend → Railway
1. New Railway project → **Deploy from GitHub repo**, root directory `backend/`.
2. Add a **PostgreSQL** plugin — Railway sets `DATABASE_URL` automatically.
3. Add env vars: `JWT_SECRET`, `SETTINGS_ENCRYPTION_KEY` (generate as above), `CORS_ORIGIN`
   (your Vercel frontend URL), `NODE_ENV=production`.
4. Railway runs `npm install && npm run build && npm start` (see `backend/railway.json`).
5. After first deploy, run `npm run db:push` once (Railway shell) to create tables, and
   `npm run db:seed` if you want demo data.

### Frontend → Vercel
1. Import the repo, root directory `frontend/`, framework preset **Vite**.
2. Build command `npm run build`, output `dist`.
3. Env var: `VITE_API_URL` = your Railway backend URL.
4. Deploy, then set `CORS_ORIGIN` on Railway to this Vercel URL.

### Mobile → Play Store / App Store
1. Generate platform folders (`flutter create .` as above), point `--dart-define=API_BASE_URL`
   at the production Railway URL in your release build command.
2. `flutter build appbundle` (Android) / `flutter build ipa` (iOS) once store accounts are ready.

## Adding integration API keys (Modules 6 & 9)

Sign in as commander/admin and open **Settings** in the nav. Add a traffic-data provider
key (HERE, TomTom, or Google Maps) and/or WhatsApp Business API credentials (Twilio Account
SID, Auth Token, sender number). Values are encrypted at rest (`SETTINGS_ENCRYPTION_KEY`)
and never displayed again in full — only a masked preview. This is a database-backed
settings screen rather than more env vars, so adding a key doesn't require a redeploy, and
a commander — not just whoever manages Railway — can manage them.

`backend/src/routes/settings.ts` exports `getSetting(key)` for the next routes that will
consume these credentials once added.

## Data model

- **users** — role (admin/commander/officer) and agency (traffic police/local police/fire/medical/municipal)
- **events** — a bandobast event (yatra, VIP visit, festival) with venue + time window
- **posts** — a picket / barricade / checkpoint / medical post, with lat/lng + geofence radius
- **post_assignments** — which officer is assigned to which post, for which shift
- **attendance** — geofenced check-in records against a post assignment
- **sos_alerts** — panic-button alerts with GPS location, ack/resolve lifecycle
- **convoys** / **convoy_waypoints** — green-corridor routes and junction-by-junction progress
- **watchlist_entries** / **checkpoint_logs** — nakabandi vehicle watchlist and check history
- **integration_settings** — encrypted API credentials for Modules 6 & 9

## Real-time events (Socket.io, room = `event:<eventId>`)

- `attendance:update` — officer checked in/out
- `sos:new`, `sos:ack`, `sos:resolved` — SOS lifecycle
- `post:update` — post/roster status changed
- `convoy:update` — convoy started or advanced to the next junction
- `checkpoint:hit` — a checked vehicle matched the watchlist
