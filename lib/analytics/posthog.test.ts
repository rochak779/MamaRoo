import { describe, expect, it, vi, beforeEach } from "vitest";

// Mocks the vendor SDK itself (not our wrapper), so this exercises the real
// lib/analytics/posthog.ts logic -- the init-once guard, the identify/optIn/
// optOut/reset passthroughs, and the validateEvent gate on capture -- without
// posthog-js making a real network call to a PostHog host in a test run.
const posthogMock = {
  init: vi.fn(),
  identify: vi.fn(),
  capture: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  reset: vi.fn(),
};

vi.mock("posthog-js", () => ({ default: posthogMock }));

const { createPosthogAnalytics } = await import("@/lib/analytics/posthog");
const { EVENTS } = await import("@/lib/analytics/events");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createPosthogAnalytics", () => {
  // These two behaviours share one test, deliberately: `initialised` is a
  // module-level flag in lib/analytics/posthog.ts (by design -- it must survive
  // across the whole app session, not reset per call), which means it also
  // persists across tests in this file. A separate "initialises only once" test
  // running after this one would find init already called and prove nothing.
  it("initialises posthog-js exactly once, with the given key and host, masking all replay input and text", () => {
    createPosthogAnalytics({ key: "phc_test", host: "https://us.i.posthog.com" });
    createPosthogAnalytics({ key: "phc_test", host: "https://us.i.posthog.com" });
    expect(posthogMock.init).toHaveBeenCalledTimes(1);
    expect(posthogMock.init).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({
        api_host: "https://us.i.posthog.com",
        opt_out_capturing_by_default: true,
        autocapture: false,
        ip: false,
        session_recording: expect.objectContaining({ maskAllInputs: true, maskTextSelector: "*" }),
      }),
    );
  });

  it("identify() passes the user id straight through", () => {
    const analytics = createPosthogAnalytics({ key: "phc_test", host: "https://us.i.posthog.com" });
    analytics.identify("user-1");
    expect(posthogMock.identify).toHaveBeenCalledWith("user-1");
  });

  it("capture() validates the event before handing it to posthog-js", () => {
    const analytics = createPosthogAnalytics({ key: "phc_test", host: "https://us.i.posthog.com" });
    analytics.capture(EVENTS.vital_logged, { kind: "weight" });
    expect(posthogMock.capture).toHaveBeenCalledWith(EVENTS.vital_logged, { kind: "weight" });
  });

  it("capture() defaults to an empty properties object when none is given", () => {
    const analytics = createPosthogAnalytics({ key: "phc_test", host: "https://us.i.posthog.com" });
    analytics.capture(EVENTS.chat_opened);
    expect(posthogMock.capture).toHaveBeenCalledWith(EVENTS.chat_opened, {});
  });

  it("capture() throws rather than send an event that fails validation", () => {
    const analytics = createPosthogAnalytics({ key: "phc_test", host: "https://us.i.posthog.com" });
    // @ts-expect-error -- deliberately invalid, this is the case the guard exists for.
    expect(() => analytics.capture(EVENTS.vital_logged, { kind: "blood_sugar" })).toThrow(/rejected/i);
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  it("optIn() and optOut() pass through to posthog-js", () => {
    const analytics = createPosthogAnalytics({ key: "phc_test", host: "https://us.i.posthog.com" });
    analytics.optIn();
    expect(posthogMock.opt_in_capturing).toHaveBeenCalledOnce();
    analytics.optOut();
    expect(posthogMock.opt_out_capturing).toHaveBeenCalledOnce();
  });

  it("reset() passes through to posthog-js", () => {
    const analytics = createPosthogAnalytics({ key: "phc_test", host: "https://us.i.posthog.com" });
    analytics.reset();
    expect(posthogMock.reset).toHaveBeenCalledOnce();
  });
});
