# Product Requirements Document (PRD)
**Project Name:** TimeToTrain (Progressive Web App)
**Platform:** Mobile-first Web Application (Next.js 16 App Router, deployed on Vercel)

## 1. Project Overview
"TimeToTrain" is a mobile-first Progressive Web Application (PWA) designed to automate interval and circuit workouts. The app manages flexible cyclical workout programs, tracks real-time progress, prevents the mobile screen from turning off during active workouts, and logs highly detailed execution statistics for future analytics.

## 2. Core Features & User Flow

### 2.1. Authentication & Onboarding
*   **Google Auth Only:** Users must authenticate using their Google Account via NextAuth.js.
*   **Routing & Protection:** The `/dashboard`, `/workout`, and `/history` routes must be protected. Unauthenticated users are redirected to the login screen (`/`).
*   **Program Validation:** Upon successful login, the system checks the database. If the user does *not* have an active workout program, they are forced to the `/onboarding` screen.
*   **First-Time Setup:** Onboarding allows the user to manually create their first cyclical program. If a program exists, they are routed to `/dashboard`.

### 2.2. Flexible Cyclical Workout Programs
*   **Custom Cycle Length:** Users can define a cycle of any length (e.g., a 7-day cycle, a 10-day cycle, or a 14-day cycle).
*   **Day Descriptions:** Each day in the cycle can have an optional `description` text field. This lets the user annotate what the day's focus is (e.g., "Upper body + core focus", "Active recovery — light stretching"). The description is shown on the dashboard next to the day heading.
*   **Days Setup & Rest Days:** For each day in the cycle (Day 1 to Day X), the user can assign a workout. If no workout is assigned to a specific day (e.g., Day 6 and Day 7), the system automatically treats it as a "Day Off / Rest Day".
*   **Auto-Tracking:** The app dynamically calculates what "Day" of the cycle the user is currently on. Formula: `(Current Date - Program Start Date + skipDayOffset) % Cycle Length`. The `skipDayOffset` is an integer stored on the program document, initialized to `0`, and incremented by `1` each time the user skips a training day. This preserves the original `startDate` for history context while allowing the cycle to advance.
*   **Multiple Workouts:** A single active day within the cycle can contain multiple distinct workouts (e.g., "Morning Cardio" and "Evening Core").

### 2.3. Cycle Dashboard (`/dashboard`)
*   **Full Cycle Overview:** The dashboard shows the entire current cycle, not just today. A horizontal scrollable row of day pills (Day 1, Day 2, ..., Day N) appears at the top. Each pill has a colored status dot:
    *   **Green dot** = all workouts for that day are completed.
    *   **Amber dot** = some but not all workouts done.
    *   **Red dot** = past day with no workouts done (missed).
    *   **Gray dot** = rest day.
    *   **No dot / dimmed** = future day.
    *   **Today** is distinguished with a special indicator.
*   **Day Selection:** Tapping any day pill selects it and displays that day's workouts below. This lets the user go back to a previous day or look ahead at upcoming days.
*   **Selected Day Content:** Shows the day number, description (if set), and workout cards with exercises. Users can start, restart, or mark complete any workout for the selected day.
*   **Manual Override:** Users can click a button to mark a specific workout as "Completed" without running the timer.
*   **Skip Training Day:** Only shown when viewing today. A confirmation prompt appears: *"Skip today's training? The cycle will advance to the next day."* On confirmation, the program's `skipDayOffset` is incremented by `1`.
*   **Restart Workout:** Even if a workout has been completed or abandoned, the user can tap "Restart" on that workout card. The new result replaces the previous log entry for that workout + date.
*   **Complete Cycle:** A "Complete Cycle & Start Fresh" button resets the cycle to Day 1. A confirmation prompt appears: *"Reset the cycle to Day 1? Your history is preserved."* On confirm, `skipDayOffset` is adjusted so the cycle restarts. All previous history is preserved.

### 2.3a. Pre-Workout Detail Screen (`/workout/[id]`)
*   **Workout Preview:** Before the timer starts, the user sees a detail screen showing:
    *   Workout name (large heading).
    *   Workout description (if set) — a block of text explaining the focus, goals, or notes.
    *   Summary stats: number of rounds, number of exercises, estimated total time.
    *   Rest between rounds value.
    *   Full exercise list, each showing: name, description (if set), duration, and rest-after time.
*   **Start Button:** A large "Start Workout" button at the bottom launches the countdown timer.
*   **Back Navigation:** A back arrow returns to the dashboard.

### 2.4. Workout Execution Engine (The Timer - `/workout/[id]`)
*   **Structure Execution:** The timer strictly follows the hierarchy: `Workout` -> `Rounds` -> `List of Exercises` -> `Duration (seconds)`.
*   **Rest Periods:** Configurable rest timers are inserted automatically:
    *   **Between Exercises:** Each exercise can have its own `restAfterSec` value. When an exercise timer reaches `0`, the rest countdown begins before the next exercise starts. The UI shows the upcoming exercise name during rest.
    *   **Between Rounds:** Each workout can have a `restAfterRoundSec` value. After the last exercise in a round, the round-rest countdown begins before the next round starts.
    *   Rest periods use the Paused/Rest color scheme (Yellow/Orange background).
*   **Auto-Progression:** When a user presses "START", the timer counts down. When it reaches `0`, the rest period begins (if configured), then the timer automatically advances to the next exercise or the next round without any user interaction.
*   **Audio Cues:** Web Audio API (or `<audio>` tags) plays short "beeps" at 3, 2, and 1 seconds remaining, and a longer beep on exercise switch.
*   **Screen Wake Lock (CRITICAL):** While the timer is active, the app MUST use `navigator.wakeLock.request('screen')` to prevent the phone from dimming or locking. This lock is released when the workout ends or the component unmounts. If the browser does not support the Wake Lock API, display a persistent warning banner: *"Your browser doesn't support screen wake lock. Please keep your screen on manually."*
*   **Controls:** The screen features "Pause/Resume", "Skip Exercise", and "Stop" buttons.
*   **Exercise Descriptions:** Each exercise can have an optional `description` text field. This lets the user document form cues, technique notes, or equipment info (e.g., "Keep elbows tucked, 2-second hold at top", "Use 12kg kettlebell"). The description is shown below the exercise name during the active timer and on the dashboard exercise list.
*   **Skip Exercise (with Partial Progress):** The user can tap "Skip Exercise" to immediately stop the current exercise timer and advance to the next exercise in the round (skipping any rest period for the skipped exercise). If the skipped exercise is the last in the current round, the timer advances to the first exercise of the next round (or ends if it was the final round). The skip is recorded in the action log. A brief visual flash animation confirms the skip action. **Partial progress rule:** If the user has been performing the exercise for **5 seconds or more** before skipping, that elapsed time is credited to `totalCompletedSec` and stored as `timeSpentSec` on the skipped exercise entry. If under 5 seconds, zero time is credited (same as before). This partial progress is visible in the workout history detail.
*   **Stop Workout (Unified Flow):** When the user taps "Stop", a modal appears with three options:
    *   **"Save & Finish"** — saves the session with progress achieved so far (status: `finished_early`). No further confirmation needed.
    *   **"Discard"** — discards the session entirely. Requires a second confirmation: *"Are you sure? This workout will not be saved."*
    *   **"Cancel"** — dismisses the modal and resumes the workout.

### 2.5. UI/UX Requirements
*   **Mobile-First (Priority Platform):** Strictly vertical layout optimized for mobile devices. All touch targets must be at least 48x48px. Buttons during active workout must be large enough to tap without precision (sweaty hands). The layout must adapt gracefully to different mobile screen sizes (iPhone SE through iPhone Pro Max, common Android devices).
*   **Massive Timer:** During the workout, the exercise name and the countdown numbers must take up the majority of the screen (e.g., `text-9xl`) so they can be read from 2 meters away on the floor.
*   **Color Feedback:** Background colors indicate state:
    *   Active Exercise = Green or Blue background.
    *   Rest Period = Yellow or Orange background.
    *   Stop Confirmation = Red background.
*   **Skip Feedback:** When the user skips an exercise, a brief visual flash animation and haptic feedback (via `navigator.vibrate()` where supported) confirm the action immediately.
*   **Progress Indicator:** During a workout, display a compact progress bar or indicator showing: current round / total rounds, current exercise / total exercises.

### 2.6. Tracking, Logging & History (`/history`)
*   **Completion Percentage:** The system calculates completion as: `totalCompletedSec / totalPlannedSec * 100`. Fully completed exercises contribute their full `durationSec`. Skipped exercises contribute their `timeSpentSec` if ≥ 5 seconds, or 0 otherwise. The denominator (`totalPlannedSec`) always stays the same. Paused time does not affect the calculation.
*   **Action Logging:** Every interaction during the workout engine is logged into an array (e.g., `started at 10:00`, `paused at 10:05`, `resumed at 10:06`, `skipped_exercise at 10:08`, `finished at 10:10`, `stopped_early at 10:10`). This ensures rich data for future statistics updates. Skipped exercises and skipped training days are also captured to provide a complete picture of adherence.
*   **History View:** A reverse-chronological list view grouped by date. Each entry shows: date, workout name, status badge (completed / finished early / skipped / partially completed), and completion percentage. The empty state for new users displays a motivational message: *"No workouts yet. Start your first session!"*

### 2.7. Program Management (`/program`)
*   **Edit Program:** Users can access a program editor from the dashboard to modify their active program: add/remove exercises, change durations, adjust rest periods, change cycle length, and reassign workouts to different days.
*   **Create New Program:** Users can create a new program, which replaces the active one. The previous program's history is preserved.
*   **Exercise Library:** Within the program editor, users can reuse exercises across different workout days to avoid re-entering the same exercise details.

## 3. Database Schema Requirements (MongoDB Atlas via Vercel)

The database uses **MongoDB Atlas** provisioned through **Vercel's native integration** (Vercel dashboard → Storage). The official `mongodb` Node.js driver is used for all database operations. The `MONGODB_URI` environment variable is auto-injected by Vercel into all deployments. Database name: `sport-timer`. The following collections define the data model:

**1. Users Collection** (`users`)
```json
{
  "_id": "ObjectId",
  "email": "string",
  "name": "string",
  "image": "string (Google avatar URL)",
  "createdAt": "ISODate",
  "preferences": {
    "soundEnabled": true
  }
}
```
*Note: The `users` collection is managed by NextAuth.js via its MongoDB Adapter. NextAuth automatically creates user documents on first Google sign-in. The `preferences` field is added by the app on first login.*

**2. Programs Collection** (`programs`)
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: users._id)",
  "isActive": true,
  "cycleLengthDays": 7,
  "startDate": "timestamp",
  "skipDayOffset": 0,
  "routines": [
    {
      "cycleDayNumber": 1,
      "description": "Upper body + core focus (optional)",
      "workouts": [
        {
          "workoutId": "w1",
          "name": "Upper Body Strength",
          "description": "Focus on controlled reps, 2-second holds (optional)",
          "rounds": 3,
          "restAfterRoundSec": 60,
          "exercises": [
            { "name": "Pushups", "durationSec": 50, "restAfterSec": 10, "description": "Keep elbows tucked (optional)" },
            { "name": "Pullups", "durationSec": 50, "restAfterSec": 10, "description": "" }
          ]
        }
      ]
    },
    {
      "cycleDayNumber": 2,
      "description": "",
      "workouts": []
    }
  ]
}
```
*Note: If Day 6 and 7 are rest days, `cycleDayNumber` 6 and 7 simply won't exist in the `routines` array. `skipDayOffset` is incremented by 1 each time the user skips a training day, shifting the cycle forward without modifying `startDate`.*

**3. WorkoutLogs Collection** (`workoutLogs`)
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: users._id)",
  "programId": "ObjectId (ref: programs._id)",
  "workoutId": "string",
  "workoutName": "string",
  "cycleDayNumber": 1,
  "date": "timestamp",
  "status": "string (enum: completed | manually_marked | partially_completed | finished_early | skipped | discarded)",
  "totalPlannedSec": 300,
  "totalCompletedSec": 250,
  "completionPercentage": 83.3,
  "skippedExercises": [
    { "round": 2, "exerciseName": "Pullups", "durationSec": 50, "timeSpentSec": 12, "timestamp": "ISO_STRING" }
  ],
  "actionLogs": [
    { "timestamp": "ISO_STRING", "action": "started" },
    { "timestamp": "ISO_STRING", "action": "paused" },
    { "timestamp": "ISO_STRING", "action": "resumed" },
    { "timestamp": "ISO_STRING", "action": "skipped_exercise", "detail": "Pullups (Round 2)" },
    { "timestamp": "ISO_STRING", "action": "finished" }
  ]
}
```

## 4. Technical Architecture Requirements

### 4.1. Framework & Authentication
*   **Next.js 16 App Router** with the `/app` directory structure. Deployed on **Vercel**.
*   **NextAuth.js** for Google OAuth with the **MongoDB Adapter** (`@auth/mongodb-adapter`). NextAuth handles user creation, session storage, and account linking directly in MongoDB — no separate auth service needed. A client-side `SessionProvider` wrapper component is required for App Router compatibility. Server Components cannot use `useSession()` directly — use `getServerSession()` for server-side auth checks, and `useSession()` only in Client Components.
*   **MongoDB Node.js driver** (`mongodb`) is used for all database operations. A shared `MongoClient` singleton (cached in `globalThis` during development to survive HMR) connects to MongoDB Atlas. The `MONGODB_URI` environment variable is auto-injected by Vercel in deployed environments; for local development, it must be copied to `.env.local`.

### 4.2. Timer State Management
*   The workout execution engine uses **`useReducer`** for all timer state: current round index, current exercise index, seconds remaining, pause/resume state, rest period state, and the accumulated action log array.
*   A dedicated `useTimer` custom hook encapsulates the `setInterval` logic, the reducer dispatch, and the Wake Lock lifecycle. This avoids stale closure bugs by keeping mutable state in a `useRef` and syncing with the reducer.
*   Timer state transitions: `idle` → `running` → `resting` → `running` → ... → `completed` (or `stopped`).

### 4.3. PWA Requirements
*   **Web App Manifest** (`manifest.json`): Includes app name, short name, icons (192px and 512px), theme color, background color, `display: "standalone"`, and `start_url: "/dashboard"`.
*   **Service Worker:** Registered via `next-pwa` or a custom service worker. Caching strategy: cache the app shell (HTML, CSS, JS) for instant loading. API/data requests are network-first.
*   **Install Prompt:** The app detects the `beforeinstallprompt` event and shows a custom "Add to Home Screen" banner on the dashboard for users who haven't installed it yet.

### 4.4. Screen Wake Lock
*   Acquired via `navigator.wakeLock.request('screen')` when the timer starts.
*   Released when the workout ends, the component unmounts, or the user navigates away.
*   Must handle the `visibilitychange` event: re-acquire the lock when the page becomes visible again (e.g., user switches back from another app).
*   **Fallback:** If `navigator.wakeLock` is `undefined`, display a persistent warning banner during the workout. Mobile devices are the priority platform — the wake lock must work reliably on iOS Safari (16.4+) and Chrome for Android.

### 4.5. Data Fetching Strategy
*   **Dashboard & History:** Server Components fetch data via the `mongodb` driver (server-side). Pages are rendered on the server for fast initial load.
*   **Workout Engine:** Client Component. Workout data is passed as props from a Server Component parent, or fetched client-side on mount. All timer logic runs entirely on the client.
*   **Writes (logging, status updates):** Performed via Next.js Server Actions or API Route Handlers that use the `mongodb` driver.

## 5. Future Backlog

The following features are out of scope for the initial release but planned for future iterations:

*   **Warm-Up & Cool-Down Phases:** Support dedicated warm-up and cool-down phases within a workout that sit outside the round structure (e.g., 5-minute warm-up before Round 1, 3-minute stretch after the final round).
*   **Offline Support:** Full offline capability via service worker caching of workout data. Users can start and complete workouts without connectivity. Action logs and completion data are queued locally and synced to MongoDB when connectivity returns (using a background sync strategy).