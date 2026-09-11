#!/usr/bin/env node
// Reads `supabase status -o json` output and prints GITHUB_ENV lines for
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY, which
// tests/rls/helpers.ts needs to reach the ephemeral local Supabase CI started,
// and for NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY, which the
// Next.js app itself needs.
//
// The job-level `env:` block in ci.yml sets NEXT_PUBLIC_SUPABASE_URL/ANON_KEY
// to placeholders so typecheck/lint/build can run before a real Supabase
// instance exists. Without this script overriding them in $GITHUB_ENV before
// `npm run test:e2e` runs `next build`, that placeholder gets baked into the
// built app (Next.js inlines NEXT_PUBLIC_* at build time) -- every real
// Supabase call the running app makes (e.g. signInWithOtp) then silently goes
// to the nonexistent https://placeholder.supabase.co and fails, which is what
// broke the Session 12 auth e2e test: it looked like a Supabase/email problem
// but no request ever reached the local GoTrue container (confirmed via its
// logs -- no /otp entry at all during the e2e run).
//
// Not done with `-o env` + grep: that format was observed prefixing lines with
// `export ` (or similar), so `grep '^API_URL='` silently matched nothing and
// wrote an EMPTY value into $GITHUB_ENV -- worse than failing, because the
// empty string overrides helpers.ts's own localhost fallback instead of
// leaving it unset. JSON keys are unambiguous, and this script fails loudly
// if any of the five is missing rather than exporting a blank value.
//
// Usage: node scripts/export-supabase-status.mjs <path-to-status.json>

import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("usage: export-supabase-status.mjs <status.json>");
  process.exit(1);
}

const status = JSON.parse(readFileSync(path, "utf8"));

const wanted = {
  SUPABASE_URL: status.API_URL,
  SUPABASE_ANON_KEY: status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
};

const missing = Object.entries(wanted)
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length > 0) {
  console.error(
    `Missing from supabase status -o json: ${missing.join(", ")}. ` +
      `Available keys: ${Object.keys(status).join(", ")}`,
  );
  process.exit(1);
}

for (const [name, value] of Object.entries(wanted)) {
  console.log(`${name}=${value}`);
}
