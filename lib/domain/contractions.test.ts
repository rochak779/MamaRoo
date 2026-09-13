import { describe, expect, it } from "vitest";
import { contractionStats } from "@/lib/domain/contractions";

const base = new Date("2026-11-20T02:00:00Z").getTime();
const at = (minutes: number) => new Date(base + minutes * 60_000).toISOString();

/** Contractions 60 seconds long, five minutes apart, for just over an hour. */
const fiveOneOne = Array.from({ length: 13 }, (_, i) => ({
  started_at: at(i * 5),
  duration_seconds: 60,
}));

describe("contractionStats", () => {
  it("reports an empty session", () => {
    expect(contractionStats([], base)).toEqual({
      count: 0,
      averageDurationSeconds: null,
      averageIntervalSeconds: null,
      isRegular: false,
      meets511: false,
    });
  });

  it("reports no interval from a single contraction", () => {
    const stats = contractionStats([{ started_at: at(0), duration_seconds: 45 }], base);
    expect(stats.averageDurationSeconds).toBe(45);
    expect(stats.averageIntervalSeconds).toBeNull();
  });

  it("averages intervals from the start of one contraction to the start of the next", () => {
    const stats = contractionStats(
      [
        { started_at: at(0), duration_seconds: 40 },
        { started_at: at(5), duration_seconds: 50 },
        { started_at: at(10), duration_seconds: 60 },
      ],
      base,
    );
    expect(stats.averageIntervalSeconds).toBe(300);
    expect(stats.averageDurationSeconds).toBe(50);
  });

  it("ignores a contraction still running when averaging duration", () => {
    const stats = contractionStats(
      [
        { started_at: at(0), duration_seconds: 60 },
        { started_at: at(5), duration_seconds: null },
      ],
      base + 6 * 60_000,
    );
    expect(stats.averageDurationSeconds).toBe(60);
    expect(stats.count).toBe(2);
  });

  it("reports regularity when intervals are close together", () => {
    expect(contractionStats(fiveOneOne, base + 70 * 60_000).isRegular).toBe(true);
  });

  it("reports irregularity when intervals vary widely", () => {
    const irregular = [
      { started_at: at(0), duration_seconds: 40 },
      { started_at: at(3), duration_seconds: 40 },
      { started_at: at(20), duration_seconds: 40 },
    ];
    expect(contractionStats(irregular, base + 25 * 60_000).isRegular).toBe(false);
  });

  it("recognises the 5-1-1 pattern", () => {
    expect(contractionStats(fiveOneOne, base + 70 * 60_000).meets511).toBe(true);
  });

  it("does not claim 5-1-1 when the pattern has lasted under an hour", () => {
    expect(contractionStats(fiveOneOne.slice(0, 5), base + 25 * 60_000).meets511).toBe(false);
  });

  it("does not claim 5-1-1 when contractions are too short", () => {
    const short = fiveOneOne.map((c) => ({ ...c, duration_seconds: 20 }));
    expect(contractionStats(short, base + 70 * 60_000).meets511).toBe(false);
  });

  it("does not claim 5-1-1 when contractions are too far apart", () => {
    const sparse = Array.from({ length: 13 }, (_, i) => ({ started_at: at(i * 12), duration_seconds: 60 }));
    expect(contractionStats(sparse, base + 160 * 60_000).meets511).toBe(false);
  });

  it("handles contractions supplied out of order", () => {
    const shuffled = [fiveOneOne[3]!, fiveOneOne[0]!, fiveOneOne[1]!, fiveOneOne[2]!];
    expect(contractionStats(shuffled, base + 30 * 60_000).averageIntervalSeconds).toBe(300);
  });
});
