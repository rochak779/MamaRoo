import { describe, expect, it } from "vitest";
import {
  eddFromIvfTransfer,
  eddFromLmp,
  eddFromScan,
  lmpFromEdd,
  pregnancyProgress,
  validateLmp,
} from "@/lib/domain/pregnancy";

describe("eddFromLmp", () => {
  it("adds 280 days to the last menstrual period", () => {
    expect(eddFromLmp("2026-01-01")).toBe("2026-10-08");
  });
});

describe("lmpFromEdd", () => {
  it("is the inverse of eddFromLmp", () => {
    expect(lmpFromEdd(eddFromLmp("2026-04-15"))).toBe("2026-04-15");
  });
});

describe("eddFromScan", () => {
  it("computes the due date from a dating scan", () => {
    // 12 weeks 3 days on the scan date means 280 - 87 = 193 days remain.
    expect(eddFromScan({ scanDate: "2026-03-10", gestWeeks: 12, gestDays: 3 })).toBe("2026-09-19");
  });

  it("treats a missing day count as zero days", () => {
    expect(eddFromScan({ scanDate: "2026-03-10", gestWeeks: 12 })).toBe("2026-09-22");
  });
});

describe("eddFromIvfTransfer", () => {
  it("computes the due date from a day-5 blastocyst transfer", () => {
    // 261 days: the standard day-5 blastocyst convention (280 - 19, where 19
    // days is the LMP-equivalent age of a 5-day blastocyst at transfer).
    expect(eddFromIvfTransfer("2026-03-10")).toBe("2026-11-26");
  });
});

describe("pregnancyProgress", () => {
  it("reports week and day at the start of pregnancy", () => {
    const p = pregnancyProgress({ edd: "2026-10-08", today: "2026-01-01" });
    expect(p).toMatchObject({ gestationalDays: 0, week: 0, day: 0, trimester: 1, isPostTerm: false });
  });

  it("reports week 12 day 3 correctly", () => {
    // 12*7 + 3 = 87 gestational days after the LMP of 2026-01-01.
    const p = pregnancyProgress({ edd: "2026-10-08", today: "2026-03-29" });
    expect(p.week).toBe(12);
    expect(p.day).toBe(3);
  });

  it("puts week 13 in the first trimester and week 14 in the second", () => {
    expect(pregnancyProgress({ edd: "2026-10-08", today: addWeeks("2026-01-01", 13) }).trimester).toBe(1);
    expect(pregnancyProgress({ edd: "2026-10-08", today: addWeeks("2026-01-01", 14) }).trimester).toBe(2);
  });

  it("puts week 28 in the third trimester", () => {
    expect(pregnancyProgress({ edd: "2026-10-08", today: addWeeks("2026-01-01", 28) }).trimester).toBe(3);
  });

  it("reports exactly week 40 on the due date", () => {
    const p = pregnancyProgress({ edd: "2026-10-08", today: "2026-10-08" });
    expect(p.week).toBe(40);
    expect(p.day).toBe(0);
    expect(p.daysToEdd).toBe(0);
    expect(p.isPostTerm).toBe(false);
  });

  it("flags post-term the day after the due date", () => {
    const p = pregnancyProgress({ edd: "2026-10-08", today: "2026-10-09" });
    expect(p.isPostTerm).toBe(true);
    expect(p.daysToEdd).toBe(-1);
  });

  it("clamps the displayed week at 42 however far past the due date she is", () => {
    const p = pregnancyProgress({ edd: "2026-10-08", today: "2027-06-01" });
    expect(p.week).toBe(42);
    expect(p.isPostTerm).toBe(true);
  });

  it("clamps to week 0 when the due date is further than a full gestation away", () => {
    const p = pregnancyProgress({ edd: "2027-10-08", today: "2026-01-01" });
    expect(p.week).toBe(0);
    expect(p.gestationalDays).toBe(0);
  });

  it("counts the days remaining until the due date", () => {
    expect(pregnancyProgress({ edd: "2026-10-08", today: "2026-10-01" }).daysToEdd).toBe(7);
  });
});

describe("validateLmp", () => {
  it("accepts a plausible recent date", () => {
    expect(validateLmp({ lmp: "2026-03-01", today: "2026-09-11" })).toEqual({ ok: true });
  });

  it("rejects a date in the future", () => {
    expect(validateLmp({ lmp: "2026-09-12", today: "2026-09-11" })).toEqual({
      ok: false,
      reason: "future",
    });
  });

  it("accepts today itself", () => {
    expect(validateLmp({ lmp: "2026-09-11", today: "2026-09-11" })).toEqual({ ok: true });
  });

  it("rejects a date more than 44 weeks ago as no longer a current pregnancy", () => {
    expect(validateLmp({ lmp: "2025-09-11", today: "2026-09-11" })).toEqual({
      ok: false,
      reason: "too_old",
    });
  });

  it("rejects a malformed date", () => {
    expect(validateLmp({ lmp: "11-09-2026", today: "2026-09-11" })).toEqual({
      ok: false,
      reason: "invalid",
    });
  });
});

function addWeeks(date: string, weeks: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const ms = Date.UTC(y, m - 1, d) + weeks * 7 * 86_400_000;
  const out = new Date(ms);
  return `${out.getUTCFullYear()}-${String(out.getUTCMonth() + 1).padStart(2, "0")}-${String(out.getUTCDate()).padStart(2, "0")}`;
}
