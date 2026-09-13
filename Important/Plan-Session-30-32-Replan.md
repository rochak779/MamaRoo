# Sessions 30–32 replan: Me tab

Source: `Screens/06-Me/` (designer markup, 7 files) compared against `Important/Implementation.md` Sessions 30 (Contraction timer), 31 (Pregnancy preparation checklist), and 32 (Settings), plus `Important/Spec.md`. This doc replaces those three session entries with four, corrects a route mismatch, and records four scope decisions made with Rochak. No code has been written against this yet.

## What the designer folder confirmed vs. changed

| Design file | Original plan coverage | Verdict |
|---|---|---|
| `More.dc.html` | Session 32 "Profile hub" | Matches — tab landing with profile card, grouped settings rows, Contraction timer entry, logout confirmation sheet. |
| `Personal Info.dc.html` | Session 32 "details" | Mostly already covered by schema: `profiles.emergency_contact_name/phone` and `profiles.city` already exist from onboarding (migration `0006`). Two gaps: the field is labeled **Age**, but the schema stores `birth_year` (Session 32 converts one to the other; no new column) — and there is **no `mobile_number` column anywhere** (new migration). |
| `Pregnancy Info.dc.html` | Session 32 "details" | Circumstance chips (Singleton / Twins / IVF or IUI / Doctor advised monitoring / Previous loss / Not sure) map directly onto the existing `pregnancies.pregnancy_flags` enum (`single`/`twins`/`ivf`/`monitored`/`priorLoss`/`unsureFlag`) from onboarding. Doctor/clinic fields already exist on `profiles`. Clean, no new schema. |
| `Notifications.dc.html` | Not explicitly named in Session 32's Files block | "Lock screen wording" (full detail vs. private) is the existing `profiles.notification_privacy` column, captured at onboarding for exactly this future use. Reminder toggles (medicine/appointment/weekly) are new preference storage only — push delivery itself stays Phase 2 (`P2-2`), so these toggles have nothing to wire to yet beyond persisting the choice. |
| `Pregnancy Preparation.dc.html` | Session 31 checklist | Matches the checklist/documents/notes shape, but the mockup has **no progress ring**, even though Session 31's own Interfaces block specifies `ProgressRing({ fraction, label })` with a test asserting `role="progressbar"`. Build the ring anyway — it's cheap and already fully specified. Adds a "transport and emergency contacts" card (multiple named contacts with call buttons) that the plan's `checklistProgress` interface doesn't cover — needs its own small table, since Personal Info's single `emergency_contact_name/phone` pair can't hold three. |
| `Contraction Timer.dc.html` | Session 30 | Matches. The mockup persists to `localStorage` for the prototype; the plan's real design (Supabase-backed, offline writes refused per the spec's offline decision) is unaffected by that — it's just how these designer prototypes are built. |
| `Privacy And Data.dc.html` | Session 32 "consent review, export, deletion" | Three real gaps against the plan and Spec.md: **no consent-review/withdraw UI** at all, despite Spec.md §1.4 stating "Withdrawal in Settings opts out and clears the stored identity" as a hard requirement; a **PIN lock** card (4-digit local passcode, masked "private entry mode," a `href="#"` "Forgot my PIN" link) that appears nowhere in Implementation.md or Spec.md; and a **"Delete pregnancy journey"** action (wipes pregnancy-scoped data, keeps the account) distinct from the plan's `deleteAccount`. Export copy reads "On its way to my email," implying async email delivery instead of the plan's direct `buildExport()` design. |

## Decisions locked in (per Rochak)

1. **Build the consent-review/withdrawal UI now**, as part of 32A. It's a small addition — `consents` and `getCurrentConsents()` already exist — and closes a real gap against a stated privacy promise.
2. **PIN lock is Phase 2.** Cut the whole card from the Privacy And Data build. Logged as `P2-13` in Implementation.md with its own open design questions (storage, recovery flow, what it gates).
3. **Build "delete pregnancy journey" now**, alongside `deleteAccount`, as part of 32A.
4. **Export stays a direct download, no email.** Matches the plan's original `buildExport()` design with zero new integrations. Adjust the mockup's toast copy from "On its way to my email" to something that matches an immediate download.

## Route fix

Implementation.md's Sessions 30–32 use `app/(app)/profile/...` paths throughout (`profile/page.tsx`, `profile/settings/page.tsx`, `profile/contractions/page.tsx`, `profile/prep/page.tsx`). `components/patterns/BottomNav.tsx` already wires the fifth tab to `/me` (confirmed — no `app/(app)/me/` directory exists yet, so the tab currently 404s). Every route below uses `/me/...`, not `/profile/...`. Same class of fix as the 8-vs-9-stages correction in the My Baby replan: build to what the shipped nav actually points at, not to what an earlier planning pass assumed.

## Revised session breakdown

### Session 30 — Contraction timer (unchanged scope, route fixed)
- Goal, files, and interfaces exactly as Implementation.md already specifies.
- Only change: `app/(app)/me/contractions/page.tsx`, not `app/(app)/profile/contractions/...`.
- No new migration. No dependency on any other Session 30–32 work — clean to start immediately.

### Session 31 — Pregnancy preparation checklist (scope corrected)
- Goal, files, and interfaces as Implementation.md specifies, at `app/(app)/me/prep/...` instead of `app/(app)/profile/prep/...`.
- **Build `ProgressRing` as already specified** even though the mockup's artboard doesn't show it — the plan's test for it stands.
- **New:** a small `emergency_contacts` table (id, user_id, name, phone, sort_order) backing the "transport and emergency contacts" card — add/edit/remove, call-link per row.
- "Documents to carry" is a static, non-editable reminder list (translated copy only, no per-user rows) — the design's own helper text says these aren't stored copies.
- No dependency on Session 30, 32, or 32A.

### Session 32 — Me tab hub and everyday settings (new session, replaces the "hub" half of the old Session 32)
- Goal: the tab landing screen plus the three low-stakes settings screens that only ever touch her own `profiles`/`pregnancies` rows.
- Routes: `app/(app)/me/page.tsx` (hub), `app/(app)/me/personal/page.tsx`, `app/(app)/me/pregnancy/page.tsx`, `app/(app)/me/notifications/page.tsx`.
- One migration: `profiles.mobile_number text check (mobile_number ~ '^[0-9]{10}$')`, following the exact pattern of the existing `emergency_contact_phone` check.
- Age ↔ `birth_year` conversion happens in the personal-details form/action; no new column.
- The hub wires its "Privacy and data" row to the fixed path `/me/privacy` up front, even though that route doesn't exist until 32A lands — same trick as the My Baby replan's bento-link fix, so 32A never needs to touch the hub file.
- Depends on nothing from 30, 31, or 32A.

### Session 32A — Privacy and data (new session, the sensitive half of the old Session 32)
- Goal: the screen that makes the product's privacy and data-control promises real — unchanged in intent from the original Session 32, expanded per the decisions above.
- Route: `app/(app)/me/privacy/page.tsx`.
- Covers: consent review and per-key withdrawal (reads `getCurrentConsents()`, writes a new `consents` row with `granted = false` exactly as Spec.md §3.1 describes — never updates or deletes); export as a direct download via `buildExport()` as originally specified; delete pregnancy journey (new — deletes every row scoped to the current `pregnancy_id` across the user-owned tables that carry one, leaving the account and `profiles` row intact); delete account (as originally specified, the one path permitted to use the service-role key).
- **No PIN lock card.** Cut per the decision above.
- This is the session touching `lib/supabase/admin.ts` and the service-role key, so — as Implementation.md already says of the old Session 32 — it runs solo/sequential, not parallelized with anything else.
- Depends on Session 32 only for the hub's link existing at a stable path; otherwise self-contained.

## Coordination points

- **The hub screen (`app/(app)/me/page.tsx`) is the one file Sessions 32 and 32A both care about**, resolved the same way the My Baby replan resolved `BabyScreen.tsx`: Session 32 wires all settings-row links up front, including `/me/privacy`, which 404s harmlessly until 32A lands.
- **Migrations:** 32 (mobile_number) and 31 (emergency_contacts table) each add one migration; neither depends on the other. Run `supabase migration new` at merge time rather than pre-assigning filenames, and whoever merges second rebases and re-runs `db reset` locally, per the existing no-Docker/linked-live-project workflow.
- **i18n:** each session adds to `i18n/en.json`/`i18n/hi.json` under its own namespace (`contractions`, `prep`, `me`, `mePrivacy` or similar — match the existing per-session namespace convention).

## Still open before some of this starts

1. **PIN lock (`P2-13`)** needs its own brainstorming pass before it's ever built — storage, recovery flow, and what it gates are all undecided. Not blocking 30/31/32/32A.
2. **The "Support" row on the hub screen** (visible in `More.dc.html`, wired with its own icon) isn't covered by any of Sessions 30–32A. Flagging as unscoped rather than silently building or dropping it — needs its own decision before Session 32 wires that row to a real destination.
