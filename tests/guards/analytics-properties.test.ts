import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { EVENTS } from "@/lib/analytics/events";

describe("analytics discipline", () => {
  it("routes every capture through the track helper, anywhere in the tree", () => {
    // Scans the WHOLE source tree, not only app/ and components/: a new file under
    // lib/ calling the vendor directly would otherwise bypass this guard entirely.
    // Test files are excluded: this is a production-code discipline check, and a
    // fixture that merely embeds the string "https://us.i.posthog.com" as a mock
    // env value (env.test.ts, AnalyticsProvider.test.tsx) is not a vendor call --
    // "posthog." also matches inside "...posthog.com", which is the literal text
    // the regex is looking for, not a coincidence to work around by loosening it.
    const hits = execSync(
      "grep -rnE \"(posthog|posthog-js)\\.|from ['\\\"]posthog-js\" app components lib i18n " +
        "--include='*.ts' --include='*.tsx' 2>/dev/null " +
        "| grep -v 'lib/analytics/posthog.ts' | grep -v '\\.test\\.' || true",
      { encoding: "utf8" },
    ).trim();
    expect(hits).toBe("");
  });

  it("detects a direct vendor call, so this guard cannot pass vacuously", () => {
    const hits = execSync(
      "grep -rnE \"posthog\\.\" lib/analytics/posthog.ts 2>/dev/null || true",
      { encoding: "utf8" },
    ).trim();
    expect(hits).not.toBe("");
  });

  it("validates every captured event against its schema", () => {
    const hits = execSync(
      "grep -rn 'posthog.capture' lib/analytics/posthog.ts 2>/dev/null || true",
      { encoding: "utf8" },
    ).trim();
    expect(hits).toContain("validateEvent");
  });

  it("uses no inline event-name string literals", () => {
    const names = Object.values(EVENTS);
    const hits = names
      .map((name) =>
        execSync(
          `grep -rn "[\\"']${name}[\\"']" app components --include='*.tsx' --include='*.ts' 2>/dev/null | grep -v 'lib/analytics' || true`,
          { encoding: "utf8" },
        ).trim(),
      )
      .filter(Boolean);
    expect(hits).toEqual([]);
  });
});
