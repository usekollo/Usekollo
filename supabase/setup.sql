-- UseKollo — Supabase setup.
--
-- SUPERSEDED by Prisma Migrate. `pnpm db:deploy` applies prisma/migrations,
-- which now covers everything below — including the row level security and
-- the auth.users -> public.users triggers, in
-- prisma/migrations/*_rls_and_auth_triggers.
--
-- Kept only as the one-shot "paste into the Supabase SQL editor" path for
-- bringing up a brand new project by hand. Note that it creates both foreign
-- keys without ON UPDATE CASCADE, which Prisma does generate — see
-- prisma/migrations/*_align_foreign_keys. A project set up from this file
-- therefore needs that migration applied on top before `prisma migrate diff`
-- reports clean.
--
-- Safe to re-run: every statement is guarded.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.users (
  id                    uuid primary key,
  email                 text not null,
  full_name             text not null default '',
  avatar_url            text,
  stellar_public_key    text,
  wallet_connected_at   timestamptz,
  wallet_last_synced_at timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.wallet_challenges (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  public_key  text not null,
  nonce       text not null,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.activity (
  id              uuid primary key default gen_random_uuid(),
  goal_id         bigint,
  goal_name       text,
  owner           text not null,
  user_id         uuid references public.users(id) on delete set null,
  type            text not null,
  amount          numeric(20, 7),
  asset_code      text,
  status          text not null,
  tx_hash         text not null,
  ledger_sequence bigint,
  created_at      timestamptz not null default now()
);

create table if not exists public.indexer_checkpoint (
  contract_id text primary key,
  last_ledger bigint not null,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create unique index if not exists users_email_idx
  on public.users (email);

-- Two accounts must never claim the same wallet. Postgres treats NULLs as
-- distinct, so accounts that have not connected a wallet do not collide here.
create unique index if not exists users_stellar_public_key_idx
  on public.users (stellar_public_key);

create index if not exists wallet_challenges_user_idx
  on public.wallet_challenges (user_id);
create unique index if not exists wallet_challenges_nonce_idx
  on public.wallet_challenges (nonce);

create index if not exists activity_owner_created_idx
  on public.activity (owner, created_at);
create index if not exists activity_goal_created_idx
  on public.activity (goal_id, created_at);

-- The API route writes an activity row the moment it submits a transaction,
-- and the cron indexer later replays the same on-chain event. This constraint
-- is what turns that second write into a no-op instead of a duplicate row.
create unique index if not exists activity_tx_hash_type_idx
  on public.activity (tx_hash, type);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
-- Every read and write in this app goes through API routes using the
-- service_role key, which bypasses RLS. Enabling RLS with no permissive
-- policies therefore changes nothing for the app but means the publishable
-- anon key — which ships to the browser — cannot read these tables directly.

alter table public.users              enable row level security;
alter table public.wallet_challenges  enable row level security;
alter table public.activity           enable row level security;
alter table public.indexer_checkpoint enable row level security;

-- One exception: let a signed-in user read their own profile row directly,
-- which is handy for debugging in the dashboard and leaks nothing.
drop policy if exists "users can read own row" on public.users;
create policy "users can read own row"
  on public.users for select
  using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Mirror auth.users -> public.users
-- ---------------------------------------------------------------------------
-- Supabase owns the auth schema, so the app's profile row is created by this
-- trigger rather than by the register route. That keeps the two in step even
-- when an account is created from the Supabase dashboard or a social provider.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
    set email     = excluded.email,
        -- Only fill the name in if we do not already have one, so a later
        -- profile edit is not clobbered by a re-run.
        full_name = case
                      when public.users.full_name = '' then excluded.full_name
                      else public.users.full_name
                    end,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the email column in step if the user changes it in auth.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
     set email = new.email, updated_at = now()
   where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Backfill any accounts that already existed before the trigger
-- ---------------------------------------------------------------------------

insert into public.users (id, email, full_name)
select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
on conflict (id) do nothing;
