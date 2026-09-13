-- Session 28: the Guide tab groups content_items by topic (the 6 bento-grid
-- cards) and needs a citation shown per item, since a single topic list mixes
-- MamaRoo-curated and Mayo-Clinic-sourced rows (Screens/05-guide/README.md's
-- "content sourcing rule"). Trimester-stage lists reuse the existing
-- week_min/week_max columns instead of category -- they were built for
-- exactly this kind of week-window filtering.
alter table public.content_items
  add column category text check (
    category in ('checkups', 'eating_well', 'staying_active', 'medicines', 'birth', 'after_birth')
  ),
  add column citation text;

-- Backfill existing rows (Session 9/18/19's placeholder content) before making
-- the column required, so the not-null constraint below doesn't fail against
-- data that predates it.
update public.content_items set citation = 'Reviewed by MamaRoo''s medical team' where citation is null;

alter table public.content_items alter column citation set not null;
