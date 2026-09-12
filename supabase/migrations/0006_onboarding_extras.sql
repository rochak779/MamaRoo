-- Sessions 15-16 onboarding flow: the About You screen adds an optional
-- emergency contact; Pregnancy Start adds two new ways of knowing her dates
-- (an IVF/IUI transfer date and "not sure yet"); Pregnancy Details adds
-- optional pregnancy-complexity flags; Notification Privacy adds a
-- lock-screen notification preference (captured now even though push
-- notifications themselves are Phase 2 -- see Spec.md's phasing note --
-- so the choice isn't lost once that ships).

alter table public.profiles
  add column emergency_contact_name text check (length(trim(emergency_contact_name)) between 1 and 80),
  add column emergency_contact_phone text check (emergency_contact_phone ~ '^[0-9]{10}$'),
  add column notification_privacy text not null default 'private'
    check (notification_privacy in ('private', 'detailed')),
  add constraint emergency_contact_name_and_phone_together
    check ((emergency_contact_name is null) = (emergency_contact_phone is null));

-- The original three-value edd_source enum (Session 7) gets two more
-- methods from the Pregnancy Start screen. Postgres can't alter a check
-- constraint in place, so the anonymous one from migration 0001 -- named
-- pregnancies_edd_source_check by Postgres's default auto-naming, confirmed
-- against the live schema -- is dropped and recreated with the wider set.
alter table public.pregnancies
  drop constraint pregnancies_edd_source_check;
alter table public.pregnancies
  add constraint pregnancies_edd_source_check
    check (edd_source in ('lmp', 'scan', 'manual', 'ivf', 'unsure'));

alter table public.pregnancies
  add column pregnancy_flags text[] not null default '{}'
    check (pregnancy_flags <@ array['single', 'twins', 'ivf', 'monitored', 'priorLoss', 'unsureFlag']::text[]),
  add column twin_type text check (twin_type in ('unconfirmed', 'dichorionic', 'monochorionic'));

-- No RLS changes: both tables already carry row-level policies scoped to
-- auth.uid() (migration 0001), and those apply to every column including
-- the new ones -- there is no per-column RLS in Postgres.
