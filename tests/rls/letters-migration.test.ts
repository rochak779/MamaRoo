// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/0009_letters.sql", "utf8");
const compact = sql.toLowerCase().replace(/\s+/g, " ");

describe("letters migration", () => {
  it("stores a bounded body and raw gestational week with timestamps", () => {
    expect(compact).toContain("create table public.letters");
    expect(compact).toContain("length(btrim(body)) between 1 and 4000");
    expect(compact).toContain("gestational_week int not null");
    expect(compact).toContain("gestational_week between 0 and 42");
    expect(compact).toContain("updated_at timestamptz not null default now()");
  });

  it("uses a same-owner composite pregnancy reference and full owner CRUD RLS", () => {
    expect(compact).toContain("foreign key (pregnancy_id, user_id)");
    expect(compact).toContain("references public.pregnancies (id, user_id)");
    expect(compact).toContain("on delete set null (pregnancy_id)");
    expect(compact).toContain("alter table public.letters enable row level security");
    for (const operation of ["select", "insert", "update", "delete"]) {
      expect(compact).toContain(`for ${operation}`);
    }
    expect(compact.match(/auth\.uid\(\) = user_id/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("keeps updated_at current on edit", () => {
    expect(compact).toContain("create trigger letters_touch before update on public.letters");
    expect(compact).toContain("execute function public.touch_updated_at()");
  });
});
