// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { listFoodSafetyItems } from "@/lib/supabase/queries/foodSafety";

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

describe("listFoodSafetyItems", () => {
  it("fetches every active item for one locale in curated order", async () => {
    const rows = [{ id: "food-1", locale: "hi", name: "पनीर", sort_order: 2, is_active: true }];
    const { calls, supabase } = fakeSupabase({ data: rows, error: null });

    await expect(listFoodSafetyItems({ supabase: supabase as never, locale: "hi" })).resolves.toEqual(rows);

    expect(supabase.from).toHaveBeenCalledWith("food_safety_items");
    expect(calls).toEqual([
      { method: "select", args: ["*"] },
      { method: "eq", args: ["locale", "hi"] },
      { method: "eq", args: ["is_active", true] },
      { method: "order", args: ["sort_order", { ascending: true }] },
    ]);
  });

  it("returns an empty list when there is no matching content", async () => {
    const { supabase } = fakeSupabase({ data: null, error: null });
    await expect(listFoodSafetyItems({ supabase: supabase as never, locale: "en" })).resolves.toEqual([]);
  });

  it("throws a query error instead of returning partial content", async () => {
    const { supabase } = fakeSupabase({ data: null, error: new Error("query failed") });
    await expect(listFoodSafetyItems({ supabase: supabase as never, locale: "en" })).rejects.toThrow("query failed");
  });
});
