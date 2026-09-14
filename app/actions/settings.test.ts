// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createServerSupabase,
  from,
  getUser,
  maybeSingle,
  profileEq,
  profileUpdate,
  pregnancyEq,
  pregnancyUpdate,
  revalidatePath,
  setLocale,
} = vi.hoisted(() => ({
  createServerSupabase: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  profileEq: vi.fn(),
  profileUpdate: vi.fn(),
  pregnancyEq: vi.fn(),
  pregnancyUpdate: vi.fn(),
  revalidatePath: vi.fn(),
  setLocale: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/i18n/locale", () => ({ setLocale }));

import {
  updateNotificationPrivacy,
  updatePersonalInfo,
  updatePregnancyInfo,
  updateProfileLocale,
} from "@/app/actions/settings";

beforeEach(() => {
  for (const mock of [
    createServerSupabase,
    from,
    getUser,
    maybeSingle,
    profileEq,
    profileUpdate,
    pregnancyEq,
    pregnancyUpdate,
    revalidatePath,
    setLocale,
  ]) mock.mockReset();

  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  profileEq.mockResolvedValue({ error: null });
  pregnancyEq.mockResolvedValue({ error: null });
  profileUpdate.mockReturnValue({ eq: profileEq });
  pregnancyUpdate.mockReturnValue({ eq: pregnancyEq });
  maybeSingle.mockResolvedValue({
    data: {
      id: "pregnancy-1",
      edd: "2026-12-12",
      edd_source: "manual",
      lmp_date: "2026-03-07",
    },
    error: null,
  });
  from.mockImplementation((table: string) => {
    if (table === "profiles") return { update: profileUpdate };
    if (table === "pregnancies") {
      return {
        select: () => ({ eq: () => ({ maybeSingle }) }),
        update: pregnancyUpdate,
      };
    }
    throw new Error(`unexpected table ${table}`);
  });
  createServerSupabase.mockResolvedValue({ auth: { getUser }, from });
});

describe("updatePersonalInfo", () => {
  const valid = {
    displayName: "Aarti",
    age: "28",
    city: "Lucknow",
    heightCm: "164",
    mobileNumber: "9876543210",
    today: "1999-01-01",
  };

  it("validates before auth and database access", async () => {
    await expect(updatePersonalInfo({ ...valid, mobileNumber: "123" })).resolves.toEqual({
      ok: false,
      errors: { mobileNumber: "mobile_invalid" },
    });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("recomputes today server-side and updates only the authenticated profile", async () => {
    await expect(updatePersonalInfo(valid)).resolves.toEqual({ ok: true });
    expect(profileUpdate).toHaveBeenCalledWith({
      display_name: "Aarti",
      birth_year: 1998,
      city: "Lucknow",
      height_cm: 164,
      mobile_number: "9876543210",
    });
    expect(profileEq).toHaveBeenCalledWith("id", "user-1");
    expect(revalidatePath).toHaveBeenCalledWith("/me");
    expect(revalidatePath).toHaveBeenCalledWith("/me/personal");
  });

  it("returns calm signed-out and database errors", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(updatePersonalInfo(valid)).resolves.toEqual({ ok: false, error: "not_authenticated" });

    profileEq.mockResolvedValueOnce({ error: { message: "profile write failed" } });
    await expect(updatePersonalInfo(valid)).resolves.toEqual({ ok: false, error: "profile write failed" });
  });
});

describe("updatePregnancyInfo", () => {
  const valid = {
    dueDate: "2026-12-12",
    dueDateSource: "manual" as const,
    pregnancyFlags: ["single" as const],
    twinType: null,
    babyNames: ["Tara"],
    isFirstPregnancy: true,
    prePregnancyWeightKg: "62",
    doctorName: "Dr Priya Sharma",
    clinicName: "Sunrise Clinic",
    today: "1999-01-01",
  };

  it("finds the authenticated user's active pregnancy instead of trusting a client id", async () => {
    await expect(updatePregnancyInfo(valid)).resolves.toEqual({ ok: true });
    expect(pregnancyUpdate).toHaveBeenCalledWith({
      edd: "2026-12-12",
      edd_source: "manual",
      lmp_date: "2026-03-07",
      pregnancy_flags: ["single"],
      twin_type: null,
      baby_name: ["Tara"],
    });
    expect(pregnancyEq).toHaveBeenCalledWith("id", "pregnancy-1");
    expect(profileUpdate).toHaveBeenCalledWith({
      is_first_pregnancy: true,
      pre_pregnancy_weight_kg: 62,
      doctor_name: "Dr Priya Sharma",
      clinic_name: "Sunrise Clinic",
    });
    expect(profileEq).toHaveBeenCalledWith("id", "user-1");
  });

  it("preserves LMP provenance when the due date itself was not corrected", async () => {
    maybeSingle.mockResolvedValueOnce({
      data: {
        id: "pregnancy-1",
        edd: "2026-12-12",
        edd_source: "lmp",
        lmp_date: "2026-03-07",
      },
      error: null,
    });

    await expect(updatePregnancyInfo({ ...valid, dueDateSource: "lmp" as never })).resolves.toEqual({ ok: true });
    expect(pregnancyUpdate).toHaveBeenCalledWith(expect.objectContaining({
      edd_source: "lmp",
      lmp_date: "2026-03-07",
    }));
  });

  it("returns calm error results for signed-out, missing-pregnancy, and failed writes", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(updatePregnancyInfo(valid)).resolves.toEqual({ ok: false, error: "not_authenticated" });

    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(updatePregnancyInfo(valid)).resolves.toEqual({ ok: false, error: "pregnancy_not_found" });

    pregnancyEq.mockResolvedValueOnce({ error: { message: "write failed" } });
    await expect(updatePregnancyInfo(valid)).resolves.toEqual({ ok: false, error: "write failed" });
    expect(profileUpdate).not.toHaveBeenCalled();
  });

  it("returns active-pregnancy read and profile-write errors", async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "read failed" } });
    await expect(updatePregnancyInfo(valid)).resolves.toEqual({ ok: false, error: "read failed" });

    profileEq.mockResolvedValueOnce({ error: { message: "profile write failed" } });
    await expect(updatePregnancyInfo(valid)).resolves.toEqual({ ok: false, error: "profile write failed" });
  });
});

describe("notification and locale updates", () => {
  it("persists lock-screen privacy to the authenticated profile", async () => {
    await expect(updateNotificationPrivacy("detailed")).resolves.toEqual({ ok: true });
    expect(profileUpdate).toHaveBeenCalledWith({ notification_privacy: "detailed" });
    expect(profileEq).toHaveBeenCalledWith("id", "user-1");
  });

  it("updates both the profile locale and locale cookie", async () => {
    await expect(updateProfileLocale("hi")).resolves.toEqual({ ok: true });
    expect(profileUpdate).toHaveBeenCalledWith({ locale: "hi" });
    expect(setLocale).toHaveBeenCalledWith("hi");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("refuses malformed privacy and locale values before auth", async () => {
    await expect(updateNotificationPrivacy("unsafe" as never)).resolves.toEqual({
      ok: false,
      errors: { notificationPrivacy: "privacy_invalid" },
    });
    await expect(updateProfileLocale("fr" as never)).resolves.toEqual({
      ok: false,
      errors: { locale: "locale_invalid" },
    });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("does not write cookies when profile persistence fails", async () => {
    profileEq.mockResolvedValueOnce({ error: { message: "privacy failed" } });
    await expect(updateNotificationPrivacy("private")).resolves.toEqual({ ok: false, error: "privacy failed" });

    profileEq.mockResolvedValueOnce({ error: { message: "locale failed" } });
    await expect(updateProfileLocale("hi")).resolves.toEqual({ ok: false, error: "locale failed" });
    expect(setLocale).not.toHaveBeenCalled();
  });
});
