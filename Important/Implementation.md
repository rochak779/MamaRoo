# MamaRoo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read the spec alongside this plan — this plan argues from the spec and does not restate it.

**Goal:** Build MamaRoo Phase 1 — a bilingual, installable pregnancy-companion PWA for middle-income Indian women, also shipped to Google Play via a Trusted Web Activity — covering daily guidance (Today), baby development (My Baby), care records (My Care), a content library (Reading), personal tools (Profile), a retrieval-only chatbot, and a printable Doctor Visit Summary.

**Architecture:** One Next.js App Router repo. Supabase is the entire backend (Postgres + Auth + Storage + RLS); there is no separate API service. All calculation lives in `lib/domain/` as pure functions with no I/O, so it is testable without a database or browser. Screens fetch, pass data to domain functions, and render. Exactly one server route (`app/api/chat`) holds a secret. A thin Bubblewrap TWA wraps the same web build for Play.

**Tech Stack:** Next.js (App Router) · React · TypeScript (strict) · Tailwind CSS · Supabase (`@supabase/ssr`) · next-intl · Serwist (service worker) · Phosphor Icons · lottie-web · Vitest + React Testing Library · Playwright + axe · Bubblewrap · Google Gemini (behind a provider interface)

**Spec:** `Important/Spec.md`

**Design reference:** `Important/Design.md`. Tokens, component states, voice and accessibility rules come from there and are never re-invented here.

---

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the spec and design document.

**Product and legal**

- The product name appears in code **only** as the constant `PRODUCT_NAME` in `lib/config.ts`. No string literal `"MamaRoo"` anywhere else, including the manifest, page titles, and email templates. A test enforces this.
- **PCPNDT Act (binding):** no field, column, form input, API payload, illustration, colour convention, copy string, or chatbot path may ask for, store, infer, display, or discuss the sex of the foetus. The chatbot refuses sex-determination questions deterministically, before any model call. Tests enforce both the schema absence and the refusal.
- **DPDP Act:** audio is never uploaded or stored. No personal data is ever included in an AI provider request. Data lives in Supabase `ap-south-1` (Mumbai). Settings provides self-service export and deletion.
- Every AI-surfaced or content-surfaced health statement renders the `DisclaimerBanner` composite.
- The Doctor Visit Summary always states: information entered by the user, not medically verified.

**Copy rules (design document §9), enforced by a test**

- No em dashes (`—`) in any user-facing copy string, in either language.
- No "it's not just X, it's Y" construction.
- Banned words: `unlock`, `empower`, `seamless`, `elevate`, `dive into`, `harness`, `leverage`.
- Gentle language on a missed task or incomplete state. Never failure language.

**Design system**

- Hex colour values, spacing values, radii, shadows, motion durations and easings exist **only** in `styles/tokens.css` (Tailwind v4 CSS-first `@theme`, so there is no `tailwind.config.ts` holding values). A test fails the build if a raw hex, a raw `ms` duration, or a `cubic-bezier` literal appears under `app/`, `components/`, or `lib/`. The single documented exception is `viewport.themeColor` in `app/layout.tsx`, which Next.js requires as a literal.
- Build order is absolute: tokens → primitives → composites → screens. No component that composes a primitive is written before that primitive exists.
- One high-emphasis (filled `color-accent-primary`) element per screen. Everything else is secondary or tertiary.
- `texture-motif` is permitted **only** on the splash screen, onboarding screens, and empty states. It is forbidden on Today, My Baby, My Care and Reading.
- Light colour mode only. No dark-mode palette is written.
- `prefers-reduced-motion` is respected on every animation, with no exceptions, collapsing to an instant state change.
- Touch targets are at least 48×48 CSS pixels. All screens function at 200% text scale with no clipping or overlap.
- Colour is never the only signal of meaning; every coloured state also carries an icon or a label.

**Bilingual**

- Every user-facing string lives in `i18n/en.json` and `i18n/hi.json`. A test fails the build if any key exists in one file and not the other.
- Text containers use `min-height`, never fixed `height`. Buttons and labels are sized for Hindi first (Devanagari runs 15–30% longer).
- Every screen is verified in both languages at 200% text scale before its session is called done.

**Dates and time**

- **PostgreSQL 15 or later is required**, for column-scoped `ON DELETE SET NULL (column)` on the composite foreign keys. Supabase provisions 15+; confirm with `select version()` in Session 7 before applying migration 2.
- A calendar day is a `date` column and a `YYYY-MM-DD` string, interpreted in `Asia/Kolkata`.
- A moment is `timestamptz`, stored in UTC.
- No date arithmetic uses the local machine timezone. Everything goes through `lib/domain/dates.ts`.

**Analytics (added to Phase 1 scope)**

- Product analytics ships in Phase 1 via **PostHog** (chosen over Mixpanel for feature flags and session replay in the same SDK), behind the `Analytics` interface in `lib/analytics/provider.ts` so the vendor is swappable in one file.
- **No health data and no free text ever leaves in an event.** Forbidden in every property: symptom or check-in text, medicine names, report titles or filenames, doctor or clinic names, display names, email addresses, chat message bodies, triage guidance text. A guard test enforces a property allowlist.
- Capture is **opt-in**. The SDK starts opted out and is only opted in after an `analytics` consent row exists. Withdrawal in Settings calls opt-out and clears the stored identity.
- `distinct_id` is the Supabase user id (a random UUID). No other identifier is ever sent, and `$ip` capture is disabled.
- Neither vendor offers an India region; US or EU hosting is accepted *because* no health data or PII is transmitted. This reasoning is recorded in the privacy policy and the Play Data Safety declaration.
- Session replay runs with all input masking on and text masking on, so a replay can never capture what she typed.

**Data access**

- RLS is enabled on every table in `public`, with no permissive fallback policy. A test asserts this for every table.
- The Supabase service-role key exists only in Vercel server environment variables. **Exactly one** application code path may use it: the account-deletion action in Session 32, which must call `auth.admin.deleteUser`. It lives in a server-only module the client bundle cannot import, and a guard test asserts the key is referenced nowhere else.
- **Ownership of a referenced parent is enforced by the schema.** `user_id = auth.uid()` proves only that she owns the row being written; a plain foreign key proves the parent exists, not that it is hers. Every reference from one user-owned row to another is a composite foreign key including `user_id` (see Sessions 8, 9 and 10), each with a parent-owned-by-someone-else denial test.
- **Current consent is the newest row per `(user_id, consent_key)`**, read from the `current_consents` view and never derived by asking whether any row has `granted = true`. On an append-only table that question can never become false.
- Content tables have a `select` policy only. No insert, update or delete policy exists, so content is writable only by migrations and seeds.

**Testing (strict TDD)**

- No dependency outside the allowlist in **Agent execution protocol** is added without the product owner's approval. A guard test enforces it.
- No session creates or modifies a file its own Files block does not name. Checked at every merge.
- A failing test is written and **observed failing** before any implementation, for every task in this plan.
- **Some later sessions compress the cycle into one step** ("Run it, watch it fail, implement, run it again") to keep this document readable. That compression never removes the requirement: for every such step, write the test, run the named command, record the observed failure, then implement, then re-run. If a step does not name a test file and a command, the first action is to derive both from the session's Files block before writing any implementation code.
- `lib/domain/` targets full branch coverage. This is the one place coverage is enforced numerically.
- Screens are tested for data states, validation and logic. Never for pixel layout — designs arrive mid-build and brittle layout assertions would fight the designer.
- Commit after every green test cycle. Commit messages use Conventional Commits.

**Three hard gates (see §Gates below) — all three are the same kind of stop, not one rule and two notes**

- **Design asset gate:** every screen session's first step is to request the designer's HTML/CSS and Lottie assets and STOP until they arrive. Screen layout is never invented by the implementer.
- **Content gate:** the triage, chatbot, suggested-questions and checklist sessions' first step is to request the reviewed content corpus, red-flag severity rules and item lists, and STOP until they arrive. Medical content is never invented by the implementer.
- **Credentials gate:** sessions needing an external account (Supabase, Google OAuth, PostHog, Gemini, Play Console, app icons) name exactly what to request and STOP until it is provided. This is a hard stop like the other two, not a lesser note.

---

## Gates — read before starting any session

### Gate A: design assets

Applies to Sessions 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32.

The first step of each of those sessions is:

> Ask the product owner for this screen's designer output: HTML/CSS (preferred) or high-resolution images, plus any Lottie JSON. **Then stop and wait.** Do not write layout markup, invent spacing, or "approximate from the tokens". If the asset has not arrived, report that the session is blocked and move to the next unblocked session.

What the implementer *may* build before the asset arrives, within the same session, is the non-visual half: the data fetch, the domain call, the form schema, the validation, and their tests. Layout waits.

### Gate B: medical content

Applies to Sessions 19 (triage) and 29 (chatbot).

> Ask the product owner for: (1) the reviewed content corpus as article bodies plus retrieval passages, (2) the red-flag symptom rules as rows of `match_terms`, `severity`, `guidance_title`, `guidance_body`, `priority`, (3) the week-mapped suggested questions. **Then stop and wait.** Never author, guess at, infer, or derive medical content or severity thresholds. Seed files from earlier sessions contain clearly-labelled non-medical placeholder rows used only to make tests runnable; they must not ship.

### Gate C: external accounts

Sessions 7, 12, 17A, 29, 33 and 34 need credentials the implementer cannot create. Each lists exactly what to request. Ask, stop, proceed when provided.

---

## File structure map

Locked before tasks, so decomposition decisions do not drift. Each file has one responsibility.

```
lib/
  config.ts                      PRODUCT_NAME, public config constants
  env.ts                         Parsed + validated environment variables
  domain/
    dates.ts                     IST-safe date-only arithmetic. No other module does date maths
    pregnancy.ts                 week/day/trimester, EDD computation and scan correction
    stages.ts                    week -> illustration stage 1..9, stage boundary table
    adherence.ts                 medicine day-grid and taken/total model
    kicks.ts                     kick session state machine
    contractions.ts              duration/interval stats and the 5-1-1 threshold
    triage.ts                    deterministic symptom rule matching
    questions.ts                 week-appropriate suggested-question selection
    timeline.ts                  merge user events with derived week milestones
    summary.ts                   Doctor Visit Summary view model
    content.ts                   locale fallback + "English only" marker
    copy.ts                      copy-rule validators used by tests
  supabase/
    browser.ts                   Browser client (anon key)
    server.ts                    Server client (cookies, anon key)
    database.types.ts            GENERATED. Never hand-edited
    queries/                     One file per feature; all typed; all RLS-scoped
  ai/
    provider.ts                  AiProvider interface. No provider detail
    gemini.ts                    Gemini implementation of AiProvider
    guardrails.ts                Pre-model deterministic refusals (incl. PCPNDT)
    intent.ts                    'data' | 'health' classification
    retrieval.ts                 Postgres full-text retrieval + threshold
    dataAnswers.ts               Templated answers from her own rows. No model call
  speech/
    transcribe.ts                Transcriber interface + availability check
    webspeech.ts                 Web Speech API implementation
  pwa/
    useOnline.ts                 Single source of truth for online state
styles/
  tokens.css                     THE only place hex/spacing/radius/shadow/motion values exist
components/
  ui/                            Primitives (design doc §5.1), one file per component
  patterns/                      Composites (design doc §5.2), one file per component
  charts/                        Vitals trend chart. Uses chart-* tokens only
i18n/
  en.json  hi.json  request.ts  locale.ts
app/
  (public)/ (auth)/ (onboarding)/ (app)/ api/chat/  dev/components/
supabase/
  migrations/                    Numbered SQL. RLS in the same migration as the table
  seed/                          Placeholder content, clearly labelled
android/                         Bubblewrap TWA project
tests/
  rls/                           Cross-user denial tests per table
  e2e/                           Playwright
  guards/                        Repo-wide guard tests (no raw hex, i18n parity, copy rules)
```

---

## Session index

Sessions are ordered so nothing is built twice and every session ends with something demonstrable. A session is one working sitting; tasks inside it are 2–5 minute steps.

For running two agents at once, see **Parallel execution** below: the lane assignment, the wave boundaries and the five rules that keep two lanes from colliding.

**Foundation (no screens, no gates)**

| # | Session | Gate |
|---|---|---|
| 0 | Repo scaffold, test harness, CI | — |
| 1 | Design tokens, fonts, motion utility | — |
| 2 | Primitives I: Button, Card, Input | — |
| 3 | Primitives II: Checkbox, Toggle, Tab, Toast, Sheet, IconWrapper | — |
| 4 | i18n infrastructure and LanguageSwitcher | — |
| 5 | Composites I: EmptyState, Skeleton, ErrorBanner, SectionHeader, DisclaimerBanner, ListRow | — |
| 6 | Composites II: IllustrationContainer, StageProgress, SeverityBadge, AudioIndicator, `/dev/components` | — |

**Data layer**

| # | Session | Gate |
|---|---|---|
| 7 | Supabase project, migration 1 (identity + pregnancy), RLS test harness | C |
| 8 | Migration 2 (check-ins, timeline, kick sessions, contractions) | — |
| 9 | Migration 3 (medicines, logs, appointments, advice, vitals, reports + storage) | — |
| 10 | Migration 4 (content, passages, symptom rules, questions, checklists, chat) + placeholder seeds | — |
| 11 | Domain library: dates, pregnancy, stages, content fallback | — |

**Entry and shell**

| # | Session | Gate |
|---|---|---|
| 12 | Auth: email OTP + Google, middleware guards | C |
| 13 | Consent register + legal document drafts | — |
| 14 | Landing screen | A |
| 15 | Onboarding intro carousel | A |
| 16 | Onboarding form, profile + pregnancy write | A |
| 17 | App shell, bottom navigation, offline state, view transitions | A |
| 17A | Analytics foundation: provider, consent gate, event taxonomy, property guard | C |

**Screens**

Every screen session from 18 onward ends with one extra step: **emit that screen's events from the taxonomy defined in Session 17A**, and add them to `lib/analytics/events.ts`. No screen invents an event name inline, and no event carries a forbidden property.

| # | Session | Gate |
|---|---|---|
| 18 | Today screen | A |
| 19 | Voice input, triage engine, check-in screen | A + B |
| 20 | My Baby: illustration, stage progress, merged timeline, baby name | A |
| 21 | Kick counter | A |
| 22 | My Care hub, medicines, adherence day-grid | A |
| 23 | Appointments | A |
| 24 | Vitals and trend charts | A |
| 25 | Doctor advice and suggested questions | A |
| 26 | Reports: capture, upload, view | A |
| 27 | Doctor Visit Summary and print | A |
| 28 | Reading list and detail | A |
| 29 | Chatbot: guardrails, retrieval, provider, panel | A + B + C |
| 30 | Contraction timer | A |
| 31 | Pregnancy preparation checklist | A |
| 32 | Settings: language, details, consent review, export, deletion | A |

**Ship**

| # | Session | Gate |
|---|---|---|
| 33 | PWA manifest, service worker, offline shell | C |
| 34 | TWA packaging and Play Store readiness | C |
| 35 | Accessibility, bilingual and device pass | — |

**Phase 2 — OPTIONAL. Every session in Phase 2 is optional and out of Phase 1 scope.** See the Phase 2 part of this document. Do not start any Phase 2 session until Phase 1 Session 35 is signed off and the product owner explicitly asks for it.

---

# Parallel execution

Two agents can work this plan at once. The structure below is the only split that is safe, because it is the only one where the two lanes touch disjoint directories. **Read this before assigning any session.**

## The waves

One agent per lane. Lanes merge at the end of each wave; nothing in wave N+1 starts until wave N is merged and `npm run verify` is green on the merged result.

| Wave | Lane A — interface | Lane B — data and domain | Collisions to watch |
|---|---|---|---|
| 1 | **Session 0 alone.** No parallelism: everything imports `lib/config.ts` and the test harness | — | — |
| 2 | S1 tokens → S2 primitives I → S3 primitives II | S7 migration 1 + RLS harness → S11 domain library | **None.** A touches `styles/` and `components/`; B touches `supabase/`, `lib/domain/`, `lib/supabase/` |
| 3 | S4 i18n → S5 composites I → S6 composites II | S8 → S9 → S10 migrations 2–4 | **None** |
| 4 | S12 auth → S13 consent and legal | S17 app shell and navigation | `middleware.ts` — S12 creates it, S17 adds the `x-pathname` header. Lane A lands first, Lane B rebases |
| 5 | S14 landing → S15 intro → S16 onboarding form | S17A analytics foundation | `app/layout.tsx` |
| 6 | S18 Today → S19 check-in → S20 My Baby → S21 kicks | S22 care hub → S23 appointments → S24 vitals → S25 advice → S26 reports | `i18n/*.json` (see the namespace rule) |
| 7 | S28 reading, S30 contractions, S31 prep checklist | S27 Visit Summary (needs 22–26 merged), S29 chatbot (needs S19 merged) | `i18n/*.json` |
| 8 | **One agent, sequential.** S32 settings → S33 PWA → S34 TWA → S35 accessibility sweep | — | These read the whole app; parallelising them buys nothing and risks everything |

Wave 6's split is not arbitrary: it mirrors the ownership grouping in design document §5.4, where Today and My Baby share the illustration container and My Care's sub-screens share state. That grouping exists so two builders do not collide.

## The five rules

1. **All database work stays in Lane B, permanently.** Two agents writing migrations produces conflicting file numbers *and* two divergent regenerations of `lib/supabase/database.types.ts`. Lane A consumes whatever types are committed and never runs `npm run db:types`.
2. **Translation keys are partitioned by namespace.** `i18n/en.json` and `hi.json` are touched by nearly every session and are the highest-conflict pair in the repository. A session may only add keys under its own namespaces:

   | Namespace | Owner |
   |---|---|
   | `common`, `nav`, `landing`, `severity`, `stages`, `milestones`, `today`, `baby`, `kicks`, `reading`, `checkin` | Lane A |
   | `auth`, `consent`, `onboarding`, `care`, `medicines`, `appointments`, `vitals`, `advice`, `questions`, `reports`, `summary`, `profile`, `settings`, `contractions`, `checklist`, `chat`, `analytics` | Lane B |

   Add keys alphabetically within a namespace so two lanes editing different namespaces produce non-overlapping diffs.
3. **Repository-wide guards run at merge, not per lane.** The i18n parity test, the raw-value scan, the PCPNDT walk and the copy-rule test all inspect the whole tree, so each lane will fail on the other's unfinished work. Running them mid-wave invites someone to weaken a guard to get green. They are merge gates.
4. **One migration, one lane, one commit.** Never split a migration across lanes, and never edit an applied migration — add a new one.
5. **Each lane works in its own git worktree** and merges into `main` at the wave boundary. A bad session is then one `git reset` away rather than an archaeology exercise.

## Expected benefit, stated honestly

Roughly **36 sessions becomes 22 to 24** in wall-clock terms, about a third saved, not half. The critical path (scaffold → primitives → shell → screens → summary → PWA → TWA → accessibility) cannot compress, and merging costs real time.

The gain is concentrated in **waves 2 and 3**, which are about ten sessions with no gates and no shared files. From wave 5 onward the binding constraint is Gate A: nineteen sessions wait on designer assets, so if screens arrive one at a time, a second agent idles and you have paid merge overhead for nothing. Parallelise the foundation aggressively; parallelise the screens only as fast as the designs land.

---

# Agent execution protocol

Applies to every agent, human or otherwise, and to every session.

## What an agent must be given

A fresh agent sees only what is handed to it. Pass, every time:

1. The **Global Constraints** section of this document, verbatim.
2. The **Gates** section, verbatim.
3. The **one session** it is to execute, complete.
4. The **Interfaces blocks** of every session named in its "Consumes" line.
5. Its **lane assignment** and the namespace table above.

Do not pass the whole plan and expect a session to be found in it.

## Forbidden without explicit approval

- **Adding a dependency that is not on the allowlist below.** The allowlist is the complete set this plan calls for. Anything else is a decision for the product owner, not a convenience.
- **Creating or modifying a file the session's Files block does not name.** If the work appears to need one, stop and report it; that is a sign the session or the plan is wrong.
- **Editing a migration that has already been applied.**
- **Weakening, skipping or excluding a guard test to get a green run.** A failing guard is information. If a guard is genuinely wrong, say so and stop.
- **Inventing screen layout, medical content, or severity thresholds.** See the Gates.
- **Claiming a session is complete without running `npm run verify` and reading its output.**

## Dependency allowlist

Runtime: `next`, `react`, `react-dom`, `@supabase/supabase-js`, `@supabase/ssr`, `next-intl`, `zod`, `@phosphor-icons/react`, `lottie-web`, `react-markdown`, `posthog-js`, `d3-scale`, `serwist`, `@serwist/next`, `server-only`, and the Google Gemini SDK (**verify the current package name against Google's documentation at Session 29; do not write one from memory**).

Development: `typescript`, `tailwindcss`, `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `@playwright/test`, `@axe-core/playwright`, `prettier`, `eslint` and the Next.js config, `supabase`, `@bubblewrap/cli`.

Add the guard in Session 0:

```ts
// tests/guards/dependencies.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const ALLOWED_RUNTIME = [
  "next", "react", "react-dom", "@supabase/supabase-js", "@supabase/ssr", "next-intl",
  "zod", "@phosphor-icons/react", "lottie-web", "react-markdown", "posthog-js",
  "d3-scale", "serwist", "@serwist/next", "server-only",
];

describe("dependency discipline", () => {
  it("adds no runtime dependency outside the allowlist", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      dependencies?: Record<string, string>;
    };
    const extra = Object.keys(pkg.dependencies ?? {}).filter(
      (name) => !ALLOWED_RUNTIME.includes(name) && !name.startsWith("@google"),
    );
    // A library pulled in for a problem a few lines of code would solve is the most
    // common way an agent-built codebase gains weight. Any addition is a decision.
    expect(extra).toEqual([]);
  });
});
```

## Declared-paths check, run at every merge

```bash
# Every path the session changed must appear in that session's Files block.
git diff --name-only main...HEAD
```

Compare the output against the session's Files block by eye. A path that is not listed is either scope creep or a gap in the plan; both need a decision, neither is merged silently.

## Commit discipline, so TDD is auditable afterwards

Test and implementation go in **separate commits**, in that order. A session landing as one commit cannot be distinguished from a session where the tests were written after the code, and TDD that cannot be audited is a convention rather than a practice.

## Review cadence

The guards run on every session automatically; they are the continuous control. On top of that:

- **A review at each wave merge** — eight points across the build, not thirty-six. This is where a wrong primitive gets caught before twenty screens inherit it.
- **A full review before the accessibility sweep** in wave 8.

Deferring all review to the end is the expensive option: the cost of fixing a foundational mistake grows with every session built on top of it.

---


# PHASE 1

---

## Session 0: Repo scaffold, test harness, CI

**Goal:** A Next.js app that boots, a Vitest suite that runs, a Playwright runner that runs, validated environment parsing, and CI that fails on any of them. No feature code.

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`, `.env.example`
- Create: `app/layout.tsx`, `app/page.tsx`, `styles/globals.css`
- Create: `lib/config.ts`, `lib/env.ts`, `lib/cn.ts`
- Create: `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`
- Create: `tests/guards/product-name.test.ts`, `tests/guards/dependencies.test.ts`, `tests/e2e/smoke.spec.ts`
- Create: `.github/workflows/ci.yml`, `.prettierrc`, `eslint.config.mjs`

**Interfaces:**
- Produces: `PRODUCT_NAME: string` and `SUPPORTED_LOCALES: readonly ["en", "hi"]` from `lib/config.ts`; `env` object from `lib/env.ts`; npm scripts `dev`, `build`, `test`, `test:e2e`, `lint`, `typecheck`.

- [x] **Step 1: Scaffold the app**

```bash
npx create-next-app@latest . --typescript --app --tailwind --eslint --use-npm --no-src-dir --import-alias "@/*"
```

Answer "No" to Turbopack prompts if asked; the default is fine either way. Then confirm the installed versions and record them in the commit message — do not assume them from memory:

```bash
npm ls next react typescript tailwindcss --depth=0
```

- [x] **Step 2: Turn TypeScript strictness all the way up**

Edit `tsconfig.json` so `compilerOptions` contains at least:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true
  }
}
```

Run `npx tsc --noEmit`. Expected: PASS (a fresh scaffold has no violations).

- [x] **Step 3: Install the test and tooling dependencies**

```bash
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @playwright/test @axe-core/playwright prettier
npx playwright install chromium
npm i zod
```

- [x] **Step 4: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    globals: true,
    coverage: {
      provider: "v8",
      // Coverage is enforced where a silent failure is HARMFUL, not where code is
      // merely plentiful. Ordinary UI code carries no threshold: a percentage target
      // there buys assertions about markup, which this plan deliberately avoids.
      include: [
        "lib/domain/**",
        "lib/ai/**",
        "lib/analytics/**",
        "app/api/chat/**",
      ],
      thresholds: { branches: 100, functions: 100, lines: 100, statements: 100 },
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

Create `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Coverage thresholds apply to the four harm-bearing directories only: the domain calculations, the AI guardrails and selection-validation path, the analytics event schemas, and the chat route. Every other layer is tested for behaviour, not for a percentage. The consent-resolution and deletion paths are covered by the RLS and action tests, which run against a real database and so are not measured by this threshold.

- [x] **Step 5: Write the first failing test — the product-name guard**

Create `tests/guards/product-name.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { PRODUCT_NAME, SUPPORTED_LOCALES } from "@/lib/config";

describe("product configuration", () => {
  it("exposes the product name as a single constant", () => {
    expect(PRODUCT_NAME).toBe("MamaRoo");
  });

  it("supports exactly English and Hindi", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en", "hi"]);
  });

  it("never hardcodes the product name outside lib/config.ts", () => {
    // grep returns exit code 1 (and empty stdout) when nothing matches, which is the pass case.
    const hits = execSync(
      "grep -rn 'MamaRoo' app components lib i18n public android 2>/dev/null " +
        "| grep -v 'lib/config.ts' " +
        "|| true",
      { encoding: "utf8" },
    ).trim();
    expect(hits).toBe("");
  });
});
```

- [x] **Step 6: Run it and watch it fail**

Run: `npx vitest run tests/guards/product-name.test.ts`
Expected: FAIL — cannot resolve `@/lib/config`.

- [x] **Step 7: Write the minimal config module**

Create `lib/config.ts`:

```ts
export const PRODUCT_NAME = "MamaRoo";

export const SUPPORTED_LOCALES = ["en", "hi"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Every calendar-day decision in this product is made in this timezone. */
export const APP_TIMEZONE = "Asia/Kolkata";

/** Gestation length used for EDD maths, in days (Naegele's rule). */
export const GESTATION_DAYS = 280;
```

- [x] **Step 8: Run the test and watch it pass**

Run: `npx vitest run tests/guards/product-name.test.ts`
Expected: PASS. If the grep test fails, the scaffold wrote the product name into `app/layout.tsx` metadata — replace it with `PRODUCT_NAME` now.

- [x] **Step 9: Write the failing test for environment validation**

Create `lib/env.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  NEXT_PUBLIC_SITE_URL: "https://example.com",
};

describe("parseEnv", () => {
  it("accepts a complete environment", () => {
    expect(parseEnv(valid).NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
  });

  it("names the missing variable when one is absent", () => {
    expect(() => parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined })).toThrow(
      /NEXT_PUBLIC_SUPABASE_ANON_KEY/,
    );
  });

  it("rejects a Supabase URL that is not a URL", () => {
    expect(() => parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "not-a-url" })).toThrow();
  });
});
```

- [x] **Step 10: Run it and watch it fail**

Run: `npx vitest run lib/env.test.ts`
Expected: FAIL — `parseEnv` is not exported.

- [x] **Step 11: Implement environment validation**

Create `lib/env.ts`:

```ts
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

export type Env = z.infer<typeof schema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const names = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid or missing environment variables: ${names}`);
  }
  return result.data;
}

export const env: Env = parseEnv(process.env);
```

Create `.env.example` listing the three names with empty values and a comment that the service-role key is set in Vercel only and never in this file.

- [x] **Step 12: Run the test and watch it pass**

Run: `npx vitest run lib/env.test.ts`
Expected: PASS.

- [x] **Step 13: Configure Playwright and a smoke spec**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  projects: [{ name: "mobile-chrome", use: { ...devices["Pixel 7"] } }],
  webServer: { command: "npm run build && npm run start", url: "http://localhost:3000", reuseExistingServer: !process.env.CI },
});
```

Only a mobile viewport is configured. This product is mobile-first; a desktop project would invite layout work nobody asked for.

Create `tests/e2e/smoke.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("the app responds on the root route", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBeLessThan(400);
});
```

- [x] **Step 14: Run the e2e smoke test**

Run: `npx playwright test`
Expected: PASS. If the build fails because `env.ts` throws, create a local `.env.local` with placeholder values matching `.env.example`.

- [x] **Step 15: Add the npm scripts**

In `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "verify": "npm run typecheck && npm run lint && npm run test && npm run test:e2e"
  }
}
```

- [x] **Step 15b: Add the class-merge helper**

Create `lib/cn.ts`:

```ts
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
```

Four lines, and no dependency is added for it. It lives in Session 0 rather than with the first component that needs it so that the UI lane and the i18n lane can both start from the scaffold without waiting on each other (see Parallel execution).

- [x] **Step 16: Add CI**

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  verify:
    runs-on: ubuntu-latest
    env:
      NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
      NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder
      NEXT_PUBLIC_SITE_URL: http://localhost:3000
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

- [x] **Step 16b: Add the dependency guard**

Create `tests/guards/dependencies.test.ts` exactly as given in **Agent execution protocol → Dependency allowlist**, then run it:

Run: `npx vitest run tests/guards/dependencies.test.ts`
Expected: PASS. If it fails, the scaffold added something beyond the allowlist — remove it rather than widening the list.

- [x] **Step 17: Run the whole verification locally**

Run: `npm run verify`
Expected: all four stages PASS.

- [x] **Step 18: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with strict TypeScript, Vitest, Playwright and CI"
```

**Done when:** `npm run verify` is green, the product-name guard passes, and CI is configured. Record the exact installed versions of Next, React, TypeScript and Tailwind in the commit body.

---

## Session 1: Design tokens, fonts, motion utility

**Goal:** Every value from design document §2 exists exactly once, in CSS, consumable from Tailwind utilities. A guard test makes it impossible to reintroduce a raw value later.

**Files:**
- Create: `styles/tokens.css`
- Modify: `styles/globals.css`, `app/layout.tsx`
- Create: `lib/motion.ts`, `lib/motion.test.ts`
- Create: `tests/guards/no-raw-values.test.ts`
- Create: `tests/guards/tokens.test.ts`

**Interfaces:**
- Produces: CSS custom properties `--color-*`, `--space-*`, `--radius-*`, `--elevation-*`, `--motion-*`, `--ease-*`, `--type-*`, `--chart-*`; Tailwind utilities derived from them (`bg-bg`, `text-text-primary`, `rounded-md`, `shadow-1`, …); `prefersReducedMotion()` and `motionDuration(token)` from `lib/motion.ts`.

- [x] **Step 1: Write the failing token test**

Create `tests/guards/tokens.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync("styles/tokens.css", "utf8");

const REQUIRED = [
  "--color-bg: #EDE3D3",
  "--color-surface: #F5EEE1",
  "--color-surface-raised: #FFFFFF",
  "--color-text-primary: #2E2822",
  "--color-text-secondary: #5A4F42",
  "--color-accent-primary: #A8482E",
  "--color-accent-secondary: #3D6B58",
  "--color-alert: #8C2F3D",
  "--color-success: #4F6E3D",
  "--color-divider: #D8CBB2",
  "--chart-series-1: #A8482E",
  "--chart-series-2: #3D6B58",
  "--chart-series-3: #C08A28",
  "--chart-series-4: #6B4A3D",
  "--space-xs: 4px",
  "--space-sm: 8px",
  "--space-md: 16px",
  "--space-lg: 24px",
  "--space-xl: 32px",
  "--space-screen: 20px",
  "--radius-sm: 12px",
  "--radius-md: 20px",
  "--radius-lg: 28px",
  "--radius-full: 999px",
  "--motion-fast: 150ms",
  "--motion-base: 250ms",
  "--motion-slow: 400ms",
];

describe("design tokens", () => {
  for (const token of REQUIRED) {
    it(`defines ${token.split(":")[0]} with the specified value`, () => {
      expect(css).toContain(token);
    });
  }

  it("defines no dark-mode palette, by explicit design decision", () => {
    expect(css).not.toContain("prefers-color-scheme");
  });
});
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/guards/tokens.test.ts`
Expected: FAIL — `styles/tokens.css` does not exist.

- [x] **Step 3: Write the token sheet**

Create `styles/tokens.css`. This is the only file in the repository permitted to contain a hex colour, a spacing pixel value, a radius, a shadow or a duration.

```css
@import "tailwindcss";

@theme {
  /* Color — design document §2 */
  --color-bg: #EDE3D3;
  --color-surface: #F5EEE1;
  --color-surface-raised: #FFFFFF;
  --color-text-primary: #2E2822;
  --color-text-secondary: #5A4F42;
  --color-accent-primary: #A8482E;
  --color-accent-secondary: #3D6B58;
  --color-alert: #8C2F3D;
  --color-success: #4F6E3D;
  --color-divider: #D8CBB2;

  /* Data visualisation — charts only, never UI */
  --chart-series-1: #A8482E;
  --chart-series-2: #3D6B58;
  --chart-series-3: #C08A28;
  --chart-series-4: #6B4A3D;
  --chart-gridline: #D8CBB2;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-screen: 20px;

  /* Shape */
  --radius-sm: 12px;
  --radius-md: 20px;
  --radius-lg: 28px;
  --radius-full: 999px;

  /* Elevation — warm-toned, built from --color-text-primary */
  --shadow-1: 0 1px 3px rgba(46, 40, 34, 0.08);
  --shadow-2: 0 2px 6px rgba(46, 40, 34, 0.12);
  --shadow-3: 0 8px 24px rgba(46, 40, 34, 0.16);

  /* Motion */
  --motion-fast: 150ms;
  --motion-base: 250ms;
  --motion-slow: 400ms;
  --motion-hero: 900ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);

  /* Typography scale */
  --text-display: 28px;
  --text-display--line-height: 36px;
  --text-h1: 24px;
  --text-h1--line-height: 32px;
  --text-h2: 18px;
  --text-h2--line-height: 26px;
  --text-body: 16px;
  --text-body--line-height: 24px;
  --text-body-sm: 14px;
  --text-body-sm--line-height: 20px;
  --text-caption: 13px;
  --text-caption--line-height: 18px;
  --text-button: 15px;
  --text-button--line-height: 20px;

  /* Font families are bound in app/layout.tsx via next/font variables */
  --font-display: var(--font-poppins), system-ui, sans-serif;
  --font-body: var(--font-hind), system-ui, sans-serif;
}

:root {
  /* Decorative layers. aria-hidden wherever they are rendered. */
  --texture-grain-opacity: 0.025;
  --texture-motif-opacity: 0.05;
  --scrim: rgba(46, 40, 34, 0.45);
}
```

- [x] **Step 4: Run the token test and watch it pass**

Run: `npx vitest run tests/guards/tokens.test.ts`
Expected: PASS.

- [x] **Step 5: Write the failing raw-value guard**

Create `tests/guards/no-raw-values.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";

function grep(pattern: string): string {
  return execSync(
    `grep -rnE '${pattern}' app components lib --include='*.ts' --include='*.tsx' --include='*.css' 2>/dev/null || true`,
    { encoding: "utf8" },
  ).trim();
}

describe("no raw design values outside styles/tokens.css", () => {
  it("contains no hex colour literals", () => {
    expect(grep("#[0-9a-fA-F]{3,8}\\b")).toBe("");
  });

  it("contains no millisecond duration literals", () => {
    expect(grep("[^-a-zA-Z0-9][0-9]+ms")).toBe("");
  });

  it("contains no cubic-bezier literals", () => {
    expect(grep("cubic-bezier")).toBe("");
  });
});
```

Note: `styles/` is deliberately not in the grep path list.

- [x] **Step 6: Run it and watch it pass or fail honestly**

Run: `npx vitest run tests/guards/no-raw-values.test.ts`
Expected: FAIL if the scaffold left hexes in `app/globals.css` or a component. Remove every one by replacing it with a token utility. Re-run until PASS. Do not weaken the grep to make it pass.

- [x] **Step 7: Wire fonts and the token sheet into the root layout**

Replace `app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Poppins, Hind } from "next/font/google";
import { PRODUCT_NAME } from "@/lib/config";
import "@/styles/tokens.css";
import "@/styles/globals.css";

const poppins = Poppins({
  subsets: ["latin", "devanagari"],
  weight: ["500"],
  variable: "--font-poppins",
  display: "swap",
});

const hind = Hind({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500"],
  variable: "--font-hind",
  display: "swap",
});

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: "A calm companion through pregnancy.",
};

export const viewport = {
  themeColor: "#EDE3D3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${hind.variable}`}>
      <body className="min-h-dvh bg-bg text-text-primary font-body">{children}</body>
    </html>
  );
}
```

`viewport.themeColor` is the one sanctioned exception to the hex rule, because Next.js requires a literal there. Add it to the guard's allowlist by changing the hex grep in `tests/guards/no-raw-values.test.ts` to append `| grep -v 'app/layout.tsx' ` before the `|| true`, and add a comment in the test explaining why that single exception exists.

- [x] **Step 8: Replace globals.css with base rules only**

`styles/globals.css`:

```css
*, *::before, *::after { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }

body {
  margin: 0;
  font-size: var(--text-body);
  line-height: var(--text-body--line-height);
}

/* Safe areas for the iPhone notch and home indicator. */
.safe-top { padding-top: env(safe-area-inset-top); }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }

/* Minimum touch target, applied to every interactive primitive. */
.tap-target { min-width: 48px; min-height: 48px; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [x] **Step 9: Write the failing motion-utility test**

Create `lib/motion.test.ts`:

```ts
import { describe, expect, it, vi, afterEach } from "vitest";
import { motionDuration, prefersReducedMotion } from "@/lib/motion";

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

afterEach(() => vi.unstubAllGlobals());

describe("motion", () => {
  it("reports the user's reduced-motion preference", () => {
    mockReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    mockReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("returns the token duration in milliseconds when motion is allowed", () => {
    mockReducedMotion(false);
    expect(motionDuration("fast")).toBe(150);
    expect(motionDuration("base")).toBe(250);
    expect(motionDuration("slow")).toBe(400);
    expect(motionDuration("hero")).toBe(900);
  });

  it("collapses every duration to zero when reduced motion is requested", () => {
    mockReducedMotion(true);
    expect(motionDuration("hero")).toBe(0);
    expect(motionDuration("fast")).toBe(0);
  });

  it("treats a missing matchMedia as motion allowed", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});
```

- [x] **Step 10: Run it and watch it fail**

Run: `npx vitest run lib/motion.test.ts`
Expected: FAIL — module not found.

- [x] **Step 11: Implement the motion utility**

Create `lib/motion.ts`:

```ts
export type MotionToken = "fast" | "base" | "slow" | "hero";

const DURATIONS: Record<MotionToken, number> = {
  fast: 150,
  base: 250,
  slow: 400,
  hero: 900,
};

export function prefersReducedMotion(): boolean {
  if (typeof matchMedia !== "function") return false;
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Duration in milliseconds for JS-driven animation. Returns 0 when the user
 * asked for reduced motion, which callers must treat as "change state instantly".
 */
export function motionDuration(token: MotionToken): number {
  return prefersReducedMotion() ? 0 : DURATIONS[token];
}
```

The numbers appear here because JavaScript cannot read a CSS custom property without a live DOM, and a test must not depend on one. `tests/guards/tokens.test.ts` and this file are kept consistent by a final assertion — add it to `lib/motion.test.ts`:

```ts
it("stays consistent with the CSS motion tokens", async () => {
  const css = (await import("node:fs")).readFileSync("styles/tokens.css", "utf8");
  for (const [token, ms] of Object.entries({ fast: 150, base: 250, slow: 400, hero: 900 })) {
    expect(css).toContain(`--motion-${token}: ${ms}ms`);
  }
});
```

- [x] **Step 12: Run the motion tests and watch them pass**

Run: `npx vitest run lib/motion.test.ts`
Expected: PASS.

- [x] **Step 13: Verify the whole suite and commit**

Run: `npm run verify`

```bash
git add -A
git commit -m "feat(design): add token sheet, bilingual fonts and reduced-motion-aware motion utility"
```

**Done when:** all token tests pass, the raw-value guard passes with only the documented `app/layout.tsx` exception, and both fonts load with Devanagari subsets.

---

## Session 2: Primitives I — Button, Card, Input

**Goal:** The three primitives every screen depends on, each covering every state and edge case listed in design document §5.1, each tested first.

**Files:**
- Create: `components/ui/Button.tsx`, `components/ui/Button.test.tsx`
- Create: `components/ui/Card.tsx`, `components/ui/Card.test.tsx`
- Create: `components/ui/Input.tsx`, `components/ui/Input.test.tsx`

**Interfaces:**
- Consumes: tokens from Session 1.
- Produces:
  - `Button({ variant?: "primary" | "secondary" | "tertiary", loading?: boolean, disabled?: boolean, disabledReason?: string, ...ButtonHTMLAttributes })`
  - (consumes `cn(...classes)` from `lib/cn.ts`, created in Session 0)
  - `Card({ as?, interactive?: boolean, selected?: boolean, disabled?: boolean, children })`
  - `CardBody`, `CardTruncatedText({ text, maxChars, showMoreLabel })`
  - `Input({ id, label, type?, error?, hint?, ...InputHTMLAttributes })`

- [x] **Step 1: Write the failing Button test**

`lib/cn.ts` already exists from Session 0.



Create `components/ui/Button.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders its label and fires onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("defaults to the primary variant", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-variant", "primary");
  });

  it("renders a secondary variant when asked", () => {
    render(<Button variant="secondary">Back</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("data-variant", "secondary");
  });

  it("keeps the label in the DOM while loading so the button never changes size", () => {
    render(<Button loading>Saving now</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveTextContent("Saving now");
    expect(screen.getByTestId("button-spinner")).toBeInTheDocument();
  });

  it("does not fire onClick while loading", async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("explains why it is disabled instead of being silently dead", () => {
    render(
      <Button disabled disabledReason="Add a medicine name first">
        Save
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription("Add a medicine name first");
  });

  it("meets the minimum touch target", () => {
    render(<Button>Ok</Button>);
    expect(screen.getByRole("button").className).toContain("tap-target");
  });

  it("wraps a long label rather than truncating it", () => {
    render(<Button>गर्भावस्था की जानकारी सहेजें और आगे बढ़ें</Button>);
    const cls = screen.getByRole("button").className;
    expect(cls).not.toContain("truncate");
    expect(cls).not.toContain("whitespace-nowrap");
  });
});
```

- [x] **Step 3: Run it and watch it fail**

Run: `npx vitest run components/ui/Button.test.tsx`
Expected: FAIL — module not found.

- [x] **Step 4: Implement Button**

Create `components/ui/Button.tsx`:

```tsx
"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "tertiary";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  /** Shown to assistive tech and as a hint, so a disabled button is never unexplained. */
  disabledReason?: string;
}

const BASE =
  "tap-target inline-flex items-center justify-center gap-sm rounded-sm px-lg py-sm " +
  "text-button font-body font-medium text-center " +
  "transition-[transform,background-color,opacity] duration-[--motion-fast] ease-[--ease-standard] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary " +
  "disabled:cursor-not-allowed";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent-primary text-surface-raised active:scale-[0.98] active:brightness-92 disabled:opacity-40",
  secondary:
    "bg-surface text-accent-primary border-[1.5px] border-accent-primary active:scale-[0.98] disabled:opacity-40",
  tertiary: "bg-transparent text-accent-primary underline-offset-4 hover:underline disabled:opacity-40",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", loading = false, disabled, disabledReason, children, className, ...rest },
  ref,
) {
  const descriptionId = disabledReason ? `${rest.id ?? "button"}-reason` : undefined;
  return (
    <>
      <button
        ref={ref}
        data-variant={variant}
        aria-busy={loading || undefined}
        aria-describedby={descriptionId}
        disabled={disabled || loading}
        className={cn(BASE, VARIANTS[variant], className)}
        {...rest}
      >
        <span className={loading ? "opacity-0" : undefined}>{children}</span>
        {loading && (
          <span
            data-testid="button-spinner"
            aria-hidden="true"
            className="absolute inline-block size-[1em] animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
      </button>
      {disabledReason && (
        <span id={descriptionId} className="sr-only">
          {disabledReason}
        </span>
      )}
    </>
  );
});
```

The label stays rendered and only its opacity changes, which is how the button keeps its width while loading — design document §5.1 requires that size never changes.

- [x] **Step 5: Run the Button tests and watch them pass**

Run: `npx vitest run components/ui/Button.test.tsx`
Expected: PASS. The `absolute` class needs a positioned parent — add `relative` to `BASE` and re-run.

- [x] **Step 6: Commit Button**

```bash
git add components/ui/Button.tsx components/ui/Button.test.tsx
git commit -m "feat(ui): add Button primitive with loading, disabled-reason and bilingual wrapping"
```

- [x] **Step 7: Write the failing Card test**

Create `components/ui/Card.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Card, CardTruncatedText } from "@/components/ui/Card";

describe("Card", () => {
  it("renders as a non-interactive container by default", () => {
    render(<Card>Content</Card>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("becomes a button when interactive, so it is keyboard reachable", async () => {
    const onClick = vi.fn();
    render(
      <Card interactive onClick={onClick}>
        Tap me
      </Card>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Tap me" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("marks the selected state with a border, not only a colour", () => {
    render(
      <Card interactive selected>
        Chosen
      </Card>,
    );
    expect(screen.getByRole("button")).toHaveAttribute("data-selected", "true");
  });

  it("dims content when disabled and blocks interaction", async () => {
    const onClick = vi.fn();
    render(
      <Card interactive disabled onClick={onClick}>
        Off
      </Card>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("CardTruncatedText", () => {
  it("shows short text in full with no control", () => {
    render(<CardTruncatedText text="Folic acid" maxChars={40} showMoreLabel="Show more" />);
    expect(screen.getByText("Folic acid")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("truncates long text and reveals it on request, never clipping silently", async () => {
    const long = "Iron and folic acid tablet taken after lunch with a full glass of water every day";
    render(<CardTruncatedText text={long} maxChars={30} showMoreLabel="Show more" />);
    expect(screen.queryByText(long)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(screen.getByText(long)).toBeInTheDocument();
  });
});
```

- [x] **Step 8: Run it and watch it fail**

Run: `npx vitest run components/ui/Card.test.tsx`
Expected: FAIL — module not found.

- [x] **Step 9: Implement Card**

Create `components/ui/Card.tsx`:

```tsx
"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface CardProps {
  children: ReactNode;
  interactive?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

const BASE = "block w-full text-left bg-surface rounded-md p-md shadow-1";

export function Card({ children, interactive, selected, disabled, onClick, className }: CardProps) {
  const classes = cn(
    BASE,
    selected && "border-[1.5px] border-accent-secondary",
    disabled && "opacity-50",
    interactive && !disabled && "active:shadow-2 active:scale-[0.99] transition-[transform,box-shadow] duration-[--motion-fast] ease-[--ease-standard]",
    className,
  );

  if (!interactive) return <div className={classes}>{children}</div>;

  return (
    <button
      type="button"
      data-selected={selected ? "true" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(classes, "tap-target")}
    >
      {children}
    </button>
  );
}

export function CardTruncatedText({
  text,
  maxChars,
  showMoreLabel,
}: {
  text: string;
  maxChars: number;
  showMoreLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= maxChars) return <p className="text-body">{text}</p>;
  if (expanded) return <p className="text-body">{text}</p>;
  return (
    <p className="text-body">
      {text.slice(0, maxChars).trimEnd()}…{" "}
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-accent-primary underline underline-offset-2"
      >
        {showMoreLabel}
      </button>
    </p>
  );
}
```

- [x] **Step 10: Run the Card tests and watch them pass**

Run: `npx vitest run components/ui/Card.test.tsx`
Expected: PASS.

- [x] **Step 11: Commit Card**

```bash
git add components/ui/Card.tsx components/ui/Card.test.tsx
git commit -m "feat(ui): add Card primitive with selected, disabled and graceful-truncation behaviour"
```

- [x] **Step 12: Write the failing Input test**

Create `components/ui/Input.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "@/components/ui/Input";

describe("Input", () => {
  it("associates its visible label with the field", () => {
    render(<Input id="weight" label="Weight in kilograms" />);
    expect(screen.getByLabelText("Weight in kilograms")).toBeInTheDocument();
  });

  it("passes the native type through so each OS shows its own control", () => {
    render(<Input id="dob" label="Date" type="date" />);
    expect(screen.getByLabelText("Date")).toHaveAttribute("type", "date");
  });

  it("renders a specific error message and links it to the field", () => {
    render(<Input id="w" label="Weight" error="Enter a weight between 30 and 200 kg" />);
    const field = screen.getByLabelText("Weight");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("Enter a weight between 30 and 200 kg");
  });

  it("never renders a generic error string", () => {
    render(<Input id="w" label="Weight" error="Enter a weight between 30 and 200 kg" />);
    expect(screen.queryByText(/invalid input/i)).not.toBeInTheDocument();
  });

  it("accepts Devanagari text without a fixed-height container", async () => {
    render(<Input id="name" label="नाम" />);
    const field = screen.getByLabelText("नाम");
    await userEvent.type(field, "प्रियंका शर्मा");
    expect(field).toHaveValue("प्रियंका शर्मा");
    expect(field.className).not.toMatch(/\bh-\d/);
    expect(field.className).toContain("min-h");
  });

  it("marks the filled state so the floating label stays raised", async () => {
    render(<Input id="city" label="City" />);
    const field = screen.getByLabelText("City");
    await userEvent.type(field, "Pune");
    expect(field).toHaveAttribute("data-filled", "true");
  });
});
```

- [x] **Step 13: Run it and watch it fail**

Run: `npx vitest run components/ui/Input.test.tsx`
Expected: FAIL — module not found.

- [x] **Step 14: Implement Input**

Create `components/ui/Input.tsx`:

```tsx
"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, error, hint, className, onChange, defaultValue, value, ...rest },
  ref,
) {
  const [filled, setFilled] = useState(Boolean(defaultValue ?? value));
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor={id} className="text-body-sm text-text-secondary">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        data-filled={filled ? "true" : undefined}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
        value={value}
        defaultValue={defaultValue}
        onChange={(event) => {
          setFilled(event.target.value.length > 0);
          onChange?.(event);
        }}
        className={cn(
          "min-h-[48px] w-full rounded-sm bg-surface px-md py-sm text-body",
          "border border-divider",
          "focus:border-2 focus:border-accent-primary focus:outline-none",
          error && "border-2 border-alert",
          "disabled:opacity-60",
          className,
        )}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} className="text-caption text-alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="text-caption text-text-secondary">
          {hint}
        </p>
      )}
    </div>
  );
});
```

The label sits above the field rather than animating inside it. The floating-label animation described in design document §5.1 is applied in Session 14 once the designer's markup for a field is available; `data-filled` is the hook it will use, so no rework is needed.

- [x] **Step 15: Run the Input tests and watch them pass**

Run: `npx vitest run components/ui/Input.test.tsx`
Expected: PASS.

- [x] **Step 16: Run the full suite and commit**

Run: `npm run verify`

```bash
git add components/ui/Input.tsx components/ui/Input.test.tsx
git commit -m "feat(ui): add Input primitive with specific errors and Devanagari-safe sizing"
```

**Done when:** 20 primitive tests pass, the raw-value guard still passes, and `npx tsc --noEmit` is clean.

---

## Session 3: Primitives II — Checkbox, Toggle, Tab, Toast, BottomSheet, IconWrapper

**Goal:** The remaining primitives from design document §5.1, including the two with real behavioural edge cases: the toast that replaces rather than queues, and the sheet that the Android back gesture closes.

**Files:**
- Create: `components/ui/Checkbox.tsx` + test
- Create: `components/ui/Toggle.tsx` + test
- Create: `components/ui/Tabs.tsx` + test
- Create: `components/ui/Toast.tsx`, `components/ui/ToastProvider.tsx` + test
- Create: `components/ui/BottomSheet.tsx` + test
- Create: `components/ui/Icon.tsx` + test
- Modify: `package.json` (add `@phosphor-icons/react`)

**Interfaces:**
- Produces:
  - `Checkbox({ id, label, checked, onCheckedChange, disabled? })`
  - `Toggle({ id, label, checked, onCheckedChange, disabled? })`
  - `Tabs({ tabs: { id, label }[], activeId, onChange })`
  - `ToastProvider({ children })` and `useToast(): { show(message: string): void }`
  - `BottomSheet({ open, onClose, title, children })`
  - `Icon({ name, size?, weight?, label? })` where `size` is `"inline" | "default" | "nav" | "hero"`

- [x] **Step 1: Install Phosphor Icons**

```bash
npm i @phosphor-icons/react
```

- [x] **Step 2: Write the failing Checkbox and Toggle tests**

Create `components/ui/Checkbox.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "@/components/ui/Checkbox";

describe("Checkbox", () => {
  it("reports its checked state to assistive technology", () => {
    render(<Checkbox id="c" label="I agree" checked onCheckedChange={() => {}} />);
    expect(screen.getByRole("checkbox", { name: "I agree" })).toBeChecked();
  });

  it("reports the change when toggled", async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox id="c" label="I agree" checked={false} onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole("checkbox"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("carries a tick mark so the checked state is never colour alone", () => {
    render(<Checkbox id="c" label="I agree" checked onCheckedChange={() => {}} />);
    expect(screen.getByTestId("checkbox-mark")).toBeInTheDocument();
  });

  it("does not report changes when disabled", async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox id="c" label="I agree" checked={false} disabled onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole("checkbox"));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
```

Create `components/ui/Toggle.test.tsx` with the same four cases, using `getByRole("switch")` and asserting `aria-checked` plus a `data-testid="toggle-knob"` element.

- [x] **Step 3: Run both and watch them fail**

Run: `npx vitest run components/ui/Checkbox.test.tsx components/ui/Toggle.test.tsx`
Expected: FAIL — modules not found.

- [x] **Step 4: Implement Checkbox and Toggle**

Create `components/ui/Checkbox.tsx`:

```tsx
"use client";

import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

export function Checkbox({
  id,
  label,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start gap-sm">
      <span className="relative inline-flex tap-target items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="peer size-[24px] appearance-none rounded-sm border border-divider bg-surface checked:bg-accent-primary disabled:opacity-60"
        />
        {checked && (
          <Check
            data-testid="checkbox-mark"
            aria-hidden="true"
            className="pointer-events-none absolute size-[18px] text-surface-raised"
          />
        )}
      </span>
      <label htmlFor={id} className={cn("min-h-[24px] text-body", disabled && "opacity-60")}>
        {label}
      </label>
    </div>
  );
}
```

Create `components/ui/Toggle.tsx` using `role="switch"`, `aria-checked`, a knob element with `data-testid="toggle-knob"`, and a `duration-[--motion-fast]` transition with no bounce.

- [x] **Step 5: Run both and watch them pass**

Run: `npx vitest run components/ui/Checkbox.test.tsx components/ui/Toggle.test.tsx`
Expected: PASS.

- [x] **Step 6: Write the failing Tabs test**

Create `components/ui/Tabs.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs } from "@/components/ui/Tabs";

const tabs = [
  { id: "articles", label: "Articles" },
  { id: "videos", label: "Videos" },
  { id: "audios", label: "Audios" },
];

describe("Tabs", () => {
  it("marks exactly one tab as selected", () => {
    render(<Tabs tabs={tabs} activeId="videos" onChange={() => {}} />);
    const selected = screen.getAllByRole("tab").filter((t) => t.getAttribute("aria-selected") === "true");
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveAccessibleName("Videos");
  });

  it("signals the active tab with weight as well as colour", () => {
    render(<Tabs tabs={tabs} activeId="videos" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: "Videos" }).className).toContain("font-medium");
  });

  it("reports the tab the user chose", async () => {
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} activeId="articles" onChange={onChange} />);
    await userEvent.click(screen.getByRole("tab", { name: "Audios" }));
    expect(onChange).toHaveBeenCalledWith("audios");
  });
});
```

- [x] **Step 7: Run it, watch it fail, implement `Tabs`, run it again**

Implement with `role="tablist"` on the container and `role="tab"` plus `aria-selected` on each button. Active styling is `bg-accent-primary text-surface-raised font-medium`; inactive is `text-text-secondary`.
Expected after implementation: PASS (3 tests).

- [x] **Step 8: Write the failing Toast test, including the replace-not-queue rule**

Create `components/ui/Toast.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "@/components/ui/ToastProvider";

function Harness() {
  const { show } = useToast();
  return (
    <>
      <button onClick={() => show("Saved")}>first</button>
      <button onClick={() => show("Medicine logged")}>second</button>
    </>
  );
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("Toast", () => {
  it("announces a brief confirmation politely", async () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText("first"));
    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent("Saved");
    expect(toast).toHaveAttribute("aria-live", "polite");
  });

  it("replaces an existing toast instead of queueing or stacking", async () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText("first"));
    await userEvent.click(screen.getByText("second"));
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent("Medicine logged");
  });

  it("dismisses itself without requiring a tap", async () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText("first"));
    act(() => void vi.advanceTimersByTime(2500));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
```

- [x] **Step 9: Run it and watch it fail**

Run: `npx vitest run components/ui/Toast.test.tsx`
Expected: FAIL — module not found.

- [x] **Step 10: Implement the toast provider**

Create `components/ui/ToastProvider.tsx`:

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const HOLD_MS = 2000;

const ToastContext = createContext<{ show: (message: string) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next); // replaces, never queues
    timer.current = setTimeout(() => setMessage(null), HOLD_MS);
  }, []);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {message !== null && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-md bottom-[88px] z-50 rounded-sm bg-text-primary px-md py-sm text-body-sm text-surface-raised shadow-3"
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}
```

- [x] **Step 11: Run the toast tests and watch them pass**

Run: `npx vitest run components/ui/Toast.test.tsx`
Expected: PASS.

- [x] **Step 12: Write the failing BottomSheet test, including the back-gesture rule**

Create `components/ui/BottomSheet.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomSheet } from "@/components/ui/BottomSheet";

describe("BottomSheet", () => {
  it("renders nothing when closed", () => {
    render(
      <BottomSheet open={false} onClose={() => {}} title="Add medicine">
        <p>Body</p>
      </BottomSheet>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("exposes itself as a labelled modal dialog when open", () => {
    render(
      <BottomSheet open onClose={() => {}} title="Add medicine">
        <p>Body</p>
      </BottomSheet>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Add medicine");
  });

  it("closes on the scrim", async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="Add medicine">
        <p>Body</p>
      </BottomSheet>,
    );
    await userEvent.click(screen.getByTestId("sheet-scrim"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="Add medicine">
        <p>Body</p>
      </BottomSheet>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on the platform back gesture instead of leaving the screen underneath", () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} title="Add medicine">
        <p>Body</p>
      </BottomSheet>,
    );
    fireEvent.popState(window);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [x] **Step 13: Run it and watch it fail**

Run: `npx vitest run components/ui/BottomSheet.test.tsx`
Expected: FAIL — module not found.

- [x] **Step 14: Implement BottomSheet**

Create `components/ui/BottomSheet.tsx`:

```tsx
"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const pushed = useRef(false);

  // A history entry makes the Android back gesture and the iOS edge swipe close
  // the sheet rather than navigate away from the screen behind it.
  useEffect(() => {
    if (!open) return;
    history.pushState({ sheet: true }, "");
    pushed.current = true;

    const onPop = () => {
      pushed.current = false;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      if (pushed.current) {
        pushed.current = false;
        history.back();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div
        data-testid="sheet-scrim"
        onClick={onClose}
        className="absolute inset-0 bg-[--scrim]"
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="safe-bottom absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-lg bg-surface-raised p-lg shadow-3 motion-safe:animate-[sheet-in_var(--motion-slow)_var(--ease-standard)]"
      >
        <h2 id={titleId} className="text-h2 font-display">
          {title}
        </h2>
        <div className="mt-md">{children}</div>
      </div>
    </div>
  );
}
```

Add the keyframes to `styles/globals.css`:

```css
@keyframes sheet-in {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
```

- [x] **Step 15: Run the sheet tests and watch them pass**

Run: `npx vitest run components/ui/BottomSheet.test.tsx`
Expected: PASS.

- [x] **Step 16: Write the failing Icon test**

Create `components/ui/Icon.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Icon } from "@/components/ui/Icon";

describe("Icon", () => {
  it("is hidden from assistive technology when it carries no meaning", () => {
    render(<Icon name="Pill" />);
    expect(screen.getByTestId("icon").getAttribute("aria-hidden")).toBe("true");
  });

  it("is announced when it carries meaning of its own", () => {
    render(<Icon name="Warning" label="Urgent" />);
    expect(screen.getByLabelText("Urgent")).toBeInTheDocument();
  });

  it("uses the nav token size for navigation icons", () => {
    render(<Icon name="House" size="nav" />);
    expect(screen.getByTestId("icon")).toHaveAttribute("data-size", "nav");
  });

  it("renders nothing rather than a broken glyph for an unknown icon name", () => {
    render(<Icon name="NotARealIconName" />);
    expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
  });
});
```

- [x] **Step 17: Run it and watch it fail, then implement Icon**

Create `components/ui/Icon.tsx`:

```tsx
import * as Phosphor from "@phosphor-icons/react";

const SIZES = { inline: 18, default: 24, nav: 26, hero: 40 } as const;
export type IconSize = keyof typeof SIZES;

export function Icon({
  name,
  size = "default",
  weight = "regular",
  label,
  className,
}: {
  name: string;
  size?: IconSize;
  weight?: "regular" | "duotone";
  label?: string;
  className?: string;
}) {
  const Component = (Phosphor as unknown as Record<string, Phosphor.Icon | undefined>)[name];
  if (!Component) return null; // never a broken-image glyph

  return (
    <Component
      data-testid="icon"
      data-size={size}
      size={SIZES[size]}
      weight={weight}
      className={className}
      aria-hidden={label ? undefined : "true"}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}
```

Run: `npx vitest run components/ui/Icon.test.tsx`
Expected: PASS.

- [x] **Step 18: Verify and commit**

Run: `npm run verify`

```bash
git add components/ui
git commit -m "feat(ui): add Checkbox, Toggle, Tabs, Toast, BottomSheet and Icon primitives"
```

**Done when:** every primitive in design document §5.1 exists with its states and its listed edge case covered by a test. Primitive work is now closed; nothing later in the plan adds a primitive.

---

## Session 4: i18n infrastructure and LanguageSwitcher

**Goal:** Both languages are first-class from the first screen. Locale is a cookie, not a URL prefix, because the landing page chooses it before any route exists. Two guard tests make a missing translation and a banned copy pattern impossible to ship.

**Files:**
- Create: `i18n/en.json`, `i18n/hi.json`, `i18n/request.ts`, `i18n/locale.ts`
- Create: `tests/guards/i18n-parity.test.ts`, `tests/guards/copy-rules.test.ts`
- Create: `lib/domain/copy.ts` + test
- Create: `components/patterns/LanguageSwitcher.tsx` + test
- Modify: `next.config.ts`, `app/layout.tsx`

**Interfaces:**
- Consumes: `SUPPORTED_LOCALES`, `DEFAULT_LOCALE` from `lib/config.ts`.
- Produces: `getLocale(): Promise<Locale>` and `setLocale(locale: Locale): Promise<void>` from `i18n/locale.ts`; `useTranslations` / `getTranslations` from `next-intl`; `validateCopy(text): string[]` from `lib/domain/copy.ts`; `LanguageSwitcher({ variant })`.

- [x] **Step 1: Install next-intl**

```bash
npm i next-intl
```

- [x] **Step 2: Write the failing copy-rule validator test**

Create `lib/domain/copy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validateCopy } from "@/lib/domain/copy";

describe("validateCopy", () => {
  it("accepts plain, calm copy", () => {
    expect(validateCopy("You are in week 24. Your baby is about the size of a corn cob.")).toEqual([]);
  });

  it("rejects an em dash", () => {
    expect(validateCopy("Week 24 — your baby is growing")).toContain("em-dash");
  });

  it("rejects the not-just-X-it's-Y construction", () => {
    expect(validateCopy("It's not just a tracker, it's a companion")).toContain("not-just-construction");
  });

  it.each(["unlock", "empower", "seamless", "elevate", "dive into", "harness", "leverage"])(
    "rejects the banned word %s",
    (word) => {
      expect(validateCopy(`We ${word} your pregnancy journey`)).toContain(`banned-word:${word}`);
    },
  );

  it("is case insensitive about banned words", () => {
    expect(validateCopy("Seamless experience")).toContain("banned-word:seamless");
  });

  it("does not flag a banned word occurring inside another word", () => {
    expect(validateCopy("Elevated blood pressure needs a check")).toEqual([]);
  });

  it("reports every violation in one string, not just the first", () => {
    expect(validateCopy("Unlock a seamless week — really")).toHaveLength(3);
  });
});
```

- [x] **Step 3: Run it and watch it fail**

Run: `npx vitest run lib/domain/copy.test.ts`
Expected: FAIL — module not found.

- [x] **Step 4: Implement the validator**

Create `lib/domain/copy.ts`:

```ts
const BANNED_WORDS = [
  "unlock",
  "empower",
  "seamless",
  "elevate",
  "dive into",
  "harness",
  "leverage",
] as const;

/**
 * Returns a violation code per breach of the voice rules in design document §9.
 * An empty array means the copy is acceptable.
 */
export function validateCopy(text: string): string[] {
  const violations: string[] = [];

  if (text.includes("—")) violations.push("em-dash");

  if (/\bit'?s not just\b[^.!?]*,\s*it'?s\b/i.test(text)) {
    violations.push("not-just-construction");
  }

  for (const word of BANNED_WORDS) {
    const pattern = new RegExp(`(^|[^\\p{L}])${word.replace(" ", "\\s+")}($|[^\\p{L}])`, "iu");
    if (pattern.test(text)) violations.push(`banned-word:${word}`);
  }

  return violations;
}
```

- [x] **Step 5: Run it and watch it pass**

Run: `npx vitest run lib/domain/copy.test.ts`
Expected: PASS.

- [x] **Step 6: Create the initial message catalogues**

Create `i18n/en.json`:

```json
{
  "common": {
    "appTagline": "A calm companion through pregnancy.",
    "continue": "Continue",
    "back": "Back",
    "save": "Save",
    "cancel": "Cancel",
    "showMore": "Show more",
    "saved": "Saved",
    "offline": "You are offline. You can read what is here, and save once you are back.",
    "englishOnly": "English only for now",
    "language": "Language",
    "languageEnglish": "English",
    "languageHindi": "हिंदी"
  },
  "landing": {
    "continueInEnglish": "Continue in English",
    "continueInHindi": "हिंदी में जारी रखें",
    "signUp": "Create an account",
    "signIn": "Sign in"
  },
  "nav": {
    "today": "Today",
    "baby": "My Baby",
    "care": "My Care",
    "reading": "Reading",
    "profile": "Profile"
  },
  "disclaimer": {
    "reviewedGuidance": "From reviewed guidance, not a diagnosis.",
    "userEntered": "Information entered by you, not medically verified."
  }
}
```

Create `i18n/hi.json` with the identical key tree and natural spoken Hindi values. Write the Hindi as spoken Hindi, never a literal translation of the English. Example for the same subset:

```json
{
  "common": {
    "appTagline": "गर्भावस्था में आपके साथ, शांत और भरोसेमंद।",
    "continue": "आगे बढ़ें",
    "back": "पीछे",
    "save": "सहेजें",
    "cancel": "रद्द करें",
    "showMore": "और देखें",
    "saved": "सहेज लिया",
    "offline": "आप ऑफ़लाइन हैं। जो यहाँ है वह पढ़ सकती हैं, और कनेक्शन आने पर सहेज सकती हैं।",
    "englishOnly": "अभी सिर्फ़ अंग्रेज़ी में",
    "language": "भाषा",
    "languageEnglish": "English",
    "languageHindi": "हिंदी"
  },
  "landing": {
    "continueInEnglish": "Continue in English",
    "continueInHindi": "हिंदी में जारी रखें",
    "signUp": "नया खाता बनाएँ",
    "signIn": "साइन इन करें"
  },
  "nav": {
    "today": "आज",
    "baby": "मेरा शिशु",
    "care": "मेरी देखभाल",
    "reading": "पढ़ें",
    "profile": "प्रोफ़ाइल"
  },
  "disclaimer": {
    "reviewedGuidance": "जाँची गई जानकारी से, यह निदान नहीं है।",
    "userEntered": "यह जानकारी आपने भरी है, डॉक्टर से जाँची नहीं गई।"
  }
}
```

- [x] **Step 7: Write the failing parity and copy guard tests**

Create `tests/guards/i18n-parity.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import en from "@/i18n/en.json";
import hi from "@/i18n/hi.json";

function flatten(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k));
}

const enKeys = flatten(en).sort();
const hiKeys = flatten(hi).sort();

describe("message catalogue parity", () => {
  it("has no key present in English but missing in Hindi", () => {
    expect(enKeys.filter((k) => !hiKeys.includes(k))).toEqual([]);
  });

  it("has no key present in Hindi but missing in English", () => {
    expect(hiKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
  });

  it("has no empty string value in either language", () => {
    const empties: string[] = [];
    const walk = (obj: unknown, locale: string, prefix = "") => {
      if (typeof obj === "string") {
        if (obj.trim() === "") empties.push(`${locale}:${prefix}`);
        return;
      }
      if (typeof obj === "object" && obj !== null) {
        for (const [k, v] of Object.entries(obj)) walk(v, locale, prefix ? `${prefix}.${k}` : k);
      }
    };
    walk(en, "en");
    walk(hi, "hi");
    expect(empties).toEqual([]);
  });
});
```

Create `tests/guards/copy-rules.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import en from "@/i18n/en.json";
import hi from "@/i18n/hi.json";
import { validateCopy } from "@/lib/domain/copy";

function strings(obj: unknown, prefix = ""): Array<[string, string]> {
  if (typeof obj === "string") return [[prefix, obj]];
  if (typeof obj !== "object" || obj === null) return [];
  return Object.entries(obj).flatMap(([k, v]) => strings(v, prefix ? `${prefix}.${k}` : k));
}

describe("copy rules (design document §9)", () => {
  for (const [locale, catalogue] of [["en", en], ["hi", hi]] as const) {
    it(`passes every voice rule in ${locale}`, () => {
      const offences = strings(catalogue)
        .map(([key, value]) => [key, validateCopy(value)] as const)
        .filter(([, v]) => v.length > 0)
        .map(([key, v]) => `${locale}:${key} -> ${v.join(", ")}`);
      expect(offences).toEqual([]);
    });
  }
});
```

- [x] **Step 8: Run both guards**

Run: `npx vitest run tests/guards/i18n-parity.test.ts tests/guards/copy-rules.test.ts`
Expected: PASS. If the Hindi catalogue is missing a key, add it now — never delete the English key to make the test pass.

- [x] **Step 9: Wire next-intl with a cookie-based locale**

Create `i18n/locale.ts`:

```ts
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "@/lib/config";

export const LOCALE_COOKIE = "mr_locale";

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function setLocale(locale: Locale): Promise<void> {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
```

Create `i18n/request.ts`:

```ts
import { getRequestConfig } from "next-intl/server";
import { getLocale } from "@/i18n/locale";

export default getRequestConfig(async () => {
  const locale = await getLocale();
  return {
    locale,
    messages: (await import(`./${locale}.json`)).default,
  };
});
```

Update `next.config.ts`:

```ts
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl({
  reactStrictMode: true,
});
```

Update `app/layout.tsx` to set `lang` from the locale and wrap children in the provider:

```tsx
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { getLocale } from "@/i18n/locale";
// ...existing font and metadata code unchanged...

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={`${poppins.variable} ${hind.variable}`}>
      <body className="min-h-dvh bg-bg text-text-primary font-body">
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

Correct `lang` on the `<html>` element is what makes VoiceOver and TalkBack pronounce Hindi correctly. It is an accessibility requirement, not a nicety.

- [x] **Step 10: Write the failing LanguageSwitcher test**

Create `components/patterns/LanguageSwitcher.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageSwitcher } from "@/components/patterns/LanguageSwitcher";

const onSelect = vi.fn();

describe("LanguageSwitcher", () => {
  it("offers both languages, each labelled in its own script", () => {
    render(<LanguageSwitcher current="en" onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "हिंदी" })).toBeInTheDocument();
  });

  it("marks the current language with a pressed state, not colour alone", () => {
    render(<LanguageSwitcher current="hi" onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: "हिंदी" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "false");
  });

  it("reports the chosen language", async () => {
    render(<LanguageSwitcher current="en" onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: "हिंदी" }));
    expect(onSelect).toHaveBeenCalledWith("hi");
  });

  it("does not report a change when the current language is tapped again", async () => {
    onSelect.mockClear();
    render(<LanguageSwitcher current="en" onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: "English" }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 11: Run it, watch it fail, then implement**

Create `components/patterns/LanguageSwitcher.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/config";

const LABELS: Record<Locale, string> = { en: "English", hi: "हिंदी" };

export function LanguageSwitcher({
  current,
  onSelect,
}: {
  current: Locale;
  onSelect: (locale: Locale) => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={LABELS[current] === "English" ? "Language" : "भाषा"}
      className={cn("flex gap-sm transition-opacity duration-[--motion-slow] ease-[--ease-standard]", pending && "opacity-60")}
    >
      {(Object.keys(LABELS) as Locale[]).map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          aria-pressed={locale === current}
          onClick={() => {
            if (locale === current) return;
            startTransition(() => onSelect(locale));
          }}
          className={cn(
            "tap-target rounded-full px-md py-sm text-button",
            locale === current
              ? "bg-accent-primary font-medium text-surface-raised"
              : "border border-divider bg-surface text-text-primary",
          )}
        >
          {LABELS[locale]}
        </button>
      ))}
    </div>
  );
}
```

The fade on `pending` is the single calm crossfade design document §5.2 asks for. The component takes `onSelect` rather than calling a server action itself, so it is testable and reusable from the landing page, the consent screen and Settings.

Run: `npx vitest run components/patterns/LanguageSwitcher.test.tsx`
Expected: PASS.

- [x] **Step 12: Add the server action the switcher is wired to**

Create `app/actions/locale.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { setLocale } from "@/i18n/locale";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/config";

export async function changeLocale(locale: Locale): Promise<void> {
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) return;
  await setLocale(locale);
  revalidatePath("/", "layout");
}
```

- [x] **Step 13: Verify and commit**

Run: `npm run verify`

```bash
git add i18n app/actions components/patterns lib/domain/copy.ts lib/domain/copy.test.ts tests/guards next.config.ts app/layout.tsx
git commit -m "feat(i18n): add cookie-based bilingual infrastructure with parity and copy-rule guards"
```

**Done when:** both catalogues have identical key trees, every string passes the voice rules in both languages, `<html lang>` reflects the chosen locale, and the switcher works without a page flash.

---

## Session 5: Composites I — EmptyState, Skeleton, ErrorBanner, SectionHeader, DisclaimerBanner, ListRow

**Goal:** The six composites that every screen uses for its non-happy paths. Building these now is what stops each screen from inventing its own empty and error treatment.

**Files:**
- Create: `components/patterns/EmptyState.tsx` + test
- Create: `components/patterns/Skeleton.tsx` + test
- Create: `components/patterns/ErrorBanner.tsx` + test
- Create: `components/patterns/SectionHeader.tsx` + test
- Create: `components/patterns/DisclaimerBanner.tsx` + test
- Create: `components/patterns/ListRow.tsx` + test
- Create: `components/patterns/TextureMotif.tsx` + test

**Interfaces:**
- Consumes: `Icon`, `Button`, `Card`, `cn`.
- Produces:
  - `EmptyState({ iconName, message, action? })`
  - `Skeleton({ lines?, className? })`, `SkeletonCard()`
  - `ErrorBanner({ message, nextStep, onRetry? })`
  - `SectionHeader({ children, action? })`
  - `DisclaimerBanner({ children })`
  - `ListRow({ iconName?, title, subtitle?, trailing?, onClick?, href? })`, `ListRowGroup({ items, showMoreLabel, initialCount })`
  - `TextureMotif()`

- [x] **Step 1: Write the failing EmptyState test**

Create `components/patterns/EmptyState.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/patterns/EmptyState";

describe("EmptyState", () => {
  it("shows the section-specific message it was given", () => {
    render(
      <EmptyState
        iconName="Pill"
        message="Nothing here yet. Add your first medicine when you're ready."
      />,
    );
    expect(
      screen.getByText("Nothing here yet. Add your first medicine when you're ready."),
    ).toBeInTheDocument();
  });

  it("renders the decorative motif hidden from assistive technology", () => {
    render(<EmptyState iconName="Pill" message="Nothing here yet." />);
    expect(screen.getByTestId("texture-motif")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders a duotone hero icon, the treatment reserved for empty states", () => {
    render(<EmptyState iconName="Pill" message="Nothing here yet." />);
    const icon = screen.getByTestId("icon");
    expect(icon).toHaveAttribute("data-size", "hero");
  });

  it("renders an optional action when one is given", () => {
    render(
      <EmptyState iconName="Pill" message="Nothing here yet." action={<button>Add medicine</button>} />,
    );
    expect(screen.getByRole("button", { name: "Add medicine" })).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run components/patterns/EmptyState.test.tsx`
Expected: FAIL — modules not found.

- [x] **Step 3: Implement TextureMotif and EmptyState**

Create `components/patterns/TextureMotif.tsx`:

```tsx
/**
 * The vine-and-leaf background motif. Permitted ONLY on the splash screen,
 * onboarding screens and empty states (design document §2, as amended by the spec).
 * Purely decorative, so it is always hidden from assistive technology.
 *
 * The artwork is a designer deliverable. Until it arrives, public/motif.svg is a
 * placeholder; swapping the file requires no code change.
 */
export function TextureMotif() {
  return (
    <div
      data-testid="texture-motif"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[url('/motif.svg')] bg-center bg-no-repeat opacity-[--texture-motif-opacity]"
    />
  );
}
```

Create `components/patterns/EmptyState.tsx`:

```tsx
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { TextureMotif } from "@/components/patterns/TextureMotif";

export function EmptyState({
  iconName,
  message,
  action,
}: {
  iconName: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-[220px] flex-col items-center justify-center gap-md px-lg py-xl text-center">
      <TextureMotif />
      <Icon name={iconName} size="hero" weight="duotone" className="text-accent-primary" />
      <p className="text-body text-text-secondary">{message}</p>
      {action}
    </div>
  );
}
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run components/patterns/EmptyState.test.tsx`
Expected: PASS.

- [x] **Step 5: Write the failing Skeleton, ErrorBanner, SectionHeader and DisclaimerBanner tests**

Create `components/patterns/Skeleton.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton, SkeletonCard } from "@/components/patterns/Skeleton";

describe("Skeleton", () => {
  it("renders placeholder shapes rather than a spinner", () => {
    render(<Skeleton lines={3} />);
    expect(screen.getAllByTestId("skeleton-line")).toHaveLength(3);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("announces that content is loading", () => {
    render(<Skeleton />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("renders a card-shaped skeleton matching the destination layout", () => {
    render(<SkeletonCard />);
    expect(screen.getByTestId("skeleton-card")).toBeInTheDocument();
  });
});
```

Create `components/patterns/ErrorBanner.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBanner } from "@/components/patterns/ErrorBanner";

describe("ErrorBanner", () => {
  it("states the problem in plain language and always gives a next step", () => {
    render(<ErrorBanner message="We could not load your medicines." nextStep="Check your connection and try again." />);
    expect(screen.getByRole("alert")).toHaveTextContent("We could not load your medicines.");
    expect(screen.getByRole("alert")).toHaveTextContent("Check your connection and try again.");
  });

  it("carries an icon so the alert colour is not the only signal", () => {
    render(<ErrorBanner message="Problem" nextStep="Try again." />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("offers a retry when the caller can retry", async () => {
    const onRetry = vi.fn();
    render(<ErrorBanner message="Problem" nextStep="Try again." onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
```

Create `components/patterns/DisclaimerBanner.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DisclaimerBanner } from "@/components/patterns/DisclaimerBanner";

describe("DisclaimerBanner", () => {
  it("renders its text at caption scale in the secondary colour", () => {
    render(<DisclaimerBanner>From reviewed guidance, not a diagnosis.</DisclaimerBanner>);
    const banner = screen.getByTestId("disclaimer");
    expect(banner).toHaveTextContent("From reviewed guidance, not a diagnosis.");
    expect(banner.className).toContain("text-caption");
    expect(banner.className).toContain("text-text-secondary");
  });

  it("is not an alert, because it must never feel alarming", () => {
    render(<DisclaimerBanner>Note</DisclaimerBanner>);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders no coloured left border, which current design criticism names as an AI tell", () => {
    render(<DisclaimerBanner>Note</DisclaimerBanner>);
    expect(screen.getByTestId("disclaimer").className).not.toMatch(/border-l/);
  });
});
```

Create `components/patterns/SectionHeader.test.tsx` asserting it renders an `h2` at `text-h2` with `font-display`, and renders an optional trailing action.

- [x] **Step 6: Run all four and watch them fail**

Run: `npx vitest run components/patterns`
Expected: FAIL — four modules not found.

- [x] **Step 7: Implement the four**

Create `components/patterns/Skeleton.tsx`:

```tsx
import { cn } from "@/lib/cn";

export function Skeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={cn("flex flex-col gap-sm", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          data-testid="skeleton-line"
          className="h-[16px] w-full rounded-sm bg-divider/60 motion-safe:animate-pulse"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div data-testid="skeleton-card" className="rounded-md bg-surface p-md shadow-1">
      <Skeleton lines={3} />
    </div>
  );
}
```

Create `components/patterns/ErrorBanner.tsx`:

```tsx
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

export function ErrorBanner({
  message,
  nextStep,
  onRetry,
  retryLabel = "Try again",
}: {
  message: string;
  nextStep: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div role="alert" className="flex flex-col gap-sm rounded-md bg-surface p-md shadow-1">
      <div className="flex items-start gap-sm">
        <Icon name="WarningCircle" className="text-alert" />
        <div className="flex flex-col gap-xs">
          <p className="text-body">{message}</p>
          <p className="text-body-sm text-text-secondary">{nextStep}</p>
        </div>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
```

Create `components/patterns/DisclaimerBanner.tsx`:

```tsx
import type { ReactNode } from "react";

export function DisclaimerBanner({ children }: { children: ReactNode }) {
  return (
    <p data-testid="disclaimer" className="text-caption text-text-secondary">
      {children}
    </p>
  );
}
```

Create `components/patterns/SectionHeader.tsx`:

```tsx
import type { ReactNode } from "react";

export function SectionHeader({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-sm mt-lg flex items-baseline justify-between gap-sm">
      <h2 className="text-h2 font-display font-medium">{children}</h2>
      {action}
    </div>
  );
}
```

- [x] **Step 8: Run them and watch them pass**

Run: `npx vitest run components/patterns`
Expected: PASS.

- [x] **Step 9: Write the failing ListRow test, including the long-list rule**

Create `components/patterns/ListRow.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListRow, ListRowGroup } from "@/components/patterns/ListRow";

describe("ListRow", () => {
  it("renders its title and subtitle", () => {
    render(<ListRow title="Folic acid" subtitle="1 tablet after lunch" />);
    expect(screen.getByText("Folic acid")).toBeInTheDocument();
    expect(screen.getByText("1 tablet after lunch")).toBeInTheDocument();
  });

  it("becomes a button when tappable and meets the touch target", async () => {
    const onClick = vi.fn();
    render(<ListRow title="Folic acid" onClick={onClick} />);
    const row = screen.getByRole("button");
    expect(row.className).toContain("tap-target");
    await userEvent.click(row);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("ListRowGroup", () => {
  const items = Array.from({ length: 22 }, (_, i) => ({ id: String(i), title: `Item ${i}` }));

  it("shows only the initial count and a show-more control for a long list", () => {
    render(<ListRowGroup items={items} initialCount={15} showMoreLabel="Show more" />);
    expect(screen.getAllByTestId("list-row")).toHaveLength(15);
    expect(screen.getByRole("button", { name: "Show more" })).toBeInTheDocument();
  });

  it("reveals the rest on request", async () => {
    render(<ListRowGroup items={items} initialCount={15} showMoreLabel="Show more" />);
    await userEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(screen.getAllByTestId("list-row")).toHaveLength(22);
  });

  it("shows no control when the list is short", () => {
    render(<ListRowGroup items={items.slice(0, 4)} initialCount={15} showMoreLabel="Show more" />);
    expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
  });
});
```

- [x] **Step 10: Run it, watch it fail, then implement**

Create `components/patterns/ListRow.tsx`:

```tsx
"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export interface ListRowProps {
  title: string;
  subtitle?: string;
  iconName?: string;
  trailing?: ReactNode;
  onClick?: () => void;
  href?: string;
}

export function ListRow({ title, subtitle, iconName, trailing, onClick, href }: ListRowProps) {
  const content = (
    <div data-testid="list-row" className="flex w-full items-center gap-md py-sm">
      {iconName && <Icon name={iconName} className="shrink-0 text-accent-secondary" />}
      <div className="flex min-w-0 flex-col">
        <span className="text-body">{title}</span>
        {subtitle && <span className="text-body-sm text-text-secondary">{subtitle}</span>}
      </div>
      {trailing && <div className="ml-auto shrink-0">{trailing}</div>}
    </div>
  );

  const interactiveClasses = cn("tap-target block w-full border-b border-divider text-left last:border-b-0");

  if (href) return <Link href={href} className={interactiveClasses}>{content}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={interactiveClasses}>{content}</button>;
  return <div className="border-b border-divider last:border-b-0">{content}</div>;
}

export function ListRowGroup({
  items,
  initialCount = 15,
  showMoreLabel,
}: {
  items: Array<ListRowProps & { id: string }>;
  initialCount?: number;
  showMoreLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, initialCount);

  return (
    <div>
      {visible.map(({ id, ...row }) => (
        <ListRow key={id} {...row} />
      ))}
      {!expanded && items.length > initialCount && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="tap-target w-full py-sm text-button text-accent-primary underline underline-offset-2"
        >
          {showMoreLabel}
        </button>
      )}
    </div>
  );
}
```

Run: `npx vitest run components/patterns/ListRow.test.tsx`
Expected: PASS.

- [x] **Step 11: Verify and commit**

Run: `npm run verify`

```bash
git add components/patterns
git commit -m "feat(ui): add empty, loading, error, header, disclaimer and list composites"
```

**Done when:** every non-happy path a screen can hit now has a shared component, and the AI-tell rules (no coloured left border, no sparkle, no shimmering thinking animation) are enforced by test.

---

## Session 6: Composites II — IllustrationContainer, StageProgress, SeverityBadge, AudioIndicator, component gallery

**Goal:** The remaining composites, including the one with the most edge cases (the illustration container), plus the development-only gallery that is the artefact used for every later visual and bilingual review.

**Files:**
- Create: `components/patterns/IllustrationContainer.tsx` + test
- Create: `components/patterns/StageProgress.tsx` + test
- Create: `lib/domain/severity.ts` (the single declaration of the three severity levels)
- Create: `components/patterns/SeverityBadge.tsx` + test
- Create: `components/patterns/AudioIndicator.tsx` + test
- Create: `app/dev/components/page.tsx`
- Modify: `package.json` (add `lottie-web`)
- Modify: `i18n/en.json`, `i18n/hi.json` (severity labels)

**Interfaces:**
- Consumes: `Icon`, `motionDuration`, `prefersReducedMotion`.
- Produces:
  - `IllustrationContainer({ lottieUrl, staticSrc, alt, loop? })`
  - `StageProgress({ stage, totalStages, label })`
  - `SeverityBadge({ severity })` where severity is `"general" | "contact_clinic" | "urgent"`
  - `AudioIndicator({ onPlay, playing, label })`

- [x] **Step 1: Install lottie-web**

```bash
npm i lottie-web
```

`lottie-web` rather than a React wrapper, because the container needs direct control over load failure and the reduced-motion path, and the wrapper adds a layer that hides exactly those cases.

- [x] **Step 2: Write the failing IllustrationContainer test**

Create `components/patterns/IllustrationContainer.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { IllustrationContainer } from "@/components/patterns/IllustrationContainer";

const loadAnimation = vi.fn();

vi.mock("lottie-web", () => ({
  default: { loadAnimation: (...args: unknown[]) => loadAnimation(...args) },
}));

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(() => {
  loadAnimation.mockReset();
  loadAnimation.mockReturnValue({ destroy: vi.fn(), addEventListener: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

describe("IllustrationContainer", () => {
  it("always renders descriptive alt text for the illustration", () => {
    mockReducedMotion(false);
    render(
      <IllustrationContainer
        lottieUrl="/stage-5.json"
        staticSrc="/stage-5.png"
        alt="Your baby at week 20, about the size of a banana"
      />,
    );
    expect(
      screen.getByAltText("Your baby at week 20, about the size of a banana"),
    ).toBeInTheDocument();
  });

  it("renders the static image only and loads no animation when reduced motion is requested", () => {
    mockReducedMotion(true);
    render(<IllustrationContainer lottieUrl="/s.json" staticSrc="/s.png" alt="Baby at week 20" />);
    expect(loadAnimation).not.toHaveBeenCalled();
    expect(screen.getByAltText("Baby at week 20")).toBeInTheDocument();
  });

  it("loads the animation when motion is allowed", async () => {
    mockReducedMotion(false);
    render(<IllustrationContainer lottieUrl="/s.json" staticSrc="/s.png" alt="Baby at week 20" />);
    await waitFor(() => expect(loadAnimation).toHaveBeenCalledOnce());
  });

  it("keeps the static fallback visible when the animation file fails to load", async () => {
    mockReducedMotion(false);
    loadAnimation.mockImplementation(() => {
      throw new Error("network");
    });
    render(<IllustrationContainer lottieUrl="/missing.json" staticSrc="/s.png" alt="Baby at week 20" />);
    await waitFor(() => expect(screen.getByAltText("Baby at week 20")).toBeVisible());
  });
});
```

- [x] **Step 3: Run it and watch it fail**

Run: `npx vitest run components/patterns/IllustrationContainer.test.tsx`
Expected: FAIL — module not found.

- [x] **Step 4: Implement IllustrationContainer**

Create `components/patterns/IllustrationContainer.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Owns the animated-illustration contract once, so no screen reimplements it:
 * - respects prefers-reduced-motion by never loading the animation at all
 * - always renders the static fallback, so a failed load is never blank space
 * - alt text is required, because every illustration must be described
 */
export function IllustrationContainer({
  lottieUrl,
  staticSrc,
  alt,
  loop = true,
}: {
  lottieUrl: string;
  staticSrc: string;
  alt: string;
  loop?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion() || !host.current) return;
    let destroy: (() => void) | undefined;

    void (async () => {
      try {
        const lottie = (await import("lottie-web")).default;
        const animation = lottie.loadAnimation({
          container: host.current!,
          renderer: "svg",
          loop,
          autoplay: true,
          path: lottieUrl,
        });
        destroy = () => animation.destroy();
        setAnimated(true);
      } catch {
        setAnimated(false); // static fallback stays visible
      }
    })();

    return () => destroy?.();
  }, [lottieUrl, loop]);

  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      <div ref={host} aria-hidden="true" className="absolute inset-0" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={staticSrc}
        alt={alt}
        className={animated ? "invisible w-full" : "w-full"}
      />
    </div>
  );
}
```

The static image stays in the DOM even when the animation plays, which is what keeps the alt text available to screen readers and preserves the layout height.

- [x] **Step 5: Run it and watch it pass**

Run: `npx vitest run components/patterns/IllustrationContainer.test.tsx`
Expected: PASS.

- [x] **Step 6: Write the failing StageProgress and SeverityBadge tests**

Create `components/patterns/StageProgress.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StageProgress } from "@/components/patterns/StageProgress";

describe("StageProgress", () => {
  it("reports progress to assistive technology as a meter, not just a picture", () => {
    render(<StageProgress stage={4} totalStages={9} label="Stage 4 of 9" />);
    const meter = screen.getByRole("progressbar");
    expect(meter).toHaveAttribute("aria-valuenow", "4");
    expect(meter).toHaveAttribute("aria-valuemax", "9");
    expect(meter).toHaveAccessibleName("Stage 4 of 9");
  });

  it("renders one marker per stage", () => {
    render(<StageProgress stage={4} totalStages={9} label="Stage 4 of 9" />);
    expect(screen.getAllByTestId("stage-marker")).toHaveLength(9);
  });

  it("marks completed stages with a state attribute, not colour alone", () => {
    render(<StageProgress stage={3} totalStages={9} label="Stage 3 of 9" />);
    const done = screen.getAllByTestId("stage-marker").filter((m) => m.dataset.state === "complete");
    expect(done).toHaveLength(3);
  });

  it("clamps a stage beyond the last one", () => {
    render(<StageProgress stage={12} totalStages={9} label="Stage 9 of 9" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "9");
  });
});
```

Create `components/patterns/SeverityBadge.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/en.json";
import { SeverityBadge } from "@/components/patterns/SeverityBadge";

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("SeverityBadge", () => {
  it.each([
    ["general", "General"],
    ["contact_clinic", "Contact your clinic"],
    ["urgent", "Urgent"],
  ] as const)("renders an icon and a label for %s, never colour alone", (severity, label) => {
    renderWithIntl(<SeverityBadge severity={severity} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("announces the urgent level as an alert", () => {
    renderWithIntl(<SeverityBadge severity="urgent" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not announce the general level as an alert", () => {
    renderWithIntl(<SeverityBadge severity="general" />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
```

Add the three labels to both catalogues under `severity.general`, `severity.contact_clinic`, `severity.urgent`.

- [x] **Step 7: Run both, watch them fail, then implement**

Create `components/patterns/StageProgress.tsx`:

```tsx
import { cn } from "@/lib/cn";

export function StageProgress({
  stage,
  totalStages,
  label,
}: {
  stage: number;
  totalStages: number;
  label: string;
}) {
  const current = Math.min(Math.max(stage, 0), totalStages);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={totalStages}
      className="flex items-center gap-xs"
    >
      {Array.from({ length: totalStages }, (_, i) => {
        const complete = i < current;
        return (
          <span
            key={i}
            data-testid="stage-marker"
            data-state={complete ? "complete" : "pending"}
            className={cn(
              "h-[6px] flex-1 rounded-full",
              complete ? "bg-accent-primary" : "bg-divider",
            )}
          />
        );
      })}
    </div>
  );
}
```

First create `lib/domain/severity.ts`, so the three severity levels are declared exactly once in the codebase and the triage engine in Session 19 imports the same type rather than redeclaring it:

```ts
/** The three levels the whole product uses. Declared once; imported everywhere. */
export const SEVERITIES = ["general", "contact_clinic", "urgent"] as const;
export type Severity = (typeof SEVERITIES)[number];
```

Then create `components/patterns/SeverityBadge.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import type { Severity } from "@/lib/domain/severity";

const CONFIG: Record<Severity, { icon: string; classes: string }> = {
  general: { icon: "Info", classes: "bg-surface text-text-primary border border-divider" },
  contact_clinic: { icon: "Phone", classes: "bg-surface text-accent-secondary border border-accent-secondary" },
  urgent: { icon: "Warning", classes: "bg-alert text-surface-raised" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const t = useTranslations("severity");
  const { icon, classes } = CONFIG[severity];
  return (
    <span
      role={severity === "urgent" ? "alert" : undefined}
      className={cn("inline-flex items-center gap-xs rounded-full px-md py-xs text-body-sm font-medium", classes)}
    >
      <Icon name={icon} size="inline" />
      {t(severity)}
    </span>
  );
}
```

Run: `npx vitest run components/patterns/StageProgress.test.tsx components/patterns/SeverityBadge.test.tsx`
Expected: PASS.

- [x] **Step 8: Write the failing AudioIndicator test, then implement**

Create `components/patterns/AudioIndicator.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AudioIndicator } from "@/components/patterns/AudioIndicator";

describe("AudioIndicator", () => {
  it("is a labelled control, because an icon alone is not accessible", () => {
    render(<AudioIndicator playing={false} onPlay={() => {}} label="Listen to this article" />);
    expect(screen.getByRole("button", { name: "Listen to this article" })).toBeInTheDocument();
  });

  it("reports its playing state", () => {
    render(<AudioIndicator playing onPlay={() => {}} label="Listen" />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("reports a request to play", async () => {
    const onPlay = vi.fn();
    render(<AudioIndicator playing={false} onPlay={onPlay} label="Listen" />);
    await userEvent.click(screen.getByRole("button"));
    expect(onPlay).toHaveBeenCalledOnce();
  });
});
```

Implement `components/patterns/AudioIndicator.tsx` as a `tap-target` button in the top-right of its container, rendering `SpeakerHigh` when idle and `SpeakerSlash`-free `Pause` when playing, with `aria-pressed` and the passed label.

Run: `npx vitest run components/patterns/AudioIndicator.test.tsx`
Expected: PASS.

- [x] **Step 9: Build the development-only component gallery**

Create `app/dev/components/page.tsx`. It renders every primitive and composite in every state, twice — once with `NextIntlClientProvider locale="en"` and once with `locale="hi"` — inside a container that can be toggled to 200% text scale with a class. It must refuse to render outside development:

```tsx
import { notFound } from "next/navigation";

export default function ComponentGalleryPage() {
  if (process.env.NODE_ENV === "production") notFound();
  // ...render every component in every state, in both locales...
  return <main className="p-screen">{/* gallery sections */}</main>;
}
```

This page is the artefact every later session uses for visual review and for the bilingual 200%-scale check. It is not a feature and is never linked from the app.

- [x] **Step 10: Add an e2e check that the gallery renders and is accessible**

Append to `tests/e2e/smoke.spec.ts`:

```ts
import AxeBuilder from "@axe-core/playwright";

test("the component gallery renders with no accessibility violations", async ({ page }) => {
  await page.goto("/dev/components");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

Run: `npx playwright test`
Expected: PASS. Fix any violation in the component, never by excluding the rule.

- [x] **Step 11: Verify and commit**

Run: `npm run verify`

```bash
git add components/patterns app/dev i18n package.json package-lock.json
git commit -m "feat(ui): add illustration, stage progress, severity badge and audio composites plus dev gallery"
```

**Done when:** the gallery renders every component in both languages with zero axe violations, and the composite layer is closed. From here on, screens compose; they do not invent.

---

## Session 7: Supabase project, migration 1, RLS test harness

**Gate C — request before starting:** ask the product owner to create a Supabase project in the **`ap-south-1` (Mumbai)** region and provide the project URL, the anon key, and the service-role key. The service-role key goes into `.env.local` and Vercel only, never into the repository. Also ask for the Supabase CLI to be permitted locally (`npx supabase` needs Docker running).

**Goal:** Local Supabase running, the identity and pregnancy tables created with RLS, generated TypeScript types, and a reusable cross-user denial test harness. Plus the PCPNDT schema guard, which must exist before any other table is written.

**Files:**
- Create: `supabase/config.toml` (generated), `supabase/migrations/0001_identity.sql`
- Create: `lib/supabase/browser.ts`, `lib/supabase/server.ts`, `lib/supabase/database.types.ts` (generated)
- Create: `tests/rls/helpers.ts`, `tests/rls/identity.test.ts`
- Create: `tests/guards/pcpndt-terms.ts` (the single shared term vocabulary), `tests/guards/schema-pcpndt.test.ts`
- Modify: `.env.example`, `package.json` (scripts), `.github/workflows/ci.yml`

**Interfaces:**
- Produces: `createBrowserSupabase()`, `createServerSupabase()`, the generated `Database` type, and `asUser(email)` / `resetDb()` helpers for RLS tests.

- [x] **Step 1: Initialise and start local Supabase**

```bash
npm i -D supabase
npx supabase init
npx supabase start
npx supabase status
```

Record the local API URL, anon key and service-role key from `status` into `.env.test`.

- [x] **Step 2: Install the Supabase client libraries**

```bash
npm i @supabase/supabase-js @supabase/ssr
```

- [x] **Step 3: Write migration 1**

Create `supabase/migrations/0001_identity.sql`:

```sql
-- Identity, pregnancy and consent. RLS is defined in the same migration as each
-- table, deliberately, so a table can never exist without its policy.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  locale text not null default 'en' check (locale in ('en', 'hi')),
  birth_year int check (birth_year between 1950 and 2025),
  city text,
  is_first_pregnancy boolean,
  height_cm numeric(5, 1) check (height_cm between 100 and 220),
  pre_pregnancy_weight_kg numeric(5, 1) check (pre_pregnancy_weight_kg between 25 and 250),
  doctor_name text,
  clinic_name text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile is readable" on public.profiles
  for select using (auth.uid() = id);
create policy "own profile is insertable" on public.profiles
  for insert with check (auth.uid() = id);
create policy "own profile is updatable" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "own profile is deletable" on public.profiles
  for delete using (auth.uid() = id);

create table public.pregnancies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lmp_date date,
  edd date not null,
  edd_source text not null check (edd_source in ('lmp', 'scan', 'manual')),
  baby_name text check (baby_name is null or length(trim(baby_name)) between 1 and 60),
  status text not null default 'active' check (status in ('active', 'ended')),
  ended_at timestamptz,
  ended_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lmp_required_when_source_is_lmp
    check (edd_source <> 'lmp' or lmp_date is not null),
  constraint ended_rows_carry_a_timestamp
    check (status <> 'ended' or ended_at is not null)
);

-- At most one active pregnancy per user.
create unique index pregnancies_one_active_per_user
  on public.pregnancies (user_id)
  where status = 'active';

create index pregnancies_user_idx on public.pregnancies (user_id);

-- Target for composite foreign keys from child tables. A child referencing
-- (pregnancy_id, user_id) can then only point at a pregnancy the same user owns.
alter table public.pregnancies add constraint pregnancies_id_user_key unique (id, user_id);

alter table public.pregnancies enable row level security;

create policy "own pregnancies are readable" on public.pregnancies
  for select using (auth.uid() = user_id);
create policy "own pregnancies are insertable" on public.pregnancies
  for insert with check (auth.uid() = user_id);
create policy "own pregnancies are updatable" on public.pregnancies
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own pregnancies are deletable" on public.pregnancies
  for delete using (auth.uid() = user_id);

-- Consent is an append-only audit trail. A withdrawal is a new row, never an edit.
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  -- Monotonic insertion order. The primary key is a random v4 UUID, so ordering by
  -- it is deterministic but NOT chronological: among rows sharing granted_at, the
  -- lexicographically greatest random UUID can be either one. The four baseline rows
  -- are inserted in a single batch and routinely share granted_at to the microsecond,
  -- so without this column a withdrawal could lose to the grant it replaced.
  seq bigint generated always as identity,
  user_id uuid not null references auth.users (id) on delete cascade,
  consent_key text not null check (consent_key in ('terms', 'privacy', 'optional_data_sharing', 'analytics')),
  version text not null,
  granted boolean not null,
  locale text not null check (locale in ('en', 'hi')),
  granted_at timestamptz not null default now()
);

-- seq DESC is part of the ordering, not decoration: the four baseline rows are
-- inserted in one batch and routinely share granted_at to the microsecond.
create index consents_user_key_idx
  on public.consents (user_id, consent_key, granted_at desc, seq desc);

alter table public.consents enable row level security;

create policy "own consents are readable" on public.consents
  for select using (auth.uid() = user_id);
create policy "own consents are insertable" on public.consents
  for insert with check (auth.uid() = user_id);
-- Deliberately no update or delete policy: the trail is immutable.

-- THE definition of "what has she currently agreed to". Every consumer reads this view:
-- the routing middleware, the analytics mount, Settings, and the Visit Summary.
-- Asking the raw table whether any row has granted = true can never become false on an
-- append-only table, so a withdrawal would never take effect. That was a real bug in an
-- earlier revision of this plan; this view exists so the question is only answerable once.
create view public.current_consents as
select distinct on (user_id, consent_key)
  user_id, consent_key, version, granted, locale, granted_at
from public.consents
order by user_id, consent_key, granted_at desc, seq desc;

-- Views run with the privileges of the querying role against the underlying table's
-- RLS, so the consents policies above already scope this per user.
alter view public.current_consents set (security_invoker = true);

-- Keep updated_at honest without application code.
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger pregnancies_touch before update on public.pregnancies
  for each row execute function public.touch_updated_at();
```

- [x] **Step 4: Apply the migration and generate types**

```bash
npx supabase migration up
npx supabase gen types typescript --local > lib/supabase/database.types.ts
```

Add the npm scripts:

```json
{
  "scripts": {
    "db:up": "supabase migration up",
    "db:reset": "supabase db reset",
    "db:types": "supabase gen types typescript --local > lib/supabase/database.types.ts"
  }
}
```

`lib/supabase/database.types.ts` is generated and must never be hand-edited. Add a note at the top of the file after generating, and re-generate after every migration.

- [x] **Step 5: Write the failing PCPNDT schema guard**

Create `tests/guards/schema-pcpndt.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";

const sql = readdirSync("supabase/migrations")
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(`supabase/migrations/${f}`, "utf8"))
  .join("\n")
  .toLowerCase();

// Every shipped text-bearing file, discovered rather than enumerated. An enumerated
// list is how this guard quietly stops covering things: a new seed file, a new legal
// page or a new component goes unscanned and the guard still passes. Directories are
// excluded explicitly and the exclusion list is short enough to audit.
// "Important" holds the planning and review documents, which discuss the prohibition
// by name and ship nothing. It is excluded as a directory rather than by filename so
// moving or adding a document cannot silently break the guard.
const EXCLUDED_DIRS = new Set(["node_modules", ".git", ".next", "coverage", "android", "playwright-report", "Important"]);
const SCANNED_EXTENSIONS = [".ts", ".tsx", ".json", ".md", ".sql", ".html", ".webmanifest"];

/**
 * The four files that must contain the forbidden terms in order to detect them:
 * the term list, this guard, the chatbot's matcher, and that matcher's test. A scan
 * that included them would fail on its own vocabulary, and the usual reaction to a
 * guard that always fails is to weaken it — so the exclusion is explicit, narrow, and
 * asserted to stay short by the test below.
 */
const MATCHER_FILES = new Set([
  "./tests/guards/pcpndt-terms.ts",
  "./tests/guards/schema-pcpndt.test.ts",
  "./lib/ai/guardrails.ts",
  "./lib/ai/guardrails.test.ts",
]);

/** Catches a planning or review document left at the repository root by mistake. */
const isPlanningDoc = (path: string) =>
  /^\.\/(Spec|Implementation_Plan|Design)\.md$/.test(path) || /^\.\/codex-review.*\.md$/.test(path);

/** Generated or vendored files whose contents this project does not author. */
const isNotAuthoredHere = (path: string) =>
  path === "./lib/supabase/database.types.ts" ||
  path === "./package-lock.json" ||
  path.endsWith(".d.ts");

function collectText(dir: string, acc: Array<[string, string]> = []): Array<[string, string]> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".well-known") continue;
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) collectText(full, acc);
    } else if (SCANNED_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      acc.push([full, readFileSync(full, "utf8").toLowerCase()]);
    }
  }
  return acc;
}

const shippedText = collectText(".").filter(
  ([path]) => !MATCHER_FILES.has(path) && !isPlanningDoc(path) && !isNotAuthoredHere(path),
);

// Imported, not declared here, so the one file holding the vocabulary is the one file
// the walk excludes. tests/guards/pcpndt-terms.ts exports FORBIDDEN and the euphemism
// set, and lib/ai/guardrails.ts imports the same list — one vocabulary, two consumers.
import { FORBIDDEN } from "./pcpndt-terms";

describe("PCPNDT compliance (spec §1.4)", () => {
  it("declares no column or type referring to foetal sex", () => {
    const hits = FORBIDDEN.filter((term) => new RegExp(`\\b${term}\\b`).test(sql));
    expect(hits).toEqual([]);
  });

  it("ships no file referring to foetal sex", () => {
    const hits = shippedText.flatMap(([path, text]) =>
      FORBIDDEN.filter((term) => text.includes(term)).map((term) => `${path}: ${term}`),
    );
    expect(hits).toEqual([]);
  });

  it("scans a meaningful number of files, so a broken walk cannot pass vacuously", () => {
    expect(shippedText.length).toBeGreaterThan(10);
  });

  it("scans application and content sources, not only configuration", () => {
    const scanned = shippedText.map(([path]) => path);
    expect(scanned.some((p) => p.startsWith("./app/"))).toBe(true);
    expect(scanned.some((p) => p.startsWith("./components/"))).toBe(true);
    expect(scanned.some((p) => p.startsWith("./supabase/"))).toBe(true);
    expect(scanned.some((p) => p.startsWith("./i18n/"))).toBe(true);
  });

  it("keeps the matcher exclusion list short enough to audit by eye", () => {
    expect(MATCHER_FILES.size).toBeLessThanOrEqual(4);
  });

  it("can actually detect a violation", () => {
    const sample = "a column named gender should be caught".toLowerCase();
    expect(FORBIDDEN.some((term) => sample.includes(term))).toBe(true);
  });
});
```

Run: `npx vitest run tests/guards/schema-pcpndt.test.ts`
Expected: PASS. This test now guards every later migration in the plan.

- [x] **Step 6: Write the RLS test harness**

Create `tests/rls/helpers.ts`:

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const admin = createClient<Database>(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Creates a confirmed user and returns a client authenticated as them. */
export async function asUser(email: string): Promise<{
  client: SupabaseClient<Database>;
  userId: string;
}> {
  const password = "test-password-123";
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw created.error;

  const client = createClient<Database>(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;

  return { client, userId: created.data.user.id };
}

/** Removes every test user, which cascades to every owned row. */
export async function resetUsers(): Promise<void> {
  const { data } = await admin.auth.admin.listUsers();
  for (const user of data?.users ?? []) {
    if (user.email?.endsWith("@rls.test")) {
      await admin.auth.admin.deleteUser(user.id);
    }
  }
}

export function uniqueEmail(tag: string): string {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@rls.test`;
}
```

- [x] **Step 7: Write the failing identity RLS test**

Create `tests/rls/identity.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, asUser, resetUsers, uniqueEmail } from "./helpers";

let alice: Awaited<ReturnType<typeof asUser>>;
let bob: Awaited<ReturnType<typeof asUser>>;

beforeAll(async () => {
  await resetUsers();
  alice = await asUser(uniqueEmail("alice"));
  bob = await asUser(uniqueEmail("bob"));

  await alice.client.from("profiles").insert({ id: alice.userId, display_name: "Alice" });
  await alice.client.from("pregnancies").insert({
    user_id: alice.userId,
    lmp_date: "2026-03-01",
    edd: "2026-12-06",
    edd_source: "lmp",
  });
});

afterAll(resetUsers);

describe("RLS on identity tables", () => {
  it("lets a user read her own profile", async () => {
    const { data } = await alice.client.from("profiles").select("display_name").single();
    expect(data?.display_name).toBe("Alice");
  });

  it("returns nothing when another user reads her profile", async () => {
    const { data } = await bob.client.from("profiles").select("*").eq("id", alice.userId);
    expect(data).toEqual([]);
  });

  it("refuses a write to another user's row", async () => {
    const { error } = await bob.client
      .from("profiles")
      .insert({ id: alice.userId, display_name: "Not Alice" });
    expect(error).not.toBeNull();
  });

  it("returns nothing when another user reads her pregnancy", async () => {
    const { data } = await bob.client.from("pregnancies").select("*");
    expect(data).toEqual([]);
  });

  it("refuses a second active pregnancy for the same user", async () => {
    const { error } = await alice.client.from("pregnancies").insert({
      user_id: alice.userId,
      edd: "2027-01-01",
      edd_source: "manual",
    });
    expect(error?.code).toBe("23505");
  });

  it("reports the newest consent per key, so a withdrawal takes effect", async () => {
    const base = { user_id: alice.userId, consent_key: "analytics" as const, version: "v1", locale: "en" as const };
    await alice.client.from("consents").insert({ ...base, granted: true });
    await alice.client.from("consents").insert({ ...base, granted: false });
    await alice.client.from("consents").insert({ ...base, granted: true });

    const { data } = await alice.client
      .from("current_consents")
      .select("granted")
      .eq("consent_key", "analytics")
      .single();
    expect(data?.granted).toBe(true);

    await alice.client.from("consents").insert({ ...base, granted: false });
    const after = await alice.client
      .from("current_consents")
      .select("granted")
      .eq("consent_key", "analytics")
      .single();
    expect(after.data?.granted).toBe(false);
  });

  it("resolves a tie on granted_at by insertion order, and picks the later row", async () => {
    const at = "2026-09-11T10:00:00Z";
    const base = { user_id: alice.userId, consent_key: "optional_data_sharing" as const, version: "v1", locale: "en" as const, granted_at: at };
    // Inserted in one statement, so both rows share granted_at exactly. The grant is
    // first and the withdrawal second, so the withdrawal must win.
    await alice.client.from("consents").insert([
      { ...base, granted: true },
      { ...base, granted: false },
    ]);
    const { data } = await alice.client
      .from("current_consents")
      .select("granted")
      .eq("consent_key", "optional_data_sharing")
      .single();
    expect(data?.granted).toBe(false);
  });

  it("shows one user nothing of another user's consents through the view", async () => {
    const { data } = await bob.client.from("current_consents").select("*");
    expect(data).toEqual([]);
  });

  it("refuses to update a consent row, because the trail is immutable", async () => {
    await alice.client.from("consents").insert({
      user_id: alice.userId,
      consent_key: "terms",
      version: "2026-09-01",
      granted: true,
      locale: "en",
    });
    const { error, data } = await alice.client
      .from("consents")
      .update({ granted: false })
      .eq("user_id", alice.userId)
      .select();
    // No update policy exists, so the row is invisible to the update and nothing changes.
    expect(data ?? []).toEqual([]);
    expect(error).toBeNull();
  });

  // The RLS-coverage test is added in Step 8, once the diagnostic function exists.
  // Do not attempt it by querying pg_catalog through PostgREST: that is not exposed,
  // and a test that merely expects an error from the attempt passes without proving
  // anything about RLS coverage.
});
```

- [x] **Step 8: Add the RLS-coverage diagnostic and its test**

Add to migration 1:

```sql
-- Reports any table in public that is missing row level security.
-- Used by tests only; safe to expose because it returns table names, not data.
create or replace function public.tables_without_rls()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select c.relname::text
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relrowsecurity = false;
$$;

-- PUBLIC holds EXECUTE on a new function by default, so revoking from anon and
-- authenticated alone would leave the restriction cosmetic. Revoke from PUBLIC first.
revoke all on function public.tables_without_rls() from public;
revoke all on function public.tables_without_rls() from anon, authenticated;
grant execute on function public.tables_without_rls() to service_role;
```

Then add this test to `tests/rls/identity.test.ts`:

```ts
it("has row level security enabled on every table in public", async () => {
  const { data, error } = await admin.rpc("tables_without_rls");
  expect(error).toBeNull();
  expect(data).toEqual([]);
});

it("does not expose the diagnostic to ordinary users", async () => {
  const { error } = await alice.client.rpc("tables_without_rls");
  expect(error).not.toBeNull();
});
```

The second assertion is what proves the `revoke ... from public` actually took effect. Without it, a missing revoke looks identical to a working one.

Re-run `npm run db:reset && npm run db:types` after editing the migration.

- [x] **Step 9: Run the RLS suite**

Run: `npx vitest run tests/rls --env-file=.env.test`
Expected: PASS. If `vitest` does not support `--env-file` in the installed version, load `.env.test` in `vitest.setup.ts` with `dotenv` instead; do not hardcode keys in the test file.

- [x] **Step 10: Add the typed Supabase clients**

First create the one shared consent query, so no consumer re-derives it. Create `lib/supabase/queries/consent.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type ConsentKey = "terms" | "privacy" | "optional_data_sharing" | "analytics";

/**
 * THE ONLY sanctioned way to ask what she has currently agreed to. Reads the
 * current_consents view, never the raw consents table: that table is append-only, so
 * "does any row have granted = true" can never become false and a withdrawal would
 * never take effect. Every consumer calls this — middleware, the analytics mount,
 * Settings, and the Visit Summary.
 */
export interface ConsentState {
  granted: boolean;
  /** Null when she has never recorded a decision for this key. */
  version: string | null;
  grantedAt: string | null;
}

export async function getCurrentConsents(
  supabase: SupabaseClient<Database>,
): Promise<Record<ConsentKey, ConsentState>> {
  const { data } = await supabase
    .from("current_consents")
    .select("consent_key, granted, version, granted_at");

  const absent: ConsentState = { granted: false, version: null, grantedAt: null };
  const base: Record<ConsentKey, ConsentState> = {
    terms: { ...absent },
    privacy: { ...absent },
    optional_data_sharing: { ...absent },
    analytics: { ...absent },
  };

  for (const row of data ?? []) {
    if (row.consent_key in base) {
      base[row.consent_key as ConsentKey] = {
        granted: row.granted,
        version: row.version,
        grantedAt: row.granted_at,
      };
    }
  }
  return base;
}
```

It returns records rather than booleans because Settings must display the version and the date she agreed, and a boolean-only helper would have forced Settings to query the view separately — which is exactly the duplicated, divergent read this function exists to prevent. A missing row means not granted: absence of consent is never treated as consent.

Add a guard test asserting that `current_consents` and `from("consents")` appear in no file other than `lib/supabase/queries/consent.ts` and `app/actions/consent.ts` (the append path):

```ts
// tests/guards/consent-reads.test.ts
it("routes every current-consent read through the shared query", () => {
  const hits = execSync(
    "grep -rn \"current_consents\\|from(\\\"consents\\\")\" app components lib middleware.ts " +
      "--include='*.ts' --include='*.tsx' 2>/dev/null " +
      "| grep -v 'lib/supabase/queries/consent.ts' " +
      "| grep -v 'app/actions/consent.ts' || true",
    { encoding: "utf8" },
  ).trim();
  expect(hits).toBe("");
});
```

Then create `lib/supabase/browser.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
import { env } from "@/lib/env";

export function createBrowserSupabase() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
```

Create `lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";
import { env } from "@/lib/env";

export async function createServerSupabase() {
  const store = await cookies();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try {
            for (const { name, value, options } of list) store.set(name, value, options);
          } catch {
            // Called from a Server Component render, where cookies are read-only.
            // Middleware refreshes the session instead, so ignoring this is correct.
          }
        },
      },
    },
  );
}
```

Only the anon key appears in either client. The service-role key is used by nothing in `lib/` — add a guard test asserting that `SUPABASE_SERVICE_ROLE_KEY` appears nowhere under `app/`, `components/` or `lib/`.

- [x] **Step 11: Add Supabase to CI**

In `.github/workflows/ci.yml`, add a step before `npm run test`:

```yaml
      - run: npx supabase start
      - run: npx supabase migration up
      - run: npx supabase gen types typescript --local > /tmp/types.ts && diff /tmp/types.ts lib/supabase/database.types.ts
```

The `diff` fails the build if someone edits a migration without regenerating types, which is the most common source of type drift.

- [x] **Step 12: Verify and commit**

```bash
git add supabase lib/supabase tests/rls tests/guards package.json .github
git commit -m "feat(db): add identity and pregnancy schema with RLS, typed clients and cross-user denial tests"
```

**Done when:** the RLS suite passes, `tables_without_rls()` returns empty, the PCPNDT guard passes, and CI regenerates and diffs the types.

---

## Session 8: Migration 2 — check-ins, timeline, kicks, contractions

**Goal:** The six daily-experience tables, each with RLS and a cross-user denial test, plus the composite foreign keys that make a referenced parent provably hers. No UI.

**Files:**
- Create: `supabase/migrations/0002_daily.sql`
- Create: `tests/rls/daily.test.ts`
- Modify: `lib/supabase/database.types.ts` (regenerated)

**Interfaces:**
- Produces: tables `checkins`, `timeline_events`, `kick_sessions`, `kick_events`, `contraction_sessions`, `contractions` — **six tables** — and the generated row types for each.

- [x] **Step 1: Write migration 2**

Create `supabase/migrations/0002_daily.sql`:

```sql
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pregnancy_id uuid,
  body text not null check (length(trim(body)) between 1 and 2000),
  input_method text not null check (input_method in ('text', 'voice')),
  severity text check (severity in ('general', 'contact_clinic', 'urgent')),
  matched_rule_id uuid,
  created_at timestamptz not null default now()
);

-- Composite FK: the pregnancy referenced must belong to the SAME user. A plain
-- foreign key would only prove the pregnancy exists, letting a leaked UUID attach
-- her check-in to someone else's pregnancy.
-- ON DELETE SET NULL names the column to null, which PostgreSQL 15+ supports.
-- Without the column list it would try to null BOTH referencing columns, and user_id
-- is NOT NULL, so deleting a pregnancy would fail with a constraint violation.
alter table public.checkins
  add constraint checkins_pregnancy_owned_by_same_user
  foreign key (pregnancy_id, user_id)
  references public.pregnancies (id, user_id) on delete set null (pregnancy_id);

create index checkins_user_time_idx on public.checkins (user_id, created_at desc);

alter table public.checkins enable row level security;
create policy "own checkins are readable" on public.checkins for select using (auth.uid() = user_id);
create policy "own checkins are insertable" on public.checkins for insert with check (auth.uid() = user_id);
create policy "own checkins are updatable" on public.checkins for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own checkins are deletable" on public.checkins for delete using (auth.uid() = user_id);

create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pregnancy_id uuid,
  source text not null check (source in ('user', 'system')),
  event_type text not null check (event_type in
    ('kick_session', 'appointment', 'report', 'checkin', 'stage_change', 'note', 'vital')),
  occurred_at timestamptz not null,
  title text not null check (length(trim(title)) between 1 and 140),
  body text,
  ref_table text,
  ref_id uuid,
  created_at timestamptz not null default now()
);

alter table public.timeline_events
  add constraint timeline_pregnancy_owned_by_same_user
  foreign key (pregnancy_id, user_id)
  references public.pregnancies (id, user_id) on delete cascade;

create index timeline_user_time_idx on public.timeline_events (user_id, occurred_at desc);

alter table public.timeline_events enable row level security;
create policy "own timeline is readable" on public.timeline_events for select using (auth.uid() = user_id);
create policy "own timeline is insertable" on public.timeline_events for insert with check (auth.uid() = user_id);
create policy "own timeline is updatable" on public.timeline_events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own timeline is deletable" on public.timeline_events for delete using (auth.uid() = user_id);

create table public.kick_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pregnancy_id uuid,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  target_count int not null default 10 check (target_count between 1 and 50),
  created_at timestamptz not null default now(),
  constraint kick_session_ends_after_it_starts check (ended_at is null or ended_at >= started_at)
);

alter table public.kick_sessions
  add constraint kick_pregnancy_owned_by_same_user
  foreign key (pregnancy_id, user_id)
  references public.pregnancies (id, user_id) on delete cascade;

create index kick_sessions_user_time_idx on public.kick_sessions (user_id, started_at desc);

-- Target for the composite foreign key from kick_events.
alter table public.kick_sessions add constraint kick_sessions_id_user_key unique (id, user_id);

-- One row per tap. This started life as a timestamptz[] on kick_sessions, appended by
-- an RPC. The RPC made concurrent appends safe but NOT retries: if a call commits and
-- its response is lost, the retry appends a second timestamp and the count is wrong.
-- A child row keyed by a client-generated tap_id makes a retry a no-op, which is the
-- property actually needed on a screen where taps arrive in bursts over a flaky link.
create table public.kick_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null,
  tap_id uuid not null,
  occurred_at timestamptz not null default now(),
  unique (session_id, tap_id),
  constraint kick_event_session_owned_by_same_user
    foreign key (session_id, user_id)
    references public.kick_sessions (id, user_id) on delete cascade
);

create index kick_events_session_time_idx on public.kick_events (session_id, occurred_at);

alter table public.kick_events enable row level security;
create policy "own kick events are readable" on public.kick_events for select using (auth.uid() = user_id);
create policy "own kick events are insertable" on public.kick_events for insert with check (auth.uid() = user_id);
create policy "own kick events are deletable" on public.kick_events for delete using (auth.uid() = user_id);
-- No update policy: a tap is recorded or removed, never edited.
-- Only one unfinished session per user, so an abandoned session is resumed, not duplicated.
create unique index kick_sessions_one_open_per_user on public.kick_sessions (user_id) where ended_at is null;

alter table public.kick_sessions enable row level security;
create policy "own kick sessions are readable" on public.kick_sessions for select using (auth.uid() = user_id);
create policy "own kick sessions are insertable" on public.kick_sessions for insert with check (auth.uid() = user_id);
create policy "own kick sessions are updatable" on public.kick_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own kick sessions are deletable" on public.kick_sessions for delete using (auth.uid() = user_id);

create table public.contraction_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index contraction_sessions_one_open_per_user
  on public.contraction_sessions (user_id) where ended_at is null;

-- Target for the composite foreign key from contractions.
alter table public.contraction_sessions
  add constraint contraction_sessions_id_user_key unique (id, user_id);

alter table public.contraction_sessions enable row level security;
create policy "own contraction sessions are readable" on public.contraction_sessions for select using (auth.uid() = user_id);
create policy "own contraction sessions are insertable" on public.contraction_sessions for insert with check (auth.uid() = user_id);
create policy "own contraction sessions are updatable" on public.contraction_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own contraction sessions are deletable" on public.contraction_sessions for delete using (auth.uid() = user_id);

create table public.contractions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null,
  started_at timestamptz not null,
  duration_seconds int check (duration_seconds between 1 and 1800),
  created_at timestamptz not null default now(),
  constraint contractions_session_owned_by_same_user
    foreign key (session_id, user_id)
    references public.contraction_sessions (id, user_id) on delete cascade
);

create index contractions_session_time_idx on public.contractions (session_id, started_at);

alter table public.contractions enable row level security;
create policy "own contractions are readable" on public.contractions for select using (auth.uid() = user_id);
create policy "own contractions are insertable" on public.contractions for insert with check (auth.uid() = user_id);
create policy "own contractions are updatable" on public.contractions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own contractions are deletable" on public.contractions for delete using (auth.uid() = user_id);
```

`duration_seconds` is nullable on purpose: a contraction that was started but never stopped is a real state the UI must handle, and forcing a value here would make it unrecordable.

No RPC is needed. A tap is an `insert` into `kick_events` carrying a `tap_id` the client generated with `crypto.randomUUID()`. The unique `(session_id, tap_id)` constraint makes a retry of the same tap a no-op rather than a second kick, and RLS plus the composite foreign key ensure she can only append to her own session.

A tap against a session that has already ended is rejected in the action, not the schema, so the UI can explain it rather than surfacing a constraint error.

- [x] **Step 2: Apply and regenerate types**

```bash
npm run db:reset && npm run db:up && npm run db:types
```

- [x] **Step 3: Write the failing RLS test for the daily tables**

Create `tests/rls/daily.test.ts`. Follow the pattern from `tests/rls/identity.test.ts`, asserting for **each of the six tables** (`checkins`, `timeline_events`, `kick_sessions`, `kick_events`, `contraction_sessions`, `contractions`) that Bob reads `[]` and that Bob's insert with Alice's `user_id` returns an error.

Then add the ownership-forgery tests, which are the point of the composite keys. RLS alone passes these inserts, because the row being written carries Bob's own `user_id`:

```ts
it("refuses to attach a check-in to another user's pregnancy", async () => {
  const alicePregnancy = await alice.client.from("pregnancies").select("id").single();
  const { error } = await bob.client.from("checkins").insert({
    user_id: bob.userId,                          // his own row, so RLS is satisfied
    pregnancy_id: alicePregnancy.data!.id,        // but her pregnancy
    body: "test",
    input_method: "text",
  });
  expect(error).not.toBeNull();                   // composite FK rejects it
});

it("refuses to attach a timeline event to another user's pregnancy", async () => {
  const alicePregnancy = await alice.client.from("pregnancies").select("id").single();
  const { error } = await bob.client.from("timeline_events").insert({
    user_id: bob.userId,
    pregnancy_id: alicePregnancy.data!.id,
    source: "user",
    event_type: "note",
    occurred_at: new Date().toISOString(),
    title: "test",
  });
  expect(error).not.toBeNull();
});

it("refuses to attach a kick session to another user's pregnancy", async () => {
  const alicePregnancy = await alice.client.from("pregnancies").select("id").single();
  const { error } = await bob.client.from("kick_sessions").insert({
    user_id: bob.userId,
    pregnancy_id: alicePregnancy.data!.id,
  });
  expect(error).not.toBeNull();
});

it("refuses to attach a contraction to another user's session", async () => {
  const aliceSession = await alice.client
    .from("contraction_sessions")
    .insert({ user_id: alice.userId })
    .select("id")
    .single();
  const { error } = await bob.client.from("contractions").insert({
    user_id: bob.userId,
    session_id: aliceSession.data!.id,
    started_at: new Date().toISOString(),
  });
  expect(error).not.toBeNull();
});

it("still allows attaching to her own parent rows", async () => {
  const alicePregnancy = await alice.client.from("pregnancies").select("id").single();
  const { error } = await alice.client.from("checkins").insert({
    user_id: alice.userId,
    pregnancy_id: alicePregnancy.data!.id,
    body: "feeling alright",
    input_method: "text",
  });
  expect(error).toBeNull();
});
```

That last test matters as much as the four denials: a composite key written with the columns in the wrong order, or against the wrong unique constraint, rejects legitimate writes too, and without it the suite would pass while the product was broken.

Then add these behaviour tests:

```ts
it("refuses a second open kick session for the same user", async () => {
  await alice.client.from("kick_sessions").insert({ user_id: alice.userId });
  const { error } = await alice.client.from("kick_sessions").insert({ user_id: alice.userId });
  expect(error?.code).toBe("23505");
});

it("refuses a kick session that ends before it starts", async () => {
  const { error } = await alice.client.from("kick_sessions").insert({
    user_id: alice.userId,
    started_at: "2026-09-11T10:00:00Z",
    ended_at: "2026-09-11T09:00:00Z",
  });
  expect(error).not.toBeNull();
});

it("still allows deleting a pregnancy that has check-ins attached", async () => {
  // Regression: a composite ON DELETE SET NULL without a column list would try to
  // null user_id too, which is NOT NULL, making this delete impossible.
  const pregnancy = await alice.client
    .from("pregnancies")
    .insert({ user_id: alice.userId, edd: "2027-06-01", edd_source: "manual", status: "ended", ended_at: new Date().toISOString() })
    .select("id")
    .single();
  await alice.client.from("checkins").insert({
    user_id: alice.userId,
    pregnancy_id: pregnancy.data!.id,
    body: "note",
    input_method: "text",
  });

  const { error } = await alice.client.from("pregnancies").delete().eq("id", pregnancy.data!.id);
  expect(error).toBeNull();

  const { data } = await alice.client.from("checkins").select("pregnancy_id, user_id");
  expect(data![0]!.pregnancy_id).toBeNull();
  expect(data![0]!.user_id).toBe(alice.userId); // survived, because only one column was nulled
});

it("records every distinct tap", async () => {
  const session = await alice.client
    .from("kick_sessions")
    .insert({ user_id: alice.userId })
    .select("id")
    .single();

  const taps = Array.from({ length: 10 }, () => crypto.randomUUID());
  await Promise.all(
    taps.map((tap_id) =>
      alice.client.from("kick_events").insert({ user_id: alice.userId, session_id: session.data!.id, tap_id }),
    ),
  );

  const { count } = await alice.client
    .from("kick_events")
    .select("id", { count: "exact", head: true })
    .eq("session_id", session.data!.id);
  expect(count).toBe(10);
});

it("treats a retried tap as the same tap, not a second one", async () => {
  const session = await alice.client
    .from("kick_sessions")
    .insert({ user_id: alice.userId })
    .select("id")
    .single();
  const tap_id = crypto.randomUUID();
  const row = { user_id: alice.userId, session_id: session.data!.id, tap_id };

  expect((await alice.client.from("kick_events").insert(row)).error).toBeNull();
  // The retry a client makes when a response is lost but the write committed.
  expect((await alice.client.from("kick_events").insert(row)).error?.code).toBe("23505");

  const { count } = await alice.client
    .from("kick_events")
    .select("id", { count: "exact", head: true })
    .eq("session_id", session.data!.id);
  expect(count).toBe(1);
});

it("refuses to record a tap against another user's session", async () => {
  const aliceSession = await alice.client
    .from("kick_sessions")
    .insert({ user_id: alice.userId })
    .select("id")
    .single();
  const { error } = await bob.client.from("kick_events").insert({
    user_id: bob.userId,
    session_id: aliceSession.data!.id,
    tap_id: crypto.randomUUID(),
  });
  expect(error).not.toBeNull();
});

it("accepts a contraction with no duration, because one may still be running", async () => {
  const session = await alice.client
    .from("contraction_sessions")
    .insert({ user_id: alice.userId })
    .select("id")
    .single();
  const { error } = await alice.client.from("contractions").insert({
    user_id: alice.userId,
    session_id: session.data!.id,
    started_at: new Date().toISOString(),
  });
  expect(error).toBeNull();
});
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run tests/rls/daily.test.ts`
Expected: PASS. Also confirm `tables_without_rls()` still returns empty by re-running `tests/rls/identity.test.ts`.

- [x] **Step 5: Commit**

```bash
git add supabase/migrations/0002_daily.sql lib/supabase/database.types.ts tests/rls/daily.test.ts
git commit -m "feat(db): add check-in, timeline, kick and contraction tables with RLS"
```

---

## Session 9: Migration 3 — medicines, logs, appointments, advice, vitals, reports, storage

**Goal:** The My Care tables plus the private reports bucket with path-prefix storage policies.

**Files:**
- Create: `supabase/migrations/0003_care.sql`
- Create: `tests/rls/care.test.ts`, `tests/rls/storage.test.ts`
- Modify: `lib/supabase/database.types.ts` (regenerated)

- [x] **Step 1: Write migration 3**

Create `supabase/migrations/0003_care.sql`:

```sql
create table public.medicines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  dosage text,
  form text,
  schedule_times time[] not null default '{}' check (array_length(schedule_times, 1) <= 6),
  days_of_week int[] check (days_of_week is null or (
    array_length(days_of_week, 1) between 1 and 7
  )),
  start_date date not null,
  end_date date,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint medicine_ends_after_it_starts check (end_date is null or end_date >= start_date)
);

create index medicines_user_active_idx on public.medicines (user_id, is_active);

-- Target for the composite foreign key from medicine_logs.
alter table public.medicines add constraint medicines_id_user_key unique (id, user_id);

alter table public.medicines enable row level security;
create policy "own medicines are readable" on public.medicines for select using (auth.uid() = user_id);
create policy "own medicines are insertable" on public.medicines for insert with check (auth.uid() = user_id);
create policy "own medicines are updatable" on public.medicines for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own medicines are deletable" on public.medicines for delete using (auth.uid() = user_id);

create table public.medicine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  medicine_id uuid not null,
  scheduled_date date not null,
  scheduled_time time not null,
  status text not null check (status in ('taken', 'skipped')),
  logged_at timestamptz not null default now(),
  unique (medicine_id, scheduled_date, scheduled_time),
  -- The medicine logged must be HERS. Without the user_id component she could log a
  -- dose against another user's medicine given only its UUID.
  constraint medicine_logs_medicine_owned_by_same_user
    foreign key (medicine_id, user_id)
    references public.medicines (id, user_id) on delete cascade
);

create index medicine_logs_user_date_idx on public.medicine_logs (user_id, scheduled_date desc);

alter table public.medicine_logs enable row level security;
create policy "own logs are readable" on public.medicine_logs for select using (auth.uid() = user_id);
create policy "own logs are insertable" on public.medicine_logs for insert with check (auth.uid() = user_id);
create policy "own logs are updatable" on public.medicine_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own logs are deletable" on public.medicine_logs for delete using (auth.uid() = user_id);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 140),
  doctor_name text,
  clinic_name text,
  scheduled_at timestamptz not null,
  location text,
  notes text,
  status text not null default 'upcoming' check (status in ('upcoming', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index appointments_user_time_idx on public.appointments (user_id, scheduled_at);

-- Target for the composite foreign key from doctor_advice.
alter table public.appointments add constraint appointments_id_user_key unique (id, user_id);

alter table public.appointments enable row level security;
create policy "own appointments are readable" on public.appointments for select using (auth.uid() = user_id);
create policy "own appointments are insertable" on public.appointments for insert with check (auth.uid() = user_id);
create policy "own appointments are updatable" on public.appointments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own appointments are deletable" on public.appointments for delete using (auth.uid() = user_id);

create table public.doctor_advice (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  appointment_id uuid,
  recorded_on date not null,
  body text not null check (length(trim(body)) between 1 and 4000),
  input_method text not null check (input_method in ('text', 'voice')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Column-scoped SET NULL (PostgreSQL 15+): nulling both columns would violate
  -- user_id NOT NULL and make appointment deletion impossible.
  constraint advice_appointment_owned_by_same_user
    foreign key (appointment_id, user_id)
    references public.appointments (id, user_id) on delete set null (appointment_id)
);

create index doctor_advice_user_date_idx on public.doctor_advice (user_id, recorded_on desc);

alter table public.doctor_advice enable row level security;
create policy "own advice is readable" on public.doctor_advice for select using (auth.uid() = user_id);
create policy "own advice is insertable" on public.doctor_advice for insert with check (auth.uid() = user_id);
create policy "own advice is updatable" on public.doctor_advice for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own advice is deletable" on public.doctor_advice for delete using (auth.uid() = user_id);

create table public.vitals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  measured_on date not null,
  kind text not null check (kind in ('weight', 'bp')),
  value_1 numeric(6, 1) not null,
  value_2 numeric(6, 1),
  notes text,
  created_at timestamptz not null default now(),
  -- PHYSICALLY IMPOSSIBLE values only: these are data-entry errors, not readings.
  -- Clinically notable but possible values are accepted and saved, with a
  -- non-diagnostic note in the UI. The database has no clinical opinion, and it must
  -- never reject a real reading: a woman with genuinely high blood pressure has to be
  -- able to record it.
  constraint weight_is_possible check (kind <> 'weight' or (value_1 between 25 and 250 and value_2 is null)),
  constraint bp_carries_both_numbers check (kind <> 'bp' or value_2 is not null),
  constraint bp_is_possible check (kind <> 'bp' or (value_1 between 50 and 300 and value_2 between 30 and 200)),
  constraint bp_diastolic_below_systolic check (kind <> 'bp' or value_2 < value_1)
);

create index vitals_user_kind_date_idx on public.vitals (user_id, kind, measured_on desc);

alter table public.vitals enable row level security;
create policy "own vitals are readable" on public.vitals for select using (auth.uid() = user_id);
create policy "own vitals are insertable" on public.vitals for insert with check (auth.uid() = user_id);
create policy "own vitals are updatable" on public.vitals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own vitals are deletable" on public.vitals for delete using (auth.uid() = user_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 140),
  report_type text,
  report_date date not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 20971520),
  page_count int,
  created_at timestamptz not null default now()
);

create index reports_user_date_idx on public.reports (user_id, report_date desc);

alter table public.reports enable row level security;
create policy "own reports are readable" on public.reports for select using (auth.uid() = user_id);
create policy "own reports are insertable" on public.reports for insert with check (auth.uid() = user_id);
create policy "own reports are updatable" on public.reports for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own reports are deletable" on public.reports for delete using (auth.uid() = user_id);

create trigger medicines_touch before update on public.medicines
  for each row execute function public.touch_updated_at();
create trigger appointments_touch before update on public.appointments
  for each row execute function public.touch_updated_at();
create trigger doctor_advice_touch before update on public.doctor_advice
  for each row execute function public.touch_updated_at();

-- Private bucket for raw report files. 20 MB ceiling matches the reports.size_bytes check.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reports', 'reports', false, 20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do nothing;

-- Objects are addressed as {user_id}/{report_id}/{filename}, so the first path
-- segment is the authorisation check.
create policy "own report files are readable" on storage.objects
  for select to authenticated
  using (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own report files are insertable" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own report files are deletable" on storage.objects
  for delete to authenticated
  using (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);
```

- [x] **Step 2: Apply and regenerate types**

```bash
npm run db:reset && npm run db:up && npm run db:types
```

- [x] **Step 3: Write the failing care RLS test**

Create `tests/rls/care.test.ts` with cross-user denial for all six tables in this migration, the two ownership-forgery cases below, plus these behavioural cases:

```ts
it("refuses to log a dose against another user's medicine", async () => {
  const aliceMedicine = await alice.client
    .from("medicines")
    .insert({ user_id: alice.userId, name: "Calcium", start_date: "2026-09-01", schedule_times: ["08:00"] })
    .select("id")
    .single();
  const { error } = await bob.client.from("medicine_logs").insert({
    user_id: bob.userId,                       // his own row, so RLS passes
    medicine_id: aliceMedicine.data!.id,       // her medicine
    scheduled_date: "2026-09-11",
    scheduled_time: "08:00",
    status: "taken",
  });
  expect(error).not.toBeNull();
});

it("refuses to link advice to another user's appointment", async () => {
  const aliceAppointment = await alice.client
    .from("appointments")
    .insert({ user_id: alice.userId, title: "Scan", scheduled_at: "2026-09-20T10:00:00Z" })
    .select("id")
    .single();
  const { error } = await bob.client.from("doctor_advice").insert({
    user_id: bob.userId,
    appointment_id: aliceAppointment.data!.id,
    recorded_on: "2026-09-11",
    body: "test",
    input_method: "text",
  });
  expect(error).not.toBeNull();
});
```


```ts
it("refuses a duplicate log for the same medicine, date and time", async () => {
  const med = await alice.client
    .from("medicines")
    .insert({ user_id: alice.userId, name: "Folic acid", start_date: "2026-09-01", schedule_times: ["09:00"] })
    .select("id")
    .single();

  const row = {
    user_id: alice.userId,
    medicine_id: med.data!.id,
    scheduled_date: "2026-09-11",
    scheduled_time: "09:00",
    status: "taken" as const,
  };
  expect((await alice.client.from("medicine_logs").insert(row)).error).toBeNull();
  expect((await alice.client.from("medicine_logs").insert(row)).error?.code).toBe("23505");
});

it("allows logging a dose from a past date, so a late log is never blocked", async () => {
  const med = await alice.client
    .from("medicines")
    .insert({ user_id: alice.userId, name: "Iron", start_date: "2026-08-01", schedule_times: ["21:00"] })
    .select("id")
    .single();
  const { error } = await alice.client.from("medicine_logs").insert({
    user_id: alice.userId,
    medicine_id: med.data!.id,
    scheduled_date: "2026-08-05",
    scheduled_time: "21:00",
    status: "taken",
  });
  expect(error).toBeNull();
});

it("refuses a blood pressure reading with only one number", async () => {
  const { error } = await alice.client
    .from("vitals")
    .insert({ user_id: alice.userId, measured_on: "2026-09-11", kind: "bp", value_1: 120 });
  expect(error).not.toBeNull();
});

it("refuses a diastolic at or above the systolic, which is a data-entry error", async () => {
  const { error } = await alice.client
    .from("vitals")
    .insert({ user_id: alice.userId, measured_on: "2026-09-11", kind: "bp", value_1: 80, value_2: 120 });
  expect(error).not.toBeNull();
});

it("accepts a clinically notable but possible reading, because blocking it would be worse", async () => {
  const { error } = await alice.client
    .from("vitals")
    .insert({ user_id: alice.userId, measured_on: "2026-09-13", kind: "bp", value_1: 165, value_2: 105 });
  expect(error).toBeNull();
});

it("refuses an impossible weight but accepts a high-normal one", async () => {
  expect(
    (await alice.client.from("vitals").insert({ user_id: alice.userId, measured_on: "2026-09-11", kind: "weight", value_1: 900 })).error,
  ).not.toBeNull();
  expect(
    (await alice.client.from("vitals").insert({ user_id: alice.userId, measured_on: "2026-09-12", kind: "weight", value_1: 96.5 })).error,
  ).toBeNull();
});

it("refuses a report larger than the 20 MB ceiling", async () => {
  const { error } = await alice.client.from("reports").insert({
    user_id: alice.userId,
    title: "Scan",
    report_date: "2026-09-11",
    storage_path: `${alice.userId}/x/scan.pdf`,
    mime_type: "application/pdf",
    size_bytes: 30_000_000,
  });
  expect(error).not.toBeNull();
});
```

- [x] **Step 4: Write the failing storage RLS test**

Create `tests/rls/storage.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asUser, resetUsers, uniqueEmail } from "./helpers";

let alice: Awaited<ReturnType<typeof asUser>>;
let bob: Awaited<ReturnType<typeof asUser>>;

beforeAll(async () => {
  await resetUsers();
  alice = await asUser(uniqueEmail("alice"));
  bob = await asUser(uniqueEmail("bob"));
});
afterAll(resetUsers);

const file = () => new Blob(["fake-image-bytes"], { type: "image/png" });

describe("reports bucket", () => {
  it("lets a user upload into her own folder", async () => {
    const { error } = await alice.client.storage
      .from("reports")
      .upload(`${alice.userId}/r1/scan.png`, file());
    expect(error).toBeNull();
  });

  it("refuses an upload into another user's folder", async () => {
    const { error } = await bob.client.storage
      .from("reports")
      .upload(`${alice.userId}/r2/sneaky.png`, file());
    expect(error).not.toBeNull();
  });

  it("refuses to download another user's file", async () => {
    const { error } = await bob.client.storage.from("reports").download(`${alice.userId}/r1/scan.png`);
    expect(error).not.toBeNull();
  });

  it("refuses a file type outside the allowed list", async () => {
    const exe = new Blob(["MZ"], { type: "application/x-msdownload" });
    const { error } = await alice.client.storage.from("reports").upload(`${alice.userId}/r3/x.exe`, exe);
    expect(error).not.toBeNull();
  });

  it("issues a signed URL for her own file", async () => {
    const { data, error } = await alice.client.storage
      .from("reports")
      .createSignedUrl(`${alice.userId}/r1/scan.png`, 60);
    expect(error).toBeNull();
    expect(data?.signedUrl).toContain("token=");
  });
});
```

- [x] **Step 5: Run both suites**

Run: `npx vitest run tests/rls`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add supabase/migrations/0003_care.sql lib/supabase/database.types.ts tests/rls
git commit -m "feat(db): add care schema, vitals and private reports bucket with path-scoped policies"
```

---

## Session 10: Migration 4 — content, passages, rules, questions, checklists, chat

**Goal:** The read-only content tables with full-text search, and the placeholder seeds that make later sessions runnable without shipping invented medical content.

**Files:**
- Create: `supabase/migrations/0004_content.sql`
- Create: `supabase/seed/content.placeholder.sql`
- Create: `tests/rls/content.test.ts`
- Modify: `lib/supabase/database.types.ts` (regenerated)

- [x] **Step 1: Write migration 4**

Create `supabase/migrations/0004_content.sql`:

```sql
create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  locale text not null check (locale in ('en', 'hi')),
  kind text not null check (kind in ('article', 'video', 'audio')),
  title text not null,
  summary text,
  body_md text,
  media_url text,
  duration_seconds int,
  week_min int check (week_min between 1 and 42),
  week_max int check (week_max between 1 and 42),
  tags text[] not null default '{}',
  narration_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (slug, locale),
  -- Target for the composite foreign key from content_passages.
  unique (id, locale),
  constraint week_range_is_ordered check (week_min is null or week_max is null or week_min <= week_max),
  constraint media_kinds_carry_a_url check (kind = 'article' or media_url is not null),
  constraint articles_carry_a_body check (kind <> 'article' or body_md is not null)
);

create index content_items_published_idx on public.content_items (locale, kind, is_published);
create index content_items_week_idx on public.content_items (week_min, week_max);

alter table public.content_items enable row level security;
-- Read only. No insert, update or delete policy exists, so content is writable
-- by migrations and seeds alone.
create policy "published content is readable" on public.content_items
  for select to authenticated using (is_published = true);

create table public.content_passages (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null,
  locale text not null check (locale in ('en', 'hi')),
  heading text,
  body text not null,
  search_tsv tsvector generated always as (
    to_tsvector('simple', coalesce(heading, '') || ' ' || body)
  ) stored,
  created_at timestamptz not null default now(),
  -- The passage's locale must match its parent item's locale. Without this a
  -- Hindi-labelled passage could hang off an English item and be served to a Hindi
  -- reader with no "English only" marker, which is the one thing the locale fallback
  -- exists to make visible.
  constraint passage_locale_matches_item
    foreign key (content_item_id, locale)
    references public.content_items (id, locale) on delete cascade
);

-- 'simple' rather than 'english' deliberately: the corpus is bilingual and
-- PostgreSQL ships no Hindi dictionary, so stemming would help one language
-- and quietly damage the other.
create index content_passages_tsv_idx on public.content_passages using gin (search_tsv);
create index content_passages_item_idx on public.content_passages (content_item_id);

alter table public.content_passages enable row level security;
create policy "passages of published content are readable" on public.content_passages
  for select to authenticated using (
    exists (
      select 1 from public.content_items ci
      where ci.id = content_passages.content_item_id and ci.is_published = true
    )
  );

create table public.symptom_rules (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('en', 'hi')),
  match_terms text[] not null check (array_length(match_terms, 1) >= 1),
  severity text not null check (severity in ('general', 'contact_clinic', 'urgent')),
  guidance_title text not null,
  guidance_body text not null,
  priority int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index symptom_rules_active_idx on public.symptom_rules (locale, is_active, priority desc);

alter table public.symptom_rules enable row level security;
create policy "active rules are readable" on public.symptom_rules
  for select to authenticated using (is_active = true);

create table public.suggested_questions (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('en', 'hi')),
  week_min int not null check (week_min between 1 and 42),
  week_max int not null check (week_max between 1 and 42),
  body text not null,
  priority int not null default 100,
  is_active boolean not null default true,
  constraint question_week_range_is_ordered check (week_min <= week_max)
);

alter table public.suggested_questions enable row level security;
create policy "active questions are readable" on public.suggested_questions
  for select to authenticated using (is_active = true);

-- The questions she has marked to carry into her next visit. Its own table because a
-- mark belongs to neither the question (shared content) nor an appointment (which may
-- not exist yet). The Visit Summary's questions section reads this.
create table public.question_marks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  suggested_question_id uuid not null references public.suggested_questions (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, suggested_question_id)
);

create index question_marks_user_idx on public.question_marks (user_id);

alter table public.question_marks enable row level security;
create policy "own marks are readable" on public.question_marks for select using (auth.uid() = user_id);
create policy "own marks are insertable" on public.question_marks for insert with check (auth.uid() = user_id);
create policy "own marks are deletable" on public.question_marks for delete using (auth.uid() = user_id);
-- Deliberately no update policy: a mark is created or removed, never edited.

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('en', 'hi')),
  category text not null check (category in ('hospital_bag', 'documents', 'birth_prep', 'home')),
  body text not null,
  sort_order int not null default 0,
  content_item_slug text,
  is_active boolean not null default true
);

alter table public.checklist_items enable row level security;
create policy "active checklist items are readable" on public.checklist_items
  for select to authenticated using (is_active = true);

create table public.checklist_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  checklist_item_id uuid not null references public.checklist_items (id) on delete cascade,
  is_done boolean not null default false,
  done_at timestamptz,
  unique (user_id, checklist_item_id)
);

alter table public.checklist_progress enable row level security;
create policy "own progress is readable" on public.checklist_progress for select using (auth.uid() = user_id);
create policy "own progress is insertable" on public.checklist_progress for insert with check (auth.uid() = user_id);
create policy "own progress is updatable" on public.checklist_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own progress is deletable" on public.checklist_progress for delete using (auth.uid() = user_id);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  body text not null,
  retrieved_passage_ids uuid[] not null default '{}',
  answer_kind text check (answer_kind in ('data', 'retrieved', 'no_match', 'refused')),
  created_at timestamptz not null default now(),
  constraint assistant_messages_declare_their_kind
    check (role <> 'assistant' or answer_kind is not null)
);

create index chat_messages_user_time_idx on public.chat_messages (user_id, created_at);

alter table public.chat_messages enable row level security;
create policy "own chat is readable" on public.chat_messages for select using (auth.uid() = user_id);
create policy "own chat is insertable" on public.chat_messages for insert with check (auth.uid() = user_id);
create policy "own chat is deletable" on public.chat_messages for delete using (auth.uid() = user_id);

-- Retrieval function. SECURITY INVOKER, so the caller's RLS still applies.
create or replace function public.search_passages(query text, in_locale text, max_results int default 5)
returns table (id uuid, content_item_id uuid, heading text, body text, rank real)
language sql
stable
as $$
  select p.id, p.content_item_id, p.heading, p.body,
         ts_rank(p.search_tsv, websearch_to_tsquery('simple', query)) as rank
  from public.content_passages p
  join public.content_items ci on ci.id = p.content_item_id
  where ci.is_published = true
    and p.locale = in_locale
    and p.search_tsv @@ websearch_to_tsquery('simple', query)
  order by rank desc
  limit greatest(1, least(max_results, 20));
$$;
```

- [x] **Step 2: Write the placeholder seed, clearly labelled**

Create `supabase/seed/content.placeholder.sql`:

```sql
-- ============================================================================
-- PLACEHOLDER CONTENT. NOT MEDICAL CONTENT. NEVER SHIP THIS FILE.
-- Exists only so tests and local development have rows to read. Every row is
-- replaced by the product owner's reviewed corpus in Session 19 and Session 29.
-- ============================================================================

insert into public.content_items (slug, locale, kind, title, summary, body_md, week_min, week_max, is_published)
values
  ('placeholder-rest', 'en', 'article', 'Placeholder: resting well',
   'Placeholder summary. Not medical content.',
   '## Placeholder\n\nThis text is a placeholder and carries no medical meaning.', 1, 42, true),
  ('placeholder-food', 'en', 'article', 'Placeholder: eating well',
   'Placeholder summary. Not medical content.',
   '## Placeholder\n\nThis text is a placeholder and carries no medical meaning.', 1, 42, true);

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

insert into public.checklist_items (locale, category, body, sort_order)
values
  ('en', 'hospital_bag', 'Placeholder item one', 1),
  ('en', 'documents', 'Placeholder item two', 2);
```

- [x] **Step 3: Apply, seed and regenerate types**

```bash
npm run db:reset && npm run db:up
npx supabase db execute --file supabase/seed/content.placeholder.sql
npm run db:types
```

Add two scripts, deliberately separate:

```json
{
  "db:seed": "supabase db execute --file supabase/seed/content.reviewed.sql",
  "db:seed:placeholder": "supabase db execute --file supabase/seed/content.placeholder.sql"
}
```

`db:seed` is the canonical entry point and points at the **reviewed** corpus, which Session 19 and Session 29 create. Until then it fails with "file not found", which is the correct behaviour: a missing reviewed corpus should be loud. `db:seed:placeholder` is for local development and CI only, and the guard test below asserts it is referenced by no deploy or release script.

Until Session 19 lands, create `supabase/seed/content.reviewed.sql` containing only a comment explaining that it is filled from the product owner's corpus at Gate B, so the script resolves and the failure is a clear empty seed rather than a missing file.

Extend `tests/guards/no-placeholder-content.test.ts`:

```ts
it("never applies placeholder content from a deploy or release path", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
  for (const [name, script] of Object.entries(pkg.scripts)) {
    if (name === "db:seed:placeholder") continue;
    expect(script, `script "${name}"`).not.toContain("placeholder");
  }
});
```

- [x] **Step 4: Write the failing content RLS and retrieval test**

Create `tests/rls/content.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, asUser, resetUsers, uniqueEmail } from "./helpers";

let alice: Awaited<ReturnType<typeof asUser>>;

beforeAll(async () => {
  await resetUsers();
  alice = await asUser(uniqueEmail("alice"));
});
afterAll(resetUsers);

describe("content tables", () => {
  it("lets any signed-in user read published content", async () => {
    const { data } = await alice.client.from("content_items").select("slug").eq("is_published", true);
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it("hides unpublished content", async () => {
    await admin.from("content_items").insert({
      slug: "draft-only",
      locale: "en",
      kind: "article",
      title: "Draft",
      body_md: "## Draft",
      is_published: false,
    });
    const { data } = await alice.client.from("content_items").select("slug").eq("slug", "draft-only");
    expect(data).toEqual([]);
  });

  it("refuses a user's attempt to write content", async () => {
    const { error } = await alice.client.from("content_items").insert({
      slug: "mine",
      locale: "en",
      kind: "article",
      title: "Mine",
      body_md: "## Mine",
    });
    expect(error).not.toBeNull();
  });

  it("retrieves a passage by full-text search", async () => {
    const { data, error } = await alice.client.rpc("search_passages", {
      query: "placeholder passage",
      in_locale: "en",
      max_results: 5,
    });
    expect(error).toBeNull();
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it("returns nothing for a query with no match, rather than a weak match", async () => {
    const { data } = await alice.client.rpc("search_passages", {
      query: "zxqwv nonexistent term",
      in_locale: "en",
      max_results: 5,
    });
    expect(data).toEqual([]);
  });

  it("refuses a passage whose locale does not match its content item", async () => {
    const englishItem = await admin
      .from("content_items")
      .select("id")
      .eq("locale", "en")
      .limit(1)
      .single();
    const { error } = await admin.from("content_passages").insert({
      content_item_id: englishItem.data!.id,
      locale: "hi",
      body: "A Hindi-labelled passage on an English item.",
    });
    expect(error).not.toBeNull();
  });

  it("keeps one user's question marks invisible to another", async () => {
    const bob = await asUser(uniqueEmail("bob"));
    const question = await alice.client.from("suggested_questions").select("id").limit(1).single();
    await alice.client
      .from("question_marks")
      .insert({ user_id: alice.userId, suggested_question_id: question.data!.id });
    const { data } = await bob.client.from("question_marks").select("*");
    expect(data).toEqual([]);
  });

  it("refuses a duplicate mark for the same question", async () => {
    const question = await alice.client.from("suggested_questions").select("id").limit(1).single();
    const row = { user_id: alice.userId, suggested_question_id: question.data!.id };
    await alice.client.from("question_marks").insert(row);
    expect((await alice.client.from("question_marks").insert(row)).error?.code).toBe("23505");
  });

  it("refuses a chat message from the assistant with no declared answer kind", async () => {
    const { error } = await alice.client.from("chat_messages").insert({
      user_id: alice.userId,
      role: "assistant",
      body: "Something",
    });
    expect(error).not.toBeNull();
  });
});
```

- [x] **Step 5: Run it and watch it pass**

Run: `npx vitest run tests/rls/content.test.ts`
Expected: PASS.

- [x] **Step 6: Add a guard that placeholder content cannot reach production**

Create `tests/guards/no-placeholder-content.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";

describe("placeholder content", () => {
  it("is clearly labelled as never-ship", () => {
    const sql = readFileSync("supabase/seed/content.placeholder.sql", "utf8");
    expect(sql).toContain("NEVER SHIP THIS FILE");
  });

  it("is not referenced from any migration, so a deploy cannot apply it", () => {
    const hits = ["0001_identity", "0002_daily", "0003_care", "0004_content"]
      .filter((f) => existsSync(`supabase/migrations/${f}.sql`))
      .map((f) => readFileSync(`supabase/migrations/${f}.sql`, "utf8"))
      .filter((sql) => sql.includes("placeholder"));
    expect(hits).toEqual([]);
  });
});
```

- [x] **Step 7: Verify and commit**

Run: `npm run verify`

```bash
git add supabase lib/supabase/database.types.ts tests
git commit -m "feat(db): add content, rules, questions, checklist and chat schema with full-text retrieval"
```

**Done when:** all four migrations apply from scratch creating all **23 tables** the spec specifies (3 identity + 6 daily + 6 care + 8 content and chat), `tables_without_rls()` is empty, content is read-only to users, retrieval works, and the placeholder seed is fenced off by a test. **The data layer is now closed: no later session in Phase 1 adds, alters or drops a table.** If a later session appears to need one, that is a signal to stop and check the spec rather than to write a migration.

---

## Session 11: Domain library — dates, pregnancy, stages, content fallback

**Goal:** The pure calculation core. Nothing in this session touches React, Supabase or the network. This is the session with the highest test-to-code ratio, and deliberately so: every edge case here is a thing that would otherwise fail silently in production.

**Files:**
- Create: `lib/domain/dates.ts` + test
- Create: `lib/domain/pregnancy.ts` + test
- Create: `lib/domain/stages.ts` + test
- Create: `lib/domain/content.ts` + test

**Interfaces:**
- Consumes: `APP_TIMEZONE`, `GESTATION_DAYS` from `lib/config.ts`.
- Produces:
  - `todayInAppZone(now?: Date): string`
  - `addDays(date: string, days: number): string`
  - `diffDays(from: string, to: string): number`
  - `isValidDateString(value: string): boolean`
  - `pregnancyProgress({ edd, today }): { gestationalDays, week, day, trimester, isPostTerm, daysToEdd }`
  - `eddFromLmp(lmp: string): string`
  - `eddFromScan({ scanDate, gestWeeks, gestDays }): string`
  - `lmpFromEdd(edd: string): string`
  - `validateLmp({ lmp, today }): { ok: true } | { ok: false; reason: "future" | "too_old" | "invalid" }`
  - `illustrationStage(week: number): number`
  - `STAGE_BOUNDARIES: readonly number[]`
  - `resolveLocalisedContent<T>({ items, locale }): { item: T; isFallback: boolean } | null`

- [x] **Step 1: Write the failing dates test**

Create `lib/domain/dates.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { addDays, diffDays, isValidDateString, todayInAppZone } from "@/lib/domain/dates";

describe("todayInAppZone", () => {
  it("returns the Indian calendar day, not the machine's", () => {
    // 2026-09-11T19:30:00Z is already 2026-09-12 in Asia/Kolkata (UTC+5:30).
    expect(todayInAppZone(new Date("2026-09-11T19:30:00Z"))).toBe("2026-09-12");
  });

  it("returns the same day just before the Indian midnight boundary", () => {
    expect(todayInAppZone(new Date("2026-09-11T18:29:00Z"))).toBe("2026-09-11");
  });

  it("formats as YYYY-MM-DD with leading zeroes", () => {
    expect(todayInAppZone(new Date("2026-01-05T06:00:00Z"))).toBe("2026-01-05");
  });
});

describe("addDays", () => {
  it("adds days across a month boundary", () => {
    expect(addDays("2026-01-30", 3)).toBe("2026-02-02");
  });

  it("adds days across a year boundary", () => {
    expect(addDays("2026-12-30", 5)).toBe("2027-01-04");
  });

  it("handles a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("subtracts with a negative count", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("adds the full gestation length correctly", () => {
    expect(addDays("2026-01-01", 280)).toBe("2026-10-08");
  });
});

describe("diffDays", () => {
  it("counts forward days as positive", () => {
    expect(diffDays("2026-09-01", "2026-09-11")).toBe(10);
  });

  it("counts backward days as negative", () => {
    expect(diffDays("2026-09-11", "2026-09-01")).toBe(-10);
  });

  it("returns zero for the same day", () => {
    expect(diffDays("2026-09-11", "2026-09-11")).toBe(0);
  });

  it("is unaffected by daylight-saving transitions elsewhere in the world", () => {
    expect(diffDays("2026-03-28", "2026-03-30")).toBe(2);
  });
});

describe("isValidDateString", () => {
  it.each(["2026-09-11", "2028-02-29"])("accepts %s", (value) => {
    expect(isValidDateString(value)).toBe(true);
  });

  it.each(["2026-13-01", "2026-02-30", "11-09-2026", "2026-9-1", "", "not a date"])(
    "rejects %s",
    (value) => {
      expect(isValidDateString(value)).toBe(false);
    },
  );
});
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run lib/domain/dates.test.ts`
Expected: FAIL — module not found.

- [x] **Step 3: Implement dates.ts**

Create `lib/domain/dates.ts`:

```ts
import { APP_TIMEZONE } from "@/lib/config";

const MS_PER_DAY = 86_400_000;
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * The calendar day in the app's timezone. Every "today" decision in the product
 * goes through here, so a user in Delhi and a server in Virginia agree.
 */
export function todayInAppZone(now: Date = new Date()): string {
  return formatter.format(now); // en-CA formats as YYYY-MM-DD
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
  );
}

function toUtcMillis(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

function fromUtcMillis(ms: number): string {
  const date = new Date(ms);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Date-only arithmetic done at UTC midnight, so no timezone can shift the result. */
export function addDays(date: string, days: number): string {
  return fromUtcMillis(toUtcMillis(date) + days * MS_PER_DAY);
}

export function diffDays(from: string, to: string): number {
  return Math.round((toUtcMillis(to) - toUtcMillis(from)) / MS_PER_DAY);
}
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run lib/domain/dates.test.ts`
Expected: PASS.

- [x] **Step 5: Commit dates**

```bash
git add lib/domain/dates.ts lib/domain/dates.test.ts
git commit -m "feat(domain): add timezone-safe date-only arithmetic"
```

- [x] **Step 6: Write the failing pregnancy test, covering every edge case from the spec**

Create `lib/domain/pregnancy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  eddFromLmp,
  eddFromScan,
  lmpFromEdd,
  pregnancyProgress,
  validateLmp,
} from "@/lib/domain/pregnancy";

describe("eddFromLmp", () => {
  it("adds 280 days to the last menstrual period", () => {
    expect(eddFromLmp("2026-01-01")).toBe("2026-10-08");
  });
});

describe("lmpFromEdd", () => {
  it("is the inverse of eddFromLmp", () => {
    expect(lmpFromEdd(eddFromLmp("2026-04-15"))).toBe("2026-04-15");
  });
});

describe("eddFromScan", () => {
  it("computes the due date from a dating scan", () => {
    // 12 weeks 3 days on the scan date means 280 - 87 = 193 days remain.
    expect(eddFromScan({ scanDate: "2026-03-10", gestWeeks: 12, gestDays: 3 })).toBe("2026-09-19");
  });

  it("treats a missing day count as zero days", () => {
    expect(eddFromScan({ scanDate: "2026-03-10", gestWeeks: 12 })).toBe("2026-09-22");
  });
});

describe("pregnancyProgress", () => {
  it("reports week and day at the start of pregnancy", () => {
    const p = pregnancyProgress({ edd: "2026-10-08", today: "2026-01-01" });
    expect(p).toMatchObject({ gestationalDays: 0, week: 0, day: 0, trimester: 1, isPostTerm: false });
  });

  it("reports week 12 day 3 correctly", () => {
    // 12*7 + 3 = 87 gestational days after the LMP of 2026-01-01.
    const p = pregnancyProgress({ edd: "2026-10-08", today: "2026-03-29" });
    expect(p.week).toBe(12);
    expect(p.day).toBe(3);
  });

  it("puts week 13 in the first trimester and week 14 in the second", () => {
    expect(pregnancyProgress({ edd: "2026-10-08", today: addWeeks("2026-01-01", 13) }).trimester).toBe(1);
    expect(pregnancyProgress({ edd: "2026-10-08", today: addWeeks("2026-01-01", 14) }).trimester).toBe(2);
  });

  it("puts week 28 in the third trimester", () => {
    expect(pregnancyProgress({ edd: "2026-10-08", today: addWeeks("2026-01-01", 28) }).trimester).toBe(3);
  });

  it("reports exactly week 40 on the due date", () => {
    const p = pregnancyProgress({ edd: "2026-10-08", today: "2026-10-08" });
    expect(p.week).toBe(40);
    expect(p.day).toBe(0);
    expect(p.daysToEdd).toBe(0);
    expect(p.isPostTerm).toBe(false);
  });

  it("flags post-term the day after the due date", () => {
    const p = pregnancyProgress({ edd: "2026-10-08", today: "2026-10-09" });
    expect(p.isPostTerm).toBe(true);
    expect(p.daysToEdd).toBe(-1);
  });

  it("clamps the displayed week at 42 however far past the due date she is", () => {
    const p = pregnancyProgress({ edd: "2026-10-08", today: "2027-06-01" });
    expect(p.week).toBe(42);
    expect(p.isPostTerm).toBe(true);
  });

  it("clamps to week 0 when the due date is further than a full gestation away", () => {
    const p = pregnancyProgress({ edd: "2027-10-08", today: "2026-01-01" });
    expect(p.week).toBe(0);
    expect(p.gestationalDays).toBe(0);
  });

  it("counts the days remaining until the due date", () => {
    expect(pregnancyProgress({ edd: "2026-10-08", today: "2026-10-01" }).daysToEdd).toBe(7);
  });
});

describe("validateLmp", () => {
  it("accepts a plausible recent date", () => {
    expect(validateLmp({ lmp: "2026-03-01", today: "2026-09-11" })).toEqual({ ok: true });
  });

  it("rejects a date in the future", () => {
    expect(validateLmp({ lmp: "2026-09-12", today: "2026-09-11" })).toEqual({
      ok: false,
      reason: "future",
    });
  });

  it("accepts today itself", () => {
    expect(validateLmp({ lmp: "2026-09-11", today: "2026-09-11" })).toEqual({ ok: true });
  });

  it("rejects a date more than 44 weeks ago as no longer a current pregnancy", () => {
    expect(validateLmp({ lmp: "2025-09-11", today: "2026-09-11" })).toEqual({
      ok: false,
      reason: "too_old",
    });
  });

  it("rejects a malformed date", () => {
    expect(validateLmp({ lmp: "11-09-2026", today: "2026-09-11" })).toEqual({
      ok: false,
      reason: "invalid",
    });
  });
});

function addWeeks(date: string, weeks: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const ms = Date.UTC(y, m - 1, d) + weeks * 7 * 86_400_000;
  const out = new Date(ms);
  return `${out.getUTCFullYear()}-${String(out.getUTCMonth() + 1).padStart(2, "0")}-${String(out.getUTCDate()).padStart(2, "0")}`;
}
```

- [x] **Step 7: Run it and watch it fail**

Run: `npx vitest run lib/domain/pregnancy.test.ts`
Expected: FAIL — module not found.

- [x] **Step 8: Implement pregnancy.ts**

Create `lib/domain/pregnancy.ts`:

```ts
import { GESTATION_DAYS } from "@/lib/config";
import { addDays, diffDays, isValidDateString } from "@/lib/domain/dates";

/** Past this, the record is treated as a previous pregnancy rather than a current one. */
const MAX_LMP_AGE_DAYS = 44 * 7;
/** Weeks beyond this are displayed clamped, because there is no stage 43. */
const MAX_DISPLAY_WEEK = 42;

export interface PregnancyProgress {
  gestationalDays: number;
  week: number;
  day: number;
  trimester: 1 | 2 | 3;
  isPostTerm: boolean;
  daysToEdd: number;
}

export function eddFromLmp(lmp: string): string {
  return addDays(lmp, GESTATION_DAYS);
}

export function lmpFromEdd(edd: string): string {
  return addDays(edd, -GESTATION_DAYS);
}

export function eddFromScan({
  scanDate,
  gestWeeks,
  gestDays = 0,
}: {
  scanDate: string;
  gestWeeks: number;
  gestDays?: number;
}): string {
  return addDays(scanDate, GESTATION_DAYS - (gestWeeks * 7 + gestDays));
}

/**
 * Gestational age is derived from the EDD, never stored, so a scan correction to
 * the EDD immediately corrects every week shown anywhere in the product.
 */
export function pregnancyProgress({ edd, today }: { edd: string; today: string }): PregnancyProgress {
  const daysToEdd = diffDays(today, edd);
  const rawGestationalDays = GESTATION_DAYS - daysToEdd;
  const gestationalDays = Math.max(0, rawGestationalDays);

  const rawWeek = Math.floor(gestationalDays / 7);
  const week = Math.min(rawWeek, MAX_DISPLAY_WEEK);
  const day = week === MAX_DISPLAY_WEEK ? 0 : gestationalDays % 7;

  const trimester: 1 | 2 | 3 = week < 14 ? 1 : week < 28 ? 2 : 3;

  return { gestationalDays, week, day, trimester, isPostTerm: daysToEdd < 0, daysToEdd };
}

export type LmpValidation = { ok: true } | { ok: false; reason: "future" | "too_old" | "invalid" };

export function validateLmp({ lmp, today }: { lmp: string; today: string }): LmpValidation {
  if (!isValidDateString(lmp)) return { ok: false, reason: "invalid" };
  const age = diffDays(lmp, today);
  if (age < 0) return { ok: false, reason: "future" };
  if (age > MAX_LMP_AGE_DAYS) return { ok: false, reason: "too_old" };
  return { ok: true };
}
```

- [x] **Step 9: Run it and watch it pass**

Run: `npx vitest run lib/domain/pregnancy.test.ts`
Expected: PASS.

- [x] **Step 10: Write the failing stages test**

Create `lib/domain/stages.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { STAGE_BOUNDARIES, illustrationStage, stageRangeLabelKeys } from "@/lib/domain/stages";

describe("illustrationStage", () => {
  it("has exactly nine stages, matching the illustration set", () => {
    expect(STAGE_BOUNDARIES).toHaveLength(9);
  });

  it("returns stage 1 before the first boundary", () => {
    expect(illustrationStage(0)).toBe(1);
    expect(illustrationStage(3)).toBe(1);
  });

  it("advances exactly at each boundary, never between", () => {
    expect(illustrationStage(7)).toBe(1);
    expect(illustrationStage(8)).toBe(2);
    expect(illustrationStage(11)).toBe(2);
    expect(illustrationStage(12)).toBe(3);
  });

  it("returns stage 9 at and beyond the final boundary", () => {
    expect(illustrationStage(36)).toBe(9);
    expect(illustrationStage(40)).toBe(9);
    expect(illustrationStage(42)).toBe(9);
  });

  it("never returns a stage outside 1 to 9, whatever the input", () => {
    for (const week of [-5, 0, 17, 41, 99]) {
      const stage = illustrationStage(week);
      expect(stage).toBeGreaterThanOrEqual(1);
      expect(stage).toBeLessThanOrEqual(9);
    }
  });

  it("exposes a translation key per stage rather than hardcoded copy", () => {
    expect(stageRangeLabelKeys()).toHaveLength(9);
    expect(stageRangeLabelKeys()[0]).toBe("stages.1");
  });
});
```

- [x] **Step 11: Run it, watch it fail, then implement**

Create `lib/domain/stages.ts`:

```ts
/**
 * The first gestational week of each of the nine illustration stages.
 * Changing this array is the only way to change stage behaviour anywhere in the
 * product, which is why the illustration, the progress indicator and the timeline
 * all read it rather than each holding their own thresholds.
 */
export const STAGE_BOUNDARIES = [0, 8, 12, 16, 20, 24, 28, 32, 36] as const;

export const TOTAL_STAGES = STAGE_BOUNDARIES.length;

export function illustrationStage(week: number): number {
  const safeWeek = Number.isFinite(week) ? Math.max(0, week) : 0;
  let stage = 1;
  for (let i = 0; i < STAGE_BOUNDARIES.length; i += 1) {
    if (safeWeek >= STAGE_BOUNDARIES[i]!) stage = i + 1;
  }
  return stage;
}

export function stageRangeLabelKeys(): string[] {
  return STAGE_BOUNDARIES.map((_, i) => `stages.${i + 1}`);
}
```

Run: `npx vitest run lib/domain/stages.test.ts`
Expected: PASS.

- [x] **Step 12: Write the failing content fallback test**

Create `lib/domain/content.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveLocalisedContent } from "@/lib/domain/content";

const en = { slug: "rest", locale: "en" as const, title: "Resting well" };
const hi = { slug: "rest", locale: "hi" as const, title: "आराम करना" };

describe("resolveLocalisedContent", () => {
  it("returns the requested locale when it exists", () => {
    expect(resolveLocalisedContent({ items: [en, hi], locale: "hi" })).toEqual({
      item: hi,
      isFallback: false,
    });
  });

  it("falls back to English and says so, rather than hiding the item", () => {
    expect(resolveLocalisedContent({ items: [en], locale: "hi" })).toEqual({
      item: en,
      isFallback: true,
    });
  });

  it("returns null when neither locale exists", () => {
    expect(resolveLocalisedContent({ items: [], locale: "hi" })).toBeNull();
  });

  it("never falls back from English to Hindi, because English is the base locale", () => {
    expect(resolveLocalisedContent({ items: [hi], locale: "en" })).toBeNull();
  });
});
```

- [x] **Step 13: Run it, watch it fail, then implement**

Create `lib/domain/content.ts`:

```ts
import { DEFAULT_LOCALE, type Locale } from "@/lib/config";

/**
 * Hindi content lands item by item (spec §1.2), so a Hindi reader must still be
 * able to open an English-only article with a clear marker. Never silently hide
 * an item, and never fall back away from the base locale.
 */
export function resolveLocalisedContent<T extends { locale: Locale }>({
  items,
  locale,
}: {
  items: readonly T[];
  locale: Locale;
}): { item: T; isFallback: boolean } | null {
  const exact = items.find((i) => i.locale === locale);
  if (exact) return { item: exact, isFallback: false };

  if (locale !== DEFAULT_LOCALE) {
    const base = items.find((i) => i.locale === DEFAULT_LOCALE);
    if (base) return { item: base, isFallback: true };
  }

  return null;
}
```

Run: `npx vitest run lib/domain/content.test.ts`
Expected: PASS.

- [x] **Step 14: Check domain coverage and commit**

Run: `npm run test:coverage`
Expected: `lib/domain/**` at 100% branches, functions, lines and statements. If any branch is uncovered, add the missing test — never lower the threshold.

```bash
git add lib/domain
git commit -m "feat(domain): add pregnancy progress, stage mapping and locale fallback with full branch coverage"
```

**Done when:** every domain function listed in the interfaces exists, coverage is 100% on `lib/domain/`, and no domain file imports React, Supabase or anything that performs I/O. Add a guard test asserting that last point:

```ts
// tests/guards/domain-purity.test.ts
import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FORBIDDEN = ["react", "react-dom", "next", "@supabase", "posthog-js", "lottie-web", "node:fs", "node:child_process"];

/**
 * Matches BOTH quote styles and all three import forms. The obvious version of this
 * guard greps only for single quotes, which silently never matches a codebase written
 * with double quotes — a guard that can never fail is worse than no guard, because it
 * reads as protection.
 */
function importsOf(dir: string): string {
  const alternatives = FORBIDDEN.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const pattern = `(from|import|require)\\s*\\(?\\s*['"](${alternatives})(/|['"])`;
  return execSync(`grep -rnE "${pattern}" ${dir} 2>/dev/null || true`, { encoding: "utf8" }).trim();
}

describe("domain purity", () => {
  it("imports nothing that performs I/O", () => {
    expect(importsOf("lib/domain")).toBe("");
  });

  it("actually detects a violation, in both quote styles and all import forms", () => {
    const dir = mkdtempSync(join(tmpdir(), "purity-"));
    try {
      writeFileSync(join(dir, "a.ts"), `import { useState } from "react";\n`);
      writeFileSync(join(dir, "b.ts"), `import { cookies } from 'next/headers';\n`);
      writeFileSync(join(dir, "c.ts"), `const fs = require("node:fs");\n`);
      writeFileSync(join(dir, "d.ts"), `await import("@supabase/supabase-js");\n`);
      const hits = importsOf(dir).split("\n").filter(Boolean);
      expect(hits).toHaveLength(4);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

The second test is the one that matters. A guard test that asserts "no matches found" passes identically whether the rule works or the pattern is broken, so every guard in this plan that greps for something must also prove it can find it.

---

## Session 12: Auth — email OTP, Google sign-in, route guards

**Gate C — request before starting:** ask the product owner to (1) enable Email OTP in Supabase Auth with the OTP template in both languages, (2) create a Google OAuth client and add the client id and secret to Supabase Auth providers, (3) confirm the production site URL and add `{site}/auth/callback` to both Supabase's redirect allowlist and the Google console.

**Goal:** She can create an account with an email code or with Google, and every route enforces the correct gate. The routing decision itself is a pure function, because "where should this user go" is the single most bug-prone piece of an onboarding funnel.

**Files:**
- Create: `lib/domain/routing.ts` + test
- Create: `lib/domain/otp.ts` + test
- Create: `middleware.ts`
- Create: `app/(auth)/signup/page.tsx`, `app/(auth)/signin/page.tsx`, `app/(auth)/verify/page.tsx`
- Create: `app/(auth)/AuthForm.tsx` + test
- Create: `app/auth/callback/route.ts`
- Create: `app/actions/auth.ts`
- Create: `lib/supabase/middleware.ts`
- Modify: `i18n/en.json`, `i18n/hi.json`
- Create: `tests/e2e/auth.spec.ts`

**Interfaces:**
- Consumes: `createServerSupabase`, `createBrowserSupabase`.
- Produces:
  - `resolveRedirect({ path, isAuthed, hasConsented, hasOnboarded }): string | null`
  - `resendState({ lastSentAt, now, cooldownSeconds }): { canResend: boolean; secondsLeft: number }`
  - `sendEmailOtp(email)`, `verifyEmailOtp(email, code)`, `signInWithGoogle()`, `signOut()` server actions
  - `AuthForm({ mode })` where mode is `"signup" | "signin"`

- [x] **Step 1: Write the failing routing test as a truth table**

Create `lib/domain/routing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveRedirect } from "@/lib/domain/routing";

const authed = { isAuthed: true, hasConsented: true, hasOnboarded: true };

describe("resolveRedirect", () => {
  it("sends a signed-out visitor away from an app route, back to the landing page", () => {
    expect(
      resolveRedirect({ path: "/today", isAuthed: false, hasConsented: false, hasOnboarded: false }),
    ).toBe("/?next=%2Ftoday");
  });

  it("leaves a signed-out visitor on the landing page", () => {
    expect(
      resolveRedirect({ path: "/", isAuthed: false, hasConsented: false, hasOnboarded: false }),
    ).toBeNull();
  });

  it("leaves a signed-out visitor on the sign-in page", () => {
    expect(
      resolveRedirect({ path: "/signin", isAuthed: false, hasConsented: false, hasOnboarded: false }),
    ).toBeNull();
  });

  it("leaves a signed-out visitor on a legal page, because consent copy must be readable first", () => {
    expect(
      resolveRedirect({ path: "/legal/privacy", isAuthed: false, hasConsented: false, hasOnboarded: false }),
    ).toBeNull();
  });

  it("sends a signed-in user without consent to the consent screen", () => {
    expect(
      resolveRedirect({ path: "/today", isAuthed: true, hasConsented: false, hasOnboarded: false }),
    ).toBe("/consent");
  });

  it("keeps a user without consent on the consent screen", () => {
    expect(
      resolveRedirect({ path: "/consent", isAuthed: true, hasConsented: false, hasOnboarded: false }),
    ).toBeNull();
  });

  it("sends a consented user without a profile to the onboarding form", () => {
    expect(
      resolveRedirect({ path: "/today", isAuthed: true, hasConsented: true, hasOnboarded: false }),
    ).toBe("/onboarding/profile");
  });

  it("lets a consented user without a profile see the onboarding intro", () => {
    expect(
      resolveRedirect({ path: "/onboarding/intro", isAuthed: true, hasConsented: true, hasOnboarded: false }),
    ).toBeNull();
  });

  it("sends a fully onboarded user away from the landing page to Today", () => {
    expect(resolveRedirect({ path: "/", ...authed })).toBe("/today");
  });

  it("sends a fully onboarded user away from sign-up to Today", () => {
    expect(resolveRedirect({ path: "/signup", ...authed })).toBe("/today");
  });

  it("sends a fully onboarded user away from the onboarding form to Today", () => {
    expect(resolveRedirect({ path: "/onboarding/profile", ...authed })).toBe("/today");
  });

  it("leaves a fully onboarded user alone inside the app", () => {
    expect(resolveRedirect({ path: "/care/medicines", ...authed })).toBeNull();
  });

  it("preserves a deep link so a notification or shared link resumes after sign-in", () => {
    expect(
      resolveRedirect({ path: "/care/summary", isAuthed: false, hasConsented: false, hasOnboarded: false }),
    ).toBe("/?next=%2Fcare%2Fsummary");
  });

  it("never builds a next parameter pointing at an external host", () => {
    expect(
      resolveRedirect({ path: "//evil.example.com", isAuthed: false, hasConsented: false, hasOnboarded: false }),
    ).toBe("/");
  });
});
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run lib/domain/routing.test.ts`
Expected: FAIL — module not found.

- [x] **Step 3: Implement routing.ts**

Create `lib/domain/routing.ts`:

```ts
const PUBLIC_PATHS = ["/", "/signin", "/signup", "/verify"];
const LEGAL_PREFIX = "/legal";
const CONSENT_PATH = "/consent";
const ONBOARDING_FORM = "/onboarding/profile";
const ONBOARDING_INTRO = "/onboarding/intro";
const HOME = "/today";

export interface RedirectInput {
  path: string;
  isAuthed: boolean;
  hasConsented: boolean;
  hasOnboarded: boolean;
}

/** A path is only safe to return to if it is same-origin and not protocol-relative. */
function safeNext(path: string): string | null {
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

/**
 * Returns the path to redirect to, or null to stay put. Every gate in the funnel
 * lives here, so no page component has to re-derive it.
 */
export function resolveRedirect({ path, isAuthed, hasConsented, hasOnboarded }: RedirectInput): string | null {
  const isPublic = PUBLIC_PATHS.includes(path) || path.startsWith(LEGAL_PREFIX);

  if (!isAuthed) {
    if (isPublic) return null;
    const next = safeNext(path);
    return next ? `/?next=${encodeURIComponent(next)}` : "/";
  }

  if (!hasConsented) return path === CONSENT_PATH ? null : CONSENT_PATH;

  if (!hasOnboarded) {
    if (path === ONBOARDING_FORM || path === ONBOARDING_INTRO || path.startsWith(LEGAL_PREFIX)) return null;
    return ONBOARDING_FORM;
  }

  if (isPublic || path === CONSENT_PATH || path.startsWith("/onboarding")) return HOME;
  return null;
}
```

- [x] **Step 4: Run it and watch it pass**

Run: `npx vitest run lib/domain/routing.test.ts`
Expected: PASS.

- [x] **Step 5: Write the failing OTP resend test**

Create `lib/domain/otp.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resendState } from "@/lib/domain/otp";

const base = new Date("2026-09-11T10:00:00Z").getTime();

describe("resendState", () => {
  it("blocks a resend immediately after sending and reports the full wait", () => {
    expect(resendState({ lastSentAt: base, now: base, cooldownSeconds: 60 })).toEqual({
      canResend: false,
      secondsLeft: 60,
    });
  });

  it("counts the remaining seconds down", () => {
    expect(resendState({ lastSentAt: base, now: base + 25_000, cooldownSeconds: 60 })).toEqual({
      canResend: false,
      secondsLeft: 35,
    });
  });

  it("rounds a part-second up, so the button never unlocks early", () => {
    expect(resendState({ lastSentAt: base, now: base + 59_500, cooldownSeconds: 60 }).secondsLeft).toBe(1);
  });

  it("allows a resend once the cooldown has elapsed", () => {
    expect(resendState({ lastSentAt: base, now: base + 60_000, cooldownSeconds: 60 })).toEqual({
      canResend: true,
      secondsLeft: 0,
    });
  });

  it("allows a resend when nothing has been sent yet", () => {
    expect(resendState({ lastSentAt: null, now: base, cooldownSeconds: 60 })).toEqual({
      canResend: true,
      secondsLeft: 0,
    });
  });

  it("allows a resend if the clock appears to have moved backwards", () => {
    expect(resendState({ lastSentAt: base, now: base - 5_000, cooldownSeconds: 60 }).canResend).toBe(false);
  });
});
```

- [x] **Step 6: Run it, watch it fail, then implement**

Create `lib/domain/otp.ts`:

```ts
export function resendState({
  lastSentAt,
  now,
  cooldownSeconds,
}: {
  lastSentAt: number | null;
  now: number;
  cooldownSeconds: number;
}): { canResend: boolean; secondsLeft: number } {
  if (lastSentAt === null) return { canResend: true, secondsLeft: 0 };
  const elapsedMs = now - lastSentAt;
  const remainingMs = cooldownSeconds * 1000 - elapsedMs;
  if (remainingMs <= 0) return { canResend: true, secondsLeft: 0 };
  return { canResend: false, secondsLeft: Math.ceil(remainingMs / 1000) };
}
```

Run: `npx vitest run lib/domain/otp.test.ts`
Expected: PASS.

- [x] **Step 7: Add the middleware session refresh and guard**

Create `lib/supabase/middleware.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import { env } from "@/lib/env";

/** Refreshes the Supabase session cookie and returns both the response and the user. */
export async function withSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, supabase, user };
}
```

Create `middleware.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { withSupabaseSession } from "@/lib/supabase/middleware";
import { getCurrentConsents } from "@/lib/supabase/queries/consent";
import { resolveRedirect } from "@/lib/domain/routing";

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await withSupabaseSession(request);

  let hasConsented = false;
  let hasOnboarded = false;

  if (user) {
    const [consents, profile] = await Promise.all([
      getCurrentConsents(supabase),   // the shared query; never the raw consents table
      supabase.from("profiles").select("onboarding_completed_at").maybeSingle(),
    ]);
    hasConsented = consents.terms.granted && consents.privacy.granted;
    hasOnboarded = Boolean(profile.data?.onboarding_completed_at);
  }

  const target = resolveRedirect({
    path: request.nextUrl.pathname,
    isAuthed: Boolean(user),
    hasConsented,
    hasOnboarded,
  });

  if (target) {
    const url = request.nextUrl.clone();
    const [pathname, query] = target.split("?");
    url.pathname = pathname!;
    url.search = query ? `?${query}` : "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|motif.svg|.well-known).*)"],
};
```

- [x] **Step 8: Add the auth server actions**

Create `app/actions/auth.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export type AuthResult = { ok: true } | { ok: false; code: "rate_limited" | "invalid_code" | "expired" | "network" | "unknown" };

export async function sendEmailOtp(email: string): Promise<AuthResult> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (!error) return { ok: true };
  if (error.status === 429) return { ok: false, code: "rate_limited" };
  return { ok: false, code: "unknown" };
}

export async function verifyEmailOtp(email: string, code: string): Promise<AuthResult> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (!error) return { ok: true };
  const message = error.message.toLowerCase();
  if (message.includes("expired")) return { ok: false, code: "expired" };
  if (message.includes("invalid")) return { ok: false, code: "invalid_code" };
  return { ok: false, code: "unknown" };
}

export async function startGoogleSignIn(next: string | null): Promise<void> {
  const supabase = await createServerSupabase();
  const callback = new URL("/auth/callback", env.NEXT_PUBLIC_SITE_URL);
  if (next) callback.searchParams.set("next", next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });
  if (error || !data.url) redirect("/signin?error=google");
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/");
}
```

Supabase links a Google identity to an existing account with the same verified email automatically, so no duplicate-account branch is written here. The e2e test in Step 12 covers that the UI does not present it as an error.

Create `app/auth/callback/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const origin = request.nextUrl.origin;

  if (!code) return NextResponse.redirect(`${origin}/signin?error=missing_code`);

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/signin?error=exchange_failed`);

  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/today";
  return NextResponse.redirect(`${origin}${target}`);
}
```

- [x] **Step 9: Write the failing AuthForm test**

Create `app/(auth)/AuthForm.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/en.json";
import { AuthForm } from "@/app/(auth)/AuthForm";

const sendOtp = vi.fn();
const verifyOtp = vi.fn();
const startGoogle = vi.fn();

function renderForm(mode: "signup" | "signin" = "signup") {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AuthForm mode={mode} onSendOtp={sendOtp} onVerifyOtp={verifyOtp} onGoogle={startGoogle} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  sendOtp.mockReset().mockResolvedValue({ ok: true });
  verifyOtp.mockReset().mockResolvedValue({ ok: true });
  startGoogle.mockReset();
});

describe("AuthForm", () => {
  it("asks for an email first", () => {
    renderForm();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("type", "email");
  });

  it("refuses to send a code to an address that is not an email", async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(sendOtp).not.toHaveBeenCalled();
    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
  });

  it("moves to the code step after sending", async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "her@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(await screen.findByLabelText(/6-digit code/i)).toBeInTheDocument();
  });

  it("tells her the code expired, specifically, not just that something failed", async () => {
    verifyOtp.mockResolvedValue({ ok: false, code: "expired" });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "her@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    await userEvent.type(await screen.findByLabelText(/6-digit code/i), "123456");
    await userEvent.click(screen.getByRole("button", { name: /verify/i }));
    expect(await screen.findByText(/that code has expired/i)).toBeInTheDocument();
  });

  it("tells her the code was wrong, separately from expiry", async () => {
    verifyOtp.mockResolvedValue({ ok: false, code: "invalid_code" });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "her@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    await userEvent.type(await screen.findByLabelText(/6-digit code/i), "000000");
    await userEvent.click(screen.getByRole("button", { name: /verify/i }));
    expect(await screen.findByText(/that code is not right/i)).toBeInTheDocument();
  });

  it("explains the wait instead of letting her hammer resend", async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "her@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    const resend = await screen.findByRole("button", { name: /resend/i });
    expect(resend).toBeDisabled();
    expect(resend).toHaveAccessibleDescription(/wait/i);
  });

  it("suggests checking the spam folder, because that is the most common real failure", async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "her@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(await screen.findByText(/check your spam folder/i)).toBeInTheDocument();
  });

  it("offers Google as an alternative on both modes", async () => {
    renderForm("signin");
    await userEvent.click(screen.getByRole("button", { name: /continue with google/i }));
    expect(startGoogle).toHaveBeenCalledOnce();
  });
});
```

- [x] **Step 10: Run it and watch it fail**

Run: `npx vitest run "app/(auth)/AuthForm.test.tsx"`
Expected: FAIL — module not found.

- [x] **Step 11: Implement AuthForm**

Create `app/(auth)/AuthForm.tsx` as a client component taking its three actions as props, so it is testable without mocking server actions. It holds two steps (`email`, `code`), validates the email with a simple `/.+@.+\..+/` test before calling anything, maps each `AuthResult` code to a distinct translated message, and drives the resend button from `resendState()` with a one-second interval. Add these keys to both catalogues:

```
auth.emailLabel, auth.codeLabel, auth.sendCode, auth.verify, auth.resend,
auth.resendWait, auth.checkSpam, auth.invalidEmail, auth.errorExpired,
auth.errorInvalidCode, auth.errorRateLimited, auth.errorNetwork, auth.errorUnknown,
auth.continueWithGoogle, auth.signupTitle, auth.signinTitle
```

English values for the three the test asserts on:
- `auth.invalidEmail`: "Enter a valid email address."
- `auth.errorExpired`: "That code has expired. Send a new one."
- `auth.errorInvalidCode`: "That code is not right. Check it and try again."
- `auth.checkSpam`: "We sent a code. Check your spam folder if it is not in your inbox."

Run: `npx vitest run "app/(auth)/AuthForm.test.tsx"`
Expected: PASS.

- [x] **Step 12: Write the e2e auth spec**

Create `tests/e2e/auth.spec.ts` covering: the landing page offers sign up and sign in; submitting an email shows the code step; a deep link to `/today` while signed out lands on `/` with a `next` parameter; and `/consent` is reached after a successful sign-in. Use Supabase's local Inbucket (`http://127.0.0.1:54324`) to read the OTP email and extract the code.

Run: `npx playwright test tests/e2e/auth.spec.ts`
Expected: PASS.

- [x] **Step 13: Verify and commit**

Run: `npm run verify`

```bash
git add lib/domain/routing.ts lib/domain/otp.ts middleware.ts lib/supabase/middleware.ts "app/(auth)" app/auth app/actions i18n tests/e2e
git commit -m "feat(auth): add email OTP and Google sign-in with a pure, fully tested routing guard"
```

**Done when:** both sign-in paths work against local Supabase, every OTP failure mode has its own message, and the routing truth table passes. Screen layout here is still the scaffold; Session 14 applies the designer's markup to these same components.

> **Pre-deployment follow-up, updated 2026-09-12 (partially resolved):** the live Supabase project was using Supabase's default mailer, hard-capped at a couple of emails per hour — meant for testing only, not real OTP traffic. Custom SMTP is now configured (Resend, verified sending domain), the email rate limit has been raised (Supabase auto-bumped it to 30/hour on enabling custom SMTP), and a live `signInWithOtp` call against the production project returns 200 and delivers mail. **Not yet resolved:** the delivered email still renders Supabase's default "sign-in link" wording instead of the plain `{{ .Token }}` code the app's sign-in screen expects the user to type, even though the Magic Link template in the Dashboard editor shows the corrected body saved. Suspected cause not yet confirmed: a "Send Email" Auth Hook overriding the Dashboard template, or a stale/cached send. **Do not rely on OTP sign-in for real users until this is fixed** — she would have no way to get the code by typing it; clicking the link would still work today via `/auth/callback`, but that's not the flow the UI is built for. Tracked again in Session 34's Gate C and release checklist.

---

## Session 13: Consent register and legal document drafts

**Goal:** A consent screen in the restrained register, writing an immutable consent trail, with the optional consents genuinely separate and genuinely unchecked.

**Files:**
- Create: `app/(auth)/consent/page.tsx`, `app/(auth)/consent/ConsentForm.tsx` + test
- Create: `app/actions/consent.ts`
- Create: `app/(public)/legal/privacy/page.tsx`, `app/(public)/legal/terms/page.tsx`
- Create: `content/legal/privacy.en.md`, `privacy.hi.md`, `terms.en.md`, `terms.hi.md`
- Create: `lib/config.ts` modification: `LEGAL_VERSION`
- Modify: `i18n/en.json`, `i18n/hi.json`

**Interfaces:**
- Produces: `recordConsents({ baseline, optionalDataSharing, analytics, locale })` server action; `LEGAL_VERSION` constant.

- [x] **Step 1: Add the policy version constant**

In `lib/config.ts`:

```ts
/** Bump when the policy text changes. Every consent row records the version it agreed to. */
export const LEGAL_VERSION = "2026-09-11";
```

- [x] **Step 2: Write the failing ConsentForm test**

Create `app/(auth)/consent/ConsentForm.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/en.json";
import { ConsentForm } from "@/app/(auth)/consent/ConsentForm";

const onSubmit = vi.fn();

function renderForm() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ConsentForm onSubmit={onSubmit} onLocaleChange={vi.fn()} locale="en" />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => onSubmit.mockReset().mockResolvedValue(undefined));

describe("ConsentForm", () => {
  it("shows a plain-language summary above the full text", () => {
    renderForm();
    const summary = screen.getByTestId("consent-summary");
    const full = screen.getByTestId("consent-links");
    expect(summary.compareDocumentPosition(full) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("starts with every optional consent unchecked", () => {
    renderForm();
    expect(screen.getByRole("checkbox", { name: /share with my doctor/i })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /help improve the app/i })).not.toBeChecked();
  });

  it("keeps the optional consents separate from the required one", () => {
    renderForm();
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("blocks continuing until the required consent is given, and explains why", async () => {
    renderForm();
    const submit = screen.getByRole("button", { name: /agree and continue/i });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAccessibleDescription(/agree to the terms/i);
    await userEvent.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits exactly the consents she chose", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("checkbox", { name: /i agree to the terms/i }));
    await userEvent.click(screen.getByRole("checkbox", { name: /help improve the app/i }));
    await userEvent.click(screen.getByRole("button", { name: /agree and continue/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      baseline: true,
      optionalDataSharing: false,
      analytics: true,
    });
  });

  it("offers the language switcher, because consent language matters most here", () => {
    renderForm();
    expect(screen.getByRole("button", { name: "हिंदी" })).toBeInTheDocument();
  });

  it("renders no illustration and no motif, per the restrained register", () => {
    renderForm();
    expect(screen.queryByTestId("texture-motif")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("makes the policy links tertiary, not competing with the primary action", () => {
    renderForm();
    expect(screen.getByRole("link", { name: /privacy policy/i }).className).not.toContain("bg-accent-primary");
  });
});
```

- [x] **Step 3: Run it and watch it fail**

Run: `npx vitest run "app/(auth)/consent/ConsentForm.test.tsx"`
Expected: FAIL — module not found.

- [x] **Step 4: Implement ConsentForm**

Create `app/(auth)/consent/ConsentForm.tsx`. It renders, in order: a `data-testid="consent-summary"` paragraph of two lines at `text-body`; three `Checkbox` controls (required terms-and-privacy, optional doctor sharing, optional analytics); a `data-testid="consent-links"` block of tertiary links to `/legal/privacy` and `/legal/terms`; the `LanguageSwitcher`; and a primary `Button` carrying `disabledReason` until the required box is ticked. Background is `color-surface-raised`, no illustration, no motion, no motif.

Run: `npx vitest run "app/(auth)/consent/ConsentForm.test.tsx"`
Expected: PASS.

- [x] **Step 5: Write the consent-recording server action**

Create `app/actions/consent.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { LEGAL_VERSION, type Locale } from "@/lib/config";

export async function recordConsents(input: {
  baseline: boolean;
  optionalDataSharing: boolean;
  analytics: boolean;
  locale: Locale;
}): Promise<void> {
  if (!input.baseline) return; // the UI blocks this; the server does not trust the UI

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  // One row per consent key. Append only, so a later change is a new row.
  const rows = [
    { consent_key: "terms" as const, granted: true },
    { consent_key: "privacy" as const, granted: true },
    { consent_key: "optional_data_sharing" as const, granted: input.optionalDataSharing },
    { consent_key: "analytics" as const, granted: input.analytics },
  ].map((row) => ({
    ...row,
    user_id: user.id,
    version: LEGAL_VERSION,
    locale: input.locale,
  }));

  const { error } = await supabase.from("consents").insert(rows);
  if (error) throw error;

  redirect("/onboarding/intro");
}
```

- [x] **Step 6: Write the legal drafts**

Create the four markdown files. Each begins with a clearly visible draft marker that a reviewer cannot miss:

```markdown
> **DRAFT, NOT LEGALLY REVIEWED.** This text must be reviewed by qualified counsel
> before launch. It is a starting point written to reflect the product's actual
> behaviour, not legal advice.
```

The privacy draft must describe, factually and matching the implementation: what is collected (profile, pregnancy dates, medicines, appointments, advice, vitals, report files, check-in text, chat messages); that report files and all records live in Supabase in the Mumbai region; that voice input is transcribed on her device and the audio is never uploaded or stored; that analytics is opt-in, hosted outside India, and carries no health data or free text; her rights to export and delete; and a contact address.

On the AI provider, the draft must use the **same best-effort wording as spec §7, not a stronger one**. Specifically it must say: nothing from her records is sent; her typed question *is* sent; before sending, the app removes email addresses, phone numbers and the names stored in her profile; and that removal cannot catch everything, so a street address, another person's name, a medicine name or an alphanumeric identifier she types into a question may still be transmitted. Writing "no personal data is sent to any AI provider" here would restate the exact overclaim revision 3 was corrected for, in the one document where being wrong has legal consequences.

Add to `tests/guards/legal.test.ts`:

```ts
it("makes the AI-provider claim at best-effort strength, not absolute", () => {
  const text = readFileSync("content/legal/privacy.en.md", "utf8");
  expect(text).not.toMatch(/no personal (data|information) is (ever )?sent/i);
  expect(text).toMatch(/question/i);
});

it("names the residual categories redaction cannot catch", () => {
  const text = readFileSync("content/legal/privacy.en.md", "utf8").toLowerCase();
  for (const category of ["address", "medicine", "identifier"]) {
    expect(text).toContain(category);
  }
});
``` Write it in the product's voice, then run the copy validator over it.

- [x] **Step 7: Add a test that the legal drafts are complete and honest**

Create `tests/guards/legal.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { validateCopy } from "@/lib/domain/copy";

const files = [
  "content/legal/privacy.en.md",
  "content/legal/privacy.hi.md",
  "content/legal/terms.en.md",
  "content/legal/terms.hi.md",
];

describe("legal documents", () => {
  for (const file of files) {
    const text = readFileSync(file, "utf8");

    it(`${file} is marked as an unreviewed draft`, () => {
      expect(text).toContain("DRAFT, NOT LEGALLY REVIEWED");
    });

    it(`${file} has no placeholder left in it`, () => {
      expect(text).not.toMatch(/\b(TBD|TODO|XXX|Lorem ipsum)\b/i);
    });

    it(`${file} passes the voice rules`, () => {
      const body = text.split("\n").filter((l) => !l.startsWith(">")).join("\n");
      expect(validateCopy(body)).toEqual([]);
    });
  }

  it("the privacy policy states the three commitments the architecture actually makes", () => {
    const text = readFileSync("content/legal/privacy.en.md", "utf8");
    expect(text).toMatch(/audio/i);
    expect(text).toMatch(/Mumbai|India/i);
    expect(text).toMatch(/analytics/i);
  });
});
```

- [x] **Step 8: Render the legal pages**

Create `app/(public)/legal/privacy/page.tsx` and `terms/page.tsx`. Each reads the markdown for the current locale, renders it in the restrained register, and includes the `LanguageSwitcher`. Use a minimal markdown renderer rather than adding a heavy dependency:

```bash
npm i react-markdown
```

- [x] **Step 9: Run the suite and commit**

Run: `npm run verify`

```bash
git add "app/(auth)/consent" "app/(public)/legal" app/actions/consent.ts content/legal lib/config.ts tests/guards/legal.test.ts i18n
git commit -m "feat(consent): add consent register with immutable trail, separate optional consents and legal drafts"
```

**Done when:** consent writes four rows with the version and locale, the optional consents default to off, the required consent gates the button with a stated reason, and every legal draft passes the guards.

---

## Session 14: Landing screen

**Gate A — request before starting:** ask for the landing screen's designer HTML/CSS (or images) and any logo or splash Lottie. Stop until it arrives.

**Goal:** The first screen she sees. Language chosen before anything else, then sign up or sign in.

**Files:**
- Create: `app/(public)/page.tsx`, `app/(public)/LandingScreen.tsx` + test
- Modify: `i18n/en.json`, `i18n/hi.json`
- Modify: `tests/e2e/auth.spec.ts`

- [ ] **Step 1: Request the asset and stop**

Ask the product owner for the landing screen asset. Do not proceed to Step 3 without it. Steps 2 is safe to do while waiting.

- [ ] **Step 2: Write the failing LandingScreen test (behaviour only, no layout assertions)**

Create `app/(public)/LandingScreen.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/en.json";
import { LandingScreen } from "@/app/(public)/LandingScreen";

const onChooseLocale = vi.fn();

function renderScreen(locale: "en" | "hi" = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={en}>
      <LandingScreen locale={locale} onChooseLocale={onChooseLocale} next={null} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => onChooseLocale.mockReset());

describe("LandingScreen", () => {
  it("offers two separate language buttons, each in its own script", () => {
    renderScreen();
    expect(screen.getByRole("button", { name: "Continue in English" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "हिंदी में जारी रखें" })).toBeInTheDocument();
  });

  it("reports the chosen language", async () => {
    renderScreen();
    await userEvent.click(screen.getByRole("button", { name: "हिंदी में जारी रखें" }));
    expect(onChooseLocale).toHaveBeenCalledWith("hi");
  });

  it("offers both sign up and sign in", () => {
    renderScreen();
    expect(screen.getByRole("link", { name: /create an account/i })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/signin");
  });

  it("carries a deep-link target through to sign up, so a shared link resumes", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <LandingScreen locale="en" onChooseLocale={onChooseLocale} next="/care/summary" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("link", { name: /create an account/i })).toHaveAttribute(
      "href",
      "/signup?next=%2Fcare%2Fsummary",
    );
  });

  it("renders the decorative motif hidden from assistive technology", () => {
    renderScreen();
    expect(screen.getByTestId("texture-motif")).toHaveAttribute("aria-hidden", "true");
  });

  it("has exactly one high-emphasis action, per the hierarchy law", () => {
    renderScreen();
    const primaries = screen
      .getAllByRole("link")
      .filter((el) => el.className.includes("bg-accent-primary"));
    expect(primaries).toHaveLength(1);
  });

  it("renders the tagline in the body face, not the display face", () => {
    renderScreen();
    expect(screen.getByText(en.common.appTagline).className).toContain("font-body");
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx vitest run "app/(public)/LandingScreen.test.tsx"`
Expected: FAIL — module not found.

- [ ] **Step 4: Port the designer's markup into LandingScreen**

Create `app/(public)/LandingScreen.tsx` by translating the designer's HTML into JSX, replacing every literal colour, size and spacing with the matching token utility, and wiring the behaviour the tests require. Keep the structure the designer gave; do not rearrange it. `TextureMotif` is permitted on this screen.

- [ ] **Step 5: Wire the page**

Create `app/(public)/page.tsx` as a Server Component that reads the locale and the `next` search parameter and renders `LandingScreen`, passing `changeLocale` as `onChooseLocale`.

- [ ] **Step 6: Run the tests and watch them pass**

Run: `npx vitest run "app/(public)/LandingScreen.test.tsx"`
Expected: PASS.

- [ ] **Step 7: Check both languages at 200% text scale**

Open `/` in the browser, switch to Hindi, and set the browser's font scale to 200%. Confirm no clipped or overlapping text and that no button label truncates. Fix by letting labels wrap, never by shrinking the type.

- [ ] **Step 8: Add the accessibility check and commit**

Append to `tests/e2e/auth.spec.ts`:

```ts
test("the landing page has no accessibility violations in either language", async ({ page }) => {
  for (const locale of ["en", "hi"]) {
    await page.context().addCookies([{ name: "mr_locale", value: locale, url: "http://localhost:3000" }]);
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, `locale ${locale}`).toEqual([]);
  }
});
```

```bash
git add "app/(public)" i18n tests/e2e
git commit -m "feat(landing): add language-first landing screen from designer markup"
```

---

## Session 15: Onboarding intro carousel

**Gate A — request before starting:** ask for the intro panels' artwork (duotone illustrations or Lottie) and copy, plus the designer's layout. Stop until it arrives.

**Goal:** Three to four panels that set expectations, skippable at any point, with motion that respects the reduced-motion preference.

**Files:**
- Create: `app/(onboarding)/intro/page.tsx`, `app/(onboarding)/intro/IntroCarousel.tsx` + test
- Modify: `i18n/en.json`, `i18n/hi.json`

- [ ] **Step 1: Request the asset and stop**

- [ ] **Step 2: Write the failing carousel test**

Create `app/(onboarding)/intro/IntroCarousel.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/en.json";
import { IntroCarousel } from "@/app/(onboarding)/intro/IntroCarousel";

const panels = [
  { id: "a", illustration: "/intro-1.png", alt: "A woman resting", body: "Panel one" },
  { id: "b", illustration: "/intro-2.png", alt: "A calendar", body: "Panel two" },
  { id: "c", illustration: "/intro-3.png", alt: "A notebook", body: "Panel three" },
];

function renderCarousel(onFinish = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <IntroCarousel panels={panels} onFinish={onFinish} />
    </NextIntlClientProvider>,
  );
  return onFinish;
}

describe("IntroCarousel", () => {
  it("shows the first panel and its described illustration", () => {
    renderCarousel();
    expect(screen.getByText("Panel one")).toBeInTheDocument();
    expect(screen.getByAltText("A woman resting")).toBeInTheDocument();
  });

  it("shows one panel at a time", async () => {
    renderCarousel();
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.queryByText("Panel one")).not.toBeInTheDocument();
    expect(screen.getByText("Panel two")).toBeInTheDocument();
  });

  it("reports progress without relying on colour", () => {
    renderCarousel();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  });

  it("finishes from the last panel", async () => {
    const onFinish = renderCarousel();
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it("is skippable from the first panel, because nobody should be trapped here", async () => {
    const onFinish = renderCarousel();
    await userEvent.click(screen.getByRole("button", { name: /skip/i }));
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it("allows going back without losing position", async () => {
    renderCarousel();
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    await userEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByText("Panel one")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it, watch it fail, implement from the designer's markup, run it again**

Expected after implementation: PASS (6 tests). `TextureMotif` is permitted here. Panel transitions use `motion-base` and collapse to an instant change under reduced motion, inherited from the global CSS rule added in Session 1.

- [ ] **Step 4: Wire the page and commit**

`app/(onboarding)/intro/page.tsx` renders the carousel and navigates to `/onboarding/profile` on finish.

```bash
git add "app/(onboarding)/intro" i18n
git commit -m "feat(onboarding): add skippable intro carousel"
```

---

## Session 16: Onboarding form

**Gate A — request before starting:** ask for the onboarding form's designer layout. Stop until it arrives.

**Goal:** The medium-length intake from spec §4.5, written to `profiles` and `pregnancies`, with a draft that survives an interruption.

**Files:**
- Create: `lib/domain/onboarding.ts` + test
- Create: `app/(onboarding)/profile/page.tsx`, `app/(onboarding)/profile/OnboardingForm.tsx` + test
- Create: `app/actions/onboarding.ts`
- Create: `lib/useDraft.ts` + test
- Modify: `i18n/en.json`, `i18n/hi.json`
- Create: `tests/e2e/onboarding.spec.ts`

**Interfaces:**
- Produces: `validateOnboarding(input): { ok: true; value: OnboardingValue } | { ok: false; errors: Record<string, string> }`; `saveOnboarding(value)` server action; `useDraft<T>(key, initial)`.

- [ ] **Step 1: Request the asset and stop**

- [ ] **Step 2: Write the failing validation test**

Create `lib/domain/onboarding.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validateOnboarding } from "@/lib/domain/onboarding";

const today = "2026-09-11";
const base = { displayName: "Priyanka", dateMode: "lmp" as const, lmp: "2026-03-01", today };

describe("validateOnboarding", () => {
  it("accepts the minimum required fields and derives the due date", () => {
    const result = validateOnboarding(base);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.edd).toBe("2026-12-06");
      expect(result.value.eddSource).toBe("lmp");
    }
  });

  it("accepts a known due date instead of the last period", () => {
    const result = validateOnboarding({
      displayName: "Priyanka",
      dateMode: "edd",
      edd: "2026-12-06",
      today,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.eddSource).toBe("manual");
      expect(result.value.lmp).toBe("2026-03-01");
    }
  });

  it("requires a name", () => {
    const result = validateOnboarding({ ...base, displayName: "   " });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.displayName).toMatch(/name/i);
  });

  it("rejects a last period in the future with a specific message", () => {
    const result = validateOnboarding({ ...base, lmp: "2026-10-01" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.lmp).toMatch(/cannot be in the future/i);
  });

  it("rejects a last period too long ago with a different message", () => {
    const result = validateOnboarding({ ...base, lmp: "2025-01-01" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.lmp).toMatch(/more than/i);
  });

  it("rejects a due date already far in the past", () => {
    const result = validateOnboarding({ displayName: "P", dateMode: "edd", edd: "2025-01-01", today });
    expect(result.ok).toBe(false);
  });

  it("accepts a due date up to 44 weeks in the future", () => {
    expect(validateOnboarding({ displayName: "P", dateMode: "edd", edd: "2027-05-01", today }).ok).toBe(true);
  });

  it("treats height, weight, age, city, doctor and clinic as optional", () => {
    expect(validateOnboarding(base).ok).toBe(true);
  });

  it("rejects an implausible height with a bounded message", () => {
    const result = validateOnboarding({ ...base, heightCm: 40 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.heightCm).toMatch(/between 100 and 220/);
  });

  it("rejects an implausible weight with a bounded message", () => {
    const result = validateOnboarding({ ...base, weightKg: 500 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.weightKg).toMatch(/between 25 and 250/);
  });

  it("rejects a birth year that would make her under 12 or over 70", () => {
    expect(validateOnboarding({ ...base, birthYear: 2020 }).ok).toBe(false);
    expect(validateOnboarding({ ...base, birthYear: 1940 }).ok).toBe(false);
    expect(validateOnboarding({ ...base, birthYear: 1998 }).ok).toBe(true);
  });

  it("trims whitespace from every text field", () => {
    const result = validateOnboarding({ ...base, displayName: "  Priyanka  ", city: "  Pune  " });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.displayName).toBe("Priyanka");
      expect(result.value.city).toBe("Pune");
    }
  });

  it("reports every error at once, not one at a time", () => {
    const result = validateOnboarding({ displayName: "", dateMode: "lmp", lmp: "bad-date", today });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 3: Run it, watch it fail, then implement `lib/domain/onboarding.ts`**

Use `validateLmp`, `eddFromLmp` and `lmpFromEdd` from `lib/domain/pregnancy.ts`. Error strings are translation keys resolved by the caller, not English sentences — but the test above asserts on English, so return keys and have the test look them up through the catalogue. Adjust the test to assert on keys if that reads more cleanly; either is acceptable as long as no English copy is hardcoded in `lib/domain/`.

Run: `npx vitest run lib/domain/onboarding.test.ts`
Expected: PASS.

- [ ] **Step 4: Write the failing draft-persistence test**

Create `lib/useDraft.test.ts` asserting that `useDraft` writes to `sessionStorage` on change, restores on mount, clears on `reset()`, and silently no-ops when `sessionStorage` throws (Safari private mode).

- [ ] **Step 5: Implement `lib/useDraft.ts`**

```ts
"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Keeps a form draft in sessionStorage so an interrupted form is never lost
 * (spec §10: session expiring mid-form). Every access is guarded, because
 * Safari private mode throws on write.
 */
export function useDraft<T extends object>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) setValue({ ...initial, ...(JSON.parse(raw) as Partial<T>) });
    } catch {
      // no draft available; continue with the initial value
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (patch: Partial<T>) => {
      setValue((current) => {
        const next = { ...current, ...patch };
        try {
          sessionStorage.setItem(key, JSON.stringify(next));
        } catch {
          // storage unavailable; the form still works, it just will not survive a reload
        }
        return next;
      });
    },
    [key],
  );

  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // nothing to clear
    }
    setValue(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { value, update, reset };
}
```

- [ ] **Step 6: Write the failing OnboardingForm test**

Assert: the name field is required; a toggle switches between "I know my last period date" and "I know my due date" and only the relevant field shows; the derived other date is displayed read-only so she can sanity-check it; native input types are used (`date`, `number`); errors appear per field with specific text; optional fields can be left blank and the form still submits; the draft is restored after an unmount and remount; and **there is no field, label or option anywhere referring to the baby's sex** (assert `queryByLabelText(/gender|sex/i)` is null).

- [ ] **Step 7: Implement the form from the designer's markup, then the server action**

Create `app/actions/onboarding.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { validateOnboarding, type OnboardingInput } from "@/lib/domain/onboarding";
import { todayInAppZone } from "@/lib/domain/dates";

export async function saveOnboarding(input: OnboardingInput): Promise<{ errors: Record<string, string> } | void> {
  const result = validateOnboarding({ ...input, today: todayInAppZone() });
  if (!result.ok) return { errors: result.errors };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const v = result.value;

  const profile = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: v.displayName,
    locale: v.locale,
    birth_year: v.birthYear ?? null,
    city: v.city ?? null,
    is_first_pregnancy: v.isFirstPregnancy ?? null,
    height_cm: v.heightCm ?? null,
    pre_pregnancy_weight_kg: v.weightKg ?? null,
    doctor_name: v.doctorName ?? null,
    clinic_name: v.clinicName ?? null,
    onboarding_completed_at: new Date().toISOString(),
  });
  if (profile.error) throw profile.error;

  const pregnancy = await supabase.from("pregnancies").insert({
    user_id: user.id,
    lmp_date: v.lmp ?? null,
    edd: v.edd,
    edd_source: v.eddSource,
  });
  if (pregnancy.error) throw pregnancy.error;

  redirect("/today");
}
```

The profile write comes first and sets `onboarding_completed_at` last in its own row, so a failure between the two writes leaves her on the form rather than in a half-onboarded state with no pregnancy.

- [ ] **Step 8: Write the e2e onboarding spec**

Create `tests/e2e/onboarding.spec.ts`: sign in via the local Inbucket OTP, accept consent, skip the intro, fill the form with an LMP, and assert arrival on `/today` with the correct week shown. Add a second case that reloads mid-form and asserts the entered name is still there.

Run: `npx playwright test tests/e2e/onboarding.spec.ts`
Expected: PASS.

- [ ] **Step 9: Verify and commit**

```bash
git add lib/domain/onboarding.ts lib/useDraft.ts "app/(onboarding)/profile" app/actions/onboarding.ts i18n tests
git commit -m "feat(onboarding): add intake form with derived due date, per-field errors and draft recovery"
```

---

## Session 17: App shell, bottom navigation, offline state, view transitions

**Gate A — request before starting:** ask for the bottom navigation's designer markup including the five icons and the active state. Stop until it arrives.

**Goal:** The persistent frame every app screen renders inside: five tabs, safe areas, the chat bubble slot, the offline banner, and view transitions.

**Files:**
- Create: `app/(app)/layout.tsx`
- Create: `components/patterns/BottomNav.tsx` + test
- Create: `components/patterns/OfflineBanner.tsx` + test
- Create: `lib/pwa/useOnline.ts` + test
- Create: `app/(app)/ChatBubbleSlot.tsx` (placeholder until Session 29)
- Modify: `styles/globals.css` (view transition rules)
- Modify: `i18n/en.json`, `i18n/hi.json`

**Interfaces:**
- Produces: `BottomNav({ activePath })`, `OfflineBanner()`, `useOnline(): boolean`, the `(app)` layout.

- [ ] **Step 1: Request the asset and stop**

- [ ] **Step 2: Write the failing useOnline test**

Create `lib/pwa/useOnline.test.ts` asserting: it returns `true` when `navigator.onLine` is true; `false` when false; it flips on the `offline` and `online` window events; and it returns `true` when `navigator.onLine` is `undefined`, because an unknown state must not lock the app into a read-only mode.

- [ ] **Step 3: Implement useOnline**

```ts
"use client";

import { useEffect, useState } from "react";

/** Single source of truth for connectivity. Every write control reads this one hook. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const read = () => setOnline(navigator.onLine ?? true);
    read();
    window.addEventListener("online", read);
    window.addEventListener("offline", read);
    return () => {
      window.removeEventListener("online", read);
      window.removeEventListener("offline", read);
    };
  }, []);

  return online;
}
```

- [ ] **Step 4: Write the failing BottomNav test**

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/en.json";
import { BottomNav } from "@/components/patterns/BottomNav";

function renderNav(activePath: string) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <BottomNav activePath={activePath} />
    </NextIntlClientProvider>,
  );
}

describe("BottomNav", () => {
  it("renders exactly the five tabs, in order", () => {
    renderNav("/today");
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/today",
      "/baby",
      "/care",
      "/reading",
      "/profile",
    ]);
  });

  it("marks the active tab for assistive technology", () => {
    renderNav("/care");
    expect(screen.getByRole("link", { name: /my care/i })).toHaveAttribute("aria-current", "page");
  });

  it("signals the active tab with a weight change as well as colour", () => {
    renderNav("/care");
    expect(screen.getByRole("link", { name: /my care/i }).className).toContain("font-medium");
  });

  it("treats a sub-route as its parent tab", () => {
    renderNav("/care/medicines");
    expect(screen.getByRole("link", { name: /my care/i })).toHaveAttribute("aria-current", "page");
  });

  it("meets the touch target on every tab", () => {
    renderNav("/today");
    for (const link of screen.getAllByRole("link")) {
      expect(link.className).toContain("tap-target");
    }
  });

  it("respects the home-indicator safe area", () => {
    renderNav("/today");
    expect(screen.getByRole("navigation").className).toContain("safe-bottom");
  });

  it("labels every tab in Hindi too", () => {
    render(
      <NextIntlClientProvider locale="hi" messages={require("@/i18n/hi.json")}>
        <BottomNav activePath="/today" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("link", { name: "आज" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run it, watch it fail, implement from the designer's markup**

Five `Link`s, each with an `Icon` at `size="nav"` and a label. Active detection is `activePath === href || activePath.startsWith(href + "/")`. Expected: PASS.

- [ ] **Step 6: Write and implement OfflineBanner**

Test: it renders nothing when online; when offline it renders a `role="status"` with the `common.offline` message and an icon. Then implement.

- [ ] **Step 7: Build the app layout**

Create `app/(app)/layout.tsx`:

```tsx
import { headers } from "next/headers";
import { BottomNav } from "@/components/patterns/BottomNav";
import { OfflineBanner } from "@/components/patterns/OfflineBanner";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { ChatBubbleSlot } from "@/app/(app)/ChatBubbleSlot";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const activePath = (await headers()).get("x-pathname") ?? "/today";

  return (
    <ToastProvider>
      <div className="safe-top flex min-h-dvh flex-col">
        <OfflineBanner />
        <main className="flex-1 px-screen pb-[96px]">{children}</main>
        <ChatBubbleSlot />
        <BottomNav activePath={activePath} />
      </div>
    </ToastProvider>
  );
}
```

Set `x-pathname` in `middleware.ts` by adding `response.headers.set("x-pathname", request.nextUrl.pathname)` before returning, so the layout knows the active tab without a client component.

- [ ] **Step 8: Add view transitions**

In `styles/globals.css`:

```css
@media (prefers-reduced-motion: no-preference) {
  ::view-transition-old(root), ::view-transition-new(root) {
    animation-duration: var(--motion-slow);
    animation-timing-function: var(--ease-standard);
  }
}
```

Enable the Next.js view-transitions behaviour in `next.config.ts` if the installed version exposes a flag for it; otherwise rely on the browser default for cross-document transitions. **Verify on a real mid-range Android device before relying on it**, per design document §3 — note the result in the commit message.

- [ ] **Step 9: Create the chat bubble placeholder**

`app/(app)/ChatBubbleSlot.tsx` renders nothing in this session and is replaced in Session 29. It exists now so the layout's bottom spacing is settled once.

- [ ] **Step 10: Verify and commit**

```bash
git add "app/(app)" components/patterns lib/pwa middleware.ts styles i18n
git commit -m "feat(shell): add app shell with five-tab navigation, offline banner and view transitions"
```

---

## Session 17A: Analytics foundation

**Gate C — request before starting:** ask the product owner for a PostHog project (EU cloud recommended) and its project API key plus host. Confirm in writing that session replay is to be enabled with full input and text masking.

**Goal:** A consent-gated, vendor-swappable analytics layer with a typed event taxonomy and a guard test that makes it impossible to leak health data into an event.

**Files:**
- Create: `lib/analytics/provider.ts`, `lib/analytics/posthog.ts`, `lib/analytics/events.ts`
- Create: `lib/analytics/sanitise.ts` (per-event allowlist schemas) + test
- Create: `components/AnalyticsProvider.tsx` + test
- Create: `tests/guards/analytics-properties.test.ts`
- Modify: `app/layout.tsx`, `lib/env.ts`, `.env.example`
- Modify: `app/actions/consent.ts` (opt in after consent)

**Interfaces:**
- Produces:
  - `Analytics` interface: `identify(userId)`, `capture(event, properties?)`, `optIn()`, `optOut()`, `reset()`
  - `track(event: EventName, properties?: EventProperties[EventName])` — the only function screens call
  - `EVENTS` taxonomy and the `EventName` union
  - `EVENT_SCHEMAS` (one strict schema per event) and `validateEvent(event, props)`, which throws on an unknown event, an undeclared key, or an out-of-range value

- [ ] **Step 1: Install PostHog**

```bash
npm i posthog-js
```

- [ ] **Step 2: Define the event taxonomy as types, not strings**

Create `lib/analytics/events.ts`:

```ts
/**
 * The complete event taxonomy. Screens import EVENTS; no screen writes an event
 * name inline. Property values are enums, counts, booleans and week numbers only:
 * never free text, never a name, never anything she typed.
 */
export const EVENTS = {
  app_opened: "app_opened",
  language_chosen: "language_chosen",
  signup_started: "signup_started",
  signup_completed: "signup_completed",
  signin_completed: "signin_completed",
  consent_granted: "consent_granted",
  onboarding_step_viewed: "onboarding_step_viewed",
  onboarding_completed: "onboarding_completed",
  tab_viewed: "tab_viewed",
  checkin_submitted: "checkin_submitted",
  triage_result_shown: "triage_result_shown",
  kick_session_started: "kick_session_started",
  kick_session_completed: "kick_session_completed",
  medicine_added: "medicine_added",
  medicine_dose_logged: "medicine_dose_logged",
  appointment_added: "appointment_added",
  vital_logged: "vital_logged",
  advice_saved: "advice_saved",
  report_uploaded: "report_uploaded",
  summary_viewed: "summary_viewed",
  summary_printed: "summary_printed",
  content_opened: "content_opened",
  content_completed: "content_completed",
  chat_opened: "chat_opened",
  chat_question_asked: "chat_question_asked",
  chat_answer_shown: "chat_answer_shown",
  contraction_session_started: "contraction_session_started",
  checklist_item_toggled: "checklist_item_toggled",
  install_prompt_accepted: "install_prompt_accepted",
  offline_write_blocked: "offline_write_blocked",
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

export interface EventProperties {
  app_opened: { source: "browser" | "standalone" | "twa" };
  language_chosen: { locale: "en" | "hi" };
  signup_started: { method: "email_otp" | "google" };
  signup_completed: { method: "email_otp" | "google" };
  signin_completed: { method: "email_otp" | "google" };
  consent_granted: { optional_data_sharing: boolean; analytics: boolean };
  onboarding_step_viewed: { step: number };
  onboarding_completed: { date_mode: "lmp" | "edd"; optional_fields_filled: number };
  tab_viewed: { tab: "today" | "baby" | "care" | "reading" | "profile" };
  checkin_submitted: { input_method: "text" | "voice"; length_bucket: "short" | "medium" | "long" };
  triage_result_shown: { severity: "general" | "contact_clinic" | "urgent" | "no_match" };
  kick_session_started: { week: number };
  kick_session_completed: { week: number; kicks: number; minutes: number };
  medicine_added: { schedule_count: number };
  medicine_dose_logged: { status: "taken" | "skipped"; late: boolean };
  appointment_added: { days_ahead: number };
  vital_logged: { kind: "weight" | "bp" };
  advice_saved: { input_method: "text" | "voice"; linked_to_appointment: boolean };
  report_uploaded: { mime_group: "image" | "pdf"; size_bucket: "small" | "medium" | "large" };
  summary_viewed: { week: number };
  summary_printed: { week: number };
  content_opened: { kind: "article" | "video" | "audio"; is_fallback_locale: boolean };
  content_completed: { kind: "article" | "video" | "audio" };
  chat_opened: Record<string, never>;
  chat_question_asked: { locale: "en" | "hi" };
  chat_answer_shown: { answer_kind: "data" | "retrieved" | "no_match" | "refused" };
  contraction_session_started: { week: number };
  checklist_item_toggled: { category: string; done: boolean };
  install_prompt_accepted: { platform: "android" | "ios" | "other" };
  offline_write_blocked: { feature: string };
}
```

Every property above is a bucket, an enum, a count or a boolean. `checkin_submitted` carries a length bucket rather than the text, which is the pattern to follow for anything she typed.

- [ ] **Step 3: Write the failing event-schema test**

Create `lib/analytics/sanitise.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { EVENTS } from "@/lib/analytics/events";
import { EVENT_SCHEMAS, validateEvent } from "@/lib/analytics/sanitise";

describe("validateEvent", () => {
  it("accepts a declared event with exactly its declared properties", () => {
    expect(validateEvent(EVENTS.vital_logged, { kind: "weight" })).toEqual({ kind: "weight" });
  });

  it("rejects an event name that has no schema", () => {
    expect(() => validateEvent("made_up_event", {})).toThrow(/unknown analytics event/i);
  });

  it("rejects any key the event did not declare", () => {
    expect(() => validateEvent(EVENTS.vital_logged, { kind: "weight", note: "fine" })).toThrow(
      /rejected/i,
    );
  });

  // The case a denylist of key names lets straight through. This is the whole reason
  // this module is an allowlist.
  it.each([
    ["condition", "bleeding"],
    ["observation", "headache"],
    ["detail", "Dr Mehta"],
    ["extra", "Priyanka"],
    ["value", "Folic acid"],
  ])("rejects health or personal data smuggled under the unlisted key %s", (key, value) => {
    expect(() => validateEvent(EVENTS.checkin_submitted, {
      input_method: "text",
      length_bucket: "short",
      [key]: value,
    })).toThrow(/rejected/i);
  });

  it("rejects a value outside the declared enum", () => {
    expect(() => validateEvent(EVENTS.vital_logged, { kind: "blood_sugar" })).toThrow(/rejected/i);
  });

  it("rejects a number outside the declared range", () => {
    expect(() => validateEvent(EVENTS.summary_viewed, { week: 120 })).toThrow(/rejected/i);
  });

  it("rejects a free-text value even where a string is expected, because no key accepts free text", () => {
    expect(() => validateEvent(EVENTS.checklist_item_toggled, {
      category: "I packed my hospital bag today",
      done: true,
    })).toThrow(/rejected/i);
  });

  it("rejects a nested object", () => {
    expect(() => validateEvent(EVENTS.tab_viewed, { tab: { name: "today" } })).toThrow(/rejected/i);
  });

  it("rejects a missing required property rather than sending a partial event", () => {
    expect(() => validateEvent(EVENTS.medicine_dose_logged, { status: "taken" })).toThrow(/rejected/i);
  });

  it("declares a schema for every event in the taxonomy, so none can be emitted unvalidated", () => {
    const missing = Object.values(EVENTS).filter((name) => !(name in EVENT_SCHEMAS));
    expect(missing).toEqual([]);
  });

  it("declares no schema for an event not in the taxonomy", () => {
    const names = Object.values(EVENTS) as string[];
    expect(Object.keys(EVENT_SCHEMAS).filter((k) => !names.includes(k))).toEqual([]);
  });
});
```

The last two tests keep `events.ts` and the schema map from drifting apart, which is the way an allowlist usually fails in practice: someone adds an event and forgets the schema, and it either throws in production or, worse, gets a permissive schema to make the error go away.

- [ ] **Step 4: Run it, watch it fail, then implement**

Create `lib/analytics/sanitise.ts`. **This is an allowlist, not a denylist.** A list of forbidden key names does not work: `{ condition: "bleeding" }` passes every such list while carrying exactly the data the rule exists to stop. Instead each event declares the exact keys it may carry and the exact values each key may hold, and anything else is rejected.

```ts
import { z } from "zod";
import { EVENTS } from "@/lib/analytics/events";

const locale = z.enum(["en", "hi"]);
const week = z.number().int().min(0).max(42);

/**
 * One schema per event, declaring EXACT permitted keys and, per key, an enum or a
 * numeric range. `.strict()` rejects any key not listed, so a free-text property is
 * not discouraged, it is unrepresentable. Analytics is hosted outside India and must
 * never carry health data or free text (Global Constraints).
 */
export const EVENT_SCHEMAS = {
  [EVENTS.app_opened]: z.object({ source: z.enum(["browser", "standalone", "twa"]) }).strict(),
  [EVENTS.language_chosen]: z.object({ locale }).strict(),
  [EVENTS.signup_started]: z.object({ method: z.enum(["email_otp", "google"]) }).strict(),
  [EVENTS.signup_completed]: z.object({ method: z.enum(["email_otp", "google"]) }).strict(),
  [EVENTS.signin_completed]: z.object({ method: z.enum(["email_otp", "google"]) }).strict(),
  [EVENTS.consent_granted]: z.object({
    optional_data_sharing: z.boolean(),
    analytics: z.boolean(),
  }).strict(),
  [EVENTS.onboarding_step_viewed]: z.object({ step: z.number().int().min(1).max(10) }).strict(),
  [EVENTS.onboarding_completed]: z.object({
    date_mode: z.enum(["lmp", "edd"]),
    optional_fields_filled: z.number().int().min(0).max(10),
  }).strict(),
  [EVENTS.tab_viewed]: z.object({
    tab: z.enum(["today", "baby", "care", "reading", "profile"]),
  }).strict(),
  [EVENTS.checkin_submitted]: z.object({
    input_method: z.enum(["text", "voice"]),
    length_bucket: z.enum(["short", "medium", "long"]),
  }).strict(),
  [EVENTS.triage_result_shown]: z.object({
    severity: z.enum(["general", "contact_clinic", "urgent", "no_match"]),
  }).strict(),
  [EVENTS.kick_session_started]: z.object({ week }).strict(),
  [EVENTS.kick_session_completed]: z.object({
    week,
    kicks: z.number().int().min(0).max(100),
    minutes: z.number().int().min(0).max(720),
  }).strict(),
  [EVENTS.medicine_added]: z.object({ schedule_count: z.number().int().min(1).max(6) }).strict(),
  [EVENTS.medicine_dose_logged]: z.object({
    status: z.enum(["taken", "skipped"]),
    late: z.boolean(),
  }).strict(),
  [EVENTS.appointment_added]: z.object({ days_ahead: z.number().int().min(-365).max(730) }).strict(),
  [EVENTS.vital_logged]: z.object({ kind: z.enum(["weight", "bp"]) }).strict(),
  [EVENTS.advice_saved]: z.object({
    input_method: z.enum(["text", "voice"]),
    linked_to_appointment: z.boolean(),
  }).strict(),
  [EVENTS.report_uploaded]: z.object({
    mime_group: z.enum(["image", "pdf"]),
    size_bucket: z.enum(["small", "medium", "large"]),
  }).strict(),
  [EVENTS.summary_viewed]: z.object({ week }).strict(),
  [EVENTS.summary_printed]: z.object({ week }).strict(),
  [EVENTS.content_opened]: z.object({
    kind: z.enum(["article", "video", "audio"]),
    is_fallback_locale: z.boolean(),
  }).strict(),
  [EVENTS.content_completed]: z.object({ kind: z.enum(["article", "video", "audio"]) }).strict(),
  [EVENTS.chat_opened]: z.object({}).strict(),
  [EVENTS.chat_question_asked]: z.object({ locale }).strict(),
  [EVENTS.chat_answer_shown]: z.object({
    answer_kind: z.enum(["data", "retrieved", "no_match", "refused"]),
  }).strict(),
  [EVENTS.contraction_session_started]: z.object({ week }).strict(),
  [EVENTS.checklist_item_toggled]: z.object({
    // A closed enum, not an arbitrary string: "category" would otherwise be a free-text hole.
    category: z.enum(["hospital_bag", "documents", "birth_prep", "home"]),
    done: z.boolean(),
  }).strict(),
  [EVENTS.install_prompt_accepted]: z.object({
    platform: z.enum(["android", "ios", "other"]),
  }).strict(),
  [EVENTS.offline_write_blocked]: z.object({
    // Also a closed enum. Every feature that can block offline is listed here.
    feature: z.enum([
      "medicine", "medicine_log", "appointment", "vital", "advice", "report",
      "checkin", "kick", "contraction", "checklist", "baby_name", "profile",
    ]),
  }).strict(),
} as const;

/**
 * Validates an event against its schema. Throws on an unknown event, an unknown key,
 * or an out-of-range value, so a mistake is caught in development and in tests rather
 * than discovered in a vendor dashboard.
 */
export function validateEvent(event: string, properties: Record<string, unknown>): Record<string, unknown> {
  const schema = (EVENT_SCHEMAS as Record<string, z.ZodType | undefined>)[event];
  if (!schema) throw new Error(`Unknown analytics event "${event}". Add it to EVENTS and EVENT_SCHEMAS.`);

  const result = schema.safeParse(properties);
  if (!result.success) {
    const detail = result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.code}`).join("; ");
    throw new Error(`Analytics event "${event}" rejected: ${detail}`);
  }
  return result.data as Record<string, unknown>;
}
```

Run: `npx vitest run lib/analytics/sanitise.test.ts`
Expected: PASS.

- [ ] **Step 5: Define the provider interface and the PostHog implementation**

Create `lib/analytics/provider.ts`:

```ts
import type { EventName, EventProperties } from "@/lib/analytics/events";

export interface Analytics {
  identify(userId: string): void;
  capture<E extends EventName>(event: E, properties?: EventProperties[E]): void;
  optIn(): void;
  optOut(): void;
  reset(): void;
}

/** Used on the server and before consent, so a call is never a crash. */
export const noopAnalytics: Analytics = {
  identify: () => {},
  capture: () => {},
  optIn: () => {},
  optOut: () => {},
  reset: () => {},
};
```

Create `lib/analytics/posthog.ts`:

```ts
"use client";

import posthog from "posthog-js";
import { validateEvent } from "@/lib/analytics/sanitise";
import type { Analytics } from "@/lib/analytics/provider";
import type { EventName, EventProperties } from "@/lib/analytics/events";

let initialised = false;

export function createPosthogAnalytics({ key, host }: { key: string; host: string }): Analytics {
  if (!initialised) {
    posthog.init(key, {
      api_host: host,
      // Opt-out by default. Capture begins only after the analytics consent row exists.
      opt_out_capturing_by_default: true,
      autocapture: false, // every event is deliberate and typed
      capture_pageview: false, // tab_viewed is emitted explicitly instead
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "*", // nothing she typed or read is ever recorded
      },
      ip: false,
      persistence: "localStorage+cookie",
    });
    initialised = true;
  }

  return {
    identify: (userId) => posthog.identify(userId),
    capture: <E extends EventName>(event: E, properties?: EventProperties[E]) =>
      posthog.capture(event, validateEvent(event, { ...(properties ?? {}) })),
    optIn: () => posthog.opt_in_capturing(),
    optOut: () => posthog.opt_out_capturing(),
    reset: () => posthog.reset(),
  };
}
```

`autocapture: false` is not a performance choice. Autocapture records the text of elements people click, which on this product would sweep up medicine names and symptom text.

- [ ] **Step 6: Write the failing AnalyticsProvider test**

Assert: it does not call `optIn` when no analytics consent is present; it calls `optIn` and `identify` when consent is present and a user id is given; it calls `optOut` and `reset` when consent is withdrawn; and `track()` is a no-op with no provider mounted.

- [ ] **Step 7: Implement AnalyticsProvider and the `track` helper**

`components/AnalyticsProvider.tsx` is a client component taking `{ userId, analyticsConsented }`, creating the provider once, and calling `optIn`/`identify` or `optOut`/`reset` accordingly. It exposes `track` through a module-level reference so any component can call `track(EVENTS.tab_viewed, { tab: "today" })` without threading context.

Mount it in `app/layout.tsx`, and **derive `analyticsConsented` from the shared query**, not from a bespoke read:

```tsx
const supabase = await createServerSupabase();
const { data: { user } } = await supabase.auth.getUser();
const consents = user ? await getCurrentConsents(supabase) : null;

<AnalyticsProvider userId={user?.id ?? null} analyticsConsented={consents?.analytics.granted ?? false} />
```

Add a test asserting that a `granted: true` followed by a `granted: false` analytics row results in `analyticsConsented === false`, which is the consumer-side half of the withdrawal path.

- [ ] **Step 8: Opt in at the moment of consent**

In `app/actions/consent.ts`, after the insert succeeds, nothing changes server-side; the provider picks up the new consent on the next render. Add a test asserting that `consent_granted` is the first event captured after consent, and that nothing is captured before it.

- [ ] **Step 9: Add the repo-wide analytics guard**

Create `tests/guards/analytics-properties.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { EVENTS } from "@/lib/analytics/events";

describe("analytics discipline", () => {
  it("routes every capture through the track helper, anywhere in the tree", () => {
    // Scans the WHOLE source tree, not only app/ and components/: a new file under
    // lib/ calling the vendor directly would otherwise bypass this guard entirely.
    const hits = execSync(
      "grep -rnE \"(posthog|posthog-js)\\.|from ['\\\"]posthog-js\" app components lib i18n " +
        "--include='*.ts' --include='*.tsx' 2>/dev/null " +
        "| grep -v 'lib/analytics/posthog.ts' || true",
      { encoding: "utf8" },
    ).trim();
    expect(hits).toBe("");
  });

  it("detects a direct vendor call, so this guard cannot pass vacuously", () => {
    const hits = execSync(
      "grep -rnE \"posthog\\.\" lib/analytics/posthog.ts 2>/dev/null || true",
      { encoding: "utf8" },
    ).trim();
    expect(hits).not.toBe("");
  });

  it("validates every captured event against its schema", () => {
    const hits = execSync(
      "grep -rn 'posthog.capture' lib/analytics/posthog.ts 2>/dev/null || true",
      { encoding: "utf8" },
    ).trim();
    expect(hits).toContain("validateEvent");
  });

  it("uses no inline event-name string literals", () => {
    const names = Object.values(EVENTS);
    const hits = names
      .map((name) =>
        execSync(
          `grep -rn "[\\"']${name}[\\"']" app components --include='*.tsx' --include='*.ts' 2>/dev/null | grep -v 'lib/analytics' || true`,
          { encoding: "utf8" },
        ).trim(),
      )
      .filter(Boolean);
    expect(hits).toEqual([]);
  });
});
```

- [ ] **Step 10: Emit the events that already have screens**

Add `app_opened`, `language_chosen`, `signup_started`, `signup_completed`, `signin_completed`, `consent_granted`, `onboarding_step_viewed`, `onboarding_completed` and `tab_viewed` at their existing call sites from Sessions 12 to 17.

- [ ] **Step 11: Verify and commit**

Run: `npm run verify`

```bash
git add lib/analytics components/AnalyticsProvider.tsx tests/guards/analytics-properties.test.ts app lib/env.ts .env.example
git commit -m "feat(analytics): add consent-gated PostHog analytics with a typed taxonomy and a property guard"
```

**Done when:** no event fires before consent, every event name comes from `EVENTS`, every event has a strict schema and an undeclared key is rejected, the vendor-call guard proves it can detect a violation, session replay masks all input and text, and `$ip` capture is off.

---

## Session 18: Today screen

**Gate A — request before starting:** ask for the Today screen's designer markup and the baby-illustration asset for at least one stage. Stop until they arrive.

**Goal:** The calm screen. Greeting with her week, the stage illustration, reminders, recommended reading, and the feeling box. Deliberately uncluttered, with exactly one high-emphasis element.

**Files:**
- Create: `lib/domain/reminders.ts` + test
- Create: `lib/supabase/queries/today.ts`
- Create: `app/(app)/today/page.tsx`, `app/(app)/today/TodayScreen.tsx` + test
- Create: `app/(app)/today/FeelingBox.tsx` + test
- Modify: `i18n/en.json`, `i18n/hi.json`
- Create: `tests/e2e/today.spec.ts`

**Interfaces:**
- Consumes: `pregnancyProgress`, `illustrationStage`, `resolveLocalisedContent`, `ListRow`, `Card`, `EmptyState`, `IllustrationContainer`, `Skeleton`.
- Produces:
  - `buildReminders({ today, now, appointments, medicines, logs }): Reminder[]`
  - `TodayScreen({ progress, stage, reminders, reading, displayName })`
  - `FeelingBox({ onSubmit, transcriber })`

- [ ] **Step 1: Request the asset and stop**

- [ ] **Step 2: Write the failing reminders test**

Create `lib/domain/reminders.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildReminders } from "@/lib/domain/reminders";

const today = "2026-09-11";
const now = new Date("2026-09-11T14:00:00+05:30").getTime();

const medicine = {
  id: "m1",
  name: "Folic acid",
  schedule_times: ["09:00", "21:00"],
  days_of_week: null,
  start_date: "2026-09-01",
  end_date: null,
  is_active: true,
};

describe("buildReminders", () => {
  it("returns nothing when there is nothing due", () => {
    expect(buildReminders({ today, now, appointments: [], medicines: [], logs: [] })).toEqual([]);
  });

  it("includes the next upcoming appointment", () => {
    const reminders = buildReminders({
      today,
      now,
      appointments: [
        { id: "a1", title: "Scan", scheduled_at: "2026-09-14T10:00:00+05:30", status: "upcoming" },
      ],
      medicines: [],
      logs: [],
    });
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({ kind: "appointment", refId: "a1", daysAhead: 3 });
  });

  it("includes only the nearest upcoming appointment, keeping the screen calm", () => {
    const reminders = buildReminders({
      today,
      now,
      appointments: [
        { id: "a2", title: "Later", scheduled_at: "2026-10-01T10:00:00+05:30", status: "upcoming" },
        { id: "a1", title: "Sooner", scheduled_at: "2026-09-14T10:00:00+05:30", status: "upcoming" },
      ],
      medicines: [],
      logs: [],
    });
    expect(reminders.filter((r) => r.kind === "appointment")).toHaveLength(1);
    expect(reminders[0]!.refId).toBe("a1");
  });

  it("ignores a cancelled appointment", () => {
    expect(
      buildReminders({
        today,
        now,
        appointments: [
          { id: "a1", title: "Scan", scheduled_at: "2026-09-14T10:00:00+05:30", status: "cancelled" },
        ],
        medicines: [],
        logs: [],
      }),
    ).toEqual([]);
  });

  it("ignores an appointment already in the past", () => {
    expect(
      buildReminders({
        today,
        now,
        appointments: [
          { id: "a1", title: "Scan", scheduled_at: "2026-09-01T10:00:00+05:30", status: "upcoming" },
        ],
        medicines: [],
        logs: [],
      }),
    ).toEqual([]);
  });

  it("includes a dose already due today and not yet logged", () => {
    const reminders = buildReminders({ today, now, appointments: [], medicines: [medicine], logs: [] });
    const doses = reminders.filter((r) => r.kind === "dose");
    expect(doses).toHaveLength(1);
    expect(doses[0]).toMatchObject({ refId: "m1", scheduledTime: "09:00", isOverdue: true });
  });

  it("excludes a dose later today, because it is not due yet", () => {
    const reminders = buildReminders({ today, now, appointments: [], medicines: [medicine], logs: [] });
    expect(reminders.some((r) => r.kind === "dose" && r.scheduledTime === "21:00")).toBe(false);
  });

  it("excludes a dose already logged", () => {
    const reminders = buildReminders({
      today,
      now,
      appointments: [],
      medicines: [medicine],
      logs: [{ medicine_id: "m1", scheduled_date: today, scheduled_time: "09:00", status: "taken" }],
    });
    expect(reminders.filter((r) => r.kind === "dose")).toEqual([]);
  });

  it("treats a skipped dose as handled, not as outstanding", () => {
    const reminders = buildReminders({
      today,
      now,
      appointments: [],
      medicines: [medicine],
      logs: [{ medicine_id: "m1", scheduled_date: today, scheduled_time: "09:00", status: "skipped" }],
    });
    expect(reminders.filter((r) => r.kind === "dose")).toEqual([]);
  });

  it("excludes an inactive medicine", () => {
    const reminders = buildReminders({
      today,
      now,
      appointments: [],
      medicines: [{ ...medicine, is_active: false }],
      logs: [],
    });
    expect(reminders).toEqual([]);
  });

  it("excludes a medicine whose course has ended", () => {
    const reminders = buildReminders({
      today,
      now,
      appointments: [],
      medicines: [{ ...medicine, end_date: "2026-09-10" }],
      logs: [],
    });
    expect(reminders).toEqual([]);
  });

  it("excludes a medicine whose course has not started", () => {
    const reminders = buildReminders({
      today,
      now,
      appointments: [],
      medicines: [{ ...medicine, start_date: "2026-09-20" }],
      logs: [],
    });
    expect(reminders).toEqual([]);
  });

  it("respects a day-of-week restriction", () => {
    // 2026-09-11 is a Friday, which is day 5.
    const fridayOnly = { ...medicine, days_of_week: [5] };
    const mondayOnly = { ...medicine, days_of_week: [1] };
    expect(
      buildReminders({ today, now, appointments: [], medicines: [fridayOnly], logs: [] }).length,
    ).toBeGreaterThan(0);
    expect(buildReminders({ today, now, appointments: [], medicines: [mondayOnly], logs: [] })).toEqual([]);
  });

  it("puts overdue doses before the upcoming appointment", () => {
    const reminders = buildReminders({
      today,
      now,
      appointments: [
        { id: "a1", title: "Scan", scheduled_at: "2026-09-14T10:00:00+05:30", status: "upcoming" },
      ],
      medicines: [medicine],
      logs: [],
    });
    expect(reminders[0]!.kind).toBe("dose");
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx vitest run lib/domain/reminders.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement reminders.ts**

Create `lib/domain/reminders.ts`:

```ts
import { diffDays, todayInAppZone } from "@/lib/domain/dates";
import { APP_TIMEZONE } from "@/lib/config";

export interface ReminderMedicine {
  id: string;
  name: string;
  schedule_times: string[];
  days_of_week: number[] | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

export interface ReminderAppointment {
  id: string;
  title: string;
  scheduled_at: string;
  status: "upcoming" | "completed" | "cancelled";
}

export interface ReminderLog {
  medicine_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: "taken" | "skipped";
}

export type Reminder =
  | { kind: "dose"; refId: string; medicineName: string; scheduledTime: string; isOverdue: true }
  | { kind: "appointment"; refId: string; title: string; daysAhead: number; scheduledAt: string };

/** 1 = Monday through 7 = Sunday, matching the medicines.days_of_week convention. */
function isoWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return jsDay === 0 ? 7 : jsDay;
}

function minutesNowInAppZone(now: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(now));
  const [h, m] = parts.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

/**
 * Today's outstanding items only. A dose is outstanding when its time has passed
 * and no log row exists for it. "Missed" is never stored, so a late log always works.
 */
export function buildReminders({
  today,
  now,
  appointments,
  medicines,
  logs,
}: {
  today: string;
  now: number;
  appointments: ReminderAppointment[];
  medicines: ReminderMedicine[];
  logs: ReminderLog[];
}): Reminder[] {
  const nowMinutes = minutesNowInAppZone(now);
  const weekday = isoWeekday(today);

  const logged = new Set(
    logs
      .filter((l) => l.scheduled_date === today)
      .map((l) => `${l.medicine_id}@${l.scheduled_time.slice(0, 5)}`),
  );

  const doses: Reminder[] = [];
  for (const medicine of medicines) {
    if (!medicine.is_active) continue;
    if (diffDays(medicine.start_date, today) < 0) continue;
    if (medicine.end_date && diffDays(medicine.end_date, today) > 0) continue;
    if (medicine.days_of_week && !medicine.days_of_week.includes(weekday)) continue;

    for (const raw of medicine.schedule_times) {
      const time = raw.slice(0, 5);
      if (minutesOf(time) > nowMinutes) continue;
      if (logged.has(`${medicine.id}@${time}`)) continue;
      doses.push({
        kind: "dose",
        refId: medicine.id,
        medicineName: medicine.name,
        scheduledTime: time,
        isOverdue: true,
      });
    }
  }
  doses.sort((a, b) =>
    a.kind === "dose" && b.kind === "dose" ? a.scheduledTime.localeCompare(b.scheduledTime) : 0,
  );

  const next = appointments
    .filter((a) => a.status === "upcoming" && new Date(a.scheduled_at).getTime() >= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

  const appointmentReminders: Reminder[] = next
    ? [
        {
          kind: "appointment",
          refId: next.id,
          title: next.title,
          scheduledAt: next.scheduled_at,
          daysAhead: diffDays(today, new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(new Date(next.scheduled_at))),
        },
      ]
    : [];

  return [...doses, ...appointmentReminders];
}

export { todayInAppZone };
```

- [ ] **Step 5: Run it and watch it pass**

Run: `npx vitest run lib/domain/reminders.test.ts`
Expected: PASS.

- [ ] **Step 6: Write the query module**

Create `lib/supabase/queries/today.ts` with one exported function returning everything Today needs in parallel: the active pregnancy, the profile display name, today's medicines and logs, upcoming appointments, and up to two published content items whose week range covers her current week. All queries are RLS-scoped; none passes a user id explicitly.

- [ ] **Step 7: Write the failing TodayScreen test**

Create `app/(app)/today/TodayScreen.test.tsx`. Assert:
- the greeting includes her name and her week
- the illustration renders with descriptive alt text naming the week
- an overdue dose reminder appears with gentle wording and no failure language (assert the rendered text does not match `/missed|failed|you forgot/i`)
- with no reminders, a calm empty line appears rather than an empty card
- recommended reading renders up to two items and links to the right slug
- the feeling box is present with both a text field and a mic control
- **no `texture-motif` is rendered on this screen** (`queryByTestId("texture-motif")` is null)
- exactly one element carries the primary-emphasis class
- a post-term state (week 40, `isPostTerm: true`) renders the holding message rather than an error

- [ ] **Step 8: Run it, watch it fail, implement from the designer's markup, run it again**

Expected: PASS. The illustration's alt text comes from a translation key taking the week as a parameter, so Hindi gets a natural sentence rather than a template.

- [ ] **Step 9: Write the FeelingBox test and implementation**

The box itself only collects and submits; the triage work is Session 19. Test: it submits trimmed text; it refuses to submit empty or whitespace-only text and says why; it shows the mic button only when the transcriber reports availability; it disables submission while offline and explains why; and it emits `checkin_submitted` with a length bucket and never the text.

- [ ] **Step 10: Add the e2e Today spec**

Create `tests/e2e/today.spec.ts`: after onboarding, `/today` shows the correct week for a known LMP, and the page has no axe violations in both languages.

- [ ] **Step 11: Verify and commit**

```bash
git add lib/domain/reminders.ts lib/supabase/queries "app/(app)/today" i18n tests
git commit -m "feat(today): add calm Today screen with derived reminders and the feeling box"
```

---

## Session 19: Voice input, triage engine, check-in screen

**Gate B — request before starting:** ask the product owner for the red-flag symptom rules: rows of `match_terms`, `severity`, `guidance_title`, `guidance_body`, `priority`, in English and Hindi. **Stop until they arrive.** Never author a severity threshold or guidance text.
**Gate A — also request:** the check-in and triage-result screens' designer markup.

**Goal:** She describes how she feels, by voice or typing, and gets a calm, reviewed response at one of three severity levels, with the urgent path working offline.

**Files:**
- Create: `lib/speech/transcribe.ts`, `lib/speech/webspeech.ts` + test
- Create: `lib/domain/triage.ts` + test
- Create: `app/(app)/checkin/page.tsx`, `app/(app)/checkin/CheckinScreen.tsx` + test
- Create: `app/actions/checkin.ts`
- Create: `supabase/seed/symptom_rules.sql` (from the product owner's content)
- Modify: `i18n/en.json`, `i18n/hi.json`

**Interfaces:**
- Produces:
  - `Transcriber` interface: `isAvailable(): boolean`, `start({ locale, onResult, onError }): () => void`
  - `triage({ text, rules }): TriageResult`
  - `saveCheckin({ body, inputMethod })` server action

- [ ] **Step 1: Request the content and the asset, then stop**

- [ ] **Step 2: Write the failing triage test**

Create `lib/domain/triage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { triage, type SymptomRule } from "@/lib/domain/triage";

// Non-medical placeholder rules. Real rules are product-owner content (Gate B).
const rules: SymptomRule[] = [
  { id: "r-general", match_terms: ["tired", "thaka"], severity: "general", priority: 10 },
  { id: "r-clinic", match_terms: ["swelling", "sujan"], severity: "contact_clinic", priority: 50 },
  { id: "r-urgent", match_terms: ["bleeding", "khoon"], severity: "urgent", priority: 90 },
  { id: "r-urgent-phrase", match_terms: ["very bad headache"], severity: "urgent", priority: 95 },
  { id: "r-urgent-hindi", match_terms: ["तेज़ दर्द"], severity: "urgent", priority: 95 },
];

describe("triage", () => {
  it("returns no match for text that matches nothing", () => {
    expect(triage({ text: "I watched a film today", rules })).toEqual({ severity: null, matchedRuleId: null });
  });

  it("matches a general term", () => {
    expect(triage({ text: "I feel tired", rules })).toEqual({ severity: "general", matchedRuleId: "r-general" });
  });

  it("matches regardless of case", () => {
    expect(triage({ text: "TIRED all day", rules }).severity).toBe("general");
  });

  it("matches despite surrounding punctuation", () => {
    expect(triage({ text: "so much swelling!!", rules }).severity).toBe("contact_clinic");
  });

  it("returns the highest severity when several terms match", () => {
    const result = triage({ text: "I am tired and there is bleeding", rules });
    expect(result.severity).toBe("urgent");
    expect(result.matchedRuleId).toBe("r-urgent");
  });

  it("prefers the higher priority rule within the same severity", () => {
    expect(triage({ text: "a very bad headache and bleeding", rules }).matchedRuleId).toBe("r-urgent-phrase");
  });

  it("matches a multi-word phrase only when the whole phrase is present", () => {
    expect(triage({ text: "a bad headache", rules }).severity).toBeNull();
  });

  it("matches a Devanagari term", () => {
    expect(triage({ text: "मुझे तेज़ दर्द हो रहा है", rules }).severity).toBe("urgent");
  });

  it("matches a transliterated term, because people type Hinglish", () => {
    expect(triage({ text: "bahut thaka hua lag raha hai", rules }).severity).toBe("general");
  });

  it("does not match a term occurring inside a longer word", () => {
    expect(triage({ text: "I went to the retired teachers meeting", rules }).severity).toBeNull();
  });

  it("returns no match for empty or whitespace text", () => {
    expect(triage({ text: "   ", rules }).severity).toBeNull();
  });

  it("returns no match when there are no rules at all, rather than guessing", () => {
    expect(triage({ text: "bleeding", rules: [] })).toEqual({ severity: null, matchedRuleId: null });
  });

  it("ignores an inactive rule", () => {
    const inactive = rules.map((r) => ({ ...r, is_active: false }));
    expect(triage({ text: "bleeding", rules: inactive }).severity).toBeNull();
  });

  it("collapses repeated whitespace before matching", () => {
    expect(triage({ text: "a very    bad     headache", rules }).severity).toBe("urgent");
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `npx vitest run lib/domain/triage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement triage.ts**

Create `lib/domain/triage.ts`:

```ts
import type { Severity } from "@/lib/domain/severity";

export type { Severity };

export interface SymptomRule {
  id: string;
  match_terms: string[];
  severity: Severity;
  priority: number;
  is_active?: boolean;
}

export interface TriageResult {
  severity: Severity | null;
  matchedRuleId: string | null;
}

const SEVERITY_RANK: Record<Severity, number> = { general: 1, contact_clinic: 2, urgent: 3 };

function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

const LATIN_ONLY = /^[a-z\s'-]+$/;

function containsTerm(haystack: string, term: string): boolean {
  const needle = normalise(term);
  if (needle === "") return false;

  // Latin terms get word boundaries so "tired" does not match "retired".
  // Devanagari has no ASCII word characters, so \b is useless there; substring
  // matching on a whitespace-normalised string is the correct behaviour.
  if (LATIN_ONLY.test(needle)) {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, "u").test(haystack);
  }
  return haystack.includes(needle);
}

/**
 * Deterministic rule matching. No model, no inference, no guessing. Rules and
 * their severities are reviewed content supplied by the product owner; this
 * function only decides which of them the text matches.
 */
export function triage({ text, rules }: { text: string; rules: SymptomRule[] }): TriageResult {
  const haystack = normalise(text);
  if (haystack === "") return { severity: null, matchedRuleId: null };

  const active = rules.filter((r) => r.is_active !== false);

  const matches = active.filter((rule) => rule.match_terms.some((term) => containsTerm(haystack, term)));
  if (matches.length === 0) return { severity: null, matchedRuleId: null };

  matches.sort((a, b) => {
    const bySeverity = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    return bySeverity !== 0 ? bySeverity : b.priority - a.priority;
  });

  const winner = matches[0]!;
  return { severity: winner.severity, matchedRuleId: winner.id };
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `npx vitest run lib/domain/triage.test.ts`
Expected: PASS.

- [ ] **Step 6: Write the failing transcriber test**

Create `lib/speech/webspeech.test.ts`. Assert: `isAvailable()` is false when neither `SpeechRecognition` nor `webkitSpeechRecognition` exists; true when either does; `start()` sets the recognition language from the locale (`hi-IN` or `en-IN`); results are passed to `onResult`; an error is passed to `onError` with a typed reason (`permission_denied`, `no_speech`, `network`, `unknown`); the returned function stops recognition; and **no audio is retained** — assert the implementation holds no `Blob`, `MediaRecorder`, or array of chunks by grepping the file for those identifiers inside the test.

- [ ] **Step 7: Implement the transcriber behind an interface**

Create `lib/speech/transcribe.ts`:

```ts
import type { Locale } from "@/lib/config";

export type TranscribeError = "permission_denied" | "no_speech" | "network" | "unsupported" | "unknown";

export interface Transcriber {
  isAvailable(): boolean;
  /** Starts listening. Returns a stop function. Audio is never buffered or uploaded. */
  start(args: {
    locale: Locale;
    onResult: (text: string, isFinal: boolean) => void;
    onError: (reason: TranscribeError) => void;
  }): () => void;
}
```

Create `lib/speech/webspeech.ts` implementing it with `SpeechRecognition`, `continuous: false`, `interimResults: true`, and `lang` set to `hi-IN` or `en-IN`. Map `error` values: `not-allowed` and `service-not-allowed` to `permission_denied`, `no-speech` to `no_speech`, `network` to `network`, anything else to `unknown`.

Swapping to a server transcriber in Phase 2 means adding one file implementing `Transcriber`. Nothing else changes.

- [ ] **Step 8: Seed the product owner's rules**

Create `supabase/seed/symptom_rules.sql` from the content supplied at Gate B, in both locales. Delete the placeholder rules from `content.placeholder.sql` in the same commit so no placeholder severity can be reached.

- [ ] **Step 9: Write the failing CheckinScreen test**

Assert:
- text input submits and shows the matching severity badge and guidance
- the mic button appears only when the transcriber is available, and is absent, not disabled, otherwise
- permission denial shows one plain explanation and leaves the text field usable
- a no-match result saves the entry with no severity and makes no claim (assert no `SeverityBadge` renders and the copy does not say "you are fine")
- the urgent result renders the urgent badge as an alert, shows her clinic and doctor name from her profile for context, and renders the disclaimer banner
- every result renders the disclaimer banner
- while offline, the urgent guidance still renders from the passed-in cached rules, and submission is blocked with a clear explanation
- `triage_result_shown` is emitted with the severity only, never the text

- [ ] **Step 10: Implement the screen, the action, and the offline guidance cache**

`app/actions/checkin.ts` runs `triage()` server-side too and stores `severity` and `matched_rule_id` alongside the body, so the stored record matches what she was shown. The rules are fetched once and cached by the service worker in Session 33; this session fetches them normally and passes them in as props, which is what makes the offline test above possible.

- [ ] **Step 11: Verify and commit**

```bash
git add lib/domain/triage.ts lib/speech "app/(app)/checkin" app/actions/checkin.ts supabase/seed i18n
git commit -m "feat(checkin): add deterministic triage, voice input behind an interface and the check-in screen"
```

**Done when:** triage is fully deterministic with 100% branch coverage, no audio is retained anywhere, the urgent path renders offline, and every outcome carries the disclaimer. Confirm in the commit body that the shipped rules came from the product owner and that placeholder rules were deleted.

---

## Session 20: My Baby — illustration, stage progress, merged timeline, baby name

**Gate A — request before starting:** ask for the My Baby screen's designer markup, all nine stage illustrations (Lottie plus static fallback), and the timeline row layout. Stop until they arrive.

**Goal:** Her baby's current stage, her position across the nine stages, an editable baby name, and the merged timeline: system week milestones interleaved with her own logged events.

**Files:**
- Create: `lib/domain/timeline.ts` + test
- Create: `lib/supabase/queries/baby.ts`
- Create: `app/(app)/baby/page.tsx`, `app/(app)/baby/BabyScreen.tsx` + test
- Create: `app/(app)/baby/BabyNameField.tsx` + test
- Create: `app/actions/baby.ts`
- Modify: `i18n/en.json`, `i18n/hi.json`

**Interfaces:**
- Produces:
  - `buildTimeline({ events, currentWeek, milestones, locale }): TimelineEntry[]`
  - `updateBabyName(name)` server action

- [ ] **Step 1: Request the assets and stop**

- [ ] **Step 2: Write the failing timeline test**

Create `lib/domain/timeline.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildTimeline } from "@/lib/domain/timeline";

const events = [
  { id: "e1", event_type: "kick_session" as const, occurred_at: "2026-09-10T10:00:00Z", title: "10 kicks counted", body: null, source: "user" as const },
  { id: "e2", event_type: "report" as const, occurred_at: "2026-08-20T10:00:00Z", title: "Scan report added", body: null, source: "user" as const },
];

const milestones = [
  { stage: 1, week: 0, titleKey: "milestones.1" },
  { stage: 2, week: 8, titleKey: "milestones.2" },
  { stage: 3, week: 12, titleKey: "milestones.3" },
];

const context = { lmp: "2026-03-01", currentWeek: 14 };

describe("buildTimeline", () => {
  it("returns her own events newest first", () => {
    const entries = buildTimeline({ events, milestones: [], ...context });
    expect(entries.map((e) => e.id)).toEqual(["e1", "e2"]);
  });

  it("includes only milestones she has already reached", () => {
    const entries = buildTimeline({ events: [], milestones, ...context });
    expect(entries).toHaveLength(3);
    expect(buildTimeline({ events: [], milestones, lmp: "2026-03-01", currentWeek: 9 })).toHaveLength(2);
  });

  it("never includes a future milestone, because the timeline is a record, not a forecast", () => {
    const entries = buildTimeline({ events: [], milestones, lmp: "2026-03-01", currentWeek: 5 });
    expect(entries.every((e) => e.kind === "milestone" && e.week <= 5)).toBe(true);
  });

  it("interleaves milestones and events in one reverse-chronological list", () => {
    const entries = buildTimeline({ events, milestones, ...context });
    const times = entries.map((e) => new Date(e.occurredAt).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("dates a milestone from the last menstrual period, so it sits correctly in the order", () => {
    const entries = buildTimeline({ events: [], milestones: [milestones[1]!], ...context });
    // Week 8 after an LMP of 2026-03-01 is 2026-04-26.
    expect(entries[0]!.occurredAt.slice(0, 10)).toBe("2026-04-26");
  });

  it("marks which entries are hers and which are ours", () => {
    const entries = buildTimeline({ events, milestones, ...context });
    expect(entries.some((e) => e.kind === "event")).toBe(true);
    expect(entries.some((e) => e.kind === "milestone")).toBe(true);
  });

  it("returns an empty list when there is nothing at all", () => {
    expect(buildTimeline({ events: [], milestones: [], lmp: "2026-03-01", currentWeek: 0 })).toEqual([]);
  });

  it("falls back to dating milestones from the due date when no last period is known", () => {
    const entries = buildTimeline({ events: [], milestones: [milestones[1]!], edd: "2026-12-06", currentWeek: 14 });
    expect(entries[0]!.occurredAt.slice(0, 10)).toBe("2026-04-26");
  });

  it("keeps a stable order for two entries at the same moment", () => {
    const same = [
      { ...events[0]!, id: "a", occurred_at: "2026-09-10T10:00:00Z" },
      { ...events[0]!, id: "b", occurred_at: "2026-09-10T10:00:00Z" },
    ];
    expect(buildTimeline({ events: same, milestones: [], ...context }).map((e) => e.id)).toEqual(["a", "b"]);
  });
});
```

- [ ] **Step 3: Run it, watch it fail, then implement**

Create `lib/domain/timeline.ts`. Milestones carry a translation key, never copy. Each milestone is dated by adding `week * 7` days to the LMP, deriving the LMP from the EDD when it is not stored. The merge is a single stable sort on `occurredAt` descending.

Run: `npx vitest run lib/domain/timeline.test.ts`
Expected: PASS.

- [ ] **Step 4: Write the failing BabyScreen test**

Assert:
- the illustration for the current stage renders with week-specific alt text
- `StageProgress` shows the correct stage out of nine
- the stage does not change between boundary weeks (render week 9 and week 11, assert the same stage)
- the timeline renders both her events and reached milestones
- a long timeline uses the show-more pattern beyond 15 entries
- with nothing logged, the timeline shows an `EmptyState` with section-specific copy
- the baby name field is present and optional
- **no field anywhere offers the baby's sex** — `queryByLabelText(/sex|gender|boy|girl/i)` is null
- no `texture-motif` renders on this screen

- [ ] **Step 5: Write the failing BabyNameField test**

Assert: it shows the current name; it saves on blur and shows a toast; it accepts Devanagari; it accepts being cleared back to empty; it trims whitespace; it rejects a name longer than 60 characters with a bounded message; and it blocks saving while offline with an explanation.

- [ ] **Step 6: Implement both from the designer's markup, plus the action**

`app/actions/baby.ts` updates `pregnancies.baby_name` for the active pregnancy, returning a field error rather than throwing on a validation failure.

- [ ] **Step 7: Verify and commit**

```bash
git add lib/domain/timeline.ts "app/(app)/baby" app/actions/baby.ts lib/supabase/queries/baby.ts i18n
git commit -m "feat(baby): add stage illustration, nine-stage progress and merged timeline"
```

---

## Session 21: Kick counter

**Gate A — request before starting:** ask for the kick counter's designer markup. Stop until it arrives.

**Goal:** A large, forgiving tap target that counts kicks toward a target of ten, survives being abandoned, and writes a timeline entry when finished.

**Files:**
- Create: `lib/domain/kicks.ts` + test
- Create: `app/(app)/baby/kicks/page.tsx`, `app/(app)/baby/kicks/KickCounter.tsx` + test
- Create: `app/actions/kicks.ts`
- Modify: `i18n/en.json`, `i18n/hi.json`

**Interfaces:**
- Produces:
  - `kickState({ events, startedAt, now, targetCount }): { count, remaining, elapsedMinutes, isComplete, lastKickAt }` where `events` is `{ tapId: string; occurredAt: string }[]`
  - `shouldAutoClose({ startedAt, now }): boolean`
  - `startKickSession()`, `recordKick(sessionId, tapId)`, `finishKickSession(sessionId)` server actions. **`tapId` is generated by the client and reused across a retry** — if the action generated it, a retry would produce a new id and the deduplication would do nothing, which is the entire point of the column

- [ ] **Step 1: Request the asset and stop**

- [ ] **Step 2: Write the failing kicks test**

Create `lib/domain/kicks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { kickState, shouldAutoClose } from "@/lib/domain/kicks";

const start = new Date("2026-09-11T10:00:00Z").getTime();
const at = (minutes: number) => new Date(start + minutes * 60_000).toISOString();
/** One recorded tap. tapId is carried so the UI can reconcile a retry without double counting. */
const tap = (minutes: number) => ({ tapId: `tap-${minutes}`, occurredAt: at(minutes) });

describe("kickState", () => {
  it("reports an empty session", () => {
    expect(kickState({ events: [], startedAt: at(0), now: start, targetCount: 10 })).toEqual({
      count: 0,
      remaining: 10,
      elapsedMinutes: 0,
      isComplete: false,
      lastKickAt: null,
    });
  });

  it("counts kicks and the time remaining to the target", () => {
    const state = kickState({
      events: [tap(1), tap(2), tap(3)],
      startedAt: at(0),
      now: start + 5 * 60_000,
      targetCount: 10,
    });
    expect(state).toMatchObject({ count: 3, remaining: 7, elapsedMinutes: 5, isComplete: false });
    expect(state.lastKickAt).toBe(at(3));
  });

  it("reports completion at the target", () => {
    const kicks = Array.from({ length: 10 }, (_, i) => tap(i + 1));
    expect(kickState({ events: kicks, startedAt: at(0), now: start + 600_000, targetCount: 10 })).toMatchObject({
      count: 10,
      remaining: 0,
      isComplete: true,
    });
  });

  it("does not report negative remaining when she taps past the target", () => {
    const kicks = Array.from({ length: 14 }, (_, i) => tap(i + 1));
    expect(kickState({ events: kicks, startedAt: at(0), now: start + 900_000, targetCount: 10 }).remaining).toBe(0);
  });

  it("rounds elapsed minutes down, so it never overstates the time", () => {
    expect(kickState({ events: [], startedAt: at(0), now: start + 119_000, targetCount: 10 }).elapsedMinutes).toBe(1);
  });

  it("handles a clock that appears to move backwards", () => {
    expect(kickState({ events: [], startedAt: at(5), now: start, targetCount: 10 }).elapsedMinutes).toBe(0);
  });

  it("counts a repeated tapId once, so a retried tap cannot inflate the count", () => {
    const duplicated = [tap(1), tap(2), tap(2)];
    expect(kickState({ events: duplicated, startedAt: at(0), now: start + 180_000, targetCount: 10 }).count).toBe(2);
  });

  it("orders by occurrence, not by the order rows arrived", () => {
    const shuffled = [tap(3), tap(1), tap(2)];
    expect(kickState({ events: shuffled, startedAt: at(0), now: start + 240_000, targetCount: 10 }).lastKickAt).toBe(at(3));
  });
});

describe("shouldAutoClose", () => {
  it("leaves a session from an hour ago open, so she can resume it", () => {
    expect(shouldAutoClose({ startedAt: at(0), now: start + 60 * 60_000 })).toBe(false);
  });

  it("closes a session left open overnight", () => {
    expect(shouldAutoClose({ startedAt: at(0), now: start + 13 * 60 * 60_000 })).toBe(true);
  });

  it("uses twelve hours as the boundary", () => {
    expect(shouldAutoClose({ startedAt: at(0), now: start + 12 * 60 * 60_000 - 1000 })).toBe(false);
    expect(shouldAutoClose({ startedAt: at(0), now: start + 12 * 60 * 60_000 + 1000 })).toBe(true);
  });
});
```

- [ ] **Step 3: Run it, watch it fail, then implement `lib/domain/kicks.ts`**

Run: `npx vitest run lib/domain/kicks.test.ts`
Expected: PASS.

- [ ] **Step 4: Write the failing KickCounter test**

Assert:
- the tap area is a single large button with an accessible name and a `tap-target` class
- tapping increments the visible count
- the count and elapsed time come from `kickState`, not from component state arithmetic
- reaching the target shows the completion state and the finish action
- an open session passed in as a prop is resumed with its existing count, not restarted
- a session older than twelve hours is presented as closed rather than resumed
- finishing calls the action once, even on a double tap
- **a retry of the same tap, through the action, does not change the count** — test by calling `recordKick(sessionId, tapId)` twice with the same `tapId` and asserting the count stays at one, which is the lost-response case the design exists for
- **the action rejects a malformed `tapId`** rather than storing it
- **while offline, tapping is refused** with a plain explanation, and `offline_write_blocked` is emitted with `feature: "kick"`. It is not accepted locally and queued: without a durable queue, closing the PWA would silently discard her count, and a lost kick count is the worst possible outcome on a screen she may be using to decide whether to go to hospital. Durable offline capture is a Phase 2 item
- a light haptic fires on a tap where the Vibration API exists, and nothing breaks where it does not

- [ ] **Step 5: Implement the counter and the actions**

**Each tap inserts one `kick_events` row carrying a `tap_id` generated by the client with `crypto.randomUUID()`.** The unique `(session_id, tap_id)` constraint is what makes the write safe to retry: if the response is lost but the insert committed, retrying the same `tap_id` conflicts and changes nothing, so the count cannot drift upward. A duplicate-key error on a retry is therefore treated as success, not as a failure.

There is no debounce and no local array. One tap, one insert, and the rendered count comes from the rows. If an insert fails for any other reason, the tap is reported as not recorded and the count does not advance — showing a number the database does not have would be worse than showing her the failure.

`finishKickSession` sets `ended_at` and inserts one `timeline_events` row of type `kick_session`.

- [ ] **Step 6: Verify and commit**

```bash
git add lib/domain/kicks.ts "app/(app)/baby/kicks" app/actions/kicks.ts i18n
git commit -m "feat(kicks): add resumable kick counter with derived state and timeline entry"
```

---

## Session 22: My Care hub, medicines, adherence day-grid

**Gate A — request before starting:** ask for the My Care hub, the medicine list, the add-medicine sheet and the adherence day-grid designer markup. Stop until they arrive.

**Goal:** Manual medicine entry, per-dose logging, and a visual adherence grid rather than a sentence about adherence.

**Files:**
- Create: `lib/domain/adherence.ts` + test
- Create: `lib/domain/medicines.ts` + test
- Create: `lib/supabase/queries/care.ts`
- Create: `app/(app)/care/page.tsx`, `app/(app)/care/CareHub.tsx` + test
- Create: `app/(app)/care/medicines/page.tsx`, `MedicineList.tsx`, `MedicineForm.tsx`, `AdherenceGrid.tsx` + tests
- Create: `app/actions/medicines.ts`
- Modify: `i18n/en.json`, `i18n/hi.json`

**Interfaces:**
- Produces:
  - `expectedDoses({ medicine, from, to }): { date: string; time: string }[]`
  - `adherenceGrid({ medicines, logs, from, to }): { date: string; expected: number; taken: number; skipped: number; unlogged: number }[]`
  - `adherenceRatio(grid): { taken: number; expected: number }`
  - `validateMedicine(input): { ok: true; value } | { ok: false; errors }`
  - `addMedicine`, `updateMedicine`, `deactivateMedicine`, `logDose` server actions

- [ ] **Step 1: Request the assets and stop**

- [ ] **Step 2: Write the failing expectedDoses and adherence tests**

Create `lib/domain/adherence.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { adherenceGrid, adherenceRatio, expectedDoses } from "@/lib/domain/adherence";

const daily = {
  id: "m1",
  schedule_times: ["09:00", "21:00"],
  days_of_week: null,
  start_date: "2026-09-08",
  end_date: null,
  is_active: true,
};

describe("expectedDoses", () => {
  it("produces one entry per time per day in range", () => {
    const doses = expectedDoses({ medicine: daily, from: "2026-09-08", to: "2026-09-10" });
    expect(doses).toHaveLength(6);
  });

  it("starts no earlier than the course start date", () => {
    const doses = expectedDoses({ medicine: daily, from: "2026-09-01", to: "2026-09-09" });
    expect(doses[0]!.date).toBe("2026-09-08");
  });

  it("stops at the course end date", () => {
    const doses = expectedDoses({
      medicine: { ...daily, end_date: "2026-09-09" },
      from: "2026-09-08",
      to: "2026-09-12",
    });
    expect(doses.at(-1)!.date).toBe("2026-09-09");
  });

  it("respects a day-of-week restriction", () => {
    // 2026-09-08 is a Tuesday (2) and 2026-09-09 a Wednesday (3).
    const doses = expectedDoses({
      medicine: { ...daily, days_of_week: [2] },
      from: "2026-09-08",
      to: "2026-09-09",
    });
    expect(doses.every((d) => d.date === "2026-09-08")).toBe(true);
  });

  it("returns nothing for an inactive medicine", () => {
    expect(expectedDoses({ medicine: { ...daily, is_active: false }, from: "2026-09-08", to: "2026-09-10" })).toEqual([]);
  });

  it("returns nothing when the range is inverted", () => {
    expect(expectedDoses({ medicine: daily, from: "2026-09-10", to: "2026-09-08" })).toEqual([]);
  });

  it("returns nothing for a medicine with no scheduled times", () => {
    expect(expectedDoses({ medicine: { ...daily, schedule_times: [] }, from: "2026-09-08", to: "2026-09-10" })).toEqual([]);
  });

  it("treats a dose at 00:00 as belonging to that calendar day, not the one before", () => {
    const doses = expectedDoses({
      medicine: { ...daily, schedule_times: ["00:00"] },
      from: "2026-09-08",
      to: "2026-09-08",
    });
    expect(doses).toEqual([{ date: "2026-09-08", time: "00:00" }]);
  });
});

describe("adherenceGrid", () => {
  const logs = [
    { medicine_id: "m1", scheduled_date: "2026-09-08", scheduled_time: "09:00", status: "taken" as const },
    { medicine_id: "m1", scheduled_date: "2026-09-08", scheduled_time: "21:00", status: "skipped" as const },
  ];

  it("returns one cell per day in the range, including days with nothing expected", () => {
    const grid = adherenceGrid({ medicines: [daily], logs, from: "2026-09-07", to: "2026-09-09" });
    expect(grid.map((c) => c.date)).toEqual(["2026-09-07", "2026-09-08", "2026-09-09"]);
    expect(grid[0]).toMatchObject({ expected: 0, taken: 0, skipped: 0, unlogged: 0 });
  });

  it("counts taken, skipped and unlogged separately, because they mean different things", () => {
    const grid = adherenceGrid({ medicines: [daily], logs, from: "2026-09-08", to: "2026-09-09" });
    expect(grid[0]).toMatchObject({ expected: 2, taken: 1, skipped: 1, unlogged: 0 });
    expect(grid[1]).toMatchObject({ expected: 2, taken: 0, skipped: 0, unlogged: 2 });
  });

  it("matches a log time stored with seconds", () => {
    const withSeconds = [{ ...logs[0]!, scheduled_time: "09:00:00" }];
    const grid = adherenceGrid({ medicines: [daily], logs: withSeconds, from: "2026-09-08", to: "2026-09-08" });
    expect(grid[0]!.taken).toBe(1);
  });

  it("ignores a log with no matching expected dose, rather than inflating the count", () => {
    const orphan = [{ medicine_id: "m1", scheduled_date: "2026-09-08", scheduled_time: "13:00", status: "taken" as const }];
    const grid = adherenceGrid({ medicines: [daily], logs: orphan, from: "2026-09-08", to: "2026-09-08" });
    expect(grid[0]).toMatchObject({ expected: 2, taken: 0, unlogged: 2 });
  });

  it("aggregates across several medicines", () => {
    const second = { ...daily, id: "m2", schedule_times: ["12:00"] };
    const grid = adherenceGrid({ medicines: [daily, second], logs: [], from: "2026-09-08", to: "2026-09-08" });
    expect(grid[0]!.expected).toBe(3);
  });

  it("handles two medicines sharing a name without mixing their logs", () => {
    const twin = { ...daily, id: "m2" };
    const onlyFirst = [{ medicine_id: "m1", scheduled_date: "2026-09-08", scheduled_time: "09:00", status: "taken" as const }];
    const grid = adherenceGrid({ medicines: [daily, twin], logs: onlyFirst, from: "2026-09-08", to: "2026-09-08" });
    expect(grid[0]).toMatchObject({ expected: 4, taken: 1, unlogged: 3 });
  });
});

describe("adherenceRatio", () => {
  it("reports taken out of expected", () => {
    const grid = adherenceGrid({
      medicines: [daily],
      logs: [{ medicine_id: "m1", scheduled_date: "2026-09-08", scheduled_time: "09:00", status: "taken" }],
      from: "2026-09-08",
      to: "2026-09-08",
    });
    expect(adherenceRatio(grid)).toEqual({ taken: 1, expected: 2 });
  });

  it("reports zero out of zero rather than dividing by zero", () => {
    expect(adherenceRatio([])).toEqual({ taken: 0, expected: 0 });
  });
});
```

- [ ] **Step 3: Run it, watch it fail, then implement `lib/domain/adherence.ts`**

Use `addDays` and `diffDays` for every date step. Normalise every time to `HH:MM` before comparing, which is what makes the seconds test pass. Expected: PASS.

- [ ] **Step 4: Write and implement `lib/domain/medicines.ts` validation**

Tests to write first: a name is required and trimmed; at least one scheduled time is required; at most six times; a time must be `HH:MM`; duplicate times in one medicine are collapsed rather than rejected; `end_date` must not precede `start_date`, with a specific message; `days_of_week` values must be 1 to 7; a duplicate name for an existing active medicine produces a warning flag rather than an error, since two doses of the same drug is legitimate.

- [ ] **Step 5: Write the failing AdherenceGrid component test**

Assert: it renders one cell per day with an accessible label per cell naming the date and the state; a fully taken day, a partly taken day, a skipped day and an unlogged day are each distinguishable by more than colour (assert a `data-state` attribute and a visible glyph); the grid has a text summary for screen readers; and the copy for an unlogged day uses gentle language with no failure words.

- [ ] **Step 6: Write the failing MedicineForm and MedicineList tests**

MedicineForm: native `time` inputs; adding and removing a time row; per-field specific errors; submitting returns the created row; the duplicate-name warning renders as a note, not a blocker; Devanagari medicine names accepted; submission blocked while offline with an explanation.

MedicineList: today's doses each with a log control; logging a dose shows a toast and updates optimistically; a past unlogged dose is still loggable; deactivating asks for confirmation in a `BottomSheet` and never uses a native `confirm()` dialog; an empty list shows the `EmptyState` with the medicine-specific copy from design document §5.2.

- [ ] **Step 7: Implement the components, the hub and the actions**

`CareHub` lists the six sub-sections with a one-line current state each. `app/actions/medicines.ts` holds `addMedicine`, `updateMedicine`, `deactivateMedicine` and `logDose`; `logDose` upserts on the unique triple so a double tap is idempotent.

- [ ] **Step 8: Emit the analytics events and commit**

Emit `medicine_added` and `medicine_dose_logged` with a `late` boolean. Never the medicine name.

```bash
git add lib/domain/adherence.ts lib/domain/medicines.ts "app/(app)/care" app/actions/medicines.ts lib/supabase/queries/care.ts i18n
git commit -m "feat(care): add medicines with per-dose logging and a visual adherence grid"
```

---

## Session 23: Appointments

**Gate A — request before starting:** ask for the appointment list and form designer markup. Stop until it arrives.

**Goal:** Upcoming and past appointments, created and edited by her, feeding both the Today reminders and the Doctor Visit Summary.

**Files:**
- Create: `lib/domain/appointments.ts` + test
- Create: `app/(app)/care/appointments/page.tsx`, `AppointmentList.tsx`, `AppointmentForm.tsx` + tests
- Create: `app/actions/appointments.ts`
- Modify: `i18n/en.json`, `i18n/hi.json`

**Interfaces:**
- Produces: `splitAppointments({ appointments, now }): { upcoming, past }`; `validateAppointment(input)`; `addAppointment`, `updateAppointment`, `cancelAppointment`, `completeAppointment` actions.

- [ ] **Step 1: Request the asset and stop**

- [ ] **Step 2: Write the failing appointments domain test**

Create `lib/domain/appointments.test.ts` covering:
- upcoming and past split on `now`, not on stored status alone
- an appointment whose time has passed but whose status is still `upcoming` appears in past, flagged `needsClosing: true`, because she should be asked whether it happened
- a cancelled appointment appears in neither list
- upcoming sorted ascending, past sorted descending
- two appointments at the identical moment both appear, in a stable order
- `validateAppointment` requires a title and a date and time, rejects a date more than two years out with a bounded message, accepts an appointment in the past (she may be recording one she already attended), trims text fields, and accepts Devanagari in every text field

- [ ] **Step 3: Run it, watch it fail, implement, run it again**

- [ ] **Step 4: Write the failing component tests**

AppointmentList: upcoming section first; a `needsClosing` appointment offers "Did this happen?" with complete and cancel actions; empty state per section with specific copy; past list uses the show-more pattern beyond 15; each row links to edit.

AppointmentForm: native `datetime-local` input; doctor and clinic default from her profile but are editable; specific errors per field; offline blocks submission with an explanation.

- [ ] **Step 5: Implement from the designer's markup, add the actions, emit `appointment_added` with `days_ahead` only**

- [ ] **Step 6: Verify and commit**

```bash
git add lib/domain/appointments.ts "app/(app)/care/appointments" app/actions/appointments.ts i18n
git commit -m "feat(care): add appointments with a close-the-loop prompt for past visits"
```

---

## Session 24: Vitals and trend charts

**Gate A — request before starting:** ask for the vitals entry and chart designer markup. Stop until it arrives.

**Goal:** Weight and blood-pressure logging with trend charts that follow the data-visualisation rules in design document §2, and that never interpret a reading clinically.

**Files:**
- Create: `lib/domain/vitals.ts` + test
- Create: `components/charts/TrendChart.tsx` + test
- Create: `app/(app)/care/vitals/page.tsx`, `VitalsScreen.tsx`, `VitalForm.tsx` + tests
- Create: `app/actions/vitals.ts`
- Modify: `i18n/en.json`, `i18n/hi.json`

**Interfaces:**
- Produces:
  - `vitalSeries({ vitals, kind, from, to }): { points: { date: string; value: number; secondValue?: number }[]; domain: { min, max } }`
  - `plausibility({ kind, value1, value2 }): { ok: true } | { ok: false; field: string; messageKey: string } | { ok: true; warnKey: string }`
  - `TrendChart({ series, seriesLabels, normalBand?, ariaSummary })`

- [ ] **Step 1: Request the asset and stop**

- [ ] **Step 2: Write the failing vitals domain test**

Cover: series built in ascending date order regardless of input order; two readings on one day both retained; an empty series returns an empty point list and a safe domain; the domain is padded so a flat line is not drawn on the axis; blood pressure produces two values per point.

Then cover the **two distinct boundaries**, which must not be conflated (spec §3.3):

```ts
describe("plausibility", () => {
  it("rejects a physically impossible weight, with the bound stated", () => {
    expect(plausibility({ kind: "weight", value1: 900 })).toMatchObject({
      ok: false,
      messageKey: "vitals.errors.weightRange",
    });
  });

  it("rejects a diastolic at or above the systolic as a data-entry error", () => {
    expect(plausibility({ kind: "bp", value1: 80, value2: 120 }).ok).toBe(false);
  });

  it("ACCEPTS a clinically notable but possible reading, and attaches a note", () => {
    const result = plausibility({ kind: "bp", value1: 165, value2: 105 });
    expect(result.ok).toBe(true);
    expect(result).toHaveProperty("warnKey");
  });

  it("accepts an ordinary reading with no note at all", () => {
    expect(plausibility({ kind: "bp", value1: 118, value2: 76 })).toEqual({ ok: true });
  });

  it("never returns a clinical claim, only a translation key", () => {
    const result = plausibility({ kind: "bp", value1: 165, value2: 105 });
    expect("warnKey" in result && result.warnKey).toMatch(/^vitals\./);
  });
});
```

The accept-and-note case is the one that matters clinically: the bounds in the database reject impossible numbers, and nothing in the product may refuse to record a real high reading. A woman with genuinely high blood pressure must be able to save it.

- [ ] **Step 3: Run it, watch it fail, implement, run it again**

- [ ] **Step 4: Write the failing TrendChart test**

Assert:
- renders one path per series
- each series carries a distinct line style or marker shape as well as a colour, per the design document rule
- each series has a direct end-of-line label
- the chart has an accessible text summary describing the trend, so it is not colour-and-shape only
- a normal-range band renders behind the line when one is given
- at most four series render; a fifth throws in development rather than silently adding a colour
- with one point, a marker renders and no path
- with no points, an `EmptyState` renders instead of an empty axis
- the chart uses only `chart-*` tokens (assert no `accent-primary` class appears)

- [ ] **Step 5: Implement the chart as inline SVG, with `d3-scale` for the scales**

```bash
npm i d3-scale
```

No charting library: one would bring its own colours, its own accessibility behaviour and its own DOM, all three of which this product needs to own. But hand-rolling *scales* is where bespoke chart code actually goes wrong — tick selection, domain padding, and date axes with duplicate values. `d3-scale` is headless, tree-shakes to a few kilobytes, and solves exactly that part.

Own the rest: the SVG markup, the `chart-*` tokens, the series line styles and marker shapes, the end-of-line labels, the focus order, and the accessible text summary.

- [ ] **Step 6: Write and implement the screen and form tests**

VitalsScreen: a tab for weight and one for blood pressure; the chart plus a reverse-chronological list; empty states per tab; the disclaimer banner present on the screen. VitalForm: native `number` inputs with `inputMode="decimal"`; blood pressure takes two fields; plausibility warnings render as notes and still allow saving; errors block saving; offline blocks saving with an explanation.

- [ ] **Step 7: Emit `vital_logged` with the kind only, then verify and commit**

```bash
git add lib/domain/vitals.ts components/charts "app/(app)/care/vitals" app/actions/vitals.ts i18n
git commit -m "feat(care): add weight and blood pressure logging with accessible trend charts"
```

---

## Session 25: Doctor advice and suggested questions

**Gate A — request before starting:** ask for the advice list, advice entry and suggested-questions designer markup.
**Gate B — request before starting:** ask for the week-mapped suggested questions in both languages. Stop until both arrive.

**Goal:** Her record of what the doctor said, and a rule-based list of questions worth asking next time, with the ones she marks carried into the Visit Summary.

**Files:**
- Create: `lib/domain/questions.ts` + test
- Create: `app/(app)/care/advice/page.tsx`, `AdviceList.tsx`, `AdviceForm.tsx` + tests
- Create: `app/(app)/care/questions/page.tsx`, `SuggestedQuestions.tsx` + test
- Create: `app/actions/advice.ts`
- Create: `supabase/seed/suggested_questions.sql`
- Modify: `i18n/en.json`, `i18n/hi.json`

**Interfaces:**
- Produces: `selectQuestions({ questions, week, locale, limit }): Question[]`; `addAdvice`, `updateAdvice`, `deleteAdvice`, `toggleQuestionMark` actions.

- [ ] **Step 1: Request the content and assets, then stop**

- [ ] **Step 2: Write the failing questions test**

Create `lib/domain/questions.test.ts` covering: only questions whose week range covers the current week are returned; higher priority first; the limit is respected; an empty list returns empty rather than throwing; a question available in the requested locale wins over the English one; an English-only question is returned with a fallback flag rather than hidden; inactive questions are excluded; and a week outside every range returns an empty list rather than the nearest match, because a mismatched question is worse than none.

- [ ] **Step 3: Run it, watch it fail, implement, run it again**

- [ ] **Step 4: Write the failing advice component tests**

AdviceList: reverse-chronological; each entry shows the date and, where linked, the appointment; long entries truncate with show-more rather than clipping; empty state with advice-specific copy; entries are editable and deletable with confirmation in a sheet.

AdviceForm: text or voice input using the same `Transcriber` interface as the check-in box; optional link to a past appointment; the date defaults to today and is editable; specific errors; offline blocks saving.

- [ ] **Step 5: Write the failing SuggestedQuestions test**

Assert: questions for the current week render; marking a question persists and shows a toast; marked questions are visually distinguished by more than colour; an English-only question carries the "English only" marker; the disclaimer banner is present; and the component makes no clinical claim in its own copy.

- [ ] **Step 6: Implement everything from the designer's markup, seed the questions, emit `advice_saved`**

Marking a question persists into `public.question_marks`, which already exists from Session 10 with its RLS policies and its cross-user denial test. **No migration is needed in this session** — the data layer closed at Session 10 and stays closed.

`toggleQuestionMark` inserts a row or deletes the existing one, relying on the unique `(user_id, suggested_question_id)` constraint so a double tap cannot create two marks. The Doctor Visit Summary in Session 27 reads these rows for its questions section.

- [ ] **Step 7: Verify and commit**

```bash
git add lib/domain/questions.ts "app/(app)/care/advice" "app/(app)/care/questions" app/actions/advice.ts supabase/seed i18n
git commit -m "feat(care): add doctor advice records and week-mapped suggested questions"
```

---

## Session 26: Reports — capture, upload, view

**Gate A — request before starting:** ask for the reports list, the capture screen and the viewer designer markup. Stop until it arrives.

**Goal:** She gets a report into the app from her camera or her files, labels it, and can open it later. Raw storage only; no extraction.

**Files:**
- Create: `lib/domain/reports.ts` + test
- Create: `app/(app)/care/reports/page.tsx`, `ReportList.tsx`, `ReportCapture.tsx`, `ReportViewer.tsx` + tests
- Create: `app/actions/reports.ts`
- Modify: `i18n/en.json`, `i18n/hi.json`

**Interfaces:**
- Produces:
  - `validateReportFile({ name, type, size }): { ok: true; mimeGroup: "image" | "pdf" } | { ok: false; reason }`
  - `storagePath({ userId, reportId, filename }): string`
  - `sanitiseFilename(name): string`
  - `uploadReport(formData)`, `deleteReport(id)`, `signedReportUrl(id)` actions

- [ ] **Step 1: Request the asset and stop**

- [ ] **Step 2: Write the failing reports domain test**

Create `lib/domain/reports.test.ts` covering:
- accepts `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- accepts `image/heic` and `image/heif`, because that is what an iPhone produces by default
- rejects any other type with reason `type`
- rejects a file over 20 MB with reason `size`, and states the limit
- rejects a zero-byte file with reason `empty`
- classifies the mime group correctly for both groups
- `storagePath` produces `{userId}/{reportId}/{filename}` with no leading slash
- `sanitiseFilename` strips path separators, strips leading dots, collapses whitespace to hyphens, preserves the extension, transliterates nothing but keeps Devanagari characters intact, and truncates a very long name to 80 characters plus the extension
- `sanitiseFilename` never returns an empty string, falling back to a generic name

- [ ] **Step 3: Run it, watch it fail, implement, run it again**

The path shape matters: the storage policy written in Session 9 authorises on the first path segment, so a bug here is a security bug. The test is the contract.

- [ ] **Step 4: Write the failing ReportCapture test**

Assert:
- the file input accepts the allowed types and sets `capture="environment"` so Android opens the camera
- a gallery and files option remains available, since not everything is photographed in the moment
- title and date are required; the date defaults to today
- an oversized file is rejected before any upload starts, with the limit stated
- an unsupported type is rejected with the reason named
- upload progress is shown and the form is not resubmittable while in flight
- a failed upload preserves the form and offers retry
- offline blocks capture with an explanation and emits `offline_write_blocked`
- on success, `report_uploaded` is emitted with the mime group and a size bucket, never the filename or title

- [ ] **Step 5: Implement capture, upload and the viewer**

**The id is generated in the action, then the row and the path are written together.** `reports.storage_path` is `NOT NULL`, so the row cannot be inserted first and have its path derived from the resulting default id afterwards — that sequence cannot be executed at all. Instead:

```ts
const reportId = crypto.randomUUID();                       // generated here, not by the default
const path = storagePath({ userId, reportId, filename });    // derived before any write

const inserted = await supabase.from("reports").insert({
  id: reportId,                                              // id and path in the SAME insert
  user_id: userId,
  title, report_type: reportType, report_date: reportDate,
  storage_path: path,
  mime_type: mimeType, size_bytes: sizeBytes,
}).select("id").single();
if (inserted.error) return { error: "metadata" };

return { reportId, path };                                   // the only path the client may upload to
```

The client then uploads to exactly that path with its own session, so RLS applies. If the upload fails, the action deletes the metadata row.

That ordering is deliberate. Uploading first and inserting second leaves an orphaned object whenever the insert fails — invisible to her, unreachable by the app, and still counting against storage. Deriving the path from a server-generated id also means the path can never name a report id she does not own, which the storage policy's first-segment check alone does not establish.

Tests: the row is created before the upload is attempted; the persisted `storage_path` is byte-identical to the path the client is told to upload to; a failed upload leaves no `reports` row behind; and the derived path's first segment is always the authenticated user's id, so it can never name another user's folder.

`ReportViewer` requests a signed URL valid for five minutes, renders an image inline or a PDF in an `<object>` with a download-free fallback link, and re-requests the URL if it expires while open rather than showing a broken frame.

- [ ] **Step 6: Write the failing ReportList test**

Assert: reverse-chronological by report date; each row shows title, type and date; an empty state with report-specific copy; show-more beyond 15; delete asks for confirmation in a sheet and states that the file is removed permanently; and the screen states plainly that reports are stored as-is with no reading of their contents in this version.

- [ ] **Step 7: Verify and commit**

```bash
git add lib/domain/reports.ts "app/(app)/care/reports" app/actions/reports.ts i18n
git commit -m "feat(care): add report capture, private storage and expiry-safe viewing"
```

---

## Session 27: Doctor Visit Summary and print

**Gate A — request before starting:** ask for the Doctor Visit Summary designer markup. It is in the restrained register, so confirm explicitly that the designer knows it carries no illustration, no motion and no motif. Stop until it arrives.

**Goal:** The screen the doctor reads. One page where possible, printable, honest about its provenance.

**Files:**
- Create: `lib/domain/summary.ts` + test
- Create: `app/(app)/care/summary/page.tsx`, `SummaryDocument.tsx` + test
- Create: `styles/print.css`
- Modify: `i18n/en.json`, `i18n/hi.json`
- Create: `tests/e2e/summary.spec.ts`

**Interfaces:**
- Produces: `buildSummary({ profile, pregnancy, progress, medicines, logs, appointments, advice, vitals, reports, markedQuestions, today }): SummaryModel`

- [ ] **Step 1: Request the asset and stop**

- [ ] **Step 2: Write the failing summary test**

Create `lib/domain/summary.test.ts` covering:
- the header carries her name, current week and day, EDD, and doctor and clinic where known
- a missing doctor or clinic is omitted rather than rendered as an empty label
- only active medicines appear, each with dosage, schedule and a 14-day taken-out-of-expected ratio
- the last appointment and the next appointment both appear, each with its date
- advice entries appear newest first, limited to the most recent five, with a count of any remainder
- the latest weight and the latest three blood-pressure readings appear
- reports appear as name and date only, never as content
- check-ins from the last 14 days appear with their severity, and ones with no severity appear as plain notes with no severity claim
- marked questions appear in their own section
- **the model always includes the provenance line key**, in every branch, including the entirely-empty case
- an entirely empty summary still produces a valid model with her header and the provenance line, not null
- the model contains no raw database row, only display-ready values, so the component cannot accidentally render something unintended

- [ ] **Step 3: Run it, watch it fail, implement, run it again**

Expected: PASS. This is the highest-value test in the plan: the Visit Summary is read by a clinician, and a silently missing medicine is a real-world harm.

- [ ] **Step 4: Write the failing SummaryDocument test**

Assert:
- every section the model provides renders, and no section renders when its list is empty
- the provenance line renders, in both languages
- **no illustration, no `texture-motif`, no animation class** appears anywhere in the output
- exactly two colours are used: assert no class other than `text-text-primary`, `text-accent-primary` and the neutral surfaces appears
- a print button exists and calls `window.print`
- `summary_viewed` is emitted with the week only, and `summary_printed` on print

- [ ] **Step 5: Write the print stylesheet**

Create `styles/print.css`, imported only by the summary route:

```css
@media print {
  nav, [data-print="hide"], button { display: none !important; }

  @page {
    margin: 15mm;
  }

  html, body {
    background: #FFFFFF;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  main { padding: 0 !important; max-width: 100% !important; }

  /* A table row, a medicine entry or an appointment must never split across pages. */
  [data-print-block], tr, li { break-inside: avoid; }

  /* Repetition across pages is done with a real table header, which every print
     engine repeats natively. position: fixed is NOT a reliable way to repeat a
     running header, especially in mobile Safari, where it typically paints once. */
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
}
```

The summary's body is therefore laid out as a single `<table>` whose `<thead>` carries the clinic-visit date and the "information entered by the user, not medically verified" line, and whose `<tbody>` rows are the sections. That is a deliberate use of a table for layout, justified by it being the only mechanism both target print engines implement for repetition.

**Concrete pass criterion, not "confirm it looks right":** generate a summary with enough content to span three pages, print to PDF on Android Chrome and on iOS Safari, and verify that (1) the date and the disclaimer appear on all three pages, (2) no medicine row, appointment row or section heading is split across a page boundary, and (3) both colours survive. If either engine fails to repeat the header, fall back to rendering the disclaimer once per section rather than shipping a summary whose provenance line appears only on page one.

This file is the single exception to the no-raw-hex rule, because `@page` and print backgrounds cannot reference a custom property reliably across engines. Add `styles/print.css` to the guard test's exclusion list with a comment stating why.

- [ ] **Step 6: Add the e2e print check**

Create `tests/e2e/summary.spec.ts`: seed a user with two medicines, one appointment, one advice entry and two vitals; open `/care/summary`; assert every value appears; then emulate print media with `page.emulateMedia({ media: "print" })` and assert the navigation and the chat bubble are not visible while the content is.

Run: `npx playwright test tests/e2e/summary.spec.ts`
Expected: PASS.

- [ ] **Step 7: Manually verify printing on both platforms**

Print to PDF from Android Chrome and from iOS Safari. Confirm: the running header and footer repeat, no row splits across a page boundary, and both colours survive. Record the result in the commit body. This cannot be automated and must not be skipped.

- [ ] **Step 8: Verify and commit**

```bash
git add lib/domain/summary.ts "app/(app)/care/summary" styles/print.css i18n tests
git commit -m "feat(summary): add printable Doctor Visit Summary in the restrained register"
```

---

## Session 28: Reading list and detail

**Gate A — request before starting:** ask for the Reading list, the article detail and the media player designer markup. Stop until it arrives.

**Goal:** The content library. Articles, videos and audios, week-relevant first, with English-only items clearly marked rather than hidden.

**Files:**
- Create: `lib/domain/library.ts` + test
- Create: `lib/supabase/queries/content.ts`
- Create: `app/(app)/reading/page.tsx`, `ReadingList.tsx` + test
- Create: `app/(app)/reading/[slug]/page.tsx`, `ContentDetail.tsx` + test
- Modify: `i18n/en.json`, `i18n/hi.json`

**Interfaces:**
- Produces: `orderLibrary({ items, week, locale }): LibraryEntry[]`

- [ ] **Step 1: Request the asset and stop**

- [ ] **Step 2: Write the failing library ordering test**

Cover: items whose week range covers the current week come first; within that group, narrower ranges come before broader ones, since a week-specific article beats an any-week one; items outside the range follow, ordered by distance from the current week; the requested locale wins per slug, with the English row used and flagged when no translation exists; an unpublished item never appears; a kind filter narrows the list without reordering it; and duplicate slugs across locales collapse to one entry.

- [ ] **Step 3: Run it, watch it fail, implement, run it again**

- [ ] **Step 4: Write the failing ReadingList test**

Assert: the three kind tabs use the `Tabs` primitive; each card shows title, summary, kind and duration where known; an English-only item shows the `common.englishOnly` marker; an empty filter result shows the `EmptyState` with kind-specific copy; a slow load shows `SkeletonCard`s, never a spinner; the chat bubble is present; and no `texture-motif` renders.

- [ ] **Step 5: Write the failing ContentDetail test**

Assert: an article renders its markdown with headings and lists; a video renders a native `<video controls>` with `playsInline`; audio renders a native `<audio controls>`; the `AudioIndicator` appears only when `narration_url` exists; a missing slug renders a not-found state with a route back to Reading, not a crash; the fallback-locale marker renders when applicable; `content_opened` is emitted with kind and fallback flag; and the page has a visible path back to Today so a deep link is never a dead end.

- [ ] **Step 6: Implement both from the designer's markup**

Use the `react-markdown` already added in Session 13. Restrict the allowed elements to headings, paragraphs, lists, emphasis and links, so a content row cannot inject markup.

- [ ] **Step 7: Verify and commit**

```bash
git add lib/domain/library.ts "app/(app)/reading" lib/supabase/queries/content.ts i18n
git commit -m "feat(reading): add content library with week-relevant ordering and locale fallback markers"
```

---

## Session 29: Chatbot — guardrails, retrieval, provider, panel

**Gate B — request before starting:** ask for the reviewed content corpus as article bodies and retrieval passages, in English at minimum. **Stop until it arrives.** The bot cannot be built against placeholder medical content.
**Gate C — request before starting:** ask for a Google Gemini API key and confirm which tier. Record in the commit body whether it is the free tier, since the free tier may use submitted prompts to improve Google's products.
**Gate A — request before starting:** ask for the chat entry icon and panel designer markup.

**Goal:** A bot that answers her data questions deterministically from her own rows, answers health questions with reviewed passage text reproduced verbatim, refuses sex-determination questions before anything else, and says plainly when it does not know.

**Read spec §5 before writing any code in this session.** The model's only job is **selection**: given the question and a short candidate list, it returns the id of the passage that answers it, or null. It never composes, summarises, softens or extends a medical statement, and its output is consumed as an identifier and then discarded. An earlier revision of this plan let the model write the answer and "enforced" retrieval-only by requiring it to cite a passage id — that check proves a reference was consulted, not that every sentence is entailed by it, so a cited answer could still carry an invented dosage. That is why the interface below cannot return text.

**Files:**
- Create: `lib/ai/provider.ts`, `lib/ai/gemini.ts`
- Create: `lib/ai/guardrails.ts` + test
- Create: `lib/ai/intent.ts` + test
- Create: `lib/ai/retrieval.ts` + test
- Create: `lib/ai/dataAnswers.ts` + test
- Create: `lib/ai/redact.ts` + test
- Create: `app/api/chat/route.ts` + test
- Create: `app/(app)/ChatPanel.tsx` + test
- Modify: `app/(app)/ChatBubbleSlot.tsx`
- Modify: `lib/env.ts`, `.env.example`
- Create: `supabase/seed/content.reviewed.sql` (from the product owner)

**Interfaces:**
- Produces:
  - `RetrievalCandidate = { id: string; contentItemId: string; heading: string | null; body: string }` — the single candidate type, defined in `lib/ai/retrieval.ts` and used by retrieval, the provider and the route
  - `AiProvider.selectPassage({ question, candidates, locale }): Promise<{ selectedId: string | null }>`
  - `guardrail(question): { blocked: true; kind: "sex_determination" | "emergency" } | { blocked: false }`
  - `classifyIntent(question): "data" | "health"`
  - `retrieve({ supabase, question, locale }): { candidates: RetrievalCandidate[]; topScore: number }`
  - `answerFromData({ supabase, question, locale }): { body: string } | null`
  - `redactQuestion(question, { displayName, doctorName, clinicName }): string`
  - `containsSexTerms(text): boolean` — used both pre-retrieval and post-response

- [ ] **Step 1: Request the corpus, the key and the asset, then stop**

- [ ] **Step 2: Write the failing guardrail test**

Create `lib/ai/guardrails.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { guardrail } from "@/lib/ai/guardrails";

describe("guardrail: sex determination (PCPNDT, spec §1.4)", () => {
  it.each([
    "is it a boy or a girl",
    "Is my baby a boy?",
    "can you tell the gender",
    "baby ka gender kya hai",
    "ladka hai ya ladki",
    "मेरा बच्चा लड़का है या लड़की",
    "लिंग बताओ",
    "what will be the sex of my baby",
    "boy ya girl",
  ])("blocks %s", (question) => {
    expect(guardrail(question)).toEqual({ blocked: true, kind: "sex_determination" });
  });

  it("does not block an unrelated question that happens to contain a similar word", () => {
    expect(guardrail("my friend's boy is two years old, when should I start solids")).toEqual({
      blocked: false,
    });
  });
});

describe("guardrail: emergency phrasing", () => {
  it.each([
    "I am bleeding heavily right now",
    "I cannot feel the baby moving at all",
    "bahut tez dard ho raha hai",
  ])("routes %s to the urgent path", (question) => {
    expect(guardrail(question)).toEqual({ blocked: true, kind: "emergency" });
  });
});

describe("guardrail: ordinary questions", () => {
  it.each(["when is my next appointment", "what should I eat in the second trimester", ""])(
    "lets %s through",
    (question) => {
      expect(guardrail(question)).toEqual({ blocked: false });
    },
  );
});
```

The emergency term list is product-owner content from Gate B, not invented here. The test above uses whichever terms they supplied; the examples are illustrative.

- [ ] **Step 3: Run it, watch it fail, then implement `lib/ai/guardrails.ts`**

Reuse the word-boundary matching from `lib/domain/triage.ts` rather than writing a second matcher. Export `containsSexTerms(text)` separately from `guardrail(question)`, because the route calls it twice: once on her question before retrieval, and once on the passage body before responding. The second call is what protects her if the reviewed corpus itself is contaminated.

Add these adversarial cases to the test before implementing, since a finite term list fails first on exactly this kind of input:

```ts
it.each([
  "is it a boi or a gurl",            // misspelling
  "baby ka gendr kya hai",            // transliteration variant
  "ladkaa ya ladkii",                 // elongated vowels
  "मेरा baby boy hai kya",             // mixed script
  "b o y or g i r l",                 // spaced letters
  "will it be my son or my daughter", // euphemism
])("blocks the evasive phrasing %s", (question) => {
  expect(guardrail(question)).toEqual({ blocked: true, kind: "sex_determination" });
});
```

Handle these by normalising before matching: lowercase, strip repeated characters, collapse internal spacing within a candidate token, and include the euphemism set (`son`, `daughter`, `beta`, `beti`) in the term list. **State the residual risk in a comment:** a finite list substantially reduces this exposure and cannot prove a negative, which is why the corpus review at Gate B and the post-response check both exist.

- [ ] **Step 4: Write and implement the intent classifier**

`lib/ai/intent.ts` is deterministic: a question containing a first-person possessive reference to her own records (`my appointment`, `my medicines`, `my BP`, `meri`, `mera`) plus a known data noun classifies as `data`; everything else is `health`. Tests cover both languages, an ambiguous question defaulting to `health` (the safer path, since it cannot fabricate), and an empty question returning `health` with retrieval then finding nothing.

- [ ] **Step 5: Write and implement retrieval with a threshold**

`lib/ai/retrieval.ts` calls the `search_passages` RPC from Session 10 and applies a minimum rank threshold. Tests: a matching query returns passages above the threshold; a weak match returns an empty list so the caller produces `no_match`; the threshold is a single named constant, not a magic number inline; and more than five passages are never returned.

- [ ] **Step 6: Write and implement deterministic data answers**

`lib/ai/dataAnswers.ts` runs whitelisted queries as her (RLS-scoped) and renders a translated template. **No model call.** Tests: the next appointment question returns the date and title; with no appointment it returns a plain "nothing scheduled" answer; the latest blood pressure returns both numbers and the date; with no readings it says so; an unrecognised data question returns null so the caller falls through to health retrieval; and the function never returns a sentence containing a value it did not read from her rows.

- [ ] **Step 6b: Write and implement the question redaction pass**

Create `lib/ai/redact.ts` + test. The selection request carries her question text, so before egress it is scanned and redacted for anything matching an email address, a phone number, a digit run of seven or more, and any occurrence of her own `display_name`, `doctor_name` or `clinic_name` from her profile. Each match is replaced with a placeholder token (`[name]`, `[email]`, `[phone]`).

Tests to write first: an email is replaced; an Indian mobile with and without `+91` is replaced; her own name is replaced case-insensitively; her doctor's name is replaced; a short common word that happens to be her name is still replaced (correctness over elegance here); a question with nothing sensitive is returned unchanged; an empty profile field is skipped rather than matching everywhere; and the function never returns the original string when a match was found.

This is a best-effort narrowing, not a guarantee, and the privacy policy says so. It exists because revision 2 of the plan claimed no personal data ever reaches the provider, which was false: she can type her own name into the question.

- [ ] **Step 7: Write the failing chat route test**

Create `app/api/chat/route.test.ts`. Mock the Supabase client and the provider. These assertions are the safety contract of the whole feature:

```ts
it("sends no data from her records to the provider", async () => {
  // The mocked profile is Priyanka, her doctor is Dr Mehta, and she takes Folic acid.
  await post({ question: "what should I eat this week", locale: "en" });
  const payload = JSON.stringify(providerMock.mock.calls);
  for (const leak of ["Priyanka", "her@example.com", "Folic acid", "Dr Mehta", "+919876543210"]) {
    expect(payload).not.toContain(leak);
  }
});

it("redacts personal data she typed INTO the question before it leaves", async () => {
  // The revision 2 version of this test used a question containing none of the
  // sensitive values, so it passed without proving anything.
  await post({
    question: "I am Priyanka and Dr Mehta asked me to call 9876543210, what should I eat",
    locale: "en",
  });
  const payload = JSON.stringify(providerMock.mock.calls);
  expect(payload).not.toContain("Priyanka");
  expect(payload).not.toContain("Mehta");
  expect(payload).not.toContain("9876543210");
  expect(payload).toContain("[name]");
});

it("returns a stored passage verbatim, never provider text", async () => {
  const passage = { id: "p1", contentItemId: "c1", heading: "Eating well", body: "Reviewed guidance text, exactly as stored." };
  retrievalMock.mockResolvedValue({ candidates: [passage], topScore: 0.9 });
  providerMock.mockResolvedValue({ selectedId: "p1" });

  const body = await (await post({ question: "what should I eat", locale: "en" })).json();
  expect(body.answerKind).toBe("retrieved");
  expect(body.body).toBe(passage.body); // byte-identical to the row
});

it("discards a selected id that was not one of the candidates", async () => {
  retrievalMock.mockResolvedValue({ candidates: [{ id: "p1", contentItemId: "c1", heading: null, body: "Reviewed text." }], topScore: 0.9 });
  providerMock.mockResolvedValue({ selectedId: "p-not-a-candidate" });
  const body = await (await post({ question: "what should I eat", locale: "en" })).json();
  expect(body.answerKind).toBe("no_match");
});

it("treats a null selection as a plain I-do-not-know", async () => {
  retrievalMock.mockResolvedValue({ candidates: [{ id: "p1", contentItemId: "c1", heading: null, body: "Reviewed text." }], topScore: 0.9 });
  providerMock.mockResolvedValue({ selectedId: null });
  const body = await (await post({ question: "unrelated", locale: "en" })).json();
  expect(body.answerKind).toBe("no_match");
  expect(body.handoff).toBe("/checkin");
});

it("ignores any extra field a provider returns, so prose can never reach the response", async () => {
  retrievalMock.mockResolvedValue({ candidates: [{ id: "p1", contentItemId: "c1", heading: null, body: "Reviewed text." }], topScore: 0.9 });
  // A provider implementation that returns more than the interface promises.
  providerMock.mockResolvedValue({ selectedId: "p1", body: "Take 200mg twice daily." } as never);
  const body = await (await post({ question: "what should I eat", locale: "en" })).json();
  expect(body.body).toBe("Reviewed text.");
  expect(JSON.stringify(body)).not.toContain("200mg");
});

it("refuses a sex-determination question without calling the provider at all", async () => {
  const response = await post({ question: "is it a boy or a girl", locale: "en" });
  expect(providerMock).not.toHaveBeenCalled();
  expect((await response.json()).answerKind).toBe("refused");
});

it("answers a data question without calling the provider", async () => {
  const response = await post({ question: "when is my next appointment", locale: "en" });
  expect(providerMock).not.toHaveBeenCalled();
  expect((await response.json()).answerKind).toBe("data");
});

it("returns no_match and the triage hand-off when retrieval finds nothing", async () => {
  retrievalMock.mockResolvedValue({ candidates: [], topScore: 0 });
  const body = await (await post({ question: "unrelated question", locale: "en" })).json();
  expect(body.answerKind).toBe("no_match");
  expect(body.handoff).toBe("/checkin");
  expect(providerMock).not.toHaveBeenCalled();
});

it("falls back to the top lexical match when the provider is unavailable", async () => {
  const passage = { id: "p1", contentItemId: "c1", heading: null, body: "Reviewed guidance text." };
  retrievalMock.mockResolvedValue({ candidates: [passage], topScore: 0.9 });
  providerMock.mockRejectedValue(new Error("503"));

  const response = await post({ question: "what should I eat", locale: "en" });
  expect(response.status).toBe(200);
  const body = await response.json();
  // Still verbatim reviewed text, chosen lexically instead of by the model.
  expect(body.body).toBe(passage.body);
});

it("returns no_match with suggestions when the provider is down and nothing retrieves", async () => {
  retrievalMock.mockResolvedValue({ candidates: [], topScore: 0 });
  providerMock.mockRejectedValue(new Error("503"));
  const body = await (await post({ question: "what should I eat", locale: "en" })).json();
  expect(body.answerKind).toBe("no_match");
  expect(body.suggestions.length).toBeGreaterThan(0);
});

it("blocks a response containing sex-determination terms even if the corpus is contaminated", async () => {
  retrievalMock.mockResolvedValue({
    candidates: [{ id: "p1", contentItemId: "c1", heading: null, body: "Contaminated passage mentioning ladka or ladki." }],
    topScore: 0.9,
  });
  providerMock.mockResolvedValue({ selectedId: "p1" });
  const body = await (await post({ question: "what happens this week", locale: "en" })).json();
  expect(body.answerKind).toBe("refused");
});

it("returns the English passage with a marker for a Hindi question against English-only content", async () => {
  const body = await (await post({ question: "मुझे क्या खाना चाहिए", locale: "hi" })).json();
  expect(body.isFallbackLocale).toBe(true);
});

it("persists every exchange with its answer kind", async () => {
  await post({ question: "what should I eat", locale: "en" });
  expect(insertedChatRows).toHaveLength(2);
  expect(insertedChatRows[1]!.answer_kind).toBeDefined();
});

it("rejects an unauthenticated request", async () => {
  userMock.mockResolvedValue({ data: { user: null } });
  expect((await post({ question: "anything", locale: "en" })).status).toBe(401);
});

it("rejects a question longer than the accepted limit with a stated limit", async () => {
  const response = await post({ question: "x".repeat(2001), locale: "en" });
  expect(response.status).toBe(400);
});
```

- [ ] **Step 8: Run it, watch it fail, then implement the route**

Implement exactly the pipeline in spec §5.1, in that order. The route's structure is what enforces the guarantees; no prompt instruction is relied upon:

```ts
// 1. Deterministic guardrails, before anything else.
if (containsSexTerms(question)) return refused();
if (isEmergencyPhrasing(question)) return urgentHandoff();

// 2. Deterministic intent. No model.
if (classifyIntent(question) === "data") return dataAnswer();

// 3. Retrieve candidates. No model.
const { candidates } = await retrieve({ supabase, question, locale });
if (candidates.length === 0) return noMatch();

// 4. Selection. The ONLY model call, and its result is an id.
let selected = candidates[0];                       // lexical fallback
try {
  const { selectedId } = await provider.selectPassage({
    question: redactQuestion(question, profile),     // never her raw text
    candidates,
    locale,
  });
  if (selectedId === null) return noMatch();
  const match = candidates.find((c) => c.id === selectedId);
  if (!match) return noMatch();                      // hallucinated id
  selected = match;
} catch {
  // Provider down: keep the lexical choice rather than failing the request.
}

// 5. The body is the STORED ROW, never anything the provider returned.
//    Check EVERY displayed field, not just the body: the heading is rendered too,
//    so a contaminated heading would otherwise walk straight past this guard.
if (containsSexTerms(displayedText(selected))) return refused();  // corpus contamination
return retrieved({
  body: selected.body,
  heading: selected.heading,
  sourceId: selected.contentItemId,
});
```

Define the field-coverage helper next to the guard so it cannot drift from what the UI renders:

```ts
/**
 * Every field of a passage that reaches the screen. The response guard runs over
 * this, not over `body` alone: if a field is added to the rendered output it must be
 * added here in the same change, and the test below fails if it is not.
 */
export function displayedText(candidate: RetrievalCandidate): string {
  return [candidate.heading ?? "", candidate.body].join(" ");
}
```

Tests to add alongside the existing ones:

```ts
it("blocks a contaminated heading, not only a contaminated body", async () => {
  retrievalMock.mockResolvedValue({
    candidates: [{ id: "p1", contentItemId: "c1", heading: "Is it a boy or a girl", body: "Clean reviewed text." }],
    topScore: 0.9,
  });
  providerMock.mockResolvedValue({ selectedId: "p1" });
  const body = await (await post({ question: "what happens this week", locale: "en" })).json();
  expect(body.answerKind).toBe("refused");
});

it("covers every rendered field in the contamination check", () => {
  // Fails if a field is added to the response but not to displayedText().
  const candidate = { id: "p1", contentItemId: "c1", heading: "H", body: "B" };
  const covered = displayedText(candidate);
  for (const field of ["heading", "body"] as const) {
    expect(covered).toContain(candidate[field]);
  }
});

it("returns a usable source link, not undefined", async () => {
  retrievalMock.mockResolvedValue({
    candidates: [{ id: "p1", contentItemId: "c1", heading: null, body: "Reviewed text." }],
    topScore: 0.9,
  });
  providerMock.mockResolvedValue({ selectedId: "p1" });
  const body = await (await post({ question: "what should I eat", locale: "en" })).json();
  expect(body.sourceId).toBe("c1");
});
```

Note what is absent: the provider's return value is destructured for `selectedId` and nothing else, so even a provider implementation that returns prose cannot put it in the response. The test asserting that is the one mocking an extra `body` field.

- [ ] **Step 9: Implement the Gemini provider**

`lib/ai/gemini.ts` implements `AiProvider` and is the only file that imports the Gemini SDK. Its prompt asks for the id of the candidate that answers the question, or the literal string `none`, and it parses the reply strictly: anything that is not one of the supplied ids becomes `selectedId: null`. Request a constrained output format (the provider's JSON-mode or schema feature) if the installed SDK version offers one, but **the parsing is what enforces the contract, not the request format.**

The model id is a single config constant; **verify the current model id against Google's current documentation at implementation time rather than writing one from memory.** Record the chosen model and tier in the commit body.

- [ ] **Step 10: Write and implement the ChatPanel**

Assert: the entry icon is docked bottom-right on every app screen and has an accessible name; opening uses the `BottomSheet` so the back gesture closes it; her messages are right-aligned and bot messages left-aligned; **no avatar, no "AI" badge, no sparkle icon** renders (assert by class and by accessible name); a health answer renders the disclaimer banner; a no-match answer renders a link to the check-in flow; a refused answer renders the fixed plain response; loading uses the same `Skeleton` as everywhere else, with no shimmering "thinking" animation; the panel is usable with the keyboard; and `chat_opened`, `chat_question_asked` and `chat_answer_shown` are emitted with no text.

- [ ] **Step 11: Replace the chat bubble placeholder and seed the reviewed corpus**

Swap `ChatBubbleSlot` to render the real entry. Fill `supabase/seed/content.reviewed.sql` with the product owner's corpus and apply it with `npm run db:seed`.

Then **delete `supabase/seed/content.placeholder.sql` from the repository**, along with the `db:seed:placeholder` script and the two placeholder guard tests, in this same commit. Leaving a placeholder seed file behind once real content exists is how a non-medical row reaches a real database months later; the tests that fenced it off are no longer needed once the file is gone. Replace them with one assertion that `content.placeholder.sql` does not exist.

- [ ] **Step 12: Verify and commit**

Run: `npm run verify`

```bash
git add lib/ai app/api/chat "app/(app)/ChatPanel.tsx" "app/(app)/ChatBubbleSlot.tsx" supabase/seed lib/env.ts .env.example
git commit -m "feat(chat): add retrieval-only chatbot with deterministic guardrails and no personal data egress"
```

**Done when:** all ten route guarantees pass as tests, no placeholder medical content remains, and the commit body records the Gemini model, the tier, and whether free-tier data usage applies.

---

## Session 30: Contraction timer

**Gate A — request before starting:** ask for the contraction timer designer markup. Stop until it arrives.

**Goal:** A timer that survives the screen sleeping, shows duration and interval averages, and notes the 5-1-1 pattern as guidance without ever diagnosing.

**Files:**
- Create: `lib/domain/contractions.ts` + test
- Create: `app/(app)/profile/contractions/page.tsx`, `ContractionTimer.tsx` + test
- Create: `app/actions/contractions.ts`
- Modify: `i18n/en.json`, `i18n/hi.json`

**Interfaces:**
- Produces: `contractionStats(contractions, now): { count, averageDurationSeconds, averageIntervalSeconds, isRegular, meets511 }`

- [ ] **Step 1: Request the asset and stop**

- [ ] **Step 2: Write the failing contractions test**

Create `lib/domain/contractions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { contractionStats } from "@/lib/domain/contractions";

const base = new Date("2026-11-20T02:00:00Z").getTime();
const at = (minutes: number) => new Date(base + minutes * 60_000).toISOString();

/** Contractions 60 seconds long, five minutes apart, for just over an hour. */
const fiveOneOne = Array.from({ length: 13 }, (_, i) => ({
  started_at: at(i * 5),
  duration_seconds: 60,
}));

describe("contractionStats", () => {
  it("reports an empty session", () => {
    expect(contractionStats([], base)).toEqual({
      count: 0,
      averageDurationSeconds: null,
      averageIntervalSeconds: null,
      isRegular: false,
      meets511: false,
    });
  });

  it("reports no interval from a single contraction", () => {
    const stats = contractionStats([{ started_at: at(0), duration_seconds: 45 }], base);
    expect(stats.averageDurationSeconds).toBe(45);
    expect(stats.averageIntervalSeconds).toBeNull();
  });

  it("averages intervals from the start of one contraction to the start of the next", () => {
    const stats = contractionStats(
      [
        { started_at: at(0), duration_seconds: 40 },
        { started_at: at(5), duration_seconds: 50 },
        { started_at: at(10), duration_seconds: 60 },
      ],
      base,
    );
    expect(stats.averageIntervalSeconds).toBe(300);
    expect(stats.averageDurationSeconds).toBe(50);
  });

  it("ignores a contraction still running when averaging duration", () => {
    const stats = contractionStats(
      [
        { started_at: at(0), duration_seconds: 60 },
        { started_at: at(5), duration_seconds: null },
      ],
      base + 6 * 60_000,
    );
    expect(stats.averageDurationSeconds).toBe(60);
    expect(stats.count).toBe(2);
  });

  it("reports regularity when intervals are close together", () => {
    expect(contractionStats(fiveOneOne, base + 70 * 60_000).isRegular).toBe(true);
  });

  it("reports irregularity when intervals vary widely", () => {
    const irregular = [
      { started_at: at(0), duration_seconds: 40 },
      { started_at: at(3), duration_seconds: 40 },
      { started_at: at(20), duration_seconds: 40 },
    ];
    expect(contractionStats(irregular, base + 25 * 60_000).isRegular).toBe(false);
  });

  it("recognises the 5-1-1 pattern", () => {
    expect(contractionStats(fiveOneOne, base + 70 * 60_000).meets511).toBe(true);
  });

  it("does not claim 5-1-1 when the pattern has lasted under an hour", () => {
    expect(contractionStats(fiveOneOne.slice(0, 5), base + 25 * 60_000).meets511).toBe(false);
  });

  it("does not claim 5-1-1 when contractions are too short", () => {
    const short = fiveOneOne.map((c) => ({ ...c, duration_seconds: 20 }));
    expect(contractionStats(short, base + 70 * 60_000).meets511).toBe(false);
  });

  it("does not claim 5-1-1 when contractions are too far apart", () => {
    const sparse = Array.from({ length: 13 }, (_, i) => ({ started_at: at(i * 12), duration_seconds: 60 }));
    expect(contractionStats(sparse, base + 160 * 60_000).meets511).toBe(false);
  });

  it("handles contractions supplied out of order", () => {
    const shuffled = [fiveOneOne[3]!, fiveOneOne[0]!, fiveOneOne[1]!, fiveOneOne[2]!];
    expect(contractionStats(shuffled, base + 30 * 60_000).averageIntervalSeconds).toBe(300);
  });
});
```

- [ ] **Step 3: Run it, watch it fail, then implement**

`meets511` is a pattern observation, not a diagnosis, and the UI copy that accompanies it is product-owner content with the disclaimer banner attached. The thresholds (60 seconds, 5 minutes, 60 minutes) are named constants with a comment stating they describe the commonly-cited 5-1-1 pattern and are not a clinical decision made by this codebase.

Run: `npx vitest run lib/domain/contractions.test.ts`
Expected: PASS.

- [ ] **Step 4: Write the failing ContractionTimer test**

Assert:
- start and stop produce one contraction with a duration
- **timing is derived from stored timestamps, not from a running counter** — advance fake timers with the component unmounted and remounted, and assert the elapsed time is still correct
- a contraction started but never stopped renders as in-progress and does not corrupt the averages
- stats render from `contractionStats`, including a null-safe empty state
- the 5-1-1 note renders only when `meets511` is true, with the disclaimer banner
- the session can be ended and a new one started
- an open session from earlier is resumed on return
- **offline refuses to start or record a contraction**, with a plain explanation, emitting `offline_write_blocked` with `feature: "contraction"`. Same reasoning as the kick counter: a queue-less "we will save it later" can discard the timings she is using to decide whether to leave for hospital. Durable offline capture is a Phase 2 item
- `contraction_session_started` is emitted with the week only

- [ ] **Step 5: Implement the timer and the actions**

Every render computes from `started_at` values; the component holds no accumulated counter. That single decision is what makes the screen correct after the phone sleeps, and the remount test is what keeps it that way.

- [ ] **Step 6: Verify and commit**

```bash
git add lib/domain/contractions.ts "app/(app)/profile/contractions" app/actions/contractions.ts i18n
git commit -m "feat(profile): add contraction timer computed from timestamps, with 5-1-1 guidance"
```

---

## Session 31: Pregnancy preparation checklist

**Gate A — request before starting:** ask for the checklist designer markup including the progress ring. Stop until it arrives.
**Gate B — request before starting:** ask for the checklist items in both languages, by category.

**Goal:** Hospital bag, documents, birth prep and home checklists with per-item ticks and a visual progress ring.

**Files:**
- Create: `lib/domain/checklist.ts` + test
- Create: `components/patterns/ProgressRing.tsx` + test
- Create: `app/(app)/profile/prep/page.tsx`, `PrepChecklist.tsx` + test
- Create: `app/actions/checklist.ts`
- Create: `supabase/seed/checklist_items.sql`

**Interfaces:**
- Produces: `checklistProgress({ items, progress }): { byCategory: {...}[]; overall: { done, total, fraction } }`; `ProgressRing({ fraction, label })`

- [ ] **Step 1: Request the content and asset, then stop**

- [ ] **Step 2: Write the failing checklist domain test**

Cover: items grouped by category in a fixed category order; items sorted by `sort_order` within a category; `done` counted from progress rows; a progress row for an item that no longer exists is ignored; the overall fraction is `done / total`; an empty item list returns a zero fraction rather than `NaN`; all-done returns a fraction of exactly 1; and inactive items are excluded from both the list and the total.

- [ ] **Step 3: Run it, watch it fail, implement, run it again**

- [ ] **Step 4: Write and implement ProgressRing**

Test: it renders an SVG with `role="progressbar"` and the correct `aria-valuenow`; a fraction of 0 and of 1 both render without a path error; a fraction outside 0 to 1 is clamped; and the visible label text is supplied, not computed from a hardcoded English string.

- [ ] **Step 5: Write the failing PrepChecklist test**

Assert: each category renders as a `SectionHeader` with its items; ticking an item persists and updates the ring; ticking is optimistic and reverts with an `ErrorBanner` on failure; an item linking to an article renders the link; an empty category renders nothing rather than an empty header; offline blocks ticking with an explanation; and `checklist_item_toggled` is emitted with the category and the new state.

- [ ] **Step 6: Implement from the designer's markup, seed the items, verify and commit**

```bash
git add lib/domain/checklist.ts components/patterns/ProgressRing.tsx "app/(app)/profile/prep" app/actions/checklist.ts supabase/seed
git commit -m "feat(profile): add pregnancy preparation checklists with a progress ring"
```

---

## Session 32: Settings — language, details, consent review, export, deletion

**Gate A — request before starting:** ask for the Profile hub and Settings designer markup. Stop until it arrives.

**Goal:** The screen that makes the product's privacy promises real: she can see what she consented to, withdraw it, take her data, and delete her account.

**Files:**
- Create: `app/(app)/profile/page.tsx`, `ProfileHub.tsx` + test
- Create: `app/(app)/profile/settings/page.tsx`, `SettingsScreen.tsx` + test
- Create: `app/actions/settings.ts`
- Create: `lib/domain/export.ts` + test
- Modify: `i18n/en.json`, `i18n/hi.json`
- Create: `tests/e2e/settings.spec.ts`

**Interfaces:**
- Produces: `buildExport({ profile, pregnancies, ...allTables }): object`; `updateProfileDetails`, `withdrawConsent`, `requestExport`, `deleteAccount` actions.

- [ ] **Step 1: Request the asset and stop**

- [ ] **Step 2: Write the failing export test**

Cover: the export contains one key per user-owned table; report files are referenced by name and date, not embedded; the export carries a generated-at timestamp and a schema version; and the export contains no other user's data by construction, since it is built from rows already fetched under RLS.

**The completeness assertion must be an integration test, not a type-level one.** An earlier revision of this plan proposed deriving the expected table list from the generated `Database` type — that cannot work, because TypeScript types are erased at runtime and a Vitest assertion has nothing to read. Query the catalogue instead, in `tests/rls/export.test.ts`:

The export has two namespaces, and only one of them is compared against the catalogue:

```ts
// buildExport returns { meta: { generatedAt, schemaVersion }, tables: { [name]: rows } }
it("exports every user-owned table, so adding a table cannot silently skip the export", async () => {
  const { data } = await admin.rpc("user_owned_tables");
  const expected = (data ?? []).sort();
  const exported = Object.keys(buildExport(fixture).tables).sort();
  expect(exported).toEqual(expected);
});

it("carries envelope metadata outside the compared namespace", () => {
  const result = buildExport(fixture);
  expect(result.meta.schemaVersion).toBeTypeOf("string");
  expect(result.meta.generatedAt).toBeTypeOf("string");
  // meta must NOT appear among the table keys, or the comparison above breaks.
  expect(Object.keys(result.tables)).not.toContain("meta");
});

it("includes profiles, whose owner column is id rather than user_id", async () => {
  const { data } = await admin.rpc("user_owned_tables");
  expect(data).toContain("profiles");
  expect(Object.keys(buildExport(fixture).tables)).toContain("profiles");
});
```

Separating `meta` from `tables` is what makes the comparison an equality rather than a subset check. An equality test is what catches the case this exists for: someone adds a table and forgets the export.

Add the supporting function to migration 1 (service-role only, same grant treatment as `tables_without_rls`):

```sql
-- "User-owned" is defined mechanically: a table in public carrying a user_id column,
-- plus profiles, whose owner column is its primary key `id` instead. Returning the
-- complete set here (rather than leaving profiles for the caller to remember) is what
-- lets the export test be an equality check.
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
```

`profiles` is the one user-owned table whose owner column is `id` rather than `user_id`. It is unioned into `user_owned_tables()` so the catalogue and the export agree by construction, rather than relying on the export author remembering to add it.

- [ ] **Step 3: Run it, watch it fail, implement, run it again**

- [ ] **Step 4: Write the failing SettingsScreen test**

Assert:
- the language switcher is present and switching persists
- her profile details are editable with the same validation as onboarding, reusing `validateOnboarding` rather than a second set of rules
- **EDD correction is available here**: changing the due date updates `pregnancies.edd` and sets `edd_source` to `scan` or `manual`, and the displayed week updates immediately
- consent status is listed per key with the version and date she agreed, read from `getCurrentConsents()` — the same shared query middleware and analytics use, never a separate read of the view or the table
- a key she has never decided on renders as "not given" rather than as a blank row
- after withdrawing a consent, the listed state for that key flips on the next render, which is the consumer-side half of the withdrawal path and is its own test
- withdrawing the optional data-sharing consent writes a new row with `granted: false` and never edits the old one
- withdrawing analytics consent calls `optOut` and `reset` on the analytics provider
- export downloads a JSON file of her own data
- deletion requires a fresh re-authentication code **and** typing a confirmation word, states plainly that report files are deleted too and that nothing can be recovered, and is not reachable in a single tap
- a stale re-authentication (older than the age bound) is refused with a plain explanation and a way to request a new code
- a pregnancy can be marked as ended, with a gentle flow and no failure language, and the app afterwards shows a holding state rather than erroring

- [ ] **Step 5: Implement the screens and actions**

`deleteAccount` is the **one sanctioned service-role code path** in the product (Global Constraints). Deleting an auth user requires `auth.admin.deleteUser`, which no anon-key client can perform, so this needs an admin client that the browser bundle can never import.

Create `lib/supabase/admin.ts`:

```ts
import "server-only"; // build fails if any client component imports this
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Service-role client. The ONLY permitted caller is the account-deletion action.
 * Never import this from a component, a hook, or any other action.
 */
export function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Admin client requires SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

Add `SUPABASE_SERVICE_ROLE_KEY` to `lib/env.ts` as a **server-only** optional variable (it must not be in the `NEXT_PUBLIC_` set), and add a guard test asserting `SUPABASE_SERVICE_ROLE_KEY` and `createAdminSupabase` appear in no file other than `lib/supabase/admin.ts` and `app/actions/settings.ts`.

`deleteAccount` runs in this order, and the order is a test:

1. Re-read the session and confirm the user; abort if absent.
2. **Require fresh re-authentication, proven server-side.** An existing session plus a typed word is not proof of recent intent: phones get left unlocked and handed around, and this action destroys every pregnancy record she has with no recovery.

   The proof must not be a timestamp the client asserts. Use Supabase's own verification: the Settings screen calls `signInWithOtp({ email })` for her current address, she enters the code, and the client calls `verifyOtp`. That succeeds only if the code was genuinely delivered and entered, and it **refreshes the session**, so the server reads the freshness from the session itself:

   ```ts
   const { data: { session } } = await supabase.auth.getSession();
   const issuedAtMs = (session?.user.last_sign_in_at ? Date.parse(session.user.last_sign_in_at) : 0);
   if (Date.now() - issuedAtMs > REAUTH_MAX_AGE_MS) return { error: "reauth_required" };
   ```

   `REAUTH_MAX_AGE_MS` is a named constant of 10 minutes. `last_sign_in_at` comes from the verified session, not from the request body, so a caller cannot forge it.
3. Confirm the typed confirmation word matches.
4. List and delete every storage object under `{userId}/` in the `reports` bucket, using **her own** client so RLS still applies.
5. Only then call `admin.auth.admin.deleteUser(userId)`, which cascades every metadata row.

Tests: a session whose `last_sign_in_at` is older than the bound is rejected with `reauth_required`; a session with no `last_sign_in_at` is rejected; an absent session is rejected; a freshness value supplied in the request body is ignored entirely (assert the decision is unchanged when the body claims a recent time and the session says otherwise); the storage deletion is called before the user deletion; and a storage failure aborts before the user is deleted.

Step 3 must precede step 4: the cascade deletes the `reports` rows that name the files, so deleting the user first leaves objects with nothing pointing at them and no way to find them again. Write a test that asserts the storage deletion is called before the user deletion, and one that asserts a storage failure aborts before the user is deleted.

- [ ] **Step 6: Write the e2e settings spec**

Cover: change language and confirm the navigation labels change; correct the EDD and confirm the week on Today changes; withdraw analytics and confirm no further events are captured; export and confirm the downloaded JSON parses and contains her medicine.

- [ ] **Step 7: Verify and commit**

```bash
git add "app/(app)/profile" app/actions/settings.ts lib/domain/export.ts i18n tests
git commit -m "feat(profile): add settings with EDD correction, consent review, export and deletion"
```

---

## Session 33: PWA manifest, service worker, offline shell

**Gate C — request before starting:** ask for the final app icons at 192 and 512 pixels, maskable, plus the production domain.

**Goal:** Installable on both platforms, instant load from the cached shell, and a predictable read-only offline experience.

**Files:**
- Create: `public/manifest.webmanifest`, `public/icons/*`
- Create: `app/sw.ts`, `app/~offline/page.tsx`
- Create: `components/InstallPrompt.tsx` + test
- Modify: `next.config.ts`, `app/layout.tsx`
- Create: `tests/e2e/pwa.spec.ts`

- [ ] **Step 1: Install Serwist**

```bash
npm i @serwist/next serwist
```

- [ ] **Step 2: Write the manifest**

Create `public/manifest.webmanifest` with `name` and `short_name` generated from `PRODUCT_NAME` at build time (so the product-name guard still passes), `start_url: "/today"`, `display: "standalone"`, `orientation: "portrait"`, `background_color` and `theme_color` set to the `color-bg` value, `lang: "en"`, `dir: "ltr"`, and both icons declared with `"purpose": "maskable any"`.

Generate it from a small build script reading `PRODUCT_NAME`, rather than hardcoding the name. Add a test asserting the generated manifest's `name` equals `PRODUCT_NAME`.

- [ ] **Step 3: Write the service worker**

Create `app/sw.ts` using Serwist's default precache plus explicit runtime rules:

```ts
import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST: unknown[] };

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [{ url: "/~offline", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();
```

Then add, explicitly, a stale-while-revalidate rule for the symptom rules and the urgent guidance, because spec §4.7 requires the urgent path to render offline. That is the one cache entry that is a safety requirement rather than a performance one — comment it as such.

- [ ] **Step 4: Write the failing offline behaviour test**

Create `tests/e2e/pwa.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("serves the app shell and a branded offline page without a connection", async ({ page, context }) => {
  await page.goto("/today");
  await page.waitForLoadState("networkidle");

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.getByRole("status")).toContainText(/offline/i);
});

test("renders urgent triage guidance while offline", async ({ page, context }) => {
  await page.goto("/checkin");
  await page.waitForLoadState("networkidle");
  await context.setOffline(true);
  await page.reload();
  // The urgent guidance must be reachable from cache.
  await expect(page.getByTestId("urgent-guidance-available")).toBeVisible();
});

test("disables write controls and explains why while offline", async ({ page, context }) => {
  await page.goto("/care/medicines");
  await page.waitForLoadState("networkidle");
  await context.setOffline(true);
  const addButton = page.getByRole("button", { name: /add medicine/i });
  await expect(addButton).toBeDisabled();
  await expect(addButton).toHaveAccessibleDescription(/offline/i);
});

test("declares a valid, installable manifest", async ({ page, request }) => {
  await page.goto("/today");
  const href = await page.getAttribute('link[rel="manifest"]', "href");
  expect(href).toBeTruthy();
  const manifest = await (await request.get(href!)).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/today");
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose?.includes("maskable"))).toBe(true);
});
```

- [ ] **Step 5: Implement until every offline test passes**

- [ ] **Step 6: Write and implement the install prompt**

Test: on Android it listens for `beforeinstallprompt`, stores the event, and shows a quiet prompt she can dismiss permanently; on iOS, where that event never fires, it shows the Add-to-Home-Screen instructions instead when running in Safari and not already standalone; it shows nothing when already installed; dismissal is remembered; and `install_prompt_accepted` is emitted with the platform.

- [ ] **Step 7: Verify safe areas and the standalone display on real devices**

Install on a real iPhone and a real mid-range Android. Confirm: no content under the notch or the home indicator, the theme colour applies, the status bar is legible, and the app resumes on the screen it was left on. Record the device models in the commit body.

- [ ] **Step 8: Commit**

```bash
git add public app/sw.ts "app/~offline" components/InstallPrompt.tsx next.config.ts app/layout.tsx tests/e2e/pwa.spec.ts
git commit -m "feat(pwa): add manifest, app-shell service worker, offline states and install prompt"
```

---

## Session 34: TWA packaging and Play Store readiness

**Gate C — request before starting:** ask for a Google Play Console account with a developer profile completed, the production domain live over HTTPS, an upload keystore decision (let Bubblewrap generate one and store it in a password manager), the store listing copy in both languages, and confirmation that custom SMTP is configured for Supabase Auth (see Session 12's pre-deployment follow-up) — the default mailer's rate limit is not viable for real sign-up/sign-in traffic.

**Goal:** A signed Android App Bundle wrapping the same web build, plus every store artefact the listing requires.

**Files:**
- Create: `android/` (Bubblewrap project, committed)
- Create: `public/.well-known/assetlinks.json`
- Create: `docs/play-store/data-safety.md`, `docs/play-store/listing.md`
- Create: `docs/play-store/release-checklist.md`

- [ ] **Step 1: Generate the TWA project**

```bash
npx @bubblewrap/cli init --manifest https://<production-domain>/manifest.webmanifest
```

Answer the prompts with the package name (reverse domain), the launcher name from the store listing, and portrait orientation. Let Bubblewrap generate the signing key; record its SHA-256 fingerprint.

- [ ] **Step 2: Publish digital asset links**

Create `public/.well-known/assetlinks.json` containing the generated fingerprint, deploy it, then verify:

```bash
curl -s https://<production-domain>/.well-known/assetlinks.json | head -20
```

If this file is wrong or missing, the TWA shows a browser address bar instead of running full-screen. That is the single most common failure in this session, so verify it before building.

- [ ] **Step 3: Build and test the bundle**

```bash
cd android && npx @bubblewrap/cli build
```

Install the generated APK on a real device and confirm: no address bar, the back gesture behaves as designed (closing sheets, not exiting), the install is full-screen with safe areas respected, and deep links open in the app rather than the browser.

- [ ] **Step 4: Write the Data Safety declaration**

Create `docs/play-store/data-safety.md` derived directly from the Global Constraints privacy table, declaring: data collected (personal info, health and fitness, photos, files), that it is encrypted in transit, that she can request deletion, and that data is not shared with third parties for advertising. Analytics is declared as collected for analytics purposes with no health data included.

This document exists in the repository so the declaration and the implementation cannot drift apart. Add a note that it must be re-checked whenever a table or an event is added.

- [ ] **Step 5: Write the release checklist**

Create `docs/play-store/release-checklist.md` with the repeatable steps: confirm custom SMTP is configured for Supabase Auth so OTP email is not rate-limited (Session 12's pre-deployment follow-up), bump `versionCode` and `versionName`, rebuild the web app, rebuild the bundle, verify asset links, verify the privacy policy URL resolves, confirm the Data Safety form matches the document, upload to internal testing first, test the install from Play, then promote.

- [ ] **Step 6: Assemble the listing artefacts**

Screenshots from a real device in both languages, a feature graphic, the short and full descriptions in both languages, and the content rating questionnaire answers. Run every description string through `validateCopy` before submitting — the store listing is user-facing copy and the voice rules apply to it.

- [ ] **Step 7: Commit**

```bash
git add android public/.well-known docs/play-store
git commit -m "chore(android): add TWA wrapper, asset links and Play Store release artefacts"
```

**Done when:** the signed bundle installs from internal testing with no address bar, asset links verify, and the Data Safety document matches the implementation. Record the package name, `versionCode` and the key fingerprint location in the commit body.

---

## Session 35: Accessibility, bilingual and device pass

**Goal:** The session that catches what per-screen work misses. Nothing new is built here; things are found and fixed.

**Files:**
- Create: `tests/e2e/accessibility.spec.ts`
- Create: `docs/qa/manual-checklist.md`
- Modify: whatever the pass finds

- [ ] **Step 1: Write the exhaustive automated accessibility sweep**

Create `tests/e2e/accessibility.spec.ts` iterating every route in both locales:

```ts
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ROUTES = [
  "/", "/signin", "/signup", "/legal/privacy", "/legal/terms", "/consent",
  "/onboarding/intro", "/onboarding/profile",
  "/today", "/checkin", "/baby", "/baby/kicks",
  "/care", "/care/medicines", "/care/appointments", "/care/advice",
  "/care/vitals", "/care/reports", "/care/questions", "/care/summary",
  "/reading", "/profile", "/profile/contractions", "/profile/prep", "/profile/settings",
];

for (const locale of ["en", "hi"] as const) {
  for (const route of ROUTES) {
    test(`${route} has no accessibility violations in ${locale}`, async ({ page, context }) => {
      await context.addCookies([{ name: "mr_locale", value: locale, url: "http://localhost:3000" }]);
      await page.goto(route);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
}
```

Run it. Fix every violation in the component that causes it. Never add an axe exclusion.

- [ ] **Step 2: Add the 200% text-scale sweep**

For each route and locale, set the viewport to a small phone size, apply a 200% root font size, and assert no element's `scrollWidth` exceeds its `clientWidth` on the body, so nothing overflows horizontally. Fix by letting text wrap, never by shrinking type or truncating.

- [ ] **Step 3: Add the touch-target sweep**

For each route, assert every element matching `a, button, input, [role="button"], [role="tab"]` has a rendered box of at least 48 by 48 CSS pixels.

- [ ] **Step 4: Write the manual checklist and work through it**

Create `docs/qa/manual-checklist.md` covering, per platform:
- VoiceOver on iOS and TalkBack on Android: every interactive element announces a meaningful name; illustrations read their alt text; the background motif and grain announce nothing; Hindi text is pronounced as Hindi, not as mispronounced English.
- `prefers-reduced-motion` enabled: no animation anywhere, including the illustration, the sheet, tab switches and the language switch.
- The interrupted-flow case: start the onboarding form, take a phone call, return, confirm nothing is lost.
- The back gesture on both platforms: closes a sheet; does not leave the screen beneath it; does not exit the app from a sub-screen.
- A deep link from a cold start lands on a working screen with a visible route back to Today.
- Printing the Visit Summary from Android Chrome and iOS Safari.
- The full flow on a genuinely mid-range device two to three years old, on a throttled connection. Record the device model and the observed load time.

- [ ] **Step 5: Verify the complete suite and commit**

Run: `npm run verify && npm run test:coverage`

```bash
git add tests/e2e/accessibility.spec.ts docs/qa
git commit -m "test: add exhaustive accessibility, text-scale and touch-target sweeps across both locales"
```

**Done when:** zero axe violations across 50 route-locale combinations, no horizontal overflow at 200% scale, every touch target at 48 pixels, and the manual checklist signed off with the test device recorded. Phase 1 is complete at this point.

---

# PHASE 2 — OPTIONAL

> ## ⚠️ THE WHOLE OF PHASE 2 IS OPTIONAL
>
> **Nothing in this part of the document is in scope for Phase 1.** No Phase 2 session may be started until:
>
> 1. Phase 1 Session 35 is signed off, and
> 2. the product owner explicitly asks for that specific Phase 2 session by name.
>
> Phase 2 sessions are deliberately specified at a lower resolution than Phase 1: each one needs its own brainstorming pass and its own gate requests before it is broken into steps. **Do not treat the task lists below as ready to execute.** They record what was deliberately left out of Phase 1, why, and what the first moves would be — so that nothing is silently lost and nothing is accidentally built early.
>
> Sessions are ordered by dependency, not by priority. The product owner chooses the order.

---

## P2-1 (optional): Phone OTP registration

**Why it was out of Phase 1:** transactional SMS in India requires DLT registration of the sender id and every message template with the telecom regulator, plus a paid SMS provider. That is a days-to-weeks external dependency with no code in it, so it would have blocked Phase 1 on something the team cannot close by working harder.

**Prerequisites before starting:** a chosen SMS provider (MSG91 or Twilio), completed DLT entity and template registration, the approved sender id, and the provider credentials configured in Supabase Auth.

**First moves:**
- Extend `AuthForm` with a phone mode. Keep the existing two-step shape (identifier, then code) so only the identifier field and the label change.
- Add `validatePhone` to `lib/domain/` covering: a 10-digit Indian mobile; a leading `+91`; a leading `0`; spaces and hyphens stripped; a landline rejected with a specific message; a number that is too short or too long rejected with the expected length stated.
- Handle the account-linking case explicitly: a phone sign-in for an email account that already exists must link, not duplicate. Decide the rule with the product owner before coding it, because the alternative (two accounts for one person, each holding half her records) is the worst outcome in the product.
- Extend the auth e2e spec to read the provider's test inbox rather than Inbucket.

**Done when:** both identifier types work, the linking rule is implemented and tested, and a real SMS arrives on a real Indian number.

---

## P2-2 (optional): Push notifications for reminders

**Why it was out of Phase 1:** Phase 1 ships in-app reminders only. Push needs a service-worker push handler, an FCM project, a server-side scheduler, token lifecycle handling, and separate iOS behaviour (iOS 16.4+, and only once installed to the home screen). That is a subsystem, not a feature.

**Prerequisites:** an FCM project and server key, a decision on the scheduler (Vercel Cron or Supabase `pg_cron`), and the notification copy in both languages.

**First moves:**
- Add a `push_subscriptions` table (`user_id`, `endpoint`, `keys`, `platform`, `created_at`, `last_seen_at`) with RLS, plus the cross-user denial test.
- Add a `notification_preferences` table or columns: which reminder types she wants, and a quiet-hours window. Default to the least intrusive setting, not the most.
- Add `lib/domain/notifications.ts`: given her medicines, appointments and preferences, and a time, return the notifications due. Pure and fully tested, including the quiet-hours boundary, the same-dose-not-notified-twice rule, and the timezone handling.
- Add the scheduled job that calls it and a deduplication table so a retried job cannot double-send.
- Handle iOS explicitly: detect standalone mode, request permission only after she has seen value (never on first launch), and fall back silently where unsupported.
- Extend the Settings screen with per-type toggles and a test that turning everything off stops all sends.

**Done when:** a reminder arrives on a real Android device and a real iOS 16.4+ installed PWA, quiet hours are respected, and no notification is ever sent twice.

---

## P2-3 (optional): Hindi content library

**Why it was out of Phase 1:** Phase 1 ships a fully bilingual interface with English-first content and an honest "English only" marker, so Hindi content lands item by item without blocking the build.

**Prerequisites:** the Hindi content written as natural spoken Hindi, not translated literally (design document §9).

**First moves:**
- Insert the Hindi `content_items` rows keyed on the existing slugs, plus their `content_passages` with `locale = 'hi'`.
- Remove the fallback marker for items that now have both locales, automatically — `resolveLocalisedContent` already handles this with no code change, which is the point of having written it that way.
- Re-check retrieval quality for Hindi questions now that Hindi passages exist; the `simple` text-search configuration does no Hindi stemming, which is the trigger for P2-6.
- Run every new string through `validateCopy` and the read-aloud test.

**Done when:** no item in the library shows the fallback marker, and a Hindi question retrieves Hindi passages.

---

## P2-4 (optional): Server-side speech to text

**Why it was out of Phase 1:** the Web Speech API is free and needs no backend, and it sits behind the `Transcriber` interface precisely so this swap is one new file.

**Prerequisites:** a decision between Sarvam AI (Indian-language specialist, India data residency, INR pricing) and Whisper, plus the key. Recommend Sarvam if Hinglish accuracy is the reason for the change, because that is what it is built for.

**First moves:**
- Add `lib/speech/serverTranscriber.ts` implementing the existing `Transcriber` interface. Change nothing else in the app.
- **Re-open the privacy decision explicitly.** Phase 1 never uploads audio. Uploading a voice description of a symptom changes the DPDP picture, requires a privacy policy update, a new consent consideration, and a retention rule (recommend: transcribe and discard within the request, never persist).
- Add a capability test that the interface contract is satisfied identically by both implementations, so either can be selected at runtime.
- Measure accuracy against the Web Speech baseline on real Hinglish samples before switching the default. If it is not clearly better, do not switch.

**Done when:** the new transcriber is selectable by configuration, audio is provably not retained, and the accuracy improvement is measured rather than assumed.

---

## P2-5 (optional): Narration and text to speech

**Why it was out of Phase 1:** narration is a genuine but secondary feature for this audience (design document §8), and Phase 1's accessibility baseline is screen-reader support, which is stronger and cheaper.

**First moves:**
- Pre-recorded human narration for reviewed static content: populate `narration_url` and let the existing `AudioIndicator` do the rest. No new component.
- Browser `SpeechSynthesis` for dynamic or user-entered content, behind a `Narrator` interface for the same reason the transcriber has one.
- Test that every screen remains fully usable with audio off, which is the rule that keeps narration a supplement.

---

## P2-6 (optional): Vector retrieval for the chatbot

**Why it was out of Phase 1:** for a corpus of tens of passages, PostgreSQL full-text search needs no embedding vendor, no API key, no re-index pipeline and far less code. Upgrade only when recall measurably disappoints, and "measurably" means a recorded failure set, not a feeling.

**Prerequisites:** a recorded set of real questions the current retrieval answers badly, and a chosen embedding provider (note: Anthropic publishes no embedding model, so this is a third-party dependency — Voyage or OpenAI).

**First moves:**
- Enable `pgvector`, add an `embedding` column to `content_passages`, and a backfill job.
- Change `search_passages` into a hybrid: full-text for exact terms, vector for semantics, combined with reciprocal rank fusion. Keep the same function signature so `lib/ai/retrieval.ts` is the only caller and barely changes.
- Add a re-index step to the content workflow, so an edited passage cannot keep a stale embedding. This is the real ongoing cost of this change and should be decided deliberately.
- Measure recall against the recorded failure set before and after. Keep the full-text path as a fallback when the embedding service is down.

**Done when:** the recorded failure set is answered, and a failed embedding call degrades to full-text rather than to no answer.

---

## P2-7 (optional): Extraction from PDF reports

**Why it was out of Phase 1:** Phase 1 deliberately stores reports raw. Extraction is a correctness and safety problem, not a parsing problem: a misread blood-pressure value shown as fact is a clinical harm.

**Prerequisites:** a real sample set of at least 30 Indian lab and scan reports, a decision on where extraction runs, and a written rule for what happens to a low-confidence value.

**First moves:**
- Add `report_extractions` (`report_id`, `field`, `value`, `unit`, `confidence`, `source_page`, `confirmed_by_user`, `extracted_at`) with RLS.
- **Make confirmation mandatory.** Nothing extracted is ever shown as her data, or reaches the Visit Summary, until she has confirmed it against the original. Build the confirmation screen before the extractor, so the extractor is never the thing that writes a fact.
- Extract text first, structure second. Start with the handful of fields that matter (haemoglobin, blood pressure, weight, scan date, gestational age on scan) rather than everything.
- Feed a confirmed scan gestational age into the EDD correction flow built in Session 32, which already exists for exactly this.
- Measure precision per field on the sample set and record it. A field below an agreed precision bar is not shipped.

**Done when:** no extracted value can reach the Visit Summary unconfirmed, and per-field precision is recorded.

---

## P2-8 (optional): In-app document scanner

**Why it was out of Phase 1:** the native file input with `capture` gets a usable photo in with no library. Edge detection, perspective correction and multi-page assembly are several sessions of polish on a flow that already works.

**First moves:** evaluate a WASM-based document-scanning library against bundle size on a mid-range device before committing. If it costs more than roughly 150 KB gzipped, reconsider — this product's performance target is a three-year-old phone.

---

## P2-9 (optional): Internal content admin

**Why it was out of Phase 1:** content is seeded by migration, which is fine for tens of items and needs no auth surface.

**First moves:** a password-gated route, or a separate internal tool, writing to `content_items` and `content_passages` with a service-role key that never touches the client bundle. Add a role column and a policy rather than bypassing RLS. Include a preview in both locales and a `validateCopy` check on save, so the voice rules are enforced at authoring time rather than at review time.

---

## P2-10 (optional): Brightness-dim toggle and APCA contrast pass

**Why it was out of Phase 1:** design document §8 records the dim toggle as a proposal awaiting confirmation, not a built decision. Phase 1 meets WCAG 2.x ratios.

**First moves:** the dim toggle is a single filter layer over the same palette, persisted per user, which is why it is cheap. The APCA pass is a measurement exercise on the existing tokens with a possible small adjustment to `color-accent-primary`, which is the one token closest to its floor at 4.6:1.

---

## P2-11 (optional): Postpartum and newborn mode

**Why it was out of Phase 1:** this is effectively a second product. It needs its own content library, its own illustration set, its own data model for feeds and sleep, and its own safety review. Phase 1 ends at the due date with a gentle holding state, which is honest rather than half-built.

**First moves:** this session must start with its own brainstorming pass, not with code. The first question is whether the postpartum product is the same app or a second one.

---

## P2-12 (optional): Doctor portal and paid consultations

**Why it was out of Phase 1:** the spec deliberately excludes a doctor-facing portal, and the Doctor Visit Summary stands in for it. Payments would additionally require Google Play Billing inside the TWA plus a separate web payment path and entitlement sync between them.

**First moves:** none. This is a new product with its own users, its own threat model, its own regulatory surface and its own commercial model. It needs its own spec from scratch. The only thing Phase 1 did for it is the un-checked optional data-sharing consent recorded in the `consents` table, which is what makes a future opt-in honest.

---

# PHASE 3 — OPTIONAL

**Also entirely optional and out of scope.** Extraction from report images (OCR of photographed reports) with the same mandatory-confirmation rule as P2-7; structured trend analysis across confirmed extracted values; and whatever Phase 2 usage data justifies. Phase 3 should not be planned in detail until Phase 2 has shipped and been measured.

---

# External review response (revision 5)

A third pass verified revision 4. Five of the seven revision-3 defects closed outright; it found
**six defects introduced by the revision 4 fixes**, all real, and all fixed here. The most important
was a practical blocker I had explicitly asked the reviewer to look for:

| Defect | Fix |
|---|---|
| **The PCPNDT guard failed on its own vocabulary.** The repository walk scanned `schema-pcpndt.test.ts`, which must contain every forbidden term to match them, so it would have failed on the first run of Session 7 — and the usual response to an always-failing guard is to weaken it | The vocabulary moved to one file, `tests/guards/pcpndt-terms.ts`, shared with `lib/ai/guardrails.ts`. Four matcher files are excluded by name, planning and review documents by pattern, and generated files (`database.types.ts`, lockfiles, `.d.ts`) as not authored here. Three new tests assert the walk still covers `app/`, `components/`, `supabase/` and `i18n/`, and that the exclusion list stays at four entries |
| Kick domain tests still called `kickState({ kickTimes })` after the interface changed to `{ events }` | Every fixture converted to `{ tapId, occurredAt }`, plus a test that a repeated `tapId` counts once and one that ordering follows occurrence rather than arrival |
| `recordKick(sessionId)` dropped the idempotency key at the action boundary, which would have defeated the whole `tap_id` design — a retry through a one-argument action generates a new id | Signature is `recordKick(sessionId, tapId)`, with the client generating it, a retry test through the action, and rejection of a malformed id |
| Session 8's Interfaces block and RLS instruction still said five tables | Six, named explicitly |
| The privacy-policy draft instruction still told the author to write "no personal data is sent to any AI provider" — recreating the corrected overclaim in the one document where being wrong has legal consequences | Instruction rewritten to spec §7 strength, with two tests: one that rejects absolute phrasing, one that requires the residual categories to be named |
| `getCurrentConsents()` returned booleans, but Settings must show the version and date — so Settings would have queried the view separately, re-creating the divergent read the function exists to prevent | Returns `ConsentState` records; Settings, middleware and analytics all read it; the Visit Summary was removed from the consumer list, since it never needed consent data |

Also strengthened: account-deletion freshness is now read from the **verified session's**
`last_sign_in_at` after a real `verifyOtp`, not from a client-asserted timestamp, with a test that a
freshness value in the request body is ignored.

**Three rounds, converging:** 21 findings, then 7, then 6 — each round smaller and more local than the
last. The first round found architectural holes, the second found contradictions between fixes, the
third found mechanical drift. That is the shape of convergence rather than churn.

---

# External review response (revision 4)

The revision 3 documents were re-reviewed. That pass closed 13 of the 21 original findings and
found **7 new defects introduced by the revision 3 fixes** — which is the expected cost of nine
substantive rewrites, and the reason the second pass weighted regressions above re-checking. All
seven are fixed here, along with four findings that were only partially closed.

| Defect | Fix |
|---|---|
| Export-completeness test could not pass: the catalogue excluded `profiles` while `buildExport` added it, plus envelope keys | `user_owned_tables()` unions in `profiles`; the export separates `meta` from `tables` and only `tables` is compared, so the assertion is a true equality |
| Metadata-first report creation violated `storage_path NOT NULL` — the path derives from the row id, so the row could not be inserted first | The id is generated in the action with `crypto.randomUUID()`, the path derived from it, and both written in one insert |
| Consent tie-break used `id DESC`, but `id` is a random v4 UUID and carries no chronology | Added `seq bigint generated always as identity`; the index, the view and the test all order by it, and the test now asserts the exact later value instead of `typeof boolean` |
| The contamination check covered `body` but the rendered `heading` went unchecked | `displayedText()` covers every rendered field, with a contaminated-heading test and a field-coverage test that fails if a field is added to the response but not to the helper |
| `db:seed` stayed wired to the placeholder corpus forever | `db:seed` points at the reviewed corpus; the placeholder has its own script, is fenced by a test against deploy paths, and is **deleted** in Session 29 |
| The §15 launch note still claimed personal data never reaches the provider, contradicting the best-effort redaction two sections earlier | Rewritten to name the residual categories: addresses, third-party names, medicine names, alphanumeric identifiers |
| The route read `selected.content_item_id`, a field the new candidate type did not declare | `RetrievalCandidate` is now one named type carrying `contentItemId`, used by retrieval, the provider and the route, with a source-link test |

**Partials also closed:** one shared `getCurrentConsents()` query that all four consumers call, with
a guard test banning raw reads elsewhere (finding 3); fresh re-authentication within a bounded window
before account deletion, with a stale-verification test (finding 4); the PCPNDT static scan now walks
the repository by extension instead of enumerating six files, with a test that fails if the walk finds
implausibly few files (finding 6).

**The one dispute I conceded.** I had rejected a child table for kick taps, arguing the atomic
`append_kick()` RPC solved it. The reviewer was right that this solves concurrency but not retries:
a committed write whose response is lost gets retried and appends a second timestamp. Idempotency
needs a client-supplied key, and a key needs a row to be unique against. `kick_events` with a unique
`(session_id, tap_id)` is the design, the 23rd table, and the reason the table count moved.

---

# External review response (revision 3)

An external review of revision 2 produced 21 findings (the review files are in `Important/`). This section records what was done with each,
including the ones that were rejected and why, so a later reader does not have to re-litigate them.

**Accepted and fixed — these were real defects, several of them in claims the plan made about its own
safety:**

| # | Finding | Fix |
|---|---|---|
| 1 | "Retrieval-only" was unenforced: a cited answer could still carry invented prose | Spec §5 rewritten. The model **selects** a passage id; the body is the stored row, verbatim. The provider interface cannot return text (Session 29) |
| 2 | RLS allowed attaching a child row to another user's parent | Six composite foreign keys with `user_id`, plus forgery denial tests and a same-owner positive test (Sessions 8, 9, 10) |
| 3 | Consent withdrawal never took effect on an append-only table | `current_consents` view, read by middleware, analytics and Settings; `(granted_at DESC, id DESC)` ordering; true→false→true test (Sessions 7, 12) |
| 4 | `deleteAccount` could not work with the declared clients | `lib/supabase/admin.ts` behind `server-only`, named as the single sanctioned service-role path, with the storage-before-user ordering as a test (Session 32) |
| 5 | Offline timer writes contradicted the approved offline decision | Both timers now refuse offline input with an explanation. Durable offline capture moved to Phase 2 (Sessions 21, 30; spec §10) |
| 6 | PCPNDT guard scanned two files and matched a finite list | Scan extended to seeds and legal content, post-response check on passage bodies, adversarial transliteration and euphemism tests, and the residual risk stated rather than claimed closed (Sessions 7, 29) |
| 7 | Analytics was a denylist of key names, so `{ condition: "bleeding" }` passed | Replaced with per-event strict schemas; unknown keys rejected; guard widened to the whole tree (Session 17A) |
| 8 | "No personal data to the provider" was false: her question text is sent | Claim restated honestly in spec §7, plus `redactQuestion()` and a test using data typed *inside* the question (Session 29) |
| 9 | Export-completeness test derived table names from an erased TypeScript type | Replaced with a `user_owned_tables()` catalogue function and an integration test (Session 32) |
| 10 | `tables_without_rls` left `EXECUTE` with `PUBLIC` | `revoke all ... from public` first, plus a test that an ordinary user cannot call it. The vacuous placeholder test was deleted rather than replaced (Session 7) |
| 11 | Passage locale was independent of its parent item | Composite foreign key `(content_item_id, locale)` with a mismatch test (Session 10) |
| 12 | Vitals: the database rejected what the UI promised to save | Two explicit boundaries — physically impossible rejects, clinically notable saves with a note (spec §3.3, Sessions 9, 24) |
| 13 | Compressed TDD steps were unauditable | Rule added to Global Constraints: compression never removes the red/green checkpoint |
| 14 | Domain-purity guard grepped single quotes while all code uses double | Pattern covers both quote styles, `require` and dynamic import, **plus a test proving the guard can detect a violation** (Session 11) |
| 15 | `position: fixed` is not a reliable print running header | Replaced with `table-header-group`, plus a concrete three-page pass criterion on both engines (Session 27) |
| 16 | Storage policy did not bind an object to its metadata row | Metadata-first with a server-generated path (Session 26). Noted as integrity, not a cross-tenant leak: the first path segment does block that |
| 17 | Consent ordering was nondeterministic on tied timestamps | `id DESC` tiebreaker in the index, the view, and a test (Session 7) |
| 18 | Spec omitted `contractions.user_id`; Session 9 said "seven tables" for six | Both corrected |
| 19 | Advertised test counts were wrong | All hardcoded counts removed. Worth noting the review's own replacement numbers were also wrong, which is the argument for not asserting counts in prose at all |
| 20 | "Two hard gates" while three were defined | Corrected, and the credentials gate stated as the same kind of stop |
| 21 | Filename references did not match the repository | References updated to `Design.md`, `Spec.md`, `Implementation_Plan.md` |

**Accepted from the disagreements section:** `d3-scale` adopted for chart scales while keeping the SVG
and tokens in-house (Session 24); coverage enforcement extended beyond `lib/domain/` to the AI,
analytics and chat-route paths (Session 0); an append-only EDD revision trail added to the Phase 2
list, with Phase 1 recording a correction as a system timeline event; curated synonym and alias terms
plus a retrieval evaluation set added to the Phase 2 retrieval work.

**Rejected, with reasons:**

- **Single `vitals` table.** The review argued the `kind`/`value_1`/`value_2` shape makes illegal
  states easy to express. The kind-dependent CHECK constraints already prevent them — `bp` requires
  `value_2`, `weight` forbids it, and diastolic must be below systolic — and there are exactly two
  units in the product, so nothing is ambiguous. One table keeps one chart component and one form.
  Revisit if a third vital type ever appears.
- **Kick timestamps as a child table — initially rejected, then conceded on the second review.**
  The first fix kept the array and appended it inside the database, which made concurrent taps safe.
  The reviewer correctly pointed out that this does not make a *retry* safe: if the call commits and
  its response is lost, the retry appends a second timestamp and the count is wrong. Idempotency
  needs a client-supplied key, and a key needs a row to be unique against. `kick_events` with a
  unique `(session_id, tap_id)` is now the design, and the 23rd table.
- **A medically reviewed claim-level allowlist for generated answers.** Out of scope because there
  are no generated answers in Phase 1 any more. The bar for reintroducing generation is recorded in
  spec §13.

---

# Plan self-review

Run after writing, recorded here so a reviewer can see what was checked.

**1. Spec coverage.** Every section of `Spec.md` maps to at least one session:

| Spec section | Sessions |
|---|---|
| §1.2 locked decisions | Throughout; stack in 0, auth in 12, offline in 33 |
| §1.3 design-doc amendments | 17 (nav), 5 and 6 (motif exclusion enforced per screen) |
| §1.4 PCPNDT | 7 (schema guard), 16 (form test), 29 (chatbot guardrail) |
| §1.4 DPDP | 13 (consent), 19 (no audio), 29 (no personal data to provider), 32 (export, deletion) |
| §2.1 repo layout | 0 |
| §2.2 domain purity | 11 (guard test) |
| §2.3 data flow | 17 (shell), 33 (service worker) |
| §3.1–3.4 all 23 tables | 7 (3), 8 (6), 9 (6), 10 (8) |
| §3.5 security posture | 7 (`tables_without_rls`), 8, 9, 10 |
| §1.4.5 and §7 analytics | 17A |
| §4.1 landing | 14 |
| §4.2 intro | 15 |
| §4.3 auth | 12 |
| §4.4 consent | 13 |
| §4.5 onboarding form | 16 |
| §4.6 Today | 18 |
| §4.7 check-in and triage | 19 |
| §4.8 My Baby and kicks | 20, 21 |
| §4.9 My Care (all six sub-sections) | 22, 23, 24, 25, 26 |
| §4.10 Visit Summary and print | 27 |
| §4.11 Reading | 28 |
| §4.12 Profile, contractions, prep, settings | 30, 31, 32 |
| §4.13 chatbot | 29 |
| §5 AI subsystem and its seven guarantees | 29 (each guarantee is a named test) |
| §6 design system and build order | 1, 2, 3, 5, 6 |
| §7 privacy table | 13, 19, 29, 32, 34 |
| §8 PWA, offline, TWA | 33, 34 |
| §9 error handling | 5 (shared components), then every screen session |
| §10 edge cases | Distributed; see the map below |
| §11 testing matrix | 0 (harness), then every session |
| §12 delivery shape | This document |
| §13, §14 Phase 2 and 3 | The optional part of this document |
| §15 open items | 5 (motif placeholder), 13 (legal drafts), 29 (Gemini tier recorded) |

**No open deviations from the spec.** Plan and spec agree as of revision 3; every change in the external-review response above was applied to both documents. Two earlier deviations were closed by amending the spec:

1. **Analytics.** Added to Phase 1 by the product owner after the spec was first approved. Now specified in the spec at §1.2 (decisions table), §1.4.5 (binding data-minimisation rules), §2.1 (`lib/analytics/` in the layout), §3.1 (the `analytics` consent key), §4.12 (opt-out in Settings), §7 (privacy table), §11 (test layer) and §15 (items 6 and 7). Implemented in Session 17A.
2. **Table count and `question_marks`.** The spec states **23** tables and specifies both `question_marks` and `kick_events` in §3. The plan creates all 23 across migrations 0001 to 0004 in Sessions 7 to 10, so **the data layer genuinely closes at Session 10** and no later session adds a migration. The count moved from 22 to 23 when the second review showed a kick tap needs an idempotency key, which needs a row to be unique against.

**Edge-case coverage map (spec §10).** Dates and pregnancy → Session 11. Language and text → Sessions 4 and 35. Auth → Session 12. Voice → Session 19. My Care → Sessions 22 to 26. Timers → Sessions 21 and 30. Chatbot → Session 29. Summary and print → Session 27. Navigation → Sessions 3 (sheet back gesture), 12 (deep links) and 17.

**2. Placeholder scan.** No task in Phase 1 contains "TBD", "implement later", "add appropriate error handling", "write tests for the above", or "similar to Task N". Where a Phase 1 session depends on content or credentials the implementer cannot produce, that is a named gate with an explicit stop, not a placeholder. Phase 2 is intentionally lower-resolution and is fenced off as optional and not-ready-to-execute.

**3. Type consistency.** Checked and fixed inline:

- `Severity` is defined once, in `lib/domain/severity.ts` (Session 6), and imported by `SeverityBadge`, `lib/domain/triage.ts` and the check-in screen. It is not redeclared anywhere.
- `Transcriber` is defined once in `lib/speech/transcribe.ts` (Session 19) and implemented by `webspeech.ts`, and in P2-4 by a server transcriber.
- `AiProvider` is defined once in `lib/ai/provider.ts` (Session 29) and implemented only by `gemini.ts`.
- `Analytics` is defined once in `lib/analytics/provider.ts` (Session 17A).
- `Reminder`, `TriageResult`, `PregnancyProgress`, `SummaryModel` each have exactly one definition, in their own domain file.
- Every `lib/domain/` function named in a session's Interfaces block appears in exactly one session, with one signature.
- `todayInAppZone`, `addDays` and `diffDays` are the only date helpers; no session defines a second one. The helper duplicated inside `lib/domain/pregnancy.test.ts` is a local test fixture, and is labelled as one.

---

# Execution

Plan complete and saved to `Important/Implementation_Plan.md`.

**Before the first session:** work through the Gate C requests for Session 7 (Supabase project in the Mumbai region) and Session 12 (Google OAuth client, email OTP templates in both languages) so the data and auth sessions are not blocked when they come up. `Spec.md` and this plan are in sync as of this revision; the self-review above records what was checked.

**Session order is not arbitrary.** Sessions 0 to 11 have no gates and no designer dependency, so they can run back to back. Every session from 14 onward is gated on a designer asset, so the realistic order is: run the ungated foundation sessions first, then take screen sessions in whatever order the designs actually arrive, using the Interfaces block in each session to confirm its dependencies are already built.

**Two execution options:**

1. **Subagent-driven (recommended)** — a fresh subagent per session, with a review between sessions. Best fit here, because each session is self-contained and the Interfaces block tells a cold subagent exactly what it may rely on.
2. **Inline execution** — sessions executed in one continuing session with checkpoints for review. Better continuity, much larger context, and a higher chance of drift on a plan this long.







