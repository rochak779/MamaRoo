import { expect, test } from "@playwright/test";

// Step 12 of the plan (Session 12) asks for a fourth assertion here: "/consent is
// reached after a successful sign-in", verified by reading the OTP code out of
// Supabase's local Inbucket (127.0.0.1:54324) and completing a real sign-in. This
// environment has no local Supabase (no Docker), so there is no Inbucket to read a
// real emailed code from, and this spec does not fake or stub a real OTP completion
// -- that would verify nothing real. That path is already covered at the logic
// level by lib/domain/routing.test.ts ("sends a signed-in user without consent to
// the consent screen") and by app/(auth)/AuthForm.test.tsx (the verify step calling
// onVerifyOtp and reacting to its result). Only the three assertions below, which
// do not require reading a real emailed code, are covered here.

// This deliberately does not claim to cover the real root page ("/"): that route is
// a separate, pre-existing pre-launch waitlist page (components/landing/
// ComingSoon.tsx, gated by the launch flag in proxy.ts) that this session does not
// touch -- redesigning its already-tuned, pixel-budget-tested layout to add sign-up
// and sign-in entry points is a visual-design task outside this scaffold-only auth
// session's scope, and risky to do blind against its tight per-breakpoint height
// budgets. That root-page gap is a product-scope question for the product owner,
// not something this test pretends to answer. What this asserts instead: the
// sign-up screen itself offers signing up (it IS the sign-up form) and offers
// signing in (a visible switch link), so both are reachable from one screen.
test("the sign-up screen offers both sign-up and a path to sign-in", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
  await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
});

test("submitting an email on the auth form shows the code step", async ({ page }) => {
  await page.goto("/signup");
  // @rls.test matches the domain tests/rls/helpers.ts already uses for throwaway
  // accounts against the live project. example.com and similar RFC 2606 reserved
  // domains are rejected by Supabase's own email validation before an OTP is even
  // attempted, which would make this a test of the wrong thing.
  await page.getByLabel(/email/i).fill(`e2e-${Date.now()}@rls.test`);
  await page.getByRole("button", { name: /send code/i }).click();
  await expect(page.getByLabel(/6-digit code/i)).toBeVisible();
});

test("a signed-out deep link to /today redirects to / with a next query param preserving the original path", async ({
  page,
}) => {
  await page.goto("/today");
  await expect(page).toHaveURL(/\/\?next=%2Ftoday$/);
});

// startGoogleSignIn() and app/auth/callback/route.ts both redirect a failed Google
// sign-in to /signin?error=... . Before this fix neither page read that param, so
// she landed back on a blank form with no explanation at all.
test("a failed Google sign-in redirect explains what happened, instead of a blank form", async ({ page }) => {
  await page.goto("/signin?error=google");
  // Not getByRole("alert"): Next.js's own route announcer
  // (#__next-route-announcer__) also carries role="alert", so that query
  // resolves to two elements. The message text itself is unambiguous.
  await expect(page.getByText(/google sign-in did not work/i)).toBeVisible();
});
