# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the `gym-app/` directory:

```bash
npm run dev       # Start development server (localhost:5173)
npm run build     # Production build to /dist
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

No test framework is configured.

## Architecture

React 19 + Vite PWA with Firebase backend. French-language UI, mobile-first design (max-width 500px).

### Tech Stack
- **React Router** (HashRouter) for navigation
- **Firebase Auth** (Google OAuth) + **Firestore** for backend
- **Recharts** for stats/progress charts
- **CSS custom properties** for dark theming (no CSS framework)

### State & Data Flow

Three-layer data persistence:
1. **localStorage** — primary read/write layer for all user data (instant, offline-capable)
2. **Firestore** — background sync; writes happen after localStorage updates
3. **AppContext** (`src/context/AppContext.jsx`) — React Context for auth state, profile, and sync triggers

On login: Firestore data is pulled and cached to localStorage. All subsequent reads come from localStorage; writes go to both simultaneously via `src/data/store.js`.

localStorage keys are user-scoped: `gym_workouts_{uid}`, `gym_schedule_{uid}`, `gym_history_{uid}`, `gym_custom_exercises_{uid}`, `gym_custom_muscles_{uid}`, `gym_weight_{uid}`. Active session state uses `gym_active_session` (not user-scoped).

### Key Files
- `src/App.jsx` — router, auth state gating (loading → login → profile setup → syncing → app), bottom nav (hidden on `/session`)
- `src/context/AppContext.jsx` — Firebase auth listener, profile management, Firestore sync
- `src/data/store.js` — all CRUD operations (localStorage + Firestore upserts)
- `src/data/firestore.js` — additional Firestore helpers and batch operations
- `src/data/exercises.js` — built-in exercise database
- `src/firebase.js` — Firebase initialization
- `public/sw.js` — Service Worker (network-first cache, rest timer push notifications)

### Routing
```
/            → Dashboard
/workouts    → Workout list/create/edit
/calendar    → Scheduled sessions
/session     → Active workout session
/history     → Past sessions
/stats       → Charts and analytics
/profile     → User profile
/exercises/new → Custom exercise creation
```

### Styling
CSS variables defined in `src/index.css` (dark navy/slate theme). Layouts use flexbox with inline styles mixed with className utilities. Mobile-optimized — avoid desktop-only layout assumptions.
