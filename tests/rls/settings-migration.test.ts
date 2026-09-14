// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync(
  "supabase/migrations/20260914063341_profile_mobile_number.sql",
  "utf8",
);
const compact = sql.toLowerCase().replace(/\s+/g, " ");

describe("Session 32 profile migration", () => {
  it("adds exactly one optional 10-digit mobile number to the existing owner-protected profile", () => {
    expect(compact).toContain("alter table public.profiles");
    expect(compact).toContain("add column mobile_number text");
    expect(compact).toContain("mobile_number ~ '^[0-9]{10}$'");
    expect(compact).not.toContain("emergency_contacts");
    expect(compact).not.toContain("create table");
  });

  it("does not duplicate the profile RLS policies that already protect every column", () => {
    expect(compact).not.toContain("create policy");
    expect(compact).not.toContain("disable row level security");
  });
});
