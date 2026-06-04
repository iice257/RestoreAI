-- RestoreAI MVP schema draft.
-- This file is not an applied migration. Generate real migration history with
-- `supabase migration new` after linking a Supabase project.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('mock', 'revenuecat', 'stripe', 'app_store', 'google_play')),
  provider_customer_id text,
  provider_subscription_id text,
  plan text not null check (plan in ('free', 'archive_pro')),
  status text not null check (status in ('active', 'trialing', 'past_due', 'canceled', 'expired')),
  credits_total integer not null default 20 check (credits_total >= 0),
  credits_used integer not null default 0 check (credits_used >= 0 and credits_used <= credits_total),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.restore_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  capture_year text,
  favorite boolean not null default false,
  source_storage_path text,
  status text not null default 'active' check (status in ('active', 'archived', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.edit_stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.restore_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_stage_id uuid references public.edit_stages(id) on delete set null,
  type text not null check (type in ('source', 'restore', 'upscale', 'extend', 'recolor', 'export')),
  title text not null,
  subtitle text not null default '',
  output_storage_path text,
  output_asset_key text,
  settings jsonb not null default '{}'::jsonb,
  remote_state text not null default 'not_uploaded' check (
    remote_state in (
      'not_uploaded',
      'consented',
      'uploaded',
      'processing',
      'downloaded',
      'deleting_remote',
      'deleted',
      'deletion_unavailable'
    )
  ),
  processing_job_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.restore_projects(id) on delete cascade,
  provider text not null default 'mock',
  status text not null check (status in ('queued', 'processing', 'succeeded', 'failed', 'canceled')),
  input_storage_path text not null,
  output_storage_path text,
  delete_remote_after_processing boolean not null default true,
  remote_deleted_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'edit_stages_processing_job_id_fkey'
  ) then
    alter table public.edit_stages
      add constraint edit_stages_processing_job_id_fkey
      foreign key (processing_job_id)
      references public.processing_jobs(id)
      on delete set null;
  end if;
end
$$;

create table if not exists public.project_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.restore_projects(id) on delete cascade,
  stage_id uuid not null references public.edit_stages(id) on delete cascade,
  format text not null check (format in ('JPEG', 'PNG', 'TIFF')),
  storage_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.restore_projects(id) on delete set null,
  stage_id uuid references public.edit_stages(id) on delete set null,
  event_type text not null check (event_type in ('credit_reserved', 'credit_spent', 'credit_refunded', 'export_created')),
  credits_delta integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists subscription_entitlements_user_id_idx on public.subscription_entitlements (user_id);
create index if not exists restore_projects_user_id_updated_at_idx on public.restore_projects (user_id, updated_at desc);
create index if not exists edit_stages_project_id_created_at_idx on public.edit_stages (project_id, created_at);
create index if not exists edit_stages_user_id_idx on public.edit_stages (user_id);
create index if not exists processing_jobs_user_id_status_idx on public.processing_jobs (user_id, status);
create index if not exists project_exports_user_id_created_at_idx on public.project_exports (user_id, created_at desc);
create index if not exists usage_events_user_id_created_at_idx on public.usage_events (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.subscription_entitlements enable row level security;
alter table public.restore_projects enable row level security;
alter table public.edit_stages enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.project_exports enable row level security;
alter table public.usage_events enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.subscription_entitlements from anon, authenticated;
revoke all on public.restore_projects from anon, authenticated;
revoke all on public.edit_stages from anon, authenticated;
revoke all on public.processing_jobs from anon, authenticated;
revoke all on public.project_exports from anon, authenticated;
revoke all on public.usage_events from anon, authenticated;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.subscription_entitlements to authenticated;
grant select, insert, update, delete on public.restore_projects to authenticated;
grant select, insert, update, delete on public.edit_stages to authenticated;
grant select on public.processing_jobs to authenticated;
grant select, insert, update, delete on public.project_exports to authenticated;
grant select on public.usage_events to authenticated;

create policy "Profiles are visible to their owner"
on public.profiles
for select
to authenticated
using ((select auth.uid()) is not null and id = (select auth.uid()));

create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) is not null and id = (select auth.uid()));

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) is not null and id = (select auth.uid()))
with check ((select auth.uid()) is not null and id = (select auth.uid()));

create policy "Users can view their own entitlements"
on public.subscription_entitlements
for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can view their own projects"
on public.restore_projects
for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can create their own projects"
on public.restore_projects
for insert
to authenticated
with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can update their own projects"
on public.restore_projects
for update
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()))
with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can delete their own projects"
on public.restore_projects
for delete
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can view their own edit stages"
on public.edit_stages
for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can create edit stages for their own projects"
on public.edit_stages
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and exists (
    select 1
    from public.restore_projects p
    where p.id = project_id
      and p.user_id = (select auth.uid())
  )
);

create policy "Users can update their own edit stages"
on public.edit_stages
for update
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()))
with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can delete their own edit stages"
on public.edit_stages
for delete
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can view their own processing jobs"
on public.processing_jobs
for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can view their own exports"
on public.project_exports
for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can create exports for their own projects"
on public.project_exports
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and exists (
    select 1
    from public.restore_projects p
    where p.id = project_id
      and p.user_id = (select auth.uid())
  )
);

create policy "Users can update their own exports"
on public.project_exports
for update
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()))
with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can delete their own exports"
on public.project_exports
for delete
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Users can view their own usage events"
on public.usage_events
for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));
