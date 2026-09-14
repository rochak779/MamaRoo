import { describe, expect, it } from "vitest";
import {
  confirmationWordMatches,
  DELETE_ACCOUNT_CONFIRMATION_WORD,
  REAUTH_MAX_AGE_MS,
  reauthIsFresh,
} from "@/lib/domain/privacy";

describe("reauthIsFresh", () => {
  const now = new Date("2026-09-14T12:10:00.000Z").getTime();

  it("accepts a sign-in just now", () => {
    expect(reauthIsFresh({ lastSignInAt: new Date(now).toISOString(), now })).toBe(true);
  });

  it("accepts a sign-in exactly at the bound", () => {
    expect(reauthIsFresh({ lastSignInAt: new Date(now - REAUTH_MAX_AGE_MS).toISOString(), now })).toBe(true);
  });

  it("rejects a sign-in one millisecond past the bound", () => {
    expect(reauthIsFresh({ lastSignInAt: new Date(now - REAUTH_MAX_AGE_MS - 1).toISOString(), now })).toBe(false);
  });

  it("rejects a null last_sign_in_at", () => {
    expect(reauthIsFresh({ lastSignInAt: null, now })).toBe(false);
  });

  it("rejects an undefined last_sign_in_at", () => {
    expect(reauthIsFresh({ lastSignInAt: undefined, now })).toBe(false);
  });

  it("rejects an unparseable value rather than throwing", () => {
    expect(reauthIsFresh({ lastSignInAt: "not a date", now })).toBe(false);
  });
});

describe("confirmationWordMatches", () => {
  it("accepts the exact English word", () => {
    expect(confirmationWordMatches(DELETE_ACCOUNT_CONFIRMATION_WORD.en, "en")).toBe(true);
  });

  it("accepts the exact Hindi word", () => {
    expect(confirmationWordMatches(DELETE_ACCOUNT_CONFIRMATION_WORD.hi, "hi")).toBe(true);
  });

  it("is case-insensitive for the English word", () => {
    expect(confirmationWordMatches("delete", "en")).toBe(true);
  });

  it("tolerates surrounding whitespace", () => {
    expect(confirmationWordMatches("  DELETE  ", "en")).toBe(true);
  });

  it("rejects a near miss", () => {
    expect(confirmationWordMatches("DELET", "en")).toBe(false);
  });

  it("rejects the other locale's word", () => {
    expect(confirmationWordMatches(DELETE_ACCOUNT_CONFIRMATION_WORD.hi, "en")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(confirmationWordMatches("", "en")).toBe(false);
  });
});
