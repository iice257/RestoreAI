# Production Readiness Checklist

RestoreAI is not production-ready. This checklist tracks the foundations that must be proven before a public launch.

## Mobile App

- Expo Router route groups for auth, protected app screens, modals, and error states.
- Native Supabase auth callback handling for `restoreai://auth/callback`, session hydration, refresh, and logout verified on EAS/dev-client builds.
- Real device testing on iOS and Android.
- Camera, media library, file import, save, share, and permission-denied paths.
- Offline and retry behavior for uploads and processing jobs.
- Crash reporting and release identifiers.
- Accessibility pass for labels, focus order, contrast, and dynamic type.

## Backend

- Authenticated API endpoints for processing jobs.
- Server-side validation for uploaded files and requested tools.
- Provider integration for restoration/upscale/extend/recolor.
- Remote deletion verification and retention windows.
- Rate limits and abuse controls.
- Structured logs and request tracing.

## Database

- Supabase migrations generated through the CLI once the project is linked.
- Supabase auth, table grants, and RLS policies verified against at least two real users.
- Private storage buckets and storage object policies.
- Backup and recovery plan.
- Data retention and deletion policy.

## Billing

- Mobile-first entitlement strategy for iOS and Android.
- Store product configuration and restore purchases.
- Webhook verification and idempotency.
- Credit ledger that cannot be changed by the client.
- Handling for renewals, cancellations, refunds, grace periods, and expired cards.

## Deployment

- EAS development, preview, and production build profiles.
- TestFlight and Google Play internal testing.
- CI checks for TypeScript and future tests.
- Release notes and rollback plan.

## Security

- Full repository security scan before public beta.
- Dependency audit.
- Secrets review.
- RLS and storage policy tests.
- Abuse testing for upload and processing endpoints.
