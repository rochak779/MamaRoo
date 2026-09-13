// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { calls, createServerSupabase, response } = vi.hoisted(() => ({
  calls: [] as Array<{ method: string; args: unknown[] }>,
  createServerSupabase: vi.fn(),
  response: { data: [] as unknown[], error: null as unknown },
}));

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));

import { getLettersData } from "@/lib/supabase/queries/letters";

beforeEach(() => {
  calls.length = 0;
  response.data = [];
  response.error = null;
  const query = new Proxy({}, {
    get(_target, method: string) {
      if (method === "then") {
        return (resolve: (value: unknown) => unknown) => Promise.resolve(response).then(resolve);
      }
      return (...args: unknown[]) => {
        calls.push({ method, args });
        return query;
      };
    },
  });
  createServerSupabase.mockReset().mockResolvedValue({
    from: (table: string) => {
      expect(table).toBe("letters");
      return query;
    },
  });
});

describe("getLettersData", () => {
  it("reads the caller's letters newest first without a user-id filter", async () => {
    response.data = [{
      id: "letter-1",
      pregnancy_id: "pregnancy-1",
      gestational_week: 26,
      body: "Dear little one,",
      created_at: "2026-09-13T10:00:00Z",
      updated_at: "2026-09-13T10:00:00Z",
    }];

    await expect(getLettersData()).resolves.toEqual([{
      id: "letter-1",
      pregnancyId: "pregnancy-1",
      gestationalWeek: 26,
      body: "Dear little one,",
      createdAt: "2026-09-13T10:00:00Z",
      updatedAt: "2026-09-13T10:00:00Z",
    }]);
    expect(calls).toContainEqual({ method: "order", args: ["created_at", { ascending: false }] });
    expect(calls.some((call) => call.args[0] === "user_id")).toBe(false);
  });

  it("throws instead of returning partial data", async () => {
    response.error = new Error("query failed");
    await expect(getLettersData()).rejects.toThrow("query failed");
  });
});
