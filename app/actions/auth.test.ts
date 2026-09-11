// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";

const { verifyOtp } = vi.hoisted(() => ({ verifyOtp: vi.fn() }));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { verifyOtp } }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}));

import { verifyEmailOtp } from "@/app/actions/auth";

beforeEach(() => {
  verifyOtp.mockReset();
});

describe("verifyEmailOtp", () => {
  it("reports success when Supabase reports no error", async () => {
    verifyOtp.mockResolvedValue({ error: null });
    expect(await verifyEmailOtp("her@example.com", "123456")).toEqual({ ok: true });
  });

  // This is the real shape returned by the live Supabase project for BOTH an
  // actually-expired code and a code that was never sent at all (verified
  // directly against it, not assumed): GoTrue's structured `code` is
  // "otp_expired" either way, with the identical message "Token has expired
  // or is invalid". There is no distinct code Supabase exposes for "wrong,
  // but not expired" -- see the fix report for how this was checked, and why
  // no separate invalid_code-from-a-real-error test exists below: inventing
  // one would assert a distinction the live API does not actually make.
  it("maps GoTrue's otp_expired code to the expired failure, not invalid_code", async () => {
    verifyOtp.mockResolvedValue({
      error: {
        name: "AuthApiError",
        message: "Token has expired or is invalid",
        status: 403,
        code: "otp_expired",
      },
    });
    expect(await verifyEmailOtp("her@example.com", "000000")).toEqual({ ok: false, code: "expired" });
  });

  it("falls back to invalid_code for any other 403, per the given fallback rule", async () => {
    verifyOtp.mockResolvedValue({
      error: { name: "AuthApiError", message: "User is banned", status: 403, code: "user_banned" },
    });
    // A real, distinct GoTrue code (not otp_expired) -- exercises the
    // error.status === 403 fallback branch itself, without fabricating an
    // OTP-specific "wrong code" distinction Supabase doesn't actually make.
    expect(await verifyEmailOtp("her@example.com", "123456")).toEqual({ ok: false, code: "invalid_code" });
  });

  it("falls back to unknown for a non-403 error with no known code", async () => {
    verifyOtp.mockResolvedValue({
      error: { name: "AuthApiError", message: "Unexpected failure", status: 500, code: "unexpected_failure" },
    });
    expect(await verifyEmailOtp("her@example.com", "123456")).toEqual({ ok: false, code: "unknown" });
  });
});
