// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { REAUTH_MAX_AGE_MS } from "@/lib/domain/privacy";

const { createServerSupabase, createAdminSupabase, getLocale } = vi.hoisted(() => ({
  createServerSupabase: vi.fn(),
  createAdminSupabase: vi.fn(),
  getLocale: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase }));
vi.mock("@/i18n/locale", () => ({ getLocale }));

import { deleteAccount, deletePregnancyJourney, requestExport } from "@/app/actions/privacy";

// A minimal chainable query-builder mock: .from(table) returns whichever
// canned object `tableImpls[table]` supplies, so each test wires only the
// methods the code path under test actually calls.
function fakeClient({
  session,
  user,
  tableImpls = {},
  storageRemove,
}: {
  session?: unknown;
  user?: unknown;
  tableImpls?: Record<string, unknown>;
  storageRemove?: ReturnType<typeof vi.fn>;
}) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: session ?? null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: user ?? null } }),
    },
    from: vi.fn((table: string) => {
      if (table in tableImpls) return tableImpls[table];
      throw new Error(`unexpected table ${table}`);
    }),
    storage: { from: vi.fn(() => ({ remove: storageRemove ?? vi.fn().mockResolvedValue({ error: null }) })) },
  };
}

const freshSession = (now: number) => ({
  user: { id: "user-1", last_sign_in_at: new Date(now).toISOString() },
});

beforeEach(() => {
  createServerSupabase.mockReset();
  createAdminSupabase.mockReset();
  getLocale.mockReset();
  getLocale.mockResolvedValue("en");
});

describe("requestExport", () => {
  it("reports not authenticated rather than fetching anything", async () => {
    createServerSupabase.mockResolvedValue(fakeClient({ user: null }));
    const result = await requestExport();
    expect(result).toEqual({ ok: false, error: "not_authenticated" });
  });

  it("builds an export envelope from every table's fetched rows", async () => {
    const selectEq = (rows: unknown[]) => ({ select: () => ({ eq: () => Promise.resolve({ data: rows, error: null }) }) });
    const tableImpls: Record<string, unknown> = { profiles: selectEq([{ id: "user-1" }]) };
    for (const t of [
      "appointments", "baby_name_favorites", "chat_messages", "checkins", "checklist_progress",
      "consents", "contraction_sessions", "contractions", "custom_questions", "doctor_advice",
      "doctor_advice_updates", "emergency_contacts", "kick_events", "kick_sessions", "letters",
      "medicine_logs", "medicines", "personal_notes", "pregnancies", "question_marks",
      "reports", "timeline_events", "vitals",
    ]) {
      tableImpls[t] = selectEq(t === "medicines" ? [{ id: "m1" }] : []);
    }
    createServerSupabase.mockResolvedValue(fakeClient({ user: { id: "user-1" }, tableImpls }));

    const result = await requestExport();

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.data.tables.profiles).toEqual([{ id: "user-1" }]);
    expect(result.data.tables.medicines).toEqual([{ id: "m1" }]);
    expect(Object.keys(result.data.tables)).toHaveLength(24); // 23 user_id tables + profiles
  });

  it("reports the first table's fetch error rather than throwing", async () => {
    createServerSupabase.mockResolvedValue(
      fakeClient({
        user: { id: "user-1" },
        tableImpls: {
          profiles: { select: () => ({ eq: () => Promise.resolve({ data: null, error: { message: "boom" } }) }) },
        },
      }),
    );

    const result = await requestExport();
    expect(result).toEqual({ ok: false, error: "boom" });
  });
});

describe("deletePregnancyJourney", () => {
  it("reports not authenticated rather than deleting anything", async () => {
    createServerSupabase.mockResolvedValue(fakeClient({ user: null }));
    const result = await deletePregnancyJourney("p1");
    expect(result).toEqual({ ok: false, error: "not_authenticated" });
  });

  it("deletes the three pregnancy-scoped tables and the pregnancy row, but never letters", async () => {
    const deleteCalls: Record<string, ReturnType<typeof vi.fn>> = {};
    const tableImpls: Record<string, unknown> = {};
    for (const t of ["checkins", "kick_sessions", "timeline_events", "pregnancies"]) {
      const secondEq = vi.fn(() => Promise.resolve({ error: null }));
      const firstEq = vi.fn(() => ({ eq: secondEq }));
      const del = vi.fn(() => ({ eq: firstEq }));
      deleteCalls[t] = del;
      tableImpls[t] = { delete: del };
    }
    createServerSupabase.mockResolvedValue(fakeClient({ user: { id: "user-1" }, tableImpls }));

    const result = await deletePregnancyJourney("p1");

    expect(result).toEqual({ ok: true });
    expect(deleteCalls.checkins).toHaveBeenCalled();
    expect(deleteCalls.kick_sessions).toHaveBeenCalled();
    expect(deleteCalls.timeline_events).toHaveBeenCalled();
    expect(deleteCalls.pregnancies).toHaveBeenCalled();
    expect(deleteCalls.letters).toBeUndefined();
  });

  it("aborts before deleting the pregnancy row when a scoped-table delete fails", async () => {
    const failingSecondEq = vi.fn(() => Promise.resolve({ error: { message: "checkins failed" } }));
    const failingFirstEq = vi.fn(() => ({ eq: failingSecondEq }));
    const pregnanciesDelete = vi.fn();
    createServerSupabase.mockResolvedValue(
      fakeClient({
        user: { id: "user-1" },
        tableImpls: {
          checkins: { delete: vi.fn(() => ({ eq: failingFirstEq })) },
          pregnancies: { delete: pregnanciesDelete },
        },
      }),
    );

    const result = await deletePregnancyJourney("p1");

    expect(result).toEqual({ ok: false, error: "checkins failed" });
    expect(pregnanciesDelete).not.toHaveBeenCalled();
  });
});

describe("deleteAccount", () => {
  it("reports not authenticated when there is no session", async () => {
    createServerSupabase.mockResolvedValue(fakeClient({ session: null }));
    const result = await deleteAccount("DELETE");
    expect(result).toEqual({ ok: false, error: "not_authenticated" });
  });

  it("rejects a session whose last_sign_in_at is older than the freshness bound", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    createServerSupabase.mockResolvedValue(fakeClient({ session: freshSession(now - REAUTH_MAX_AGE_MS - 1) }));

    const result = await deleteAccount("DELETE");
    expect(result).toEqual({ ok: false, error: "reauth_required" });
    vi.restoreAllMocks();
  });

  it("rejects a session with no last_sign_in_at at all", async () => {
    createServerSupabase.mockResolvedValue(fakeClient({ session: { user: { id: "user-1", last_sign_in_at: null } } }));
    const result = await deleteAccount("DELETE");
    expect(result).toEqual({ ok: false, error: "reauth_required" });
  });

  it("ignores a freshness value the caller supplies and decides from the session alone", async () => {
    // deleteAccount's signature takes only the confirmation word -- there is
    // no parameter through which a caller could even assert a fake
    // last_sign_in_at. This test documents that by construction: a stale
    // session is rejected regardless of what's passed.
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    createServerSupabase.mockResolvedValue(fakeClient({ session: freshSession(now - REAUTH_MAX_AGE_MS - 1) }));

    const result = await deleteAccount("DELETE");
    expect(result).toEqual({ ok: false, error: "reauth_required" });
    vi.restoreAllMocks();
  });

  it("rejects a confirmation word that doesn't match the locale actually shown", async () => {
    const now = Date.now();
    createServerSupabase.mockResolvedValue(fakeClient({ session: freshSession(now) }));
    getLocale.mockResolvedValue("en");

    const result = await deleteAccount("wrong word");
    expect(result).toEqual({ ok: false, error: "confirmation_mismatch" });
  });

  it("accepts the Hindi word when the locale shown was Hindi", async () => {
    const now = Date.now();
    const storageRemove = vi.fn().mockResolvedValue({ error: null });
    createServerSupabase.mockResolvedValue(
      fakeClient({
        session: freshSession(now),
        tableImpls: { reports: { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) } },
        storageRemove,
      }),
    );
    getLocale.mockResolvedValue("hi");
    const deleteUser = vi.fn().mockResolvedValue({ error: null });
    createAdminSupabase.mockReturnValue({ auth: { admin: { deleteUser } } });

    const result = await deleteAccount("हटाएँ");
    expect(result).toEqual({ ok: true });
  });

  it("deletes storage objects before deleting the user, in that order", async () => {
    const now = Date.now();
    const order: string[] = [];
    const storageRemove = vi.fn().mockImplementation(async () => {
      order.push("storage");
      return { error: null };
    });
    const deleteUser = vi.fn().mockImplementation(async () => {
      order.push("user");
      return { error: null };
    });
    createServerSupabase.mockResolvedValue(
      fakeClient({
        session: freshSession(now),
        tableImpls: {
          reports: { select: () => ({ eq: () => Promise.resolve({ data: [{ storage_path: "user-1/r1.jpg" }], error: null }) }) },
        },
        storageRemove,
      }),
    );
    createAdminSupabase.mockReturnValue({ auth: { admin: { deleteUser } } });

    const result = await deleteAccount("DELETE");

    expect(result).toEqual({ ok: true });
    expect(storageRemove).toHaveBeenCalledWith(["user-1/r1.jpg"]);
    expect(order).toEqual(["storage", "user"]);
  });

  it("aborts before deleting the user when storage deletion fails", async () => {
    const now = Date.now();
    const storageRemove = vi.fn().mockResolvedValue({ error: { message: "storage failed" } });
    const deleteUser = vi.fn();
    createServerSupabase.mockResolvedValue(
      fakeClient({
        session: freshSession(now),
        tableImpls: {
          reports: { select: () => ({ eq: () => Promise.resolve({ data: [{ storage_path: "user-1/r1.jpg" }], error: null }) }) },
        },
        storageRemove,
      }),
    );
    createAdminSupabase.mockReturnValue({ auth: { admin: { deleteUser } } });

    const result = await deleteAccount("DELETE");

    expect(result).toEqual({ ok: false, error: "storage failed" });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("skips the storage call entirely when she has no reports, and still deletes the user", async () => {
    const now = Date.now();
    const storageRemove = vi.fn();
    const deleteUser = vi.fn().mockResolvedValue({ error: null });
    createServerSupabase.mockResolvedValue(
      fakeClient({
        session: freshSession(now),
        tableImpls: { reports: { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) } },
        storageRemove,
      }),
    );
    createAdminSupabase.mockReturnValue({ auth: { admin: { deleteUser } } });

    const result = await deleteAccount("DELETE");

    expect(result).toEqual({ ok: true });
    expect(storageRemove).not.toHaveBeenCalled();
    expect(deleteUser).toHaveBeenCalledWith("user-1");
  });
});
