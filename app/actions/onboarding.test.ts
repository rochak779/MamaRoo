// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";

const { getUser, upsert, insert, from } = vi.hoisted(() => {
  const upsert = vi.fn();
  const insert = vi.fn();
  const from = vi.fn((table: string) => (table === "profiles" ? { upsert } : { insert }));
  return { getUser: vi.fn(), upsert, insert, from };
});

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser }, from }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

import { saveOnboarding } from "@/app/actions/onboarding";

const base = {
  displayName: "Priyanka",
  dueDateMethod: "lmp" as const,
  date: "2026-03-01",
  today: "2020-01-01", // deliberately stale; the action recomputes today itself
};

beforeEach(() => {
  getUser.mockReset();
  upsert.mockReset();
  insert.mockReset();
  from.mockClear();
});

describe("saveOnboarding", () => {
  it("returns the validation errors without touching the database when the input is invalid", async () => {
    const result = await saveOnboarding({ ...base, displayName: "" });
    expect(result).toEqual({ ok: false, errors: expect.objectContaining({ displayName: expect.any(String) }) });
    expect(from).not.toHaveBeenCalled();
  });

  it("sends her to sign in when there is no authenticated user", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(saveOnboarding(base)).rejects.toThrow("REDIRECT:/signin");
  });

  it("writes the profile then the pregnancy, and reports success", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    upsert.mockResolvedValue({ error: null });
    insert.mockResolvedValue({ error: null });

    const result = await saveOnboarding({
      ...base,
      age: 28,
      weightKg: 62,
      emergencyContactName: "Asha",
      emergencyContactPhone: "9876543210",
      pregnancyFlags: ["twins"],
      twinType: "monochorionic",
      notificationPrivacy: "detailed",
    });

    expect(result).toEqual({ ok: true });
    expect(from).toHaveBeenCalledWith("profiles");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user-1",
        display_name: "Priyanka",
        birth_year: 1998,
        emergency_contact_name: "Asha",
        emergency_contact_phone: "9876543210",
        notification_privacy: "detailed",
      }),
    );
    expect(from).toHaveBeenCalledWith("pregnancies");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        edd_source: "lmp",
        pregnancy_flags: ["twins"],
        twin_type: "monochorionic",
      }),
    );
  });

  it("throws when the profile write fails, without attempting the pregnancy write", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    upsert.mockResolvedValue({ error: new Error("db down") });

    await expect(saveOnboarding(base)).rejects.toThrow("db down");
    expect(insert).not.toHaveBeenCalled();
  });

  it("throws when the pregnancy write fails", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    upsert.mockResolvedValue({ error: null });
    insert.mockResolvedValue({ error: new Error("db down") });

    await expect(saveOnboarding(base)).rejects.toThrow("db down");
  });
});
