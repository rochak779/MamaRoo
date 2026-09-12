import { describe, expect, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { EVENTS } from "@/lib/analytics/events";

const fakeAnalytics = {
  identify: vi.fn(),
  capture: vi.fn(),
  optIn: vi.fn(),
  optOut: vi.fn(),
  reset: vi.fn(),
};

// AnalyticsProvider reads these directly off process.env (see its own comment on
// why), not through lib/env.ts, so setting them here is what stands in for a
// configured PostHog project.
process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com";

vi.mock("@/lib/analytics/posthog", () => ({
  createPosthogAnalytics: () => fakeAnalytics,
}));

// Imported after the mocks above so the module under test picks them up.
const { AnalyticsProvider, track } = await import("@/components/AnalyticsProvider");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AnalyticsProvider", () => {
  it("track() is a no-op with no provider mounted, rather than a crash", () => {
    expect(() => track(EVENTS.tab_viewed, { tab: "today" })).not.toThrow();
  });

  it("does not call optIn when no analytics consent is present", () => {
    render(<AnalyticsProvider userId={null} analyticsConsented={false} optionalDataSharingConsented={false} />);
    expect(fakeAnalytics.optIn).not.toHaveBeenCalled();
  });

  it("calls optIn and identify when consent is present and a user id is given", () => {
    render(<AnalyticsProvider userId="user-1" analyticsConsented={true} optionalDataSharingConsented={false} />);
    expect(fakeAnalytics.optIn).toHaveBeenCalled();
    expect(fakeAnalytics.identify).toHaveBeenCalledWith("user-1");
  });

  it("calls optOut and reset when consent is withdrawn", () => {
    const { rerender } = render(
      <AnalyticsProvider userId="user-1" analyticsConsented={true} optionalDataSharingConsented={false} />,
    );
    rerender(<AnalyticsProvider userId="user-1" analyticsConsented={false} optionalDataSharingConsented={false} />);
    expect(fakeAnalytics.optOut).toHaveBeenCalled();
    expect(fakeAnalytics.reset).toHaveBeenCalled();
  });

  function consentGrantedCalls() {
    return fakeAnalytics.capture.mock.calls.filter(([event]) => event === EVENTS.consent_granted);
  }

  it("captures consent_granted on the transition to granted, and not before it", () => {
    // app_opened also captures on mount (tested separately below), so this test
    // isolates consent_granted specifically rather than asserting on call count.
    const { rerender } = render(
      <AnalyticsProvider userId="user-1" analyticsConsented={false} optionalDataSharingConsented={false} />,
    );
    expect(consentGrantedCalls()).toHaveLength(0);

    rerender(<AnalyticsProvider userId="user-1" analyticsConsented={true} optionalDataSharingConsented={true} />);
    expect(consentGrantedCalls()).toEqual([
      [EVENTS.consent_granted, { optional_data_sharing: true, analytics: true }],
    ]);
  });

  it("does not re-fire consent_granted on a fresh mount for an already-consented user", () => {
    render(<AnalyticsProvider userId="user-1" analyticsConsented={true} optionalDataSharingConsented={true} />);
    expect(consentGrantedCalls()).toHaveLength(0);
  });

  it("captures app_opened as source: browser by default", () => {
    render(<AnalyticsProvider userId={null} analyticsConsented={false} optionalDataSharingConsented={false} />);
    expect(fakeAnalytics.capture).toHaveBeenCalledWith(EVENTS.app_opened, { source: "browser" });
  });

  it("captures app_opened as source: standalone when launched as an installed PWA", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query === "(display-mode: standalone)",
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;

    render(<AnalyticsProvider userId={null} analyticsConsented={false} optionalDataSharingConsented={false} />);
    expect(fakeAnalytics.capture).toHaveBeenCalledWith(EVENTS.app_opened, { source: "standalone" });

    window.matchMedia = original;
  });

  it("captures app_opened as source: twa when launched from the Android referrer", () => {
    const original = Object.getOwnPropertyDescriptor(document, "referrer");
    Object.defineProperty(document, "referrer", { value: "android-app://com.mamaroo.app", configurable: true });

    render(<AnalyticsProvider userId={null} analyticsConsented={false} optionalDataSharingConsented={false} />);
    expect(fakeAnalytics.capture).toHaveBeenCalledWith(EVENTS.app_opened, { source: "twa" });

    if (original) Object.defineProperty(document, "referrer", original);
  });
});
