/**
 * The week-by-week hero illustrations in public/illustrations/weeks span
 * exactly this range. Weeks 1-40 cover every gestational week the normal
 * Today/Baby illustration ever needs -- pregnancyProgress() clamps display
 * week at 42, but isPostTerm flips to true at 40 weeks + 1 day, so a live
 * pregnancy never reaches 41 or 42 without also being routed to the
 * "overdue" edge state. That state reuses the same week art rather than a
 * dedicated illustration, so it still needs a sensible week to clamp to --
 * hence the upper bound here, not just a "this shouldn't happen" guard.
 */
export const MIN_ILLUSTRATION_WEEK = 1;
export const MAX_ILLUSTRATION_WEEK = 40;

/**
 * The one place that knows the week illustration set's file naming and
 * range, so the Today hero, the Baby tab hero, and the overdue edge state
 * (which simply reuses whatever the caller passed for the current week) all
 * stay in sync by construction. No .json Lottie asset exists for any week
 * yet -- IllustrationContainer already treats a missing/failing lottieUrl as
 * "fall back to the static image", so this points at the path a future
 * animated asset would use without requiring a code change to pick it up.
 */
export function weekIllustrationSrc(week: number): { lottieUrl: string; staticSrc: string } {
  const safeWeek = Number.isFinite(week) ? Math.max(0, Math.round(week)) : 0;
  const clamped = Math.min(Math.max(safeWeek, MIN_ILLUSTRATION_WEEK), MAX_ILLUSTRATION_WEEK);
  return {
    lottieUrl: `/illustrations/weeks/week-${clamped}.json`,
    staticSrc: `/illustrations/weeks/week-${clamped}.svg`,
  };
}
