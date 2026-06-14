# RestoreAI App Surface Inventory

Updated: 2026-06-14

RestoreAI is an Expo managed app targeting iOS first and Android second. It is
currently an MVP scaffold with a complete local demo journey and partial live
service foundations. Items labeled **mock** or **draft** are not production
implementations.

## Pages And States

| Page/state | Current implementation | Primary actions |
| --- | --- | --- |
| Splash | Native React Native screen | Initializes local storage and routes to onboarding or home |
| Onboarding | Native React Native screen | Complete onboarding, continue to login, continue in demo mode |
| Login / sign up | Native React Native screen | Email sign-in, Apple/Google placeholders, demo mode |
| Home | High-fidelity interactive reference board | Open recent result, choose Restore/Upscale/Extend/Recolor, import, library, settings, account |
| Import | High-fidelity interactive reference board | Camera, photo library, files, samples, privacy information |
| Restore workflow | High-fidelity interactive reference board | Configure restoration controls and start processing |
| Upscale workflow | Native React Native screen | Configure options/intensity and start processing |
| Extend workflow | Native React Native screen | Configure options/intensity and start processing |
| Recolor workflow | Native React Native screen | Configure options/intensity and start processing |
| Processing | Native React Native screen | View progress, cancel and retain the draft |
| Comparison | High-fidelity interactive reference board | Before/after review, export, save, share, edit, favorite/details |
| Export | Native React Native screen | Choose JPEG/PNG/TIFF, save, share, review export history |
| Library | Native React Native screen | Browse projects, open a project, import |
| Project detail | Native React Native screen | Review timeline, select a stage, continue editing, export |
| Settings | Native React Native screen | Privacy/storage preferences, offline mode, default export, reset demo |
| Account / subscription | Native React Native screen | Upgrade, cancel, restore purchase, sign out |
| Privacy consent | Native React Native screen | Approve upload processing and remote-deletion preference |
| Offline state | Native state screen | Return to the local library |
| Permission-denied state | Native state screen | Continue with sample images |
| Empty-library state | Native state screen | Start an import |
| Processing-error state | Native state screen | Return to the preserved edit draft |

## Implemented User Actions

- Complete onboarding or enter demo mode.
- Request a live Supabase email OTP when live auth mode is configured.
- Sign in and sign out through the mock service used by default.
- Block protected import, processing, export, and tool actions for signed-out users.
- Import from camera, photo library, document picker, or bundled samples.
- Preserve selected local image URIs through the local processing and export flow.
- Create projects and immutable edit stages without overwriting the source.
- Switch between project timeline stages.
- Run simulated Restore, Upscale, Extend, and Recolor processing.
- Require upload privacy consent before simulated remote processing.
- Cancel processing while preserving the draft.
- Compare before/after results.
- Save an export variant and invoke the native share sheet.
- Enforce client-side plan access for Pro tools and PNG/TIFF exports.
- Simulate upgrade, cancellation, and purchase restoration.
- Persist account, preferences, and projects locally.
- Reset all local demo state.

## Foundation Work Completed

### Mobile frontend

- Expo Router entry point and strict TypeScript configuration.
- iOS and Android identifiers, icons, splash assets, and native permission copy.
- Safe-area handling, native image picking, media-library saving, sharing, haptics,
  gesture handling, and Reanimated integration.
- High-fidelity visual checkpoints for Home, Import, Restore, and Comparison.
- Native implementations for auth, library, project detail, export, settings,
  account, processing, privacy, and state screens.

### Application architecture

- Typed domain models for accounts, projects, stages, tools, preferences, and
  remote processing state.
- Typed service contracts for auth, billing, and image workflows.
- Mock/live service switches driven by public Expo environment variables.
- Live modes fail closed when required integrations are unavailable.
- Typed backend API client contract for processing jobs, deletion, and
  entitlements, including timeout and error handling.

### Authentication

- Mock authentication for local development.
- Supabase email OTP request adapter for live auth mode using the publishable
  client key.
- Pending verification results do not unlock protected actions.
- Email validation and surfaced network/provider errors.

### Data

- AsyncStorage persistence with a validated state codec.
- SQLite project snapshots on iOS and Android.
- Draft Supabase schema for profiles, entitlements, projects, stages,
  processing jobs, exports, and usage events.
- RLS policies and explicit grants drafted for user-owned data.

### Billing and entitlements

- Free and Archive Pro domain model.
- Client-side tool and export entitlement gates.
- Mock upgrade, cancellation, and restore-purchase flow.
- Environment placeholders for RevenueCat and Stripe publishable keys.

### Delivery and security

- EAS development, preview, and production profiles.
- GitHub Actions TypeScript checkpoint on pushes and pull requests.
- Public environment template with secret-handling guidance.
- Baseline security review and production-readiness checklist.
- A non-breaking dependency audit repair removed the critical finding reported
  on 2026-06-14. Eleven moderate Expo toolchain transitive findings remain and
  require a controlled Expo SDK 56 upgrade rather than `npm audit fix --force`.

## Still Required For A Functional Live MVP

1. Complete the Supabase deep-link callback, session hydration, refresh, and
   server-verified logout flow.
2. Convert the single in-memory screen state machine into Expo Router auth and
   protected route groups.
3. Link a Supabase project, generate migrations, apply the schema, and test RLS
   with multiple real users.
4. Add private Storage buckets and authenticated upload/download policies.
5. Implement the processing API/backend and replace simulated image processing.
6. Persist projects, stages, jobs, and exports to the live database.
7. Add RevenueCat or native StoreKit/Google Play billing and server-authoritative
   entitlements.
8. Add crash reporting, structured logs, tracing, rate limits, upload validation,
   abuse controls, and retention/deletion jobs.
9. Complete iOS Simulator/device and Android emulator/device test passes.
10. Authenticate EAS, create preview builds, and distribute through TestFlight
    and Google Play internal testing.

## Current Preview Set

These captures were generated from the current Expo web checkpoint at a
430 x 932 phone viewport on 2026-06-14. They verify responsive rendering but do
not replace iOS Simulator or physical-device tests.

- `docs/previews/onboarding.png`
- `docs/previews/login.png`
- `docs/previews/home.png`
- `docs/previews/import.png`
- `docs/previews/restore.png`
- `docs/previews/privacy-consent.png`
- `docs/previews/processing.png`
- `docs/previews/comparison.png`
- `docs/previews/export.png`
- `docs/previews/library.png`
- `docs/previews/project-detail.png`
- `docs/previews/settings.png`
- `docs/previews/account.png`

Visual review notes:

- The high-fidelity Home, Import, Restore, and Comparison boards render without
  blank assets, clipping, or interaction-layer shifts at the test viewport.
- Native screens render cleanly and remain scrollable where content exceeds the
  viewport.
- Header placeholders currently show empty circular controls when no left or
  right action exists. Removing those placeholders is a UI cleanup task.
- Several native screens are functional scaffolds and do not yet match the
  visual fidelity of the four reference-board screens.
