"use client";

import { useEffect, useRef } from "react";
import { createPosthogAnalytics } from "@/lib/analytics/posthog";
import { noopAnalytics, type Analytics } from "@/lib/analytics/provider";
import { EVENTS, type EventName, type EventProperties } from "@/lib/analytics/events";

// Module-level so any component can call track() without threading context, and so
// it defaults to the noop implementation on the server and before this provider
// has ever mounted -- a call is never a crash.
let analytics: Analytics = noopAnalytics;

/** The only function screens call to record an event. */
export function track<E extends EventName>(event: E, properties?: EventProperties[E]) {
  analytics.capture(event, properties);
}

/** TWA launches carry the `android-app://` referrer (the standard signal Chrome
 * sets for a Trusted Web Activity, see Session 34); a TWA also reports
 * `display-mode: standalone`, so the referrer check must come first. The return
 * type is written as its own literal union rather than derived from
 * EventProperties by indexed access, because that spelling would quote this
 * event's key in source, which the repo-wide analytics guard cannot tell apart
 * from an inline event-name literal passed to capture. */
function detectAppSource(): "browser" | "standalone" | "twa" {
  if (typeof document !== "undefined" && document.referrer.startsWith("android-app://")) return "twa";
  if (typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches) {
    return "standalone";
  }
  return "browser";
}

export interface AnalyticsProviderProps {
  userId: string | null;
  analyticsConsented: boolean;
  optionalDataSharingConsented: boolean;
}

/**
 * Mounted once in the root layout. Creates the vendor provider on first mount (a
 * no-op forever if PostHog isn't configured), then opts in/out and identifies as
 * consent changes. `consent_granted` fires exactly once, on the transition into
 * consent -- not on every load for an already-consented user, which is why the
 * ref below is seeded from the initial prop rather than a hardcoded `false`.
 */
export function AnalyticsProvider({ userId, analyticsConsented, optionalDataSharingConsented }: AnalyticsProviderProps) {
  const wasConsented = useRef(analyticsConsented);

  useEffect(() => {
    // Read directly off process.env, NOT the shared lib/env.ts -- that module's
    // parseEnv(process.env) call is eager (it throws at import time on an invalid
    // environment) and was written for server-side startup validation. Next.js
    // only inlines NEXT_PUBLIC_ vars into the client bundle for a literal,
    // statically-visible `process.env.NEXT_PUBLIC_X` access like this one; lib/env.ts's
    // dynamic `parseEnv(process.env)` defeats that, so in the browser its `process.env`
    // reads back empty and its unconditional validation throws during module
    // evaluation. That crashed every page, because this AnalyticsProvider is the
    // first client component ever to import lib/env.ts.
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    if (analytics === noopAnalytics && posthogKey && posthogHost) {
      analytics = createPosthogAnalytics({ key: posthogKey, host: posthogHost });
    }
    // Fires every mount, consented or not: PostHog's own opt-out-by-default state
    // (set in lib/analytics/posthog.ts) is what actually withholds the network
    // send pre-consent, same as every other event -- there is nothing app_opened
    // specific to gate here.
    track(EVENTS.app_opened, { source: detectAppSource() });
  }, []);

  useEffect(() => {
    if (analyticsConsented) {
      analytics.optIn();
      if (userId) analytics.identify(userId);
      if (!wasConsented.current) {
        track(EVENTS.consent_granted, {
          optional_data_sharing: optionalDataSharingConsented,
          analytics: true,
        });
      }
    } else {
      analytics.optOut();
      analytics.reset();
    }
    wasConsented.current = analyticsConsented;
  }, [analyticsConsented, optionalDataSharingConsented, userId]);

  return null;
}
