/**
 * Real weekly meal plan sourced from mothers-weekly-meal-plan.md (a
 * transcribed AMVI Hospital printed plan), replacing the earlier
 * diet-type-branching dummy content in mealPlan.ts. The plan is fixed per
 * day of week -- there's no diet-type selector in the source document --
 * and the Meal Plan screen only ever renders today's day, never the full
 * week, so she's never reading Thursday's menu on a Tuesday.
 */

export const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const MEAL_SLOTS = [
  "beforeBreakfast",
  "breakfast",
  "morningSnack",
  "lunch",
  "afternoonSnack",
  "evening",
  "dinner",
  "bedtime",
] as const;
export type WeeklyMealSlotKind = (typeof MEAL_SLOTS)[number];

/** Printed once at the bottom of the source plan as a shared reference --
 * the clock time for each slot never varies by day. */
const SLOT_TIMES: Record<WeeklyMealSlotKind, string> = {
  beforeBreakfast: "6:30 am",
  breakfast: "8:00 am",
  morningSnack: "11:00 am",
  lunch: "1:00 pm",
  afternoonSnack: "4:00 pm",
  evening: "5:30 pm",
  dinner: "8:00 pm",
  bedtime: "10:00 pm",
};

export interface WeeklyMealSlot {
  slot: WeeklyMealSlotKind;
  time: string;
  labelKey: string;
  itemsKey: string;
}

/**
 * Every slot resolves to an i18n key, never literal copy -- same convention
 * mealPlanFor used -- the strings live in i18n/en.json and i18n/hi.json
 * under weeklyMealPlan.<day>.<slot>, sourced verbatim from
 * mothers-weekly-meal-plan.md.
 */
export function weeklyMealPlanFor(day: Weekday): WeeklyMealSlot[] {
  return MEAL_SLOTS.map((slot) => ({
    slot,
    time: SLOT_TIMES[slot],
    labelKey: `weeklyMealPlan.slotLabel.${slot}`,
    itemsKey: `weeklyMealPlan.${day}.${slot}`,
  }));
}

const JS_DAY_TO_WEEKDAY: readonly Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/**
 * date is a "YYYY-MM-DD" app-zone calendar day (see todayInAppZone in
 * lib/domain/dates.ts). Read at UTC midnight, same as the rest of
 * lib/domain/dates.ts, so no timezone can shift which weekday it resolves to.
 */
export function weekdayFromDate(date: string): Weekday {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return JS_DAY_TO_WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]!;
}
