-- Per-user breathing settings and immutable session snapshots.
-- Ownership is always auth.uid(); the Data API never receives a trusted user id.

create table public.breathing_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  inhale_seconds integer not null,
  hold_seconds integer not null,
  exhale_seconds integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint breathing_settings_inhale_seconds_check
    check (inhale_seconds between 2 and 15),
  constraint breathing_settings_hold_seconds_check
    check (hold_seconds between 1 and 15),
  constraint breathing_settings_exhale_seconds_check
    check (exhale_seconds between 2 and 15)
);

create table public.breathing_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  cycle_count integer not null,
  elapsed_seconds numeric not null,
  inhale_seconds integer not null,
  hold_seconds integer not null,
  exhale_seconds integer not null,
  created_at timestamptz not null default now(),
  constraint breathing_sessions_cycle_count_check
    check (cycle_count >= 1),
  constraint breathing_sessions_elapsed_seconds_check
    check (elapsed_seconds >= 0),
  constraint breathing_sessions_inhale_seconds_check
    check (inhale_seconds between 2 and 15),
  constraint breathing_sessions_hold_seconds_check
    check (hold_seconds between 1 and 15),
  constraint breathing_sessions_exhale_seconds_check
    check (exhale_seconds between 2 and 15)
);

create index breathing_sessions_user_id_created_at_desc_idx
  on public.breathing_sessions (user_id, created_at desc);

create or replace function public.set_breathing_settings_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger breathing_settings_set_updated_at
  before update on public.breathing_settings
  for each row
  execute function public.set_breathing_settings_updated_at();

alter table public.breathing_settings enable row level security;
alter table public.breathing_settings force row level security;
alter table public.breathing_sessions enable row level security;
alter table public.breathing_sessions force row level security;

revoke all on table public.breathing_settings from public, anon;
revoke all on table public.breathing_sessions from public, anon;

grant select, insert, update on table public.breathing_settings to authenticated;
grant select, insert on table public.breathing_sessions to authenticated;

create policy breathing_settings_select_own
  on public.breathing_settings
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy breathing_settings_insert_own
  on public.breathing_settings
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy breathing_settings_update_own
  on public.breathing_settings
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy breathing_sessions_select_own
  on public.breathing_sessions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy breathing_sessions_insert_own
  on public.breathing_sessions
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));
