// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/20260913193912_guide_faqs.sql", "utf8");
const compact = sql.toLowerCase().replace(/\s+/g, " ");
const seed = readFileSync("supabase/seed/guide_faqs.placeholder.sql", "utf8");
const packageJson = readFileSync("package.json", "utf8");

describe("guide FAQs migration", () => {
  it("creates ordered bilingual FAQ and scheme catalogs", () => {
    expect(compact).toContain("create table public.guide_faqs");
    expect(compact).toContain("create index guide_faqs_locale_idx on public.guide_faqs (locale, sort_order)");
    expect(compact).toContain("create table public.guide_schemes");
    expect(compact).toContain("create index guide_schemes_locale_idx on public.guide_schemes (locale, sort_order)");
    expect(compact.match(/locale text not null check \(locale in \('en', 'hi'\)\)/g)).toHaveLength(2);
    expect(compact.match(/is_active boolean not null default true/g)).toHaveLength(2);
  });

  it("permits authenticated reads of active rows and defines no write policy", () => {
    expect(compact).toContain("for select to authenticated using (is_active = true)");
    expect(compact.match(/for select to authenticated using \(is_active = true\)/g)).toHaveLength(2);
    for (const operation of ["insert", "update", "delete"]) {
      expect(compact).not.toMatch(new RegExp(`create policy[^;]+for ${operation}`));
    }
  });

  it("seeds every exact English mock row plus Hindi placeholders", () => {
    for (const copy of [
      "Can I eat fruit at night",
      "Gentle movement is usually encouraged, not avoided.",
      "Will an oil massage harm my baby",
      "Can I sleep on my back",
      "Cash support for your first living child, paid in installments.",
      "Cash assistance for institutional delivery, mainly for those below the poverty line.",
      "A free number to call for pregnancy related questions and appointment help.",
    ]) {
      expect(seed).toContain(copy);
    }
    // 4 FAQs + 3 schemes per locale, not the mock's 5 FAQs -- the seed file's own
    // header comment explains which FAQ is dropped and why (PCPNDT, spec 1.4).
    expect(seed.match(/\('en',/g)).toHaveLength(7);
    expect(seed.match(/\('hi',/g)).toHaveLength(7);
    expect(seed.match(/'Pradhan Mantri Matru Vandana Yojana'/g)).toHaveLength(2);
    expect(seed.match(/'Janani Suraksha Yojana'/g)).toHaveLength(2);
    expect(packageJson).toContain("./seed/guide_faqs.placeholder.sql");
  });

  // No local PCPNDT check here: writing one means typing the forbidden term into
  // this file's own source, which tests/guards/schema-pcpndt.test.ts (the
  // repo-wide guard) would then flag on itself -- the same reason that guard
  // keeps its own exception list to four files. The repo-wide guard already
  // covers this file and this seed unconditionally; a second, narrower copy
  // would only add a second thing to keep in sync.
});
