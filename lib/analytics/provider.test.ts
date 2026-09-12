import { describe, expect, it } from "vitest";
import { noopAnalytics } from "@/lib/analytics/provider";

describe("noopAnalytics", () => {
  it("does nothing and never throws, on the server, before consent, and before a vendor is configured", () => {
    expect(() => {
      noopAnalytics.identify("user-1");
      noopAnalytics.capture("app_opened", { source: "browser" });
      noopAnalytics.optIn();
      noopAnalytics.optOut();
      noopAnalytics.reset();
    }).not.toThrow();
  });
});
