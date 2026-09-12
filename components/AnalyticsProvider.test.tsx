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

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_POSTHOG_KEY: "phc_test",
    NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
  },
}));

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

  it("captures consent_granted as the first event, and nothing before the transition to granted", () => {
    const { rerender } = render(
      <AnalyticsProvider userId="user-1" analyticsConsented={false} optionalDataSharingConsented={false} />,
    );
    expect(fakeAnalytics.capture).not.toHaveBeenCalled();

    rerender(<AnalyticsProvider userId="user-1" analyticsConsented={true} optionalDataSharingConsented={true} />);
    expect(fakeAnalytics.capture).toHaveBeenCalledTimes(1);
    expect(fakeAnalytics.capture).toHaveBeenCalledWith(
      EVENTS.consent_granted,
      { optional_data_sharing: true, analytics: true },
    );
  });

  it("does not re-fire consent_granted on a fresh mount for an already-consented user", () => {
    render(<AnalyticsProvider userId="user-1" analyticsConsented={true} optionalDataSharingConsented={true} />);
    expect(fakeAnalytics.capture).not.toHaveBeenCalled();
  });
});
