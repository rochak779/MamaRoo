// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";

const { getUser, insert, from } = vi.hoisted(() => {
  const insert = vi.fn();
  return { getUser: vi.fn(), insert, from: vi.fn(() => ({ insert })) };
});

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser }, from }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}));
// redirect() aborts the request in real Next.js by throwing; mirror that here
// so the code under test cannot fall through to the next line and reach
// supabase.from(...) with no user, the way a plain no-op mock would let it.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { recordConsents, withdrawConsent } from "@/app/actions/consent";
import { LEGAL_VERSION } from "@/lib/config";

beforeEach(() => {
  getUser.mockReset();
  insert.mockReset();
  from.mockClear();
});

describe("recordConsents", () => {
  it("does nothing when the required consent was not given, since the server does not trust the UI", async () => {
    await recordConsents({ baseline: false, optionalDataSharing: true, analytics: true, locale: "en" });
    expect(from).not.toHaveBeenCalled();
  });

  it("sends her to sign in when there is no authenticated user", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(
      recordConsents({ baseline: true, optionalDataSharing: false, analytics: false, locale: "en" }),
    ).rejects.toThrow("REDIRECT:/signin");
    expect(from).not.toHaveBeenCalled();
  });

  it("writes one row per consent key with her locale and the current legal version, then continues onboarding", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    insert.mockResolvedValue({ error: null });

    await expect(
      recordConsents({ baseline: true, optionalDataSharing: true, analytics: false, locale: "hi" }),
    ).rejects.toThrow("REDIRECT:/onboarding/profile");

    expect(from).toHaveBeenCalledWith("consents");
    expect(insert).toHaveBeenCalledWith([
      { consent_key: "terms", granted: true, user_id: "user-1", version: LEGAL_VERSION, locale: "hi" },
      { consent_key: "privacy", granted: true, user_id: "user-1", version: LEGAL_VERSION, locale: "hi" },
      {
        consent_key: "optional_data_sharing",
        granted: true,
        user_id: "user-1",
        version: LEGAL_VERSION,
        locale: "hi",
      },
      { consent_key: "analytics", granted: false, user_id: "user-1", version: LEGAL_VERSION, locale: "hi" },
    ]);
  });

  it("throws when the insert fails, instead of silently redirecting as if it had succeeded", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    insert.mockResolvedValue({ error: { message: "insert failed" } });

    await expect(
      recordConsents({ baseline: true, optionalDataSharing: false, analytics: false, locale: "en" }),
    ).rejects.toThrow("insert failed");
  });
});

describe("withdrawConsent", () => {
  it("writes a single granted:false row for optional_data_sharing", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    insert.mockResolvedValue({ error: null });

    const result = await withdrawConsent("optional_data_sharing", "en");

    expect(result).toEqual({ ok: true });
    expect(from).toHaveBeenCalledWith("consents");
    expect(insert).toHaveBeenCalledWith({
      consent_key: "optional_data_sharing",
      granted: false,
      user_id: "user-1",
      version: LEGAL_VERSION,
      locale: "en",
    });
  });

  it("writes a single granted:false row for analytics", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    insert.mockResolvedValue({ error: null });

    const result = await withdrawConsent("analytics", "hi");

    expect(result).toEqual({ ok: true });
    expect(insert).toHaveBeenCalledWith({
      consent_key: "analytics",
      granted: false,
      user_id: "user-1",
      version: LEGAL_VERSION,
      locale: "hi",
    });
  });

  // terms/privacy withdrawal is presented as account deletion, never a toggle
  // (Spec.md §3.2) -- this rejects the value server-side too, since a forged
  // request is not bound by what the UI happens to offer.
  it.each(["terms", "privacy"] as const)("refuses to withdraw the required baseline consent %s", async (key) => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const result = await withdrawConsent(key, "en");

    expect(result).toEqual({ ok: false, error: "not_withdrawable" });
    expect(from).not.toHaveBeenCalled();
  });

  it("reports not authenticated rather than throwing when there is no session", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const result = await withdrawConsent("analytics", "en");

    expect(result).toEqual({ ok: false, error: "not_authenticated" });
    expect(from).not.toHaveBeenCalled();
  });

  it("reports the database error rather than throwing", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    insert.mockResolvedValue({ error: { message: "insert failed" } });

    const result = await withdrawConsent("analytics", "en");

    expect(result).toEqual({ ok: false, error: "insert failed" });
  });
});
