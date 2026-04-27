# RestoreAI

RestoreAI is an Expo mobile app for restoring, upscaling, extending, and recoloring damaged or low-quality images.

This implementation is a production-quality local demo:

- Mock auth and subscription flows with persistent account state.
- Mock AI image workflows with realistic progress, privacy consent, credits, retries, and remote deletion state.
- Non-destructive stacked edits: source images are preserved, and every edit/export becomes a timeline stage.
- Code-native screens built from the supplied premium mobile design references.

## Run

```bash
npm install
npm run start
```

Use Expo Go when compatible. The app is built in the managed workflow and does not require real API keys for v1.
