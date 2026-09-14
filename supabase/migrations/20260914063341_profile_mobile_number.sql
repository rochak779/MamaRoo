-- Session 32 adds the user's own mobile number to the existing profile row.
-- The profile table already has owner-scoped CRUD RLS from migration 0001,
-- and those policies protect this column too; no duplicate policy is needed.

alter table public.profiles
  add column mobile_number text check (mobile_number ~ '^[0-9]{10}$');
