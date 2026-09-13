import { describe, expect, it } from "vitest";
import {
  formatWeekLabel,
  openingLine,
  validateLetterBody,
} from "@/lib/domain/letters";

describe("openingLine", () => {
  it("uses the first non-empty line and collapses its whitespace", () => {
    expect(openingLine("\n\n  Dear   little one,   \nThe rest of the letter."))
      .toBe("Dear little one,");
  });

  it("truncates a long opening line without exceeding the requested length", () => {
    const preview = openingLine("A".repeat(120), 48);
    expect(preview).toHaveLength(48);
    expect(preview.endsWith("…")).toBe(true);
  });
});

describe("formatWeekLabel", () => {
  it("formats a stored week number through localized template copy", () => {
    expect(formatWeekLabel({ week: 26, locale: "en-IN", template: "Week {week}" }))
      .toBe("Week 26");
    expect(formatWeekLabel({ week: 26, locale: "hi-IN", template: "सप्ताह {week}" }))
      .toBe("सप्ताह 26");
  });

  it("rejects a week outside the supported gestational range", () => {
    expect(() => formatWeekLabel({ week: -1, locale: "en-IN", template: "Week {week}" }))
      .toThrow(RangeError);
    expect(() => formatWeekLabel({ week: 43, locale: "en-IN", template: "Week {week}" }))
      .toThrow(RangeError);
  });
});

describe("validateLetterBody", () => {
  it("trims the outside while preserving the body paragraphs", () => {
    expect(validateLetterBody("  Dear little one,\n\nI felt you move today.  ")).toEqual({
      ok: true,
      value: "Dear little one,\n\nI felt you move today.",
    });
  });

  it("returns field errors for blank, overlong, and malformed values", () => {
    expect(validateLetterBody("   ")).toEqual({ ok: false, error: "empty" });
    expect(validateLetterBody("x".repeat(4001))).toEqual({ ok: false, error: "too_long" });
    expect(validateLetterBody(null)).toEqual({ ok: false, error: "invalid" });
  });

  it("accepts Devanagari text at the exact length boundary", () => {
    expect(validateLetterBody("क".repeat(4000))).toEqual({
      ok: true,
      value: "क".repeat(4000),
    });
  });
});
