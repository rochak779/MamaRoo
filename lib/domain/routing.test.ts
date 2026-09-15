import { describe, expect, it } from "vitest";
import { resolveRedirect } from "@/lib/domain/routing";

const authed = { isAuthed: true, hasConsented: true, hasOnboarded: true };

describe("resolveRedirect", () => {
  it("sends a signed-out visitor away from an app route, to language select", () => {
    expect(
      resolveRedirect({ path: "/today", isAuthed: false, hasConsented: false, hasOnboarded: false }),
    ).toBe("/welcome?next=%2Ftoday");
  });

  it("leaves a signed-out visitor on the splash screen", () => {
    expect(
      resolveRedirect({ path: "/", isAuthed: false, hasConsented: false, hasOnboarded: false }),
    ).toBeNull();
  });

  it("leaves a signed-out visitor on the language select screen", () => {
    expect(
      resolveRedirect({ path: "/welcome", isAuthed: false, hasConsented: false, hasOnboarded: false }),
    ).toBeNull();
  });

  it("leaves a signed-out visitor on the welcome entry screen", () => {
    expect(
      resolveRedirect({ path: "/start", isAuthed: false, hasConsented: false, hasOnboarded: false }),
    ).toBeNull();
  });

  it("leaves a signed-out visitor on the sign-in page", () => {
    expect(
      resolveRedirect({ path: "/signin", isAuthed: false, hasConsented: false, hasOnboarded: false }),
    ).toBeNull();
  });

  it("leaves a signed-out visitor on a legal page, because consent copy must be readable first", () => {
    expect(
      resolveRedirect({ path: "/legal/privacy", isAuthed: false, hasConsented: false, hasOnboarded: false }),
    ).toBeNull();
  });

  // Consent capture re-enabled 2026-09-15 ahead of launch -- see
  // Important/Implementation.md's Session 13 follow-up.
  it("sends a signed-in, unconsented user to the consent screen", () => {
    expect(
      resolveRedirect({ path: "/today", isAuthed: true, hasConsented: false, hasOnboarded: false }),
    ).toBe("/consent");
  });

  it("leaves an unconsented user already on /consent in place", () => {
    expect(
      resolveRedirect({ path: "/consent", isAuthed: true, hasConsented: false, hasOnboarded: false }),
    ).toBeNull();
  });

  it("lets a signed-in user without consent read a legal page, because the consent screen links there", () => {
    expect(
      resolveRedirect({ path: "/legal/privacy", isAuthed: true, hasConsented: false, hasOnboarded: false }),
    ).toBeNull();
  });

  it("sends a consented user without a profile to the onboarding form", () => {
    expect(
      resolveRedirect({ path: "/today", isAuthed: true, hasConsented: true, hasOnboarded: false }),
    ).toBe("/onboarding/profile");
  });

  it("lets a consented user without a profile still read a legal page", () => {
    expect(
      resolveRedirect({ path: "/legal/privacy", isAuthed: true, hasConsented: true, hasOnboarded: false }),
    ).toBeNull();
  });

  // Session 15's originally-planned standalone intro carousel is superseded by
  // the delivered mockups' single pre-auth /start screen (Welcome), so
  // /onboarding/intro is no longer a real route -- a stale link to it should
  // land on the actual onboarding form, not be treated as an exempt path.
  it("sends a consented user without a profile away from the retired intro route to the onboarding form", () => {
    expect(
      resolveRedirect({ path: "/onboarding/intro", isAuthed: true, hasConsented: true, hasOnboarded: false }),
    ).toBe("/onboarding/profile");
  });

  it("sends a fully onboarded user away from the landing page to Today", () => {
    expect(resolveRedirect({ path: "/", ...authed })).toBe("/today");
  });

  it("sends a fully onboarded user away from sign-up to Today", () => {
    expect(resolveRedirect({ path: "/signup", ...authed })).toBe("/today");
  });

  it("sends a fully onboarded user away from the welcome entry screen to Today", () => {
    expect(resolveRedirect({ path: "/start", ...authed })).toBe("/today");
  });

  it("sends a fully onboarded user away from the onboarding form to Today", () => {
    expect(resolveRedirect({ path: "/onboarding/profile", ...authed })).toBe("/today");
  });

  it("leaves a fully onboarded user alone inside the app", () => {
    expect(resolveRedirect({ path: "/care/medicines", ...authed })).toBeNull();
  });

  it("preserves a deep link so a notification or shared link resumes after sign-in", () => {
    expect(
      resolveRedirect({ path: "/care/summary", isAuthed: false, hasConsented: false, hasOnboarded: false }),
    ).toBe("/welcome?next=%2Fcare%2Fsummary");
  });

  it("never builds a next parameter pointing at an external host", () => {
    expect(
      resolveRedirect({ path: "//evil.example.com", isAuthed: false, hasConsented: false, hasOnboarded: false }),
    ).toBe("/welcome");
  });
});
