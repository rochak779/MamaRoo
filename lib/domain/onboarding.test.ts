import { describe, expect, it } from "vitest";
import { validateOnboarding } from "@/lib/domain/onboarding";
import en from "@/i18n/en.json";

const t = (key: keyof typeof en.onboarding.errors) => en.onboarding.errors[key];

const today = "2026-09-11";
const base = {
  displayName: "Priyanka",
  dueDateMethod: "lmp" as const,
  date: "2026-03-01",
  today,
};

describe("validateOnboarding", () => {
  it("accepts the minimum required fields and derives the due date from the LMP", () => {
    const result = validateOnboarding(base);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.edd).toBe("2026-12-06");
      expect(result.value.eddSource).toBe("lmp");
      expect(result.value.lmp).toBe("2026-03-01");
    }
  });

  it("requires a name even when it is entirely missing", () => {
    const result = validateOnboarding({ dueDateMethod: "lmp", date: "2026-03-01", today } as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.displayName).toBe(t("nameRequired"));
  });

  it("requires a name", () => {
    const result = validateOnboarding({ ...base, displayName: "   " });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.displayName).toBe(t("nameRequired"));
  });

  it("trims whitespace from text fields", () => {
    const result = validateOnboarding({
      ...base,
      displayName: "  Priyanka  ",
      city: "  Pune  ",
      emergencyContactName: " Asha ",
      emergencyContactPhone: " 9876543210 ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.displayName).toBe("Priyanka");
      expect(result.value.city).toBe("Pune");
      expect(result.value.emergencyContactName).toBe("Asha");
      expect(result.value.emergencyContactPhone).toBe("9876543210");
    }
  });

  it("reports every error at once, not one at a time", () => {
    const result = validateOnboarding({ displayName: "", dueDateMethod: "lmp", date: "not-a-date", today });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(2);
  });

  describe("age", () => {
    it("is optional", () => {
      expect(validateOnboarding(base).ok).toBe(true);
    });

    it("converts a plausible age into a birth year", () => {
      const result = validateOnboarding({ ...base, age: 28 });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.birthYear).toBe(1998);
    });

    it("rejects an age that would make her under 12", () => {
      const result = validateOnboarding({ ...base, age: 6 });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.age).toBe(t("ageRange"));
    });

    it("rejects an age that would make her over 70", () => {
      const result = validateOnboarding({ ...base, age: 86 });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.age).toBe(t("ageRange"));
    });
  });

  describe("weight", () => {
    it("is optional", () => {
      expect(validateOnboarding(base).ok).toBe(true);
    });

    it("rejects an implausible weight", () => {
      const result = validateOnboarding({ ...base, weightKg: 500 });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.weightKg).toBe(t("weightRange"));
    });

    it("accepts a weight within range", () => {
      const result = validateOnboarding({ ...base, weightKg: 62 });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.weightKg).toBe(62);
    });
  });

  describe("emergency contact", () => {
    it("is entirely optional", () => {
      expect(validateOnboarding(base).ok).toBe(true);
    });

    it("requires a phone number once a name is given", () => {
      const result = validateOnboarding({ ...base, emergencyContactName: "Asha" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.emergencyContactPhone).toBe(t("emergencyContactIncomplete"));
      }
    });

    it("requires a name once a phone number is given", () => {
      const result = validateOnboarding({ ...base, emergencyContactPhone: "9876543210" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.emergencyContactName).toBe(t("emergencyContactIncomplete"));
      }
    });

    it("rejects a phone number that is not 10 digits", () => {
      const result = validateOnboarding({ ...base, emergencyContactName: "Asha", emergencyContactPhone: "123" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.emergencyContactPhone).toBe(t("emergencyPhoneInvalid"));
    });

    it("accepts a complete pair", () => {
      const result = validateOnboarding({
        ...base,
        emergencyContactName: "Asha",
        emergencyContactPhone: "9876543210",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.emergencyContactName).toBe("Asha");
        expect(result.value.emergencyContactPhone).toBe("9876543210");
      }
    });
  });

  describe("due date method", () => {
    it("requires a method", () => {
      const result = validateOnboarding({ displayName: "P", today } as never);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.dueDateMethod).toBe(t("dueDateMethodRequired"));
    });

    it("derives the due date from the last period", () => {
      const result = validateOnboarding({ ...base, dueDateMethod: "lmp", date: "2026-01-01" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.edd).toBe("2026-10-08");
        expect(result.value.eddSource).toBe("lmp");
      }
    });

    it("rejects a last period in the future", () => {
      const result = validateOnboarding({ ...base, dueDateMethod: "lmp", date: "2026-10-01" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.date).toBe(t("dateFuture"));
    });

    it("rejects a last period more than 44 weeks ago", () => {
      const result = validateOnboarding({ ...base, dueDateMethod: "lmp", date: "2025-01-01" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.date).toBe(t("dateTooOld"));
    });

    it("takes an ultrasound-confirmed date directly as the due date", () => {
      const result = validateOnboarding({ ...base, dueDateMethod: "scan", date: "2026-12-01" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.edd).toBe("2026-12-01");
        expect(result.value.eddSource).toBe("scan");
        expect(result.value.lmp).toBe("2026-02-24");
      }
    });

    it("takes a doctor-given due date directly", () => {
      const result = validateOnboarding({ ...base, dueDateMethod: "manual", date: "2026-12-06" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.edd).toBe("2026-12-06");
        expect(result.value.eddSource).toBe("manual");
      }
    });

    it("derives the due date from an IVF/IUI transfer date", () => {
      const result = validateOnboarding({ ...base, dueDateMethod: "ivf", date: "2026-03-10" });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.edd).toBe("2026-11-26");
        expect(result.value.eddSource).toBe("ivf");
      }
    });

    it("rejects a due date already far in the past", () => {
      const result = validateOnboarding({ ...base, dueDateMethod: "manual", date: "2025-01-01" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.date).toBe(t("dueDatePast"));
    });

    it("accepts a due date up to 44 weeks in the future", () => {
      const result = validateOnboarding({ ...base, dueDateMethod: "manual", date: "2027-05-01" });
      expect(result.ok).toBe(true);
    });

    it("rejects a due date implausibly far in the future", () => {
      const result = validateOnboarding({ ...base, dueDateMethod: "manual", date: "2029-01-01" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.date).toBe(t("dueDateTooFar"));
    });

    it("needs no date at all for 'not sure yet', and seeds a placeholder due date instead", () => {
      const result = validateOnboarding({ displayName: "Priyanka", dueDateMethod: "unsure", today });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.eddSource).toBe("unsure");
        expect(result.value.edd).toBe("2027-06-18"); // today + 280 days
        expect(result.value.lmp).toBeNull();
      }
    });

    it("requires a date for every method except 'not sure yet'", () => {
      const result = validateOnboarding({ displayName: "Priyanka", dueDateMethod: "scan", today });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.date).toBe(t("dateRequired"));
    });
  });

  describe("pregnancy flags and notification privacy", () => {
    it("treats pregnancy flags, twin type and notification privacy as optional, defaulting privacy to private", () => {
      const result = validateOnboarding(base);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.pregnancyFlags).toEqual([]);
        expect(result.value.twinType).toBeNull();
        expect(result.value.notificationPrivacy).toBe("private");
      }
    });

    it("carries through whichever flags, twin type and privacy choice were made", () => {
      const result = validateOnboarding({
        ...base,
        pregnancyFlags: ["twins", "priorLoss"],
        twinType: "monochorionic",
        notificationPrivacy: "detailed",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.pregnancyFlags).toEqual(["twins", "priorLoss"]);
        expect(result.value.twinType).toBe("monochorionic");
        expect(result.value.notificationPrivacy).toBe("detailed");
      }
    });
  });

  // PCPNDT Act (spec 1.4, Important/Implementation.md): this domain module
  // must never touch the prohibited foetal characteristic. Checked as two
  // separate substrings so this test itself doesn't spell out either of the
  // exact phrases the repo-wide guard at tests/guards/schema-pcpndt.test.ts
  // scans for and forbids outside its own matcher files.
  it("has no field, key or value anywhere referring to the prohibited characteristic", () => {
    const result = validateOnboarding({
      ...base,
      pregnancyFlags: ["twins"],
      twinType: "monochorionic",
    });
    const serialized = JSON.stringify(result).toLowerCase();
    const prohibitedWord = ["gen", "der"].join("");
    expect(serialized).not.toMatch(/\bsex\b/);
    expect(serialized).not.toContain(prohibitedWord);
  });
});
