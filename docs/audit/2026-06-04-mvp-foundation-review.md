# RestoreAI MVP Foundation Review

Date: 2026-06-04
Platform target: Expo managed workflow for iOS first, Android second

## Current State

RestoreAI is a strong visual prototype, not yet a production app.

What already works:

- Expo Router boots the app through `app/index.tsx`.
- TypeScript strict mode passes.
- Local state persists account preferences and projects through AsyncStorage.
- Native SQLite stores project payload snapshots on iOS/Android through `src/storage.native.ts`.
- The main restoration loop is demoable: onboarding, login mock, import/sample selection, tool choice, processing simulation, comparison, export variant, library, settings, and account.
- The app preserves original images conceptually through stacked edit stages.

What is still demo-only:

- Auth is a local mock and does not create server sessions.
- Billing is a local mock and does not use StoreKit, Google Play Billing, RevenueCat, Stripe, or server-side entitlement verification.
- Image processing is simulated in `src/mock-clients.ts`.
- Imported camera/library images are discarded and replaced with sample assets.
- Project data is local-only and not tied to a server user.
- Privacy and remote deletion states are simulated.

What is missing for MVP foundation:

- Real Expo Router route groups and protected route boundaries.
- A backend/API layer for image-processing jobs, billing webhooks, entitlement sync, and remote deletion.
- Supabase project linkage, migrations, RLS verification, storage buckets, and generated types.
- A production auth flow with secure token handling.
- A mobile-compliant billing strategy.
- CI/CD and EAS project initialization.
- Error logging, analytics, crash reporting, rate limiting, abuse controls, backups, and operational runbooks.

## Flaws In The Suggested Plan

The user's staged plan is directionally right. The main adjustment is billing: because this is an iOS/Android app selling app functionality and digital processing credits, Stripe should not be the default in-app purchase path for App Store distribution. The safer mobile-first plan is StoreKit and Google Play Billing, usually through RevenueCat or another entitlement layer. Stripe can still support backend invoices, web checkout, or non-mobile purchase surfaces where policy allows it.

The second adjustment is deployment. Vercel can host a web checkpoint or backend surface, but the main app deployment path should be EAS builds, TestFlight, and Google Play internal testing.

The third adjustment is timing. Security should not wait until the end. Full production hardening comes later, but RLS, secret handling, entitlement verification, and upload deletion semantics need to be designed before real user data or payments are introduced.

## Recommended Next Stage

Build the MVP foundation scaffold before adding more visual polish.

Stage 1, foundation scaffold:

- Split services behind typed clients: auth, billing, image workflow, storage, and telemetry.
- Add env configuration and keep all secrets out of Expo public env.
- Draft the Supabase schema and RLS model.
- Add EAS config and CI checkpoint checks.
- Keep the app running with local mocks until live services are wired.

Stage 2, end-to-end MVP loop:

- Sign up or sign in with Supabase Auth.
- Create a project record owned by the authenticated user.
- Upload the original image to private storage.
- Create a processing job through a backend endpoint.
- Persist completed edit stages and credit usage.
- Show updated dashboard/library data from the database.
- Respect entitlement and credit state before processing.

Stage 3, mobile billing:

- Add RevenueCat or native IAP integration through a development client.
- Map store products to server-verified entitlements.
- Add restore purchases and subscription edge cases.
- Keep Stripe as an optional backend/web channel, not the default iOS in-app unlock path.

Stage 4, production-readiness passes:

- Add observability, crash reporting, API rate limits, abuse controls, deletion verification, backups, and security test coverage.
- Run a full security scan and fix findings before any public beta.

