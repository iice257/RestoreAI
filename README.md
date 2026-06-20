# RestoreAI

RestoreAI is an Expo mobile app for restoring, upscaling, extending, and recoloring damaged or low-quality images.

This implementation is a local MVP prototype. It has a polished visual demo, but the production foundations are still being scaffolded:

- Mock auth and subscription flows with persistent account state, plus a live
  Supabase email OTP path with callback/session handling when configured.
- Mock AI image workflows with realistic progress, privacy consent, credits, retries, and remote deletion state.
- Non-destructive stacked edits: source images are preserved, and every edit/export becomes a timeline stage.
- Code-native and reference-image screens built from the supplied premium mobile design references.
- Draft service, database, deployment, and security plans for the next MVP pass.

## Run

```bash
npm install
npm run start
```

Use Expo Go when compatible. The app is built in the managed workflow and does not require real API keys for the local mock build.

## Check

```bash
npm run check
```

## Current Stage

The next milestone is an end-to-end MVP loop:

User signs in, imports or creates a project, runs a restoration job through a backend boundary, persists the project and edit stage in the database, respects entitlement/credit state, and exports the result.

See `docs/audit/2026-06-04-mvp-foundation-review.md` for the current audit and
next-stage plan. See `docs/app-surface-inventory.md` for the complete page,
action, feature, foundation, and preview inventory.
