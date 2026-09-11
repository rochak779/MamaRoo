import { describe, expect, it } from "vitest";
import { resolveRedirect } from "@/lib/domain/routing";

const authed = { isAuthed: true, hasConsented: true, hasOnboarded: true };

describe("resolveRedirect", () => {
  it("sends a signed-out visitor away from an app route, back to the landing page", () => {
    expect(
      resolveRedirect({ path: "/today", isAuthed: false, hasConsented: false, hasOnboarded: false }),
    ).toBe("/?next=%2Ftoday");
  });

  it("leaves a signed-out visitor on the landing page", () => {
    expect(
      resolveRedirect({ path: "/", isAuthed: false, hasConsented: false, hasOnboarded: false }),
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

  it("sends a signed-in user without consent to the consent screen", () => {
    expect(
      resolveRedirect({ path: "/today", isAuthed: true, hasConsented: false, hasOnboarded: false }),
    ).toBe("/consent");
  });

  it("keeps a user without consent on the consent screen", () => {
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

  it("lets a consented user without a profile see the onboarding intro", () => {
    expect(
      resolveRedirect({ path: "/onboarding/intro", isAuthed: true, hasConsented: true, hasOnboarded: false }),
    ).toBeNull();
  });

  it("sends a fully onboarded user away from the landing page to Today", () => {
    expect(resolveRedirect({ path: "/", ...authed })).toBe("/today");
  });

  it("sends a fully onboarded user away from sign-up to Today", () => {
    expect(resolveRedirect({ path: "/signup", ...authed })).toBe("/today");
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
    ).toBe("/?next=%2Fcare%2Fsummary");
  });

  it("never builds a next parameter pointing at an external host", () => {
    expect(
      resolveRedirect({ path: "//evil.example.com", isAuthed: false, hasConsented: false, hasOnboarded: false }),
    ).toBe("/");
  });
});
