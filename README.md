# 🚀 1-on-1 Mentor-Student Collaboration Platform

A real-time web application for mentors and students to collaborate with video calls, **collaborative code editing with CRDT**, and instant messaging.

## 🎯 Project Features

### Core Features ✅
- **Authentication & Authorization**: Supabase-based auth with Mentor/Student roles
- **Session Management**: Create, join, and manage 1-on-1 sessions.
- **🆕 Collaborative Code Editor** 🚀: Real-time code sync using Yjs CRDT (NO CONFLICTS!)
  - Multiple users edit simultaneously
  - Automatic conflict resolution
  - Cursor tracking with user presence
  - Offline support (changes sync on reconnect)
- **Video Conferencing**: WebRTC-based 1-on-1 video calls
- **Screen Sharing**: Share your screen during sessions
- **Instant Messaging**: Socket.io powered session-based chat
- **Code Execution**: Run code in a sandboxed environment
- **User Presence**: See who's online and active

### What Makes Collaborative Editor Special

| Feature | Benefit |
|---------|---------|
| **CRDT (Yjs)** | Automatic conflict resolution - no manual merges needed |
| **Character-level ops** | Only sends changed characters (bandwidth efficient) |
| **Offline support** | Changes queue locally, sync when reconnected |
| **Cursor tracking** | See exactly where collaborators are editing |
| **Instant sync** | ~50-100ms updates, feels like Google Docs |
| **Scalable** | Works with any number of simultaneous editors |

### Tech Stack

**Frontend**
- Next.js 14+ with TypeScript
- React 18+
- Tailwind CSS with custom theme
- Monaco Editor (VS Code)
- **✨ Yjs + y-monaco** for CRDT collaboration
- **✨ y-websocket** for real-time sync
- shadcn/ui components
- Socket.io client
- WebRTC for video

**Backend**
- Node.js + Express.js
- **✨ Y-WebSocket Server** for CRDT synchronization
- Socket.io for real-time sync
- PostgreSQL (Neon)
- Supabase Auth
- TypeScript

**Infrastructure**
- Database: PostgreSQL on Neon
- Frontend: Netlify
- Backend: Render
- **✨ Collaborative Editor Server**: Separate WebSocket for CRDT (port 1234)

## 📁 Project Structure

```
1-1-mentor-session-booking-app/
├── frontend/              # Next.js application
├── backend/               # Express.js server
├── database/              # Schema & migrations
├── docs/                  # Architecture & docs
│   ├── COLLAB_EDITOR_SETUP.md    # 📖 Comprehensive setup guide
│   ├── COLLAB_QUICK_START.md     # ⚡ Quick reference
│   └── ARCHITECTURE.md           # System architecture
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ & npm/yarn
- PostgreSQL/Neon account
- Supabase account

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Visit `http://localhost:3000`

### Backend Setup
```bash
cd backend
npm install
npm run dev
```
Backend runs on `http://localhost:5000`

## 🗄️ Database

Initialize PostgreSQL database:
```bash
cd database
npm run migrate
npm run seed
```

## 📋 API Endpoints

### Auth
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Sessions
- `POST /api/sessions` - Create session (Mentor only)
- `GET /api/sessions/:id` - Get session details
- `POST /api/sessions/:id/join` - Join session
- `POST /api/sessions/:id/end` - End session
- `GET /api/sessions/active` - Get active sessions

### Users
- `GET /api/users/mentors` - List all mentors
- `GET /api/users/profile/:id` - Get user profile
- `PUT /api/users/profile` - Update profile

## 🔌 WebSocket Events

### Code Editor
- `code:update` - Code content changed
- `cursor:move` - User cursor moved
- `language:change` - Language selection changed

### Chat
- `message:send` - Send message
- `message:receive` - Receive message

### Video
- `offer:send` - WebRTC offer
- `answer:send` - WebRTC answer
- `ice:candidate` - ICE candidate

## 🎨 Theme

Purple, Green, and Yellow glowing theme with modern glassmorphism effects.

```css
Primary: #8B5CF6 (Purple)
Secondary: #22C55E (Green)
Accent: #EAB308 (Yellow)
```

## 📦 Deployment

### Frontend (Netlify)
```bash
npm run build
```
Connect to Netlify CI/CD

### Backend (Render)
```bash
npm run build
```
Connect to Render with environment variables

## 🔐 Environment Variables

Create `.env.local` for frontend and `.env` for backend.

See `docs/ENVIRONMENT.md` for details.

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database Schema](docs/DATABASE.md)
- [API Reference](docs/API.md)
- [WebSocket Events](docs/WEBSOCKET.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## 📝 License

MIT License - See LICENSE file

## 🎥 Demo

[Live Demo Link]

## 👨‍💼 Resume Description

Built a real-time 1-on-1 mentorship platform with authentication, session management, live collaborative code editing using Socket.io, integrated messaging, WebRTC video calling, and screen sharing. Deployed on Netlify (frontend) and Render (backend) with PostgreSQL on Neon.

---

**Built with ❤️ for mentors and students worldwide**
