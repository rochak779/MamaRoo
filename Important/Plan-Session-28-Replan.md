# Session 28 replan: Guide tab, split for incremental delivery

Source: `Screens/05-guide/` (designer markup, arrived 2026-09-13) compared against `Important/Implementation.md`'s Session 28 ("Reading list and detail") and the `content_items`/`content_passages` schema (Migration 4, Session 9/18). This doc replaces that one session with three, same treatment as `Important/Plan-Sessions-22-27-Replan.md` gave My Care. No code has been written against this yet.

## What the designer folder confirmed vs. changed

| Design file | Original plan coverage | Verdict |
|---|---|---|
| `Guide.dc.html` | Not modeled — original plan assumed a flat list | New. A static 8-card bento home (Trimester hero + 6 topic cards + Common Questions row), fixed routes, no dynamic content. |
| `Trimester Overview.dc.html` | Not modeled | New. Three static stage cards (weeks 1–12 / 13–26 / 27–40); current stage gets a badge. Pure week→trimester calculation, no new table — reuses the `pregnancyProgress` week the rest of the app already computes. |
| `Topic List.dc.html` | Session 28's flat `ReadingList`, but as a 3-tab (article/video/audio) list | Bigger than planned, same job. One generic list template reused for 6 topic cards *and* all 3 trimester stages (9 call sites, one component) — no kind-tabs, single column, type shown per-row instead. `content_items` has no topic grouping today. |
| `Article Reader.dc.html` | Session 28's article branch of `ContentDetail` (Session 18.4) | Matches the reuse the original plan intended — same component, entered from `/guide` instead of `/reading`. One new requirement: **every item carries its own citation** (Mayo Clinic or MamaRoo, mixed within one list) — `content_items` has no citation column today. |
| `Video Player.dc.html` | Session 18.4's existing video branch of `ContentDetail` | Matches almost exactly (title, citation, Video/Text toggle, "read the text version" section). The mock embeds a YouTube iframe; the real component plays `media_url` through a native `<video>` tag. Keeping the real implementation — same "mock simulates, build uses the real pattern" treatment as Session 26. |
| `Food Safety Lookup.dc.html` | **Not in Implementation.md at all** | Net-new. A search tool, not content-library-backed — no article/video shape fits it (status verdict + short/long text, always MamaRoo-cited). |
| `Common Questions.dc.html` | **Not in Implementation.md at all** | Net-new, and two sections with different shapes: an FAQ accordion, and a separately-styled Government schemes section. Distinct from Care's `suggested_questions`/`custom_questions` (those feed the Visit Summary and support per-user marking; these don't relate to either). |

## Decisions this replan makes (flag if you'd call any of these differently)

1. **Split by data shape, same rule as the Care replan.** Session 28 covers everything that fits the existing `content_items` model (home, trimester picker, topic lists, article/video detail). 28A and 28B get their own sessions because Food Safety and Common Questions need genuinely different tables, not just new rows.
2. **`content_items` gets two new columns, not a new table.** `category text` (checkups / eating_well / staying_active / medicines / birth / after_birth, nullable — trimester-stage lists don't use it, they filter on the existing `week_min`/`week_max` instead) and `citation text not null` (free text, e.g. "Source: Mayo Clinic pregnancy guide" or "Reviewed by MamaRoo's medical team"). This is the one migration in Session 28.
3. **`ContentDetail` moves out of `app/(app)/reading/`.** That path is a leftover from Session 18.4 pulling the component forward before `/reading` had a `page.tsx` — the route was later renamed to `/guide` (commit `9bae752`) and `app/(app)/reading/` was never cleaned up. It's imported from two unrelated route trees (`today/listen` and, as of this session, `guide/[topic]`), so it moves to `components/content/ContentDetail.tsx` (matching the `components/patterns/` / `components/ui/` convention) rather than living under either route. Today's `listen/[slug]/page.tsx` import path updates; `app/(app)/reading/` is deleted.
4. **One dynamic route serves all 9 topic lists.** `app/(app)/guide/[topic]/page.tsx` handles `checkups`, `eating-well`, `staying-active`, `medicines`, `birth`, `after-birth`, `trimester-1`, `trimester-2`, `trimester-3` — the six category slugs query by `category`, the three trimester slugs query by week-range overlap. One component (`TopicList.tsx`), matching the design's "shared template" framing.
5. **Eating well's second destination (Food Safety Lookup) is a banner inside its Topic List**, not a chooser screen — no markup shows how you get from the Eating well card to the lookup tool, and the README only says the card "also offers" it. Cheapest reading consistent with the routing note; revisit if real markup ever shows otherwise.
6. **Common Questions gets its own tables — `guide_faqs` and `guide_schemes`** — not reused rows in `suggested_questions`. That table is Care-tab content mapped to visit weeks and user-markable; Common Questions is unrelated general content with no per-user state at all.
7. **No real content exists yet for any topic, the food safety data, the FAQs, or the schemes.** Same Gate B gap as Sessions 18 and 25A — build fully against placeholder seed rows, swap in real content later as a content-only change.

## Revised session breakdown

### Session 28 — Guide home, Trimester Overview, Topic List, content library plumbing
**Goal:** The navigational shell of the tab, plus everything that's really just a filtered view of `content_items`.

**Files:**
- Migration: `supabase/migrations/00XX_guide_content.sql` — adds `category` and `citation` to `content_items`; backfills existing rows with a placeholder citation so the `not null` constraint holds.
- Create: `lib/domain/library.ts` + test — `trimesterOf(week)`, `orderLibrary({ items, week, locale })` (week-relevance ordering, for the 3 trimester-stage lists), `topicItems({ items, category, locale })` (topic-grouped ordering, for the 6 category lists). Both apply the existing `resolveLocalisedContent` fallback-locale rule per slug.
- Modify: `lib/supabase/queries/content.ts` — add `listContentByCategory` and `listContentByWeekRange`, and `category`/`citation` to the existing select.
- Create: `app/(app)/guide/page.tsx`, `GuideHome.tsx` + test — the bento grid, static routes to the 6 category slugs, `trimester`, and `questions` (Session 28B's route, linked now so 28B doesn't have to touch this file).
- Create: `app/(app)/guide/trimester/page.tsx`, `TrimesterOverview.tsx` + test.
- Create: `app/(app)/guide/[topic]/page.tsx`, `TopicList.tsx` + test.
- Move: `app/(app)/reading/[slug]/ContentDetail.tsx` (+ test) → `components/content/ContentDetail.tsx` (+ test); add the article/markdown branch and a per-item citation line (Session 18.4 built video/audio, not article).
- Create: `app/(app)/guide/[topic]/[slug]/page.tsx` — renders `ContentDetail` with `backHref="/guide/[topic]"`.
- Modify: `app/(app)/today/listen/[slug]/page.tsx` — update the `ContentDetail` import path.
- Delete: `app/(app)/reading/` (now empty).
- Modify: `i18n/en.json`, `i18n/hi.json` — new top-level `guide` namespace (nav's `guide` key already exists from the BottomNav rename; screen copy is new).

**Interfaces:**
- Produces: `trimesterOf(week): 1 | 2 | 3`, `orderLibrary(...)`, `topicItems(...)`, `listContentByCategory(...)`, `listContentByWeekRange(...)`
- Consumes: `pregnancyProgress` (existing, for the current week), `resolveLocalisedContent` (existing)

**Depends on:** nothing outstanding — `content_items` exists since Migration 4.

### Session 28A — Food Safety Lookup
**Goal:** Search-by-name tool with a calm safe/moderation/avoid verdict, never a chatbot, always MamaRoo-cited.

**Files:**
- Migration: `supabase/migrations/00XX_food_safety.sql` — `food_safety_items` (id, locale, name, aliases text[], status check in ('safe','moderation','avoid'), short_text, long_text). RLS: read-only for authenticated, same shape as `content_items`.
- Create: `lib/domain/foodSafety.ts` + test — name/alias matching for the search box.
- Create: `lib/supabase/queries/foodSafety.ts` + test.
- Create: `app/(app)/guide/food-safety/page.tsx`, `FoodSafetyLookup.tsx` + test.
- Modify: `app/(app)/guide/[topic]/TopicList.tsx` — add the "Check if a food is safe" banner when `topic === "eating-well"` (Decision 5 above).
- Modify: `i18n/en.json`, `i18n/hi.json` — new top-level `foodSafety` namespace.
- Create: `supabase/seed/food_safety.placeholder.sql` — placeholder rows for the six "commonly searched" foods in the mock, both locales.

**Depends on:** Session 28's `/guide/[topic]` route existing so the banner has somewhere real to link from (cosmetic — the lookup page itself has no dependency).

### Session 28B — Common Questions
**Goal:** FAQ accordion (myth-correction copy, citation on expand) and a visually separate Government schemes section, both read-only shared content.

**Files:**
- Migration: `supabase/migrations/00XX_guide_faqs.sql` — `guide_faqs` (id, locale, question, answer, sort_order) and `guide_schemes` (id, locale, name, short_text, long_text, sort_order). Same read-only RLS shape as `suggested_questions`.
- Create: `lib/supabase/queries/guideFaqs.ts` + test.
- Create: `app/(app)/guide/questions/page.tsx`, `CommonQuestions.tsx` + test.
- Modify: `i18n/en.json`, `i18n/hi.json` — new top-level `commonQuestions` namespace.
- Create: `supabase/seed/guide_faqs.placeholder.sql` — the 5 FAQ + 3 scheme placeholder rows from the mock, both locales.

**Depends on:** nothing beyond Session 28's `GuideHome` already linking `/guide/questions`.

## Coordination points

- **`GuideHome.tsx` link wiring** is fixed by Session 28 up front (same move as Session 22 did for `CareHub`) — 28A and 28B don't need to touch it.
- **Migrations:** don't pre-assign numbers — run `supabase migration new` at merge time per the Care replan's own lesson. All three sessions' migrations are independent (different tables / an additive column pair), so land in any order.
- **i18n:** each session gets its own top-level namespace (`guide`, `foodSafety`, `commonQuestions`) — same convention as Care, for the same reason (avoids JSON merge conflicts when built in parallel worktrees).
- **`ContentDetail` move (Session 28 only):** this is the one file both Today and Guide depend on. Session 28 owns the move; 28A/28B never touch it.

## Recommended build order

| Order | Session | Builder | Why here |
|---|---|---|---|
| 1 | 28 | Claude | Foundational — owns the migration, the `ContentDetail` move, and the route Today already depends on. Higher blast radius if wrong. |
| 2 (parallel-safe, either order) | 28A, 28B | Codex | Independent of each other and of nothing in 28's code once 28's routes exist to link from (cosmetic only). |

Depends on Session 27 (Doctor Visit Summary) merging first only in the trivial sense of not wanting two worktrees open against a moving `main` at once — there is no functional dependency between Guide and Care.
