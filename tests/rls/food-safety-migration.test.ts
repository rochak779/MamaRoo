// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/20260913185517_food_safety.sql", "utf8");
const compact = sql.toLowerCase().replace(/\s+/g, " ");
const seed = readFileSync("supabase/seed/food_safety.placeholder.sql", "utf8");

describe("food safety migration", () => {
  it("creates the constrained bilingual food-safety catalog", () => {
    expect(compact).toContain("create table public.food_safety_items");
    expect(compact).toContain("locale text not null check (locale in ('en', 'hi'))");
    expect(compact).toContain("status text not null check (status in ('safe', 'moderation', 'avoid'))");
    expect(compact).toContain("is_active boolean not null default true");
    expect(compact).toContain("create index food_safety_items_locale_idx on public.food_safety_items (locale, sort_order)");
  });

  it("permits authenticated reads of active rows and defines no write policy", () => {
    expect(compact).toContain("alter table public.food_safety_items enable row level security");
    expect(compact).toContain("for select to authenticated using (is_active = true)");
    for (const operation of ["insert", "update", "delete"]) {
      expect(compact).not.toMatch(new RegExp(`create policy[^;]+for ${operation}`));
    }
  });

  it("seeds the six exact English mock items plus bilingual placeholder rows", () => {
    for (const copy of [
      "Ripe papaya is fine in normal amounts.",
      "Better to avoid raw or unripe papaya during pregnancy.",
      "Paneer made at home or from pasteurised milk is safe.",
      "Fine occasionally, but easy to overdo on salt.",
      "One or two cups a day is generally fine.",
      "Better to avoid raw sprouts, cooked ones are fine.",
    ]) {
      expect(seed).toContain(copy);
    }
    expect(seed.match(/\('en',/g)).toHaveLength(6);
    expect(seed.match(/\('hi',/g)).toHaveLength(6);
    expect(seed).not.toContain("'Fish'");
  });
});
