-- Session 31: pregnancy preparation checklist, transport/emergency contacts,
-- and birth preference notes.

-- checklist_items/checklist_progress already existed on the linked project
-- with a shape from an earlier, uncommitted attempt at this session (2 dummy
-- rows, no real user data, RLS already on but never captured in a migration
-- file or shipped). Clearing that drift before defining the real shape below
-- rather than layering on top of it.
drop table if exists public.checklist_progress;
drop table if exists public.checklist_items;

-- Checklist catalogue: seeded, bilingual content (same shape as
-- food_safety_items) with one addition -- `item_key`, a locale-stable
-- identifier shared by the en/hi row pair for the same real-world item.
-- Per-user progress (below) references `item_key`, not the row's own uuid,
-- so her ticked state survives a language switch instead of resetting
-- because the Hindi and English rows for "Phone charger" have different ids.
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  item_key text not null,
  locale text not null check (locale in ('en', 'hi')),
  category text not null check (category in ('me', 'baby', 'docs')),
  label text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (item_key, locale)
);

create index checklist_items_locale_category_idx on public.checklist_items (locale, category, sort_order);

alter table public.checklist_items enable row level security;
create policy "active checklist items are readable" on public.checklist_items
  for select to authenticated using (is_active = true);

-- Per-user ticks, keyed by the locale-stable item_key above.
create table public.checklist_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_key text not null,
  done boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (user_id, item_key)
);

create index checklist_progress_user_idx on public.checklist_progress (user_id);

alter table public.checklist_progress enable row level security;
create policy "own checklist progress is readable" on public.checklist_progress
  for select using (auth.uid() = user_id);
create policy "own checklist progress is insertable" on public.checklist_progress
  for insert with check (auth.uid() = user_id);
create policy "own checklist progress is updatable" on public.checklist_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own checklist progress is deletable" on public.checklist_progress
  for delete using (auth.uid() = user_id);

create trigger checklist_progress_touch before update on public.checklist_progress
  for each row execute function public.touch_updated_at();

-- Transport and emergency contacts: onboarding only ever captured one
-- name/phone pair (profiles.emergency_contact_name/phone), which can't hold
-- the multiple contacts (family, driver, clinic) this screen needs. This
-- table is seeded once from that onboarding pair the first time she opens
-- Prep (see app/actions/checklist.ts) so she is never asked to re-type a
-- contact she already gave; profiles.emergency_contact_name/phone stays
-- untouched afterwards as the onboarding-time snapshot, while this table is
-- the live, editable list from here on.
create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  phone text not null check (phone ~ '^[0-9]{10}$'),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index emergency_contacts_user_sort_idx on public.emergency_contacts (user_id, sort_order);

alter table public.emergency_contacts enable row level security;
create policy "own emergency contacts are readable" on public.emergency_contacts
  for select using (auth.uid() = user_id);
create policy "own emergency contacts are insertable" on public.emergency_contacts
  for insert with check (auth.uid() = user_id);
create policy "own emergency contacts are updatable" on public.emergency_contacts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own emergency contacts are deletable" on public.emergency_contacts
  for delete using (auth.uid() = user_id);

create trigger emergency_contacts_touch before update on public.emergency_contacts
  for each row execute function public.touch_updated_at();

-- Birth preference notes: shown in the designer mockup but not part of
-- Implementation.md's original Session 31 text -- added here the same way
-- Session 31 already adds ProgressRing beyond that text: it's cheap, fully
-- specified by the mockup, and a real pregnancy-prep need. Free text, tied
-- to the pregnancy it was written for (not the account), same as other
-- pregnancy-scoped fields on this table.
alter table public.pregnancies
  add column birth_notes text check (length(birth_notes) <= 4000);
