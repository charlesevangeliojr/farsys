# Bayabas Toril Schedule App (Farsys)

Consultation scheduling app for Bayabas Toril — students request consultations with
teachers, admins approve registrations and manage sections, school years, and accounts.
Built with Expo Router + Firebase (Firestore). Runs on Android, iOS, and web.

## Features

- **Role-based login** (`app/index.jsx`): checks `admin_accounts` → `students` →
  `teachers` by email. Admins need `status: active`; students need `status: approved`.
- **Student registration** (`app/register.jsx`): validates profile fields, requires an
  **active section** and **active school year**, saves to `students` with
  `status: pending`, and creates a `notifications` entry + local push notification.
- **Registration approval** (`app/registration_request.jsx`): admin approves/rejects
  pending students. New sign-ups cannot log in until approved.
- **Consultations / schedules** (`app/make_consultation.jsx`,
  `app/consultation_request.jsx`): students book consultations, teachers/admins
  approve, notifications are written to Firestore.
- **Management screens**: `section.jsx`, `school_year.jsx`, `teacher_account.jsx`,
  `dashboard.jsx`, `settings.jsx`, `profile.jsx`, `about.jsx`, `developer.jsx`.
- **Forgot password + OTP** (`app/forgotpassword.jsx`, `app/verify_otp.jsx`): writes an
  OTP doc to the `otp` collection and sends it via the `sendOtpEmail` Cloud Function
  (`functions/index.js` + `services/emailService.js`).
- **Local notifications** (`services/notificationService.js`): immediate/scheduled
  Expo notifications for registrations and consultation status changes.
- **Dark/light theme** (`contexts/ThemeContext.jsx`): follows the system scheme, with
  a manual toggle. The `Appearance.setColorScheme` call is guarded because it does
  not exist on web (`react-native-web`).
- **Persistent session** (`contexts/AuthContext.jsx`): user cached in AsyncStorage.

## Performance (server-light)

Firestore reads are filtered server-side with `where(...)` queries instead of
downloading whole collections and filtering in JS. This keeps Firestore costs,
latency, and memory usage low as data grows.

| Screen | Query |
|---|---|
| Login (`index.jsx`) | Admin by `email` (was: full `admin_accounts` scan) |
| Dashboard | Schedules/notifications by user id; admin notifications `limit(100)` |
| Make consultation | Schedules by `student_id`; teachers by `status=active` |
| Consultation request | Schedules by `teacher_id` |
| Registration request | Students by `status` |
| Register | Sections/school years by `status=active` |
| School year | Deactivate-others query filters by `status=active` |

Other lightness measures:

- Dashboard clock re-renders every **30s** (was every 1s).
- Duplicate 60s polling interval in `make_consultation.jsx` removed (was firing
  twice per minute and could double-write Firestore notifications).
- Cloud Function `sendOtpEmail` **reuses one SMTP transport** across invocations
  (was creating a new TLS connection per request) and applies a simple rate
  limit (3 OTP emails per address per 10 minutes).
- `nodemailer` removed from the client `package.json` (server-only package).

## Tech stack

- Expo SDK 54, expo-router (file-based routing), React 19, React Native 0.81
- Firebase JS SDK v12: Firestore (primary DB), Storage (optional — see free-tier note)
- Cloud Functions (gen 1, Node 18): `sendOtpEmail` via Nodemailer/Gmail SMTP
- `backend-example/server.js` is a **mock Express/JWT example only** — the app does
  not call it.

## Project structure

```
app/                   Expo Router screens (index=login, register, dashboard, ...)
components/            Themed UI primitives
constants/             Theme colors
contexts/              AuthContext (session), ThemeContext (dark/light)
hooks/                 use-theme-color, etc.
services/              emailService (OTP function), notificationService (Expo push)
firebase.js            Firebase init — reads EXPO_PUBLIC_* from .env, Storage optional
functions/             Cloud Function: sendOtpEmail
backend-example/       Unused Express mock — reference only
firebase.json          firestore.functions deploy targets (no storage = free tier)
firestore.rules        Dev rules (open). Tighten before production.
storage.rules          Unused unless you enable Storage (requires Blaze)
.env / .env.example    Local Firebase config (gitignored / template)
```

## Prerequisites

- Node.js 20+ and npm
- Firebase CLI: `npm i -g firebase-tools` then `firebase login`
- Expo Go app (phone) for device testing, or Android Studio / Xcode for emulators
- A Firebase project with Firestore enabled (free Spark plan is enough if you skip
  Storage — see below)

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create / select a Firebase project**
   ```bash
   firebase projects:list
   # create the web app record (one-time) to get a config:
   firebase apps:create WEB "schedule-web" --project <PROJECT_ID>
   firebase apps:sdkconfig WEB <APP_ID> --project <PROJECT_ID>
   ```
   Also create the Firestore database (console → Build → Firestore → Create,
   production mode, region e.g. `asia-southeast1`).

3. **Configure `.env`** (copy from `.env.example`):
   ```bash
   EXPO_PUBLIC_FIREBASE_API_KEY=
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=   # leave BLANK for free tier (no Storage)
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
   EXPO_PUBLIC_FIREBASE_APP_ID=
   EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=
   EXPO_PUBLIC_SEND_OTP_URL=https://us-central1-<PROJECT_ID>.cloudfunctions.net/sendOtpEmail
   ```
   `firebase.js` reads these at startup. Storage is only initialized when a bucket
   is set; otherwise uploads fall back to the local image URI (no crash).

4. **Link the project + deploy Firestore rules**
   `.firebaserc` holds the default project id. Then:
   ```bash
   firebase deploy --only firestore:rules --project <PROJECT_ID>
   ```
   `firestore.rules` is currently **open read/write for development** (matches the
   app's direct Firestore access with no Firebase Auth). Tighten before production.

5. **Seed minimum data** (a fresh DB is empty and register will refuse without these):
   - `school_years`: one doc with `status: active`
     (`year_name`, `start_date`, `end_date`, `description`)
   - `sections`: one doc with `status: active`
     (`section_name`, `grade_level`, `adviser`, `max_students`)
   - `admin_accounts`: one doc with `status: active`
     (`firstname`, `lastname`, `email`, `password`)
   - Test student: `students` doc with `status: approved` to allow login.

6. **(Optional) OTP email function** — free tier includes Cloud Function invocations,
   but you need a Gmail app password:
   ```bash
   firebase functions:config:set gmail.user="you@gmail.com" gmail.pass="<app-password>"
   firebase deploy --only functions --project <PROJECT_ID>
   ```
   Without this, `POST …/sendOtpEmail` returns 404 and forgot-password email
   delivery fails (OTP docs are still written to Firestore). The function reuses
   a single SMTP transport and rate-limits to 3 OTP emails per address per 10
   minutes.

## Running

```bash
npx expo start --web     # web → http://localhost:8081
npx expo start           # then press a (Android) / i (iOS) / w (web)
npm run android | npm run ios | npm run web
npm run lint
```

Expo prints a QR code for Expo Go. On web, check the **browser console** for app logs.

## Test accounts (current `farsys-150ab` seed)

- Admin: `admin@test.com` / `admin123` (`admin_accounts`, `status: active`)
- Student: `student@test.com` / `student123` (`students`, `status: approved`)
- Section `BSIT-1A` (`grade_level: 1st Year`, active) and school year `2025-2026`
  (active) exist so registration validation passes.

Flow to try: register a new student → it lands as `pending` → log in as admin →
approve in Registration Request → student can now log in.

## Firestore collections

| Collection | Purpose | Key fields |
|---|---|---|
| `admin_accounts` | Admin logins | `firstname`, `lastname`, `email`, `password`, `status` |
| `students` | Student accounts | `first_name`, `last_name`, `email`, `password`, `student_lrn`, `section_id`, `school_year_id`, `status` (`pending`/`approved`/`rejected`) |
| `teachers` | Teacher accounts | `firstname`, `email`, `password`, `status` (`active`) |
| `sections` | Class sections | `section_name`, `grade_level`, `adviser`, `max_students`, `status` |
| `school_years` | School years | `year_name`, `start_date`, `end_date`, `status` |
| `teacher_sections` | Teacher↔section links | teacher/section ids |
| `schedules` | Consultation bookings | `teacher_name`, `purpose`, `consultation_time`, `student_id`, status |
| `notifications` | In-app notification feed | `type`, `title`, `message`, `isRead`, `studentId`… |
| `otp` | Password-reset codes | `otp`, `status`, `created_at`, `expires_at` |

## Free-tier notes

- Firestore + Functions + Expo Go all work on the free Spark plan.
- **Storage requires Blaze** on new projects (console shows "needs upgrade"). This
  repo is set up to run without it: leave `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
  empty, `firebase.json` has no storage target, and `uploadImage` in
  `register.jsx` / `teacher_account.jsx` keeps the local URI instead of uploading.
- To enable cloud profile pictures later: upgrade to Blaze (still ~free at this
  scale), set the bucket in `.env`, re-add the storage target to `firebase.json`,
  and deploy `storage` rules.

## Security notes

- Passwords are currently stored **in plaintext** in Firestore
  (see `register.jsx` comment "In production, this should be hashed"). Do not use
  real passwords; migrate to Firebase Auth + hashed credentials before production.
- `firestore.rules` allows open read/write for development. Restrict per-collection
  (and require auth) before any real deployment.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Appearance.setColorScheme is not a function` (web) | Already fixed in `contexts/ThemeContext.jsx` via `typeof` guard. Pull latest. |
| `Missing or insufficient permissions` (403) | Firestore rules not deployed or DB locked. Run `firebase deploy --only firestore:rules`. |
| `Failed to send email: 404` | `sendOtpEmail` not deployed. Deploy functions + set gmail config (see above). |
| Register says "select a section" / "no active school year" | Fresh DB is empty — seed an active `sections` + `school_years` doc. |
| "Account Pending" on login | Expected — new students are `pending` until an admin approves them. |
| `expo-notifications` warning on web | Expected — push listeners are no-ops on web; test on device. |
| Package version warnings on `expo start` | Version drift. Run `npx expo install --fix` to align. |
| `shadow*` / `resizeMode` warnings on web | `react-native-web` deprecations (`boxShadow`, `props.resizeMode`). Cosmetic. |
