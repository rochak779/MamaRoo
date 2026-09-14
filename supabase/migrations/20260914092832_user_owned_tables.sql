-- Session 32A: a service-role-only catalogue function, used by the export
-- completeness test (tests/rls/privacy.test.ts) to assert that
-- requestExport's hardcoded table list hasn't drifted from the real schema.
-- Not called by any production code path -- the export action fetches each
-- table explicitly, under her own RLS-scoped client, rather than looping
-- over a runtime introspection query.
--
-- "User-owned" is defined mechanically: a table in public carrying a user_id
-- column, plus profiles, whose owner column is its primary key `id` instead.
-- Returning the complete set here (rather than leaving profiles for the
-- caller to remember) is what lets the export test be an equality check.
create or replace function public.user_owned_tables()
returns setof text
language sql stable security definer set search_path = public as $$
  select c.relname::text
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid
  where n.nspname = 'public' and c.relkind = 'r'
    and a.attname = 'user_id' and a.attnum > 0 and not a.attisdropped
  union
  select 'profiles';
$$;

revoke all on function public.user_owned_tables() from public;
revoke all on function public.user_owned_tables() from anon, authenticated;
grant execute on function public.user_owned_tables() to service_role;
