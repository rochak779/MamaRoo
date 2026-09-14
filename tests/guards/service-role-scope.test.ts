import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// The service-role key bypasses RLS entirely. Exactly two files are allowed to
// reference it: lib/supabase/admin.ts (the client itself) and lib/env.ts (the
// schema declaring the var name so it validates at startup). Everywhere else --
// every component, every other action, every other lib module -- it must never
// appear, or RLS stops being the thing actually protecting her data.
const ALLOWED_KEY_FILES = ["lib/supabase/admin.ts", "lib/env.ts"];
// createAdminSupabase itself is allowed one more caller: the one action
// permitted to use it (account deletion).
const ALLOWED_CLIENT_FILES = [...ALLOWED_KEY_FILES, "app/actions/privacy.ts"];

function grepFor(pattern: string, allowed: string[]): string {
  const exclude = allowed.map((f) => `| grep -v '${f}'`).join(" ");
  return execSync(
    `grep -rn "${pattern}" app components lib --include='*.ts' --include='*.tsx' 2>/dev/null ` +
      `| grep -v '\\.test\\.' ${exclude} || true`,
    { encoding: "utf8" },
  ).trim();
}

describe("service-role key and client stay scoped to account deletion", () => {
  it("SUPABASE_SERVICE_ROLE_KEY appears in no file except admin.ts and env.ts", () => {
    expect(grepFor("SUPABASE_SERVICE_ROLE_KEY", ALLOWED_KEY_FILES)).toBe("");
  });

  it("createAdminSupabase is called from no file except admin.ts and the deletion action", () => {
    expect(grepFor("createAdminSupabase", ALLOWED_CLIENT_FILES)).toBe("");
  });

  it("detects a real violation, so this guard cannot pass vacuously", () => {
    const hits = execSync(
      "grep -rn \"SUPABASE_SERVICE_ROLE_KEY\" lib/supabase/admin.ts 2>/dev/null || true",
      { encoding: "utf8" },
    ).trim();
    expect(hits).not.toBe("");
  });
});
