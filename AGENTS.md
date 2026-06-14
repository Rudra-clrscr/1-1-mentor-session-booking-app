# Agent Guide — 1-on-1 Mentor Session Booking App

## Project Overview

Real-time mentor-student collaboration platform. Mentors and students connect via 1-on-1 sessions featuring collaborative code editing (Yjs CRDT), WebRTC video calls, screen sharing, and Socket.io chat.

**Stack:**
- Frontend: Next.js 14 + React 18 + TypeScript + Tailwind CSS (Netlify)
- Backend: Node.js + Express + Socket.io + TypeScript (Render)
- DB: PostgreSQL on Neon
- Auth: Supabase Auth
- Collab editor: Yjs + y-websocket (separate server, port 1234)

---

## Repository Structure

```
1-1-mentor-session-booking-app/
├── frontend/src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── admin/            # Admin dashboard
│   │   ├── browse/           # Browse mentors
│   │   ├── calendar/         # Mentor availability calendar
│   │   ├── dashboard/        # Role-based dashboard + analytics/availability
│   │   ├── earnings/         # Mentor earnings
│   │   ├── login/ signup/    # Auth pages
│   │   ├── mentor/[id]/      # Mentor public profile
│   │   ├── profile/          # User profile settings
│   │   ├── search/           # Mentor search
│   │   ├── session/[id]/     # Active session (editor + video + chat)
│   │   ├── session/create/   # Create session
│   │   └── sessions/history/ # Session history
│   ├── components/
│   │   ├── ui/               # shadcn/ui primitives + GlowingComponents
│   │   ├── CollaborativeEditor.tsx   # Yjs + Monaco integration
│   │   ├── VideoConferencing.tsx     # WebRTC video component
│   │   ├── VideoConferenceWrapper.tsx
│   │   ├── NotificationDropdown.tsx
│   │   ├── RatingsSection.tsx
│   │   ├── SessionFeedbackForm.tsx
│   │   ├── SessionRatingModal.tsx
│   │   ├── ReminderToast.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── VideoCodeModal.tsx
│   ├── hooks/
│   │   └── useAuth.ts        # Supabase auth hook
│   ├── services/
│   │   ├── api.ts            # REST API client (all backend calls)
│   │   ├── socket.ts         # Socket.io client setup
│   │   ├── webrtc.ts         # WebRTC peer connection logic
│   │   ├── collaborativeEditorService.ts  # Yjs provider setup
│   │   └── webrtcDebug.ts / webrtcDiagnostics.ts
│   ├── store/index.ts        # Global state (Zustand or Context)
│   └── types/index.ts        # Shared TypeScript types
│
├── backend/src/
│   ├── index.ts              # Express app + Socket.io server entry
│   ├── config.ts             # Env config
│   ├── database.ts           # Neon PostgreSQL connection pool
│   ├── migrations.ts         # Migration runner
│   ├── seed.ts               # DB seed data
│   ├── yWebsocketServer.ts   # Yjs WebSocket server (CRDT)
│   ├── middleware/
│   │   └── auth.ts           # JWT + Supabase auth middleware
│   ├── routes/               # Express route handlers
│   │   ├── auth.ts           # POST /login, /signup, /logout
│   │   ├── sessions.ts       # CRUD + join sessions
│   │   ├── users.ts          # User listing + search
│   │   ├── profile.ts        # Profile CRUD
│   │   ├── messages.ts       # Chat message history
│   │   ├── code.ts           # Code snapshots + execution
│   │   ├── availability.ts   # Mentor availability slots
│   │   ├── ratings.ts        # Session ratings + reviews
│   │   ├── payments.ts       # Payment records
│   │   ├── recordings.ts     # Session recordings
│   │   ├── notifications.ts  # In-app notifications
│   │   ├── sessionHistory.ts # Historical session data
│   │   ├── analytics.ts      # Dashboard analytics
│   │   └── admin.ts          # Admin routes
│   ├── services/
│   │   ├── emailService.ts   # Email (reminders, notifications)
│   │   └── reminderService.ts # Scheduled session reminders
│   ├── socket/
│   │   ├── handlers.ts       # Main Socket.io event handlers
│   │   ├── realtimeHandlers.ts
│   │   └── handlers/         # Modular event handlers
│   ├── migrations/           # SQL migration files (run in order)
│   └── utils/
│       └── codeExecutor.py   # Python code execution sandbox
│
├── database/                 # Schema docs + raw SQL
├── docs/                     # Architecture, API, deployment docs
└── .github/                  # PR templates, CI workflows
```

---

## Key Conventions

### Auth
- Supabase Auth handles identity. JWT tokens attached to every API request via `Authorization: Bearer <token>`.
- Backend `middleware/auth.ts` verifies JWT before protected routes.
- Two roles: `mentor` and `student`. Role-based UI and API guards enforced.
- Session ownership: only the creating mentor can end/delete a session.

### Database
- PostgreSQL on Neon. Connection pool in `backend/src/database.ts`.
- Raw SQL queries — no ORM. Query builders in route/service files.
- Migrations live in `backend/src/migrations/`. Always add new SQL files; never edit existing ones.
- UUIDs as primary keys.

### Real-time Architecture
- **Collaborative editing**: Yjs CRDT via `yWebsocketServer.ts` on port 1234. Frontend uses `collaborativeEditorService.ts` + `CollaborativeEditor.tsx`.
- **Chat + presence**: Socket.io in `backend/src/socket/handlers.ts`. Frontend `services/socket.ts`.
- **Video calls**: WebRTC peer connections. Signaling over Socket.io. Logic in `services/webrtc.ts` + `VideoConferencing.tsx`.

### Frontend Patterns
- App Router (Next.js 14). Each route has its own `page.tsx`.
- Server components where possible; client components marked with `"use client"`.
- API calls go through `services/api.ts` — do not call `fetch` directly in components.
- shadcn/ui for base components. Custom glowing UI in `components/ui/GlowingComponents.tsx`.
- Tailwind for all styling. No CSS modules or styled-components.

### Backend Patterns
- Express routes call services/DB directly — no separate controller layer in practice.
- All routes return JSON. Error responses: `{ error: string, details?: string }`.
- Environment variables via `backend/src/config.ts`. Never hardcode secrets.

---

## Environment Variables

Backend requires (see `backend/.env.example`):
```
DATABASE_URL          # Neon PostgreSQL connection string
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET
PORT                  # default 3001
```

Frontend requires (`.env.local`):
```
NEXT_PUBLIC_API_URL           # Backend URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_WS_URL            # y-websocket server URL (port 1234)
```

---

## Running Locally

```bash
# Backend (port 3001)
cd backend && npm install && npm run dev

# Collaborative editor server (port 1234)
cd backend && npm run collab

# Frontend (port 3000)
cd frontend && npm install && npm run dev
```

---

## Common Tasks

| Task | Where to look |
|------|---------------|
| Add API endpoint | `backend/src/routes/<area>.ts` |
| Add DB table | New file in `backend/src/migrations/` |
| Add frontend page | `frontend/src/app/<route>/page.tsx` |
| Update UI component | `frontend/src/components/` |
| Modify auth logic | `backend/src/middleware/auth.ts` + `frontend/src/hooks/useAuth.ts` |
| Change socket events | `backend/src/socket/handlers.ts` + `frontend/src/services/socket.ts` |
| Update video logic | `frontend/src/services/webrtc.ts` + `VideoConferencing.tsx` |
| Update collab editor | `frontend/src/components/CollaborativeEditor.tsx` + `collaborativeEditorService.ts` |

---

## Deployment

- **Frontend**: Netlify. Auto-deploys from `master`. Config in `netlify.toml`.
- **Backend**: Render. Config in `render.yaml`. Includes both the Express server and y-websocket server.
- **Database**: Neon (serverless PostgreSQL). Run migrations manually after schema changes.

---

## What to Avoid

- Do not bypass the `auth` middleware on protected routes.
- Do not edit existing SQL migration files — add new ones.
- Do not call backend APIs directly from Next.js server components without auth tokens.
- Do not use `any` in TypeScript — check `frontend/src/types/index.ts` for shared types.
- Do not introduce new CSS files — use Tailwind classes.
- Session termination is mentor-only — preserve this access control.
