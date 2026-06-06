# Baseline Security Review

Date: 2026-06-04

## Current Risk Summary

RestoreAI currently avoids several production risks because it does not talk to real services yet. The moment live auth, storage, image processing, or billing is connected, the risk profile changes sharply because the app will handle personal photos, account identity, and payment entitlements.

## Immediate Controls Added Or Planned

- `.env` files are ignored; `.env.example` documents public Expo variables only.
- Service role keys, Stripe secrets, provider API keys, and webhook secrets must never be included in `EXPO_PUBLIC_*` variables.
- The draft Supabase schema enables RLS on user-data tables.
- Billing and processing states are intended to be server-authoritative, not client-authoritative.
- Remote deletion state must be verified by the backend provider before being shown as final.
- Live service modes fail closed until real clients are wired, so a preview build cannot silently use mocks while claiming live auth, billing, or processing.
- Live auth mode now sends Supabase email OTP requests with the publishable key only; the app does not yet complete native callback verification or persist a Supabase session.
- Client-side entitlement gates now keep the local MVP flow honest, but production must still enforce tools, exports, credits, and subscription status on the backend.
- Client-side auth gates now protect real-photo import, processing, and export in the mock app; production must enforce the same boundaries with server-verified sessions and RLS.

## High-Priority Security Gaps

- Supabase Auth is only partially wired: email OTP requests work in live mode, but callback handling, session hydration, refresh, and sign-out revocation still need implementation.
- No backend authorization layer for processing jobs.
- No private object storage policies applied yet.
- No webhook signature verification for billing.
- No abuse controls for uploads, processing requests, or repeated failed auth attempts.
- No audit log for sensitive operations.
- No data retention policy for originals, generated outputs, or deleted remote jobs.
- No dependency vulnerability scan has been run in this pass.

## Security Rules For The Next Implementation Pass

- Use Supabase Auth user IDs for ownership checks, not user-editable metadata.
- Add native deep-link handling for `restoreai://auth/callback` and verify the session before unlocking protected app screens.
- Keep RLS enabled on every exposed public table.
- Let the backend or verified webhooks update subscriptions, credits, and usage events.
- Use short-lived upload paths and private buckets for source and output images.
- Validate image type, size, and processing options server-side.
- Verify every billing webhook signature before updating entitlements.
- Store only public publishable keys in Expo public env.
