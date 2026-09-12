import { expect, test } from "@playwright/test";

// Same constraint as tests/e2e/auth.spec.ts: this environment has no local
// Supabase (no Docker), so there is no Inbucket to read a real emailed OTP
// code from. A real sign-in through to the onboarding form and Journey Ready
// is therefore not exercised here -- that path is covered at the logic level
// by lib/domain/onboarding.test.ts (validation, due-date derivation),
// app/actions/onboarding.test.ts (the server write) and
// app/(onboarding)/profile/OnboardingForm.test.tsx (the wizard's own
// step-by-step behavior, draft persistence and Journey Ready screen). What
// this asserts instead is the reachable, unauthenticated part of the funnel.

test("the welcome entry screen offers starting a journey and signing in to an existing one", async ({ page }) => {
  await page.goto("/start");
  await expect(page.getByRole("button", { name: /start my pregnancy journey/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /already have an account/i })).toBeVisible();
});

test("starting a journey from the welcome screen leads to sign-up", async ({ page }) => {
  await page.goto("/start");
  await page.getByRole("button", { name: /start my pregnancy journey/i }).click();
  await expect(page).toHaveURL(/\/signup$/);
});

test("choosing 'I already have an account' from the welcome screen leads to sign-in", async ({ page }) => {
  await page.goto("/start");
  await page.getByRole("button", { name: /already have an account/i }).click();
  await expect(page).toHaveURL(/\/signin$/);
});

test("a signed-out deep link to the onboarding form redirects to language select, preserving the original path", async ({
  page,
}) => {
  await page.goto("/onboarding/profile");
  await expect(page).toHaveURL(/\/welcome\?next=%2Fonboarding%2Fprofile$/);
});
