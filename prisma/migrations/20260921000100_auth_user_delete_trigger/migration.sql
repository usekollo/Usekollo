-- Mirror deletes from auth.users into public.users.
--
-- public.users.id mirrors auth.users.id but is deliberately not a foreign key
-- — the auth schema is Supabase's, not Prisma's. The consequence was that
-- nothing removed the profile row when an account was deleted, so:
--
--   1. the profile row was orphaned, and
--   2. because users_email_idx is unique, that orphan kept the address
--      reserved. Registering it again failed inside the insert trigger with
--      "Database error creating new user", permanently, with no way back
--      short of deleting the row by hand.
--
-- The same applied to users_stellar_public_key_idx: a deleted account's wallet
-- could never be connected again.
--
-- Inserts and email changes were already mirrored (see
-- 20260920000100_rls_and_auth_triggers); this is the missing third trigger.

create or replace function public.handle_user_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.users where id = old.id;
  return old;
end;
$$;

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute function public.handle_user_deleted();
