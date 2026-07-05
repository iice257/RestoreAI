# RestoreAI Memory

- Build as an Expo managed-workflow app first; avoid custom native code unless future providers require it.
- Auth and billing are local mocks for v1: no real auth, Stripe, RevenueCat, or native IAP integration yet.
- Never overwrite source images. Preserve original, settings, outputs, timeline stages, branches, and export variants.
- Image workflows must support stacked edits in any order, with access to every timeline stage.
- Privacy default is local-first: ask before simulated remote processing and record/delete remote job state where supported.
- Supplied design references live in `assets/references`; generated references should match their cinematic dark premium style.
