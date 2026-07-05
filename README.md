# RestoreAI

RestoreAI is an Expo mobile app for restoring, upscaling, extending, and recoloring damaged or low-quality images.

The current implementation is a local MVP prototype with production foundations being scaffolded:

- Mock auth and subscription flows with persistent account state, plus a live Supabase email OTP path with callback/session handling when configured.
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

CI runs the same check through the `Expo checkpoint` workflow.

## Environment

Copy `.env.example` to `.env` only when using live services. The mock build runs without secrets.

## Current Stage

The next milestone is an end-to-end MVP loop:

User signs in, imports or creates a project, runs a restoration job through a backend boundary, persists the project and edit stage in the database, respects entitlement/credit state, and exports the result.

See `docs/audit/2026-06-04-mvp-foundation-review.md` for the current audit and next-stage plan. See `docs/app-surface-inventory.md` for the complete page, action, feature, foundation, and preview inventory.

## Product Direction

RestoreAI is focused on bringing damaged, blurry, low-resolution, and faded photos back to life. It is designed to be simple enough for everyday users while providing advanced restoration controls for creators, photographers, archivists, and preservation teams.

### MVP Scope

1. Upload/import image.
2. Auto Restore.
3. Upscale at 2x or 4x.
4. Basic color correction.
5. Before/after compare.
6. Export/share.

### Product Backlog

- Restoration and enhancement: Auto Restore, super-resolution upscaling, scratch and dust removal, noise reduction, face detail recovery, color correction, and before/after comparison.
- Photo repair and creative recovery: damage inpainting, manual retouch brush, B&W colorization, object/background cleanup, and perspective correction.
- Workflow and UX: batch processing, preset profiles, non-destructive history, export profiles, and metadata safety controls.
- Trust and safety: restoration confidence, AI-generated region heatmap, model cards, and historical authenticity guardrails.
- Platform and collaboration: cloud and on-device modes, team workspaces, versioned exports, and a public API/SDK.

## License

Add the project license once selected.
