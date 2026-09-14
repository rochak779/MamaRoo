// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/20260914092832_user_owned_tables.sql", "utf8");
const compact = sql.toLowerCase().replace(/\s+/g, " ");

describe("user_owned_tables migration", () => {
  it("defines a stable, security-definer function scoped to public", () => {
    expect(compact).toContain("create or replace function public.user_owned_tables()");
    expect(compact).toContain("returns setof text");
    expect(compact).toContain("language sql stable security definer set search_path = public");
  });

  it("unions in profiles, whose owner column is id rather than user_id", () => {
    expect(compact).toContain("union");
    expect(compact).toContain("select 'profiles'");
  });

  it("is executable by service_role only, revoked from anon, authenticated, and public", () => {
    expect(compact).toContain("revoke all on function public.user_owned_tables() from public");
    expect(compact).toContain("revoke all on function public.user_owned_tables() from anon, authenticated");
    expect(compact).toContain("grant execute on function public.user_owned_tables() to service_role");
  });
});
