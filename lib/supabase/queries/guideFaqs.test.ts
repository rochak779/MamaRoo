// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { listGuideFaqs, listGuideSchemes } from "@/lib/supabase/queries/guideFaqs";

function fakeSupabase(result: { data: unknown; error: unknown }) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const query = new Proxy(
    {},
    {
      get(_target, method: string) {
        if (method === "then") {
          return (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
        }
        return (...args: unknown[]) => {
          calls.push({ method, args });
          return query;
        };
      },
    },
  );
  const supabase = { from: vi.fn(() => query) };
  return { calls, supabase };
}

describe.each([
  ["listGuideFaqs", listGuideFaqs, "guide_faqs"],
  ["listGuideSchemes", listGuideSchemes, "guide_schemes"],
] as const)("%s", (_name, listItems, table) => {
  it("fetches active localized content in curated order", async () => {
    const rows = [{ id: "content-1", locale: "hi", sort_order: 2, is_active: true }];
    const { calls, supabase } = fakeSupabase({ data: rows, error: null });

    await expect(listItems({ supabase: supabase as never, locale: "hi" })).resolves.toEqual(rows);
    expect(supabase.from).toHaveBeenCalledWith(table);
    expect(calls).toEqual([
      { method: "select", args: ["*"] },
      { method: "eq", args: ["locale", "hi"] },
      { method: "eq", args: ["is_active", true] },
      { method: "order", args: ["sort_order", { ascending: true }] },
    ]);
  });

  it("returns an empty list for missing content and throws query errors", async () => {
    const empty = fakeSupabase({ data: null, error: null });
    await expect(listItems({ supabase: empty.supabase as never, locale: "en" })).resolves.toEqual([]);

    const failed = fakeSupabase({ data: null, error: new Error("query failed") });
    await expect(listItems({ supabase: failed.supabase as never, locale: "en" })).rejects.toThrow("query failed");
  });
});
