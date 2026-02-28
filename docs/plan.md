# Sport Timer — Implementation Plan

## Current State

- **Next.js 16.1.6** with App Router (fresh scaffold, no app code yet)
- **React 19.2.3**, **TypeScript 5**, **Tailwind CSS 4** via PostCSS
- React Compiler enabled
- Google OAuth credentials configured in `.env.local`
- MongoDB Atlas provisioned via Vercel (URI in `.env.local` as `ttt_MONGODB_URI`, matching the Vercel project prefix convention)
- Deployed on Vercel, synced with `mindme-labs/sport-timer` GitHub repo
- PRD finalized at `docs/prd.md`

## Dependencies to Install

```bash
npm install mongodb @auth/mongodb-adapter next-auth next-pwa
```

---

## Phase 1: Foundation (Auth + DB + App Shell)

**Goal:** User can sign in with Google, session persists, MongoDB connected, app shell with mobile navigation.

| # | Task | Files |
|---|------|-------|
| 1 | Create MongoClient singleton with `globalThis` caching for HMR | `lib/mongodb.ts` |
| 2 | Set up NextAuth with Google provider + MongoDB Adapter | `app/api/auth/[...nextauth]/route.ts` |
| 3 | Create `SessionProvider` wrapper (Client Component) | `components/Providers.tsx` |
| 4 | Update root layout: wrap with `SessionProvider`, add mobile viewport meta, PWA manifest link | `app/layout.tsx` |
| 5 | Create auth middleware — protect `/dashboard`, `/workout`, `/history`, `/program`, `/onboarding` routes | `middleware.ts` |
| 6 | Create login page — Google sign-in button, redirect to `/dashboard` on success | `app/page.tsx` |
| 7 | Create app shell layout with bottom navigation (Dashboard, History, Program) | `app/(app)/layout.tsx` |
| 8 | Create placeholder pages for each route | `app/(app)/dashboard/page.tsx`, `app/(app)/history/page.tsx`, `app/(app)/program/page.tsx` |
| 9 | Generate a real `NEXTAUTH_SECRET` (replace placeholder in `.env.local`) | `.env.local` |
| 10 | Update PRD to reflect Next.js 16 instead of 14 | `docs/prd.md` |

**Checkpoint:** User can sign in with Google → lands on `/dashboard` placeholder → session persists across refreshes → sign out works.

---

## Phase 2: Onboarding + Program Management

**Goal:** New user creates their first workout program via guided onboarding. Returning user can edit their program.

| # | Task | Files |
|---|------|-------|
| 1 | Create program DB helper functions (create, read, update, getActiveByUser) | `lib/db/programs.ts` |
| 2 | Add redirect logic: no active program → `/onboarding`; has program → `/dashboard` | `app/(app)/dashboard/page.tsx` |
| 3 | Create onboarding multi-step form: cycle length → add days → add workouts per day → add exercises with duration + rest | `app/(app)/onboarding/page.tsx`, `components/program/` |
| 4 | Server Action: validate and save program to MongoDB | `app/(app)/onboarding/actions.ts` |
| 5 | Create program editor page (reuses onboarding form components) | `app/(app)/program/page.tsx` |
| 6 | Server Action: update existing program | `app/(app)/program/actions.ts` |

**Checkpoint:** New user completes onboarding → program saved to MongoDB → user redirected to dashboard. User can edit program from `/program`.

---

## Phase 3: Dashboard

**Goal:** User sees today's workouts based on cycle calculation, can start, skip day, or manually complete.

| # | Task | Files |
|---|------|-------|
| 1 | Create workout logs DB helper functions (create, getByUser, getByDate) | `lib/db/workoutLogs.ts` |
| 2 | Create cycle day calculation utility: `(daysDiff + skipDayOffset) % cycleLengthDays` | `lib/utils/cycleDay.ts` |
| 3 | Build dashboard page: fetch active program, calculate current day, display today's workouts or "Day Off" | `app/(app)/dashboard/page.tsx` |
| 4 | "Start Workout" button → navigates to `/workout/[workoutId]` | `app/(app)/dashboard/page.tsx` |
| 5 | "Skip Day" button with confirmation modal → increment `skipDayOffset` → log `skipped` entry | `components/dashboard/SkipDayButton.tsx`, `app/(app)/dashboard/actions.ts` |
| 6 | "Mark Complete" button → create log with `manually_marked` status | `components/dashboard/MarkCompleteButton.tsx` |

**Checkpoint:** Dashboard shows correct cycle day workouts. Skip Day advances cycle. Manual complete creates log. Start navigates to timer.

---

## Phase 4: Timer Engine (Core Feature)

**Goal:** Full workout execution with countdown, rest periods, skip exercise, stop flow, audio cues, wake lock.

| # | Task | Files |
|---|------|-------|
| 1 | Create timer reducer: state machine (`idle` → `running` → `resting` → ... → `completed`/`stopped`) | `hooks/useTimerReducer.ts` |
| 2 | Create `useTimer` hook: `setInterval` + `useRef` for tick, dispatch to reducer, accumulate action logs | `hooks/useTimer.ts` |
| 3 | Create `useWakeLock` hook: acquire/release, `visibilitychange` re-acquire, fallback detection | `hooks/useWakeLock.ts` |
| 4 | Create `useAudioCues` hook: Web Audio API beeps at 3/2/1s, longer beep on exercise switch | `hooks/useAudioCues.ts` |
| 5 | Create workout page (Server Component): load workout data, pass to timer client component | `app/(app)/workout/[id]/page.tsx` |
| 6 | Create Timer UI (Client Component): massive countdown (`text-9xl`), exercise name, progress indicator (round X/Y, exercise X/Y) | `components/timer/TimerDisplay.tsx` |
| 7 | Color-coded backgrounds: green/blue = active, yellow/orange = rest, red = stop modal | `components/timer/TimerDisplay.tsx` |
| 8 | "Skip Exercise" button: advance to next exercise, flash animation, haptic vibration | `components/timer/SkipButton.tsx` |
| 9 | "Pause/Resume" button | `components/timer/PauseButton.tsx` |
| 10 | "Stop" button → modal: "Save & Finish" / "Discard" / "Cancel" | `components/timer/StopModal.tsx` |
| 11 | Wake lock fallback banner (if browser doesn't support it) | `components/timer/WakeLockBanner.tsx` |
| 12 | On workout end: calculate completion %, save log via Server Action | `app/(app)/workout/[id]/actions.ts` |

**Checkpoint:** User starts workout → timer counts down through exercises/rounds with rest → audio beeps at 3/2/1 → skip works → stop flow works → log saved on completion → screen stays on.

---

## Phase 5: History

**Goal:** User views past workout logs in a clear, date-grouped list.

| # | Task | Files |
|---|------|-------|
| 1 | Build history page: fetch logs sorted by date descending, group by date | `app/(app)/history/page.tsx` |
| 2 | Create log entry card: date, workout name, status badge (color-coded), completion % | `components/history/LogEntry.tsx` |
| 3 | Status badges: completed (green), finished early (blue), skipped (gray), partially completed (orange) | `components/history/StatusBadge.tsx` |
| 4 | Empty state: motivational message for new users | `app/(app)/history/page.tsx` |

**Checkpoint:** History page shows all past workouts grouped by date. Status badges and percentages are correct. Empty state works for new users.

---

## Phase 6: PWA + Polish

**Goal:** Installable PWA, final mobile polish, production readiness.

| # | Task | Files |
|---|------|-------|
| 1 | Create web app manifest | `public/manifest.json` |
| 2 | Create app icons (192px, 512px) | `public/icons/` |
| 3 | Configure service worker: cache app shell, network-first for API | `next.config.ts` (next-pwa config) |
| 4 | Detect `beforeinstallprompt` → show "Add to Home Screen" banner | `components/InstallPrompt.tsx` |
| 5 | Final mobile responsiveness pass (iPhone SE → Pro Max, common Android) | All pages |
| 6 | Touch target audit: all interactive elements ≥ 48x48px | All components |
| 7 | Update metadata in root layout: title, description, theme-color | `app/layout.tsx` |
| 8 | Replace placeholder `NEXTAUTH_SECRET` with a secure random value | `.env.local` + Vercel env vars |

**Checkpoint:** App is installable from mobile browser. Works as standalone app. All touch targets are comfortable. Icons and splash screen appear correctly.

---

## File Structure (Target)

```
sport-timer/
├── app/
│   ├── (app)/
│   │   ├── layout.tsx              # App shell with bottom nav
│   │   ├── dashboard/
│   │   │   ├── page.tsx            # Today's workouts
│   │   │   └── actions.ts          # Skip day, mark complete
│   │   ├── workout/
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Workout loader (Server)
│   │   │       └── actions.ts      # Save workout log
│   │   ├── history/
│   │   │   └── page.tsx            # Past workout logs
│   │   ├── program/
│   │   │   ├── page.tsx            # Edit program
│   │   │   └── actions.ts          # Update program
│   │   └── onboarding/
│   │       ├── page.tsx            # First-time setup
│   │       └── actions.ts          # Create program
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts        # NextAuth API route
│   ├── layout.tsx                  # Root layout + SessionProvider
│   ├── page.tsx                    # Login page
│   └── globals.css
├── components/
│   ├── Providers.tsx               # SessionProvider wrapper
│   ├── dashboard/
│   │   ├── SkipDayButton.tsx
│   │   └── MarkCompleteButton.tsx
│   ├── timer/
│   │   ├── TimerDisplay.tsx        # Main timer UI
│   │   ├── SkipButton.tsx
│   │   ├── PauseButton.tsx
│   │   ├── StopModal.tsx
│   │   └── WakeLockBanner.tsx
│   ├── history/
│   │   ├── LogEntry.tsx
│   │   └── StatusBadge.tsx
│   ├── program/
│   │   └── ProgramForm.tsx         # Shared form for onboarding + edit
│   └── InstallPrompt.tsx
├── hooks/
│   ├── useTimer.ts
│   ├── useTimerReducer.ts
│   ├── useWakeLock.ts
│   └── useAudioCues.ts
├── lib/
│   ├── mongodb.ts                  # MongoClient singleton
│   ├── db/
│   │   ├── programs.ts             # Program CRUD
│   │   └── workoutLogs.ts          # WorkoutLog CRUD
│   └── utils/
│       └── cycleDay.ts             # Cycle day calculation
├── public/
│   ├── manifest.json
│   └── icons/
├── docs/
│   ├── prd.md
│   └── plan.md
├── middleware.ts
├── .env.local
├── next.config.ts
├── package.json
└── tsconfig.json
```
