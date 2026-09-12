"use client";

import { useEffect, useRef } from "react";
import { env } from "@/lib/env";
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
    if (analytics === noopAnalytics && env.NEXT_PUBLIC_POSTHOG_KEY && env.NEXT_PUBLIC_POSTHOG_HOST) {
      analytics = createPosthogAnalytics({
        key: env.NEXT_PUBLIC_POSTHOG_KEY,
        host: env.NEXT_PUBLIC_POSTHOG_HOST,
      });
    }
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
