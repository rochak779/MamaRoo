-- ============================================================================
-- PLACEHOLDER CONTENT. NOT MEDICAL CONTENT. NEVER SHIP THIS FILE.
-- Exists only so tests and local development have rows to read. Every row is
-- replaced by the product owner's reviewed corpus in Session 19 and Session 29.
-- ============================================================================

insert into public.content_items (slug, locale, kind, title, summary, body_md, week_min, week_max, citation, is_published)
values
  ('placeholder-rest', 'en', 'article', 'Placeholder: resting well',
   'Placeholder summary. Not medical content.',
   '## Placeholder\n\nThis text is a placeholder and carries no medical meaning.', 1, 42,
   'Placeholder citation. Not medical content.', true),
  ('placeholder-food', 'en', 'article', 'Placeholder: eating well',
   'Placeholder summary. Not medical content.',
   '## Placeholder\n\nThis text is a placeholder and carries no medical meaning.', 1, 42,
   'Placeholder citation. Not medical content.', true);

-- Session 28: one placeholder item per Guide topic card, so the topic list
-- and trimester screens have something to render locally rather than
-- exercising only the empty state. Real content replaces these at the same
-- content gate as everything else here (Session 19 / Session 29).
insert into public.content_items (slug, locale, kind, title, summary, body_md, media_url, duration_seconds, category, citation, is_published)
values
  ('placeholder-checkups', 'en', 'article', 'Placeholder: your first checkup',
   'Placeholder summary. Not medical content.',
   '## Placeholder\n\nThis text is a placeholder and carries no medical meaning.', null, null,
   'checkups', 'Placeholder citation. Not medical content.', true),
  ('placeholder-eating-well', 'en', 'article', 'Placeholder: simple meals',
   'Placeholder summary. Not medical content.',
   '## Placeholder\n\nThis text is a placeholder and carries no medical meaning.', null, null,
   'eating_well', 'Placeholder citation. Not medical content.', true),
  ('placeholder-staying-active', 'en', 'video', 'Placeholder: gentle movement',
   'Placeholder summary. Not medical content.', null,
   'https://example.com/placeholder.mp4', 180,
   'staying_active', 'Placeholder citation. Not medical content.', true),
  ('placeholder-medicines', 'en', 'article', 'Placeholder: iron and folic acid',
   'Placeholder summary. Not medical content.',
   '## Placeholder\n\nThis text is a placeholder and carries no medical meaning.', null, null,
   'medicines', 'Placeholder citation. Not medical content.', true),
  ('placeholder-birth', 'en', 'article', 'Placeholder: the day itself',
   'Placeholder summary. Not medical content.',
   '## Placeholder\n\nThis text is a placeholder and carries no medical meaning.', null, null,
   'birth', 'Placeholder citation. Not medical content.', true),
  ('placeholder-after-birth', 'en', 'article', 'Placeholder: healing and rest',
   'Placeholder summary. Not medical content.',
   '## Placeholder\n\nThis text is a placeholder and carries no medical meaning.', null, null,
   'after_birth', 'Placeholder citation. Not medical content.', true);

insert into public.content_passages (content_item_id, locale, heading, body)
select id, 'en', 'Placeholder heading',
       'Placeholder passage body used only to exercise retrieval in tests.'
from public.content_items where slug like 'placeholder-%';

insert into public.symptom_rules (locale, match_terms, severity, guidance_title, guidance_body, priority)
values
  ('en', array['placeholder-general-term'], 'general',
   'Placeholder general guidance', 'Placeholder body. Not medical content.', 10),
  ('en', array['placeholder-clinic-term'], 'contact_clinic',
   'Placeholder clinic guidance', 'Placeholder body. Not medical content.', 50),
  ('en', array['placeholder-urgent-term'], 'urgent',
   'Placeholder urgent guidance', 'Placeholder body. Not medical content.', 90);

insert into public.suggested_questions (locale, week_min, week_max, body)
values ('en', 1, 42, 'Placeholder question. Not medical content.');

-- checklist_items has its own seed (supabase/seed/checklist_items.sql, same
-- "placeholder auto-run vs. reviewed-corpus manual apply" split as
-- food_safety_items and guide content below) -- it's deliberately not
-- listed in config.toml's db.seed.sql_paths, same as those. A stale insert
-- targeting an earlier, abandoned shape of this table (a "body" column that
-- no longer exists) used to live here; removed rather than fixed in place,
-- since real seed content for this table already exists in its own file.
