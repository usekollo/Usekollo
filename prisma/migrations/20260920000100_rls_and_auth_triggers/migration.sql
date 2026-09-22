-- The two things the Prisma schema cannot express, carried over verbatim from
-- the old supabase/setup.sql: row level security, and the triggers that mirror
-- auth.users into public.users.
--
-- Every statement is guarded, so re-running this is a no-op.

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
