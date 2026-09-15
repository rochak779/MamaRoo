import { describe, expect, it } from "vitest";
import {
  MAX_ILLUSTRATION_WEEK,
  MIN_ILLUSTRATION_WEEK,
  weekIllustrationSrc,
} from "@/lib/domain/illustrations";

describe("weekIllustrationSrc", () => {
  it("returns the matching week's static and lottie paths", () => {
    expect(weekIllustrationSrc(20)).toEqual({
      lottieUrl: "/illustrations/weeks/week-20.json",
      staticSrc: "/illustrations/weeks/week-20.svg",
    });
  });

  it("clamps below week 1 up to the earliest illustration", () => {
    expect(weekIllustrationSrc(0)).toEqual({
      lottieUrl: `/illustrations/weeks/week-${MIN_ILLUSTRATION_WEEK}.json`,
      staticSrc: `/illustrations/weeks/week-${MIN_ILLUSTRATION_WEEK}.svg`,
    });
  });

  it("clamps above week 40 down to the latest illustration -- the post-term overdue screen has no week 41/42 art", () => {
    expect(weekIllustrationSrc(41)).toEqual({
      lottieUrl: `/illustrations/weeks/week-${MAX_ILLUSTRATION_WEEK}.json`,
      staticSrc: `/illustrations/weeks/week-${MAX_ILLUSTRATION_WEEK}.svg`,
    });
    expect(weekIllustrationSrc(42)).toEqual(weekIllustrationSrc(MAX_ILLUSTRATION_WEEK));
  });

  it("rounds a fractional week rather than propagating it into a bad path", () => {
    expect(weekIllustrationSrc(20.6)).toEqual(weekIllustrationSrc(21));
  });

  it("treats a non-finite week as week 0, rather than propagating NaN or Infinity -- same convention as illustrationStage", () => {
    expect(weekIllustrationSrc(NaN)).toEqual(weekIllustrationSrc(0));
    expect(weekIllustrationSrc(Infinity)).toEqual(weekIllustrationSrc(0));
  });

  it("never returns a week outside 1 to 40, whatever the input", () => {
    for (const week of [-5, 0, 17, 41, 99]) {
      const { staticSrc } = weekIllustrationSrc(week);
      const match = /week-(\d+)\.svg$/.exec(staticSrc);
      const week_ = Number(match?.[1]);
      expect(week_).toBeGreaterThanOrEqual(MIN_ILLUSTRATION_WEEK);
      expect(week_).toBeLessThanOrEqual(MAX_ILLUSTRATION_WEEK);
    }
  });
});
