import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getContentItem,
  listContentByCategory,
  listContentByWeekRange,
  type ContentItemRow,
} from "@/lib/supabase/queries/content";
import type { Database } from "@/lib/supabase/database.types";
import { PRODUCT_NAME } from "@/lib/config";

// tests/guards/product-name.test.ts forbids the literal product name outside
// lib/config.ts, so fixtures build the real citation copy from PRODUCT_NAME.
const CURATED_CITATION = `Reviewed by ${PRODUCT_NAME}'s medical team`;

const english: ContentItemRow = {
  id: "content-en",
  slug: "sleep-well",
  locale: "en",
  kind: "audio",
  title: "Sleep well",
  summary: null,
  body_md: null,
  media_url: null,
  narration_url: "/sleep.mp3",
  duration_seconds: 120,
  week_min: 10,
  week_max: 20,
  tags: [],
  category: null,
  citation: CURATED_CITATION,
  is_published: true,
  created_at: "2026-09-01T00:00:00Z",
};

const hindi: ContentItemRow = { ...english, id: "content-hi", locale: "hi", title: "अच्छी नींद" };

function fakeClient(rows: ContentItemRow[]) {
  const filters: Array<[string, unknown]> = [];
  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => {
      filters.push([column, value]);
      return query;
    },
    then: (resolve: (value: { data: ContentItemRow[]; error: null }) => unknown) => {
      const filtered = rows.filter((row) =>
        filters.every(([column, value]) => row[column as keyof ContentItemRow] === value),
      );
      return Promise.resolve({ data: filtered, error: null }).then(resolve);
    },
  };
  return { from: () => query } as unknown as SupabaseClient<Database>;
}

/**
 * A little more capable than `fakeClient` above: supports `.in()` and a
 * PostgREST-style `.or("col.is.null,col.lte.5")` string, since the list
 * queries below need both (mirroring `getTodayData`'s week-range dance).
 * Each call ANDs with the ones before it; a single `.or()` call ORs its own
 * comma-separated clauses together first.
 */
function fakeListClient(rows: ContentItemRow[]) {
  const predicates: Array<(row: ContentItemRow) => boolean> = [];
  function parseClause(clause: string): (row: ContentItemRow) => boolean {
    const [column, op, value] = clause.split(".") as [keyof ContentItemRow, string, string];
    if (op === "is" && value === "null") return (row) => row[column] === null;
    if (op === "lte") return (row) => (row[column] as number | null) !== null && (row[column] as number) <= Number(value);
    if (op === "gte") return (row) => (row[column] as number | null) !== null && (row[column] as number) >= Number(value);
    throw new Error(`unsupported clause in test fake: ${clause}`);
  }
  const query = {
    select: () => query,
    eq: (column: keyof ContentItemRow, value: unknown) => {
      predicates.push((row) => row[column] === value);
      return query;
    },
    in: (column: keyof ContentItemRow, values: unknown[]) => {
      predicates.push((row) => values.includes(row[column]));
      return query;
    },
    or: (clauses: string) => {
      const parsed = clauses.split(",").map(parseClause);
      predicates.push((row) => parsed.some((p) => p(row)));
      return query;
    },
    then: (resolve: (value: { data: ContentItemRow[]; error: null }) => unknown) => {
      const filtered = rows.filter((row) => predicates.every((p) => p(row)));
      return Promise.resolve({ data: filtered, error: null }).then(resolve);
    },
  };
  return { from: () => query } as unknown as SupabaseClient<Database>;
}

describe("getContentItem", () => {
  it("returns the requested locale", async () => {
    await expect(
      getContentItem({ supabase: fakeClient([english, hindi]), slug: "sleep-well", locale: "hi" }),
    ).resolves.toEqual({ item: hindi, isFallback: false });
  });

  it("falls back to English when Hindi is unavailable", async () => {
    await expect(
      getContentItem({ supabase: fakeClient([english]), slug: "sleep-well", locale: "hi" }),
    ).resolves.toEqual({ item: english, isFallback: true });
  });

  it("returns null for unknown or unpublished content", async () => {
    const unpublished = { ...english, id: "draft", slug: "draft", is_published: false };
    const supabase = fakeClient([english, unpublished]);

    await expect(getContentItem({ supabase, slug: "unknown", locale: "en" })).resolves.toBeNull();
    await expect(getContentItem({ supabase, slug: "draft", locale: "en" })).resolves.toBeNull();
  });
});

describe("listContentByCategory", () => {
  const checkup = { ...english, id: "c1", slug: "first-checkup", category: "checkups" };
  const eating = { ...english, id: "c2", slug: "safe-snacks", category: "eating_well" };
  const draftCheckup = { ...english, id: "c3", slug: "draft", category: "checkups", is_published: false };

  it("returns only published items in the requested category, both locales", async () => {
    const hindiCheckup = { ...hindi, id: "c1-hi", slug: "first-checkup", category: "checkups" };
    const supabase = fakeListClient([checkup, eating, draftCheckup, hindiCheckup]);
    const rows = await listContentByCategory({ supabase, category: "checkups", locale: "hi" });
    expect(rows.map((r) => r.id).sort()).toEqual(["c1", "c1-hi"]);
  });

  it("excludes unpublished items", async () => {
    const supabase = fakeListClient([checkup, draftCheckup]);
    const rows = await listContentByCategory({ supabase, category: "checkups", locale: "en" });
    expect(rows.map((r) => r.id)).toEqual(["c1"]);
  });
});

describe("listContentByWeekRange", () => {
  it("includes an item whose range overlaps the requested window", async () => {
    const inRange = { ...english, id: "w1", week_min: 5, week_max: 15 };
    const outOfRange = { ...english, id: "w2", week_min: 30, week_max: 35 };
    const unbounded = { ...english, id: "w3", week_min: null, week_max: null };
    const supabase = fakeListClient([inRange, outOfRange, unbounded]);
    const rows = await listContentByWeekRange({ supabase, weekMin: 0, weekMax: 13, locale: "en" });
    expect(rows.map((r) => r.id).sort()).toEqual(["w1", "w3"]);
  });

  it("fetches both the requested locale and English for fallback resolution", async () => {
    const en = { ...english, id: "w1", week_min: 0, week_max: 13 };
    const hi2 = { ...hindi, id: "w1-hi", week_min: 0, week_max: 13 };
    const supabase = fakeListClient([en, hi2]);
    const rows = await listContentByWeekRange({ supabase, weekMin: 0, weekMax: 13, locale: "hi" });
    expect(rows.map((r) => r.id).sort()).toEqual(["w1", "w1-hi"]);
  });
});
