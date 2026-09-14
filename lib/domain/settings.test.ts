import { describe, expect, it } from "vitest";
import {
  DEFAULT_REMINDER_PREFERENCES,
  ageFromBirthYear,
  parseReminderPreferences,
  validateLocale,
  validateNotificationPrivacy,
  validatePersonalInfo,
  validatePregnancyInfo,
} from "@/lib/domain/settings";

describe("ageFromBirthYear", () => {
  it("expresses the stored birth year as an age without inventing a second field", () => {
    expect(ageFromBirthYear(1998, "2026-09-14")).toBe(28);
    expect(ageFromBirthYear(null, "2026-09-14")).toBeNull();
  });
});

describe("validatePersonalInfo", () => {
  it("reuses onboarding rules and converts age back to birth_year", () => {
    expect(
      validatePersonalInfo({
        displayName: "  Aarti  ",
        age: "28",
        city: "  Lucknow ",
        heightCm: "164.5",
        mobileNumber: "98765 43210",
        today: "2026-09-14",
      }),
    ).toEqual({
      ok: true,
      value: {
        displayName: "Aarti",
        birthYear: 1998,
        city: "Lucknow",
        heightCm: 164.5,
        mobileNumber: "9876543210",
      },
    });
  });

  it("rejects non-numeric and both out-of-range height boundaries", () => {
    for (const heightCm of ["not-a-number", "99", "221"]) {
      expect(validatePersonalInfo({
        displayName: "Aarti",
        age: "28",
        city: "Lucknow",
        heightCm,
        mobileNumber: "",
        today: "2026-09-14",
      })).toMatchObject({ ok: false, errors: { heightCm: "height_range" } });
    }
  });

  it("maps name and age onboarding errors independently", () => {
    const base = {
      displayName: "Aarti",
      age: "28",
      city: "",
      heightCm: "",
      mobileNumber: "",
      today: "2026-09-14",
    };
    expect(validatePersonalInfo({ ...base, displayName: "" })).toEqual({
      ok: false,
      errors: { displayName: "name_required" },
    });
    expect(validatePersonalInfo({ ...base, age: "9" })).toEqual({
      ok: false,
      errors: { age: "age_range" },
    });
  });

  it("keeps optional values null and reports field-specific validation codes", () => {
    expect(
      validatePersonalInfo({
        displayName: "",
        age: "9",
        city: "",
        heightCm: "250",
        mobileNumber: "123",
        today: "2026-09-14",
      }),
    ).toEqual({
      ok: false,
      errors: {
        displayName: "name_required",
        age: "age_range",
        heightCm: "height_range",
        mobileNumber: "mobile_invalid",
      },
    });

    expect(
      validatePersonalInfo({
        displayName: "Aarti",
        age: "",
        city: "",
        heightCm: "",
        mobileNumber: "",
        today: "2026-09-14",
      }),
    ).toEqual({
      ok: true,
      value: {
        displayName: "Aarti",
        birthYear: null,
        city: null,
        heightCm: null,
        mobileNumber: null,
      },
    });
  });
});

describe("validatePregnancyInfo", () => {
  it("validates a corrected due date with onboarding's date rules and derives lmp_date", () => {
    expect(
      validatePregnancyInfo({
        dueDate: "2026-12-12",
        dueDateSource: "scan",
        pregnancyFlags: ["twins", "monitored"],
        twinType: "dichorionic",
        babyNames: ["  Tara ", "Mira"],
        isFirstPregnancy: false,
        prePregnancyWeightKg: "62.5",
        doctorName: " Dr Priya Sharma ",
        clinicName: " Sunrise Clinic ",
        today: "2026-09-14",
      }),
    ).toEqual({
      ok: true,
      value: {
        dueDate: "2026-12-12",
        dueDateSource: "scan",
        lmpDate: "2026-03-07",
        pregnancyFlags: ["twins", "monitored"],
        twinType: "dichorionic",
        babyNames: ["Tara", "Mira"],
        isFirstPregnancy: false,
        prePregnancyWeightKg: 62.5,
        doctorName: "Dr Priya Sharma",
        clinicName: "Sunrise Clinic",
      },
    });
  });

  it("keeps an existing onboarding due-date source available for a no-change save", () => {
    const result = validatePregnancyInfo({
      dueDate: "2026-12-12",
      dueDateSource: "lmp",
      pregnancyFlags: ["single"],
      twinType: null,
      babyNames: ["Tara"],
      isFirstPregnancy: true,
      prePregnancyWeightKg: "62",
      doctorName: "",
      clinicName: "",
      today: "2026-09-14",
    });

    expect(result).toMatchObject({ ok: true, value: { dueDateSource: "lmp" } });
  });

  it("rejects invalid dates, flags, twin detail, names, and onboarding weight ranges", () => {
    const result = validatePregnancyInfo({
      dueDate: "2040-01-01",
      dueDateSource: "manual",
      pregnancyFlags: ["not-a-flag" as never],
      twinType: "monochorionic",
      babyNames: ["A", "B"],
      isFirstPregnancy: null,
      prePregnancyWeightKg: "10",
      doctorName: "",
      clinicName: "",
      today: "2026-09-14",
    });

    expect(result).toEqual({
      ok: false,
      errors: {
        dueDate: "due_date_invalid",
        pregnancyFlags: "pregnancy_flags_invalid",
        twinType: "twin_type_invalid",
        babyNames: "baby_names_invalid",
        prePregnancyWeightKg: "weight_range",
      },
    });
  });

  it("rejects malformed collections, provenance, text, and experience values", () => {
    const base = {
      dueDate: "2026-12-12",
      dueDateSource: "scan" as const,
      pregnancyFlags: ["single" as const],
      twinType: null,
      babyNames: ["Tara"],
      isFirstPregnancy: true,
      prePregnancyWeightKg: "",
      doctorName: "",
      clinicName: "",
      today: "2026-09-14",
    };

    expect(validatePregnancyInfo({ ...base, dueDateSource: "other" as never })).toMatchObject({
      ok: false,
      errors: { dueDate: "due_date_invalid" },
    });
    expect(validatePregnancyInfo({ ...base, pregnancyFlags: ["single", "single"] })).toMatchObject({
      ok: false,
      errors: { pregnancyFlags: "pregnancy_flags_invalid" },
    });
    expect(validatePregnancyInfo({ ...base, pregnancyFlags: null as never })).toMatchObject({
      ok: false,
      errors: { pregnancyFlags: "pregnancy_flags_invalid" },
    });
    expect(validatePregnancyInfo({ ...base, babyNames: null as never })).toMatchObject({
      ok: false,
      errors: { babyNames: "baby_names_invalid" },
    });
    expect(validatePregnancyInfo({ ...base, twinType: "not-a-type" as never })).toMatchObject({
      ok: false,
      errors: { twinType: "twin_type_invalid" },
    });
    expect(validatePregnancyInfo({ ...base, isFirstPregnancy: "yes" as never })).toMatchObject({
      ok: false,
      errors: { isFirstPregnancy: "first_pregnancy_invalid" },
    });
    expect(validatePregnancyInfo({
      ...base,
      doctorName: "d".repeat(121),
      clinicName: "c".repeat(121),
    })).toMatchObject({
      ok: false,
      errors: { doctorName: "text_too_long", clinicName: "text_too_long" },
    });
  });
});

describe("notification settings", () => {
  it("accepts only the two lock-screen privacy modes", () => {
    expect(validateNotificationPrivacy("private")).toEqual({ ok: true, value: "private" });
    expect(validateNotificationPrivacy("detailed")).toEqual({ ok: true, value: "detailed" });
    expect(validateNotificationPrivacy("everything")).toEqual({ ok: false, error: "privacy_invalid" });
  });

  it("accepts only configured profile locales", () => {
    expect(validateLocale("en")).toBe(true);
    expect(validateLocale("hi")).toBe(true);
    expect(validateLocale("fr")).toBe(false);
    expect(validateLocale(null)).toBe(false);
  });

  it("loads only boolean reminder preferences and otherwise returns calm defaults", () => {
    expect(parseReminderPreferences(null)).toEqual(DEFAULT_REMINDER_PREFERENCES);
    expect(parseReminderPreferences("not json")).toEqual(DEFAULT_REMINDER_PREFERENCES);
    expect(parseReminderPreferences('{"medicine":false,"appointments":false,"weekly":true}')).toEqual({
      medicine: false,
      appointments: false,
      weekly: true,
    });
    expect(parseReminderPreferences('{"medicine":"yes"}')).toEqual(DEFAULT_REMINDER_PREFERENCES);
  });
});
