import { describe, expect, it } from "vitest";
import { WEEKDAYS, weekdayFromDate, weeklyMealPlanFor, type Weekday } from "@/lib/domain/weeklyMealPlan";

describe("weeklyMealPlanFor", () => {
  it("returns the eight meal slots in a fixed order for every day", () => {
    for (const day of WEEKDAYS) {
      const slots = weeklyMealPlanFor(day);
      expect(slots.map((s) => s.slot)).toEqual([
        "beforeBreakfast",
        "breakfast",
        "morningSnack",
        "lunch",
        "afternoonSnack",
        "evening",
        "dinner",
        "bedtime",
      ]);
    }
  });

  it("gives every slot a translation key, never literal copy", () => {
    for (const s of weeklyMealPlanFor("monday")) {
      expect(s.itemsKey).toBe(`weeklyMealPlan.monday.${s.slot}`);
      expect(s.labelKey).toBe(`weeklyMealPlan.slotLabel.${s.slot}`);
    }
  });

  it("varies the items key by day for the same slot", () => {
    const monday = weeklyMealPlanFor("monday").find((s) => s.slot === "breakfast")!;
    const tuesday = weeklyMealPlanFor("tuesday").find((s) => s.slot === "breakfast")!;
    expect(monday.itemsKey).not.toBe(tuesday.itemsKey);
  });

  it("keeps the printed clock time stable across days for the same slot", () => {
    const mondayLunch = weeklyMealPlanFor("monday").find((s) => s.slot === "lunch")!;
    const fridayLunch = weeklyMealPlanFor("friday").find((s) => s.slot === "lunch")!;
    expect(mondayLunch.time).toBe(fridayLunch.time);
    expect(mondayLunch.time).toBe("1:00 pm");
  });
});

describe("weekdayFromDate", () => {
  it.each([
    ["2026-09-13", "sunday"],
    ["2026-09-14", "monday"],
    ["2026-09-15", "tuesday"],
    ["2026-09-16", "wednesday"],
    ["2026-09-17", "thursday"],
    ["2026-09-18", "friday"],
    ["2026-09-19", "saturday"],
  ] satisfies [string, Weekday][])("resolves %s to %s", (date, expected) => {
    expect(weekdayFromDate(date)).toBe(expected);
  });

  it("is not shifted by the local system timezone", () => {
    // Reads the date components directly rather than constructing a local
    // Date, so this holds regardless of which timezone the test runs in.
    expect(weekdayFromDate("2026-01-01")).toBe("thursday");
  });
});
