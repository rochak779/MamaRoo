import type { EventName, EventProperties } from "@/lib/analytics/events";

export interface Analytics {
  identify(userId: string): void;
  capture<E extends EventName>(event: E, properties?: EventProperties[E]): void;
  optIn(): void;
  optOut(): void;
  reset(): void;
}

/** Used on the server, before consent, and before a vendor is configured, so a call
 * to `track()` is never a crash. */
export const noopAnalytics: Analytics = {
  identify: () => {},
  capture: () => {},
  optIn: () => {},
  optOut: () => {},
  reset: () => {},
};
