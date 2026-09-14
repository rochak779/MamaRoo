// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/20260914061906_pregnancy_prep.sql", "utf8");
const compact = sql.toLowerCase().replace(/\s+/g, " ");

describe("pregnancy prep migration", () => {
  it("keys checklist items by a locale-stable item_key, unique per locale", () => {
    expect(compact).toContain("create table public.checklist_items");
    expect(compact).toContain("item_key text not null");
    expect(compact).toContain("locale text not null check (locale in ('en', 'hi'))");
    expect(compact).toContain("unique (item_key, locale)");
    expect(compact).toContain("alter table public.checklist_items enable row level security");
    expect(compact).toContain("using (is_active = true)");
  });

  it("scopes checklist progress to the owner and keys it by item_key, not a per-locale row id", () => {
    expect(compact).toContain("create table public.checklist_progress");
    expect(compact).toContain("item_key text not null");
    expect(compact).toContain("unique (user_id, item_key)");
    expect(compact).toContain("alter table public.checklist_progress enable row level security");
    for (const operation of ["select", "insert", "update", "delete"]) {
      expect(compact).toContain(`for ${operation}`);
    }
    expect(compact.match(/auth\.uid\(\) = user_id/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("bounds emergency contact name and phone, with full owner CRUD RLS", () => {
    expect(compact).toContain("create table public.emergency_contacts");
    expect(compact).toContain("length(btrim(name)) between 1 and 80");
    expect(compact).toContain("phone text not null check (phone ~ '^[0-9]{10}$')");
    expect(compact).toContain("alter table public.emergency_contacts enable row level security");
  });

  it("keeps updated_at current on checklist_progress and emergency_contacts edits", () => {
    expect(compact).toContain("create trigger checklist_progress_touch before update on public.checklist_progress");
    expect(compact).toContain("create trigger emergency_contacts_touch before update on public.emergency_contacts");
    expect(compact.match(/execute function public\.touch_updated_at\(\)/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("adds a bounded birth_notes column to pregnancies", () => {
    expect(compact).toContain("alter table public.pregnancies");
    expect(compact).toContain("add column birth_notes text check (length(birth_notes) <= 4000)");
  });
});
