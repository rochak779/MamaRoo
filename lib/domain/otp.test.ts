import { describe, expect, it } from "vitest";
import { resendState } from "@/lib/domain/otp";

const base = new Date("2026-09-11T10:00:00Z").getTime();

describe("resendState", () => {
  it("blocks a resend immediately after sending and reports the full wait", () => {
    expect(resendState({ lastSentAt: base, now: base, cooldownSeconds: 60 })).toEqual({
      canResend: false,
      secondsLeft: 60,
    });
  });

  it("counts the remaining seconds down", () => {
    expect(resendState({ lastSentAt: base, now: base + 25_000, cooldownSeconds: 60 })).toEqual({
      canResend: false,
      secondsLeft: 35,
    });
  });

  it("rounds a part-second up, so the button never unlocks early", () => {
    expect(resendState({ lastSentAt: base, now: base + 59_500, cooldownSeconds: 60 }).secondsLeft).toBe(1);
  });

  it("allows a resend once the cooldown has elapsed", () => {
    expect(resendState({ lastSentAt: base, now: base + 60_000, cooldownSeconds: 60 })).toEqual({
      canResend: true,
      secondsLeft: 0,
    });
  });

  it("allows a resend when nothing has been sent yet", () => {
    expect(resendState({ lastSentAt: null, now: base, cooldownSeconds: 60 })).toEqual({
      canResend: true,
      secondsLeft: 0,
    });
  });

  it("allows a resend if the clock appears to have moved backwards", () => {
    expect(resendState({ lastSentAt: base, now: base - 5_000, cooldownSeconds: 60 }).canResend).toBe(false);
  });
});
