"use client";

import posthog from "posthog-js";
import { validateEvent } from "@/lib/analytics/sanitise";
import type { Analytics } from "@/lib/analytics/provider";
import type { EventName, EventProperties } from "@/lib/analytics/events";

let initialised = false;

export function createPosthogAnalytics({ key, host }: { key: string; host: string }): Analytics {
  if (!initialised) {
    posthog.init(key, {
      api_host: host,
      // Opt-out by default. Capture begins only after the analytics consent row exists.
      opt_out_capturing_by_default: true,
      autocapture: false, // every event is deliberate and typed
      capture_pageview: false, // tab_viewed is emitted explicitly instead
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "*", // nothing she typed or read is ever recorded
      },
      ip: false,
      persistence: "localStorage+cookie",
    });
    initialised = true;
  }

  return {
    identify: (userId) => posthog.identify(userId),
    capture: <E extends EventName>(event: E, properties?: EventProperties[E]) =>
      posthog.capture(event, validateEvent(event, { ...(properties ?? {}) })),
    optIn: () => posthog.opt_in_capturing(),
    optOut: () => posthog.opt_out_capturing(),
    reset: () => posthog.reset(),
  };
}
