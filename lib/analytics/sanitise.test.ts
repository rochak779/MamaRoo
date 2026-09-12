import { describe, expect, it } from "vitest";
import { EVENTS } from "@/lib/analytics/events";
import { EVENT_SCHEMAS, validateEvent } from "@/lib/analytics/sanitise";

describe("validateEvent", () => {
  it("accepts a declared event with exactly its declared properties", () => {
    expect(validateEvent(EVENTS.vital_logged, { kind: "weight" })).toEqual({ kind: "weight" });
  });

  it("rejects an event name that has no schema", () => {
    expect(() => validateEvent("made_up_event", {})).toThrow(/unknown analytics event/i);
  });

  it("rejects any key the event did not declare", () => {
    expect(() => validateEvent(EVENTS.vital_logged, { kind: "weight", note: "fine" })).toThrow(
      /rejected/i,
    );
  });

  // The case a denylist of key names lets straight through. This is the whole reason
  // this module is an allowlist.
  it.each([
    ["condition", "bleeding"],
    ["observation", "headache"],
    ["detail", "Dr Mehta"],
    ["extra", "Priyanka"],
    ["value", "Folic acid"],
  ])("rejects health or personal data smuggled under the unlisted key %s", (key, value) => {
    expect(() => validateEvent(EVENTS.checkin_submitted, {
      input_method: "text",
      length_bucket: "short",
      [key]: value,
    })).toThrow(/rejected/i);
  });

  it("rejects a value outside the declared enum", () => {
    expect(() => validateEvent(EVENTS.vital_logged, { kind: "blood_sugar" })).toThrow(/rejected/i);
  });

  it("rejects a number outside the declared range", () => {
    expect(() => validateEvent(EVENTS.summary_viewed, { week: 120 })).toThrow(/rejected/i);
  });

  it("rejects a free-text value even where a string is expected, because no key accepts free text", () => {
    expect(() => validateEvent(EVENTS.checklist_item_toggled, {
      category: "I packed my hospital bag today",
      done: true,
    })).toThrow(/rejected/i);
  });

  it("rejects a nested object", () => {
    expect(() => validateEvent(EVENTS.tab_viewed, { tab: { name: "today" } })).toThrow(/rejected/i);
  });

  it("rejects a missing required property rather than sending a partial event", () => {
    expect(() => validateEvent(EVENTS.medicine_dose_logged, { status: "taken" })).toThrow(/rejected/i);
  });

  it("declares a schema for every event in the taxonomy, so none can be emitted unvalidated", () => {
    const missing = Object.values(EVENTS).filter((name) => !(name in EVENT_SCHEMAS));
    expect(missing).toEqual([]);
  });

  it("declares no schema for an event not in the taxonomy", () => {
    const names = Object.values(EVENTS) as string[];
    expect(Object.keys(EVENT_SCHEMAS).filter((k) => !names.includes(k))).toEqual([]);
  });
});
