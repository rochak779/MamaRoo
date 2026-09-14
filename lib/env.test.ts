import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  NEXT_PUBLIC_SITE_URL: "https://example.com",
};

describe("parseEnv", () => {
  it("accepts a complete environment", () => {
    expect(parseEnv(valid).NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
  });

  it("names the missing variable when one is absent", () => {
    expect(() => parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined })).toThrow(
      /NEXT_PUBLIC_SUPABASE_ANON_KEY/,
    );
  });

  it("rejects a Supabase URL that is not a URL", () => {
    expect(() => parseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "not-a-url" })).toThrow();
  });

  it("accepts an environment with no PostHog configuration at all", () => {
    expect(() => parseEnv(valid)).not.toThrow();
  });

  it("accepts a fully-configured PostHog project", () => {
    const withPosthog = parseEnv({
      ...valid,
      NEXT_PUBLIC_POSTHOG_KEY: "phc_test",
      NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
    });
    expect(withPosthog.NEXT_PUBLIC_POSTHOG_KEY).toBe("phc_test");
  });

  it("rejects a PostHog host that is not a URL", () => {
    expect(() =>
      parseEnv({ ...valid, NEXT_PUBLIC_POSTHOG_KEY: "phc_test", NEXT_PUBLIC_POSTHOG_HOST: "not-a-url" }),
    ).toThrow(/NEXT_PUBLIC_POSTHOG_HOST/);
  });

  // .env.example leaves these two commented out (# NEXT_PUBLIC_POSTHOG_KEY=), but
  // an uncommented, blank line ("NEXT_PUBLIC_POSTHOG_KEY=") is an easy slip and
  // must not crash the server the same way a genuinely malformed value should.
  it("treats an empty-string PostHog key and host as unset, not invalid", () => {
    const result = parseEnv({ ...valid, NEXT_PUBLIC_POSTHOG_KEY: "", NEXT_PUBLIC_POSTHOG_HOST: "" });
    expect(result.NEXT_PUBLIC_POSTHOG_KEY).toBeUndefined();
    expect(result.NEXT_PUBLIC_POSTHOG_HOST).toBeUndefined();
  });

  it("accepts an environment with no service-role key at all", () => {
    expect(parseEnv(valid).SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });

  it("accepts a service-role key when present, and treats an empty string as unset", () => {
    expect(parseEnv({ ...valid, SUPABASE_SERVICE_ROLE_KEY: "service-key" }).SUPABASE_SERVICE_ROLE_KEY).toBe(
      "service-key",
    );
    expect(parseEnv({ ...valid, SUPABASE_SERVICE_ROLE_KEY: "" }).SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });
});
