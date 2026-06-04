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

## High-Priority Security Gaps

- No real authentication or session handling.
- No backend authorization layer for processing jobs.
- No private object storage policies applied yet.
- No webhook signature verification for billing.
- No abuse controls for uploads, processing requests, or repeated failed auth attempts.
- No audit log for sensitive operations.
- No data retention policy for originals, generated outputs, or deleted remote jobs.
- No dependency vulnerability scan has been run in this pass.

## Security Rules For The Next Implementation Pass

- Use Supabase Auth user IDs for ownership checks, not user-editable metadata.
- Keep RLS enabled on every exposed public table.
- Let the backend or verified webhooks update subscriptions, credits, and usage events.
- Use short-lived upload paths and private buckets for source and output images.
- Validate image type, size, and processing options server-side.
- Verify every billing webhook signature before updating entitlements.
- Store only public publishable keys in Expo public env.

