export interface ContractionRecord {
  started_at: string;
  duration_seconds: number | null;
}

export interface ContractionStatsResult {
  count: number;
  averageDurationSeconds: number | null;
  averageIntervalSeconds: number | null;
  isRegular: boolean;
  meets511: boolean;
}

// The commonly-cited "5-1-1" pattern: contractions roughly five minutes
// apart, lasting roughly a minute each, for roughly an hour. This is a
// pattern observation surfaced as guidance -- never a diagnosis, and never a
// threshold this codebase decides on its own (see Session 30's own note).
const FIVE_ONE_ONE_INTERVAL_SECONDS = 5 * 60;
const FIVE_ONE_ONE_MIN_DURATION_SECONDS = 60;
const FIVE_ONE_ONE_MIN_SPAN_SECONDS = 60 * 60;

// "Regular" tolerates real-world variation in when she notices and taps
// stop/start -- not a strict five-minute-exactly requirement.
const REGULAR_INTERVAL_TOLERANCE_SECONDS = 90;

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Pure projection of contraction rows into what the timer screen shows.
 * Never trusts a running counter -- every value here is computed fresh from
 * started_at/duration_seconds, so it's correct however long the screen has
 * been asleep.
 */
// now is part of the interface the timer component depends on (a live
// clock reading it can pass without maintaining its own state) but every
// current stat is derived from stored started_at/duration_seconds values
// alone, so it goes unused here.
export function contractionStats(contractions: ContractionRecord[], _now: number): ContractionStatsResult {
  const sorted = [...contractions].sort(
    (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
  );

  const count = sorted.length;

  const durations = sorted
    .map((c) => c.duration_seconds)
    .filter((d): d is number => d != null);
  const averageDurationSeconds = average(durations);

  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prevStart = new Date(sorted[i - 1]!.started_at).getTime();
    const thisStart = new Date(sorted[i]!.started_at).getTime();
    intervals.push((thisStart - prevStart) / 1000);
  }
  const averageIntervalSeconds = average(intervals);

  const isRegular =
    intervals.length > 0 &&
    intervals.every((i) => Math.abs(i - FIVE_ONE_ONE_INTERVAL_SECONDS) <= REGULAR_INTERVAL_TOLERANCE_SECONDS);

  const spanSeconds =
    sorted.length > 0
      ? (new Date(sorted[sorted.length - 1]!.started_at).getTime() - new Date(sorted[0]!.started_at).getTime()) / 1000
      : 0;
  const allLongEnough = durations.length === sorted.length && durations.every((d) => d >= FIVE_ONE_ONE_MIN_DURATION_SECONDS);
  const meets511 = isRegular && allLongEnough && spanSeconds >= FIVE_ONE_ONE_MIN_SPAN_SECONDS;

  return { count, averageDurationSeconds, averageIntervalSeconds, isRegular, meets511 };
}
