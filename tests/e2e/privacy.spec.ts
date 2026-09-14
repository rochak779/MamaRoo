import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { admin, createOnboardedSession, type OnboardedFixture } from "./helpers/todaySession";

async function grantConsents(userId: string, optionalDataSharing = true) {
  const { error } = await admin.from("consents").insert([
    { user_id: userId, consent_key: "terms", granted: true, version: "v1", locale: "en" },
    { user_id: userId, consent_key: "privacy", granted: true, version: "v1", locale: "en" },
    { user_id: userId, consent_key: "optional_data_sharing", granted: optionalDataSharing, version: "v1", locale: "en" },
    { user_id: userId, consent_key: "analytics", granted: false, version: "v1", locale: "en" },
  ]);
  expect(error).toBeNull();
}

test.describe("Privacy and data", () => {
  let fixture: OnboardedFixture | undefined;

  test.afterEach(async () => {
    await fixture?.cleanup();
    fixture = undefined;
  });

  test("shows consent status, has no accessibility violations, and lets her withdraw an optional consent", async ({
    page,
    context,
    baseURL,
  }) => {
    fixture = await createOnboardedSession({ baseURL: baseURL! });
    await grantConsents(fixture.userId);
    await context.addCookies(fixture.cookies);

    await page.goto("/me/privacy");
    await expect(page.getByText("Terms of service")).toBeVisible();
    await expect(page.getByText("Withdrawing this means deleting your account below.")).toHaveCount(2);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);

    await page.getByRole("button", { name: "Withdraw" }).click();
    await expect(page.getByRole("button", { name: "Withdraw" })).toHaveCount(0);

    const row = await admin
      .from("consents")
      .select("granted")
      .eq("user_id", fixture.userId)
      .eq("consent_key", "optional_data_sharing")
      .order("granted_at", { ascending: false })
      .limit(1)
      .single();
    expect(row.data?.granted).toBe(false);
  });

  test("downloads her data as a JSON file", async ({ page, context, baseURL }) => {
    fixture = await createOnboardedSession({ baseURL: baseURL! });
    await grantConsents(fixture.userId);
    await context.addCookies(fixture.cookies);

    await page.goto("/me/privacy");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download my information" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^mamaroo-export-\d{4}-\d{2}-\d{2}\.json$/);
  });

  test("deletes the pregnancy journey but keeps the account and her letters", async ({ page, context, baseURL }) => {
    fixture = await createOnboardedSession({ baseURL: baseURL! });
    await grantConsents(fixture.userId);
    const pregnancy = await admin.from("pregnancies").select("id").eq("user_id", fixture.userId).single();
    const pregnancyId = pregnancy.data!.id;
    await admin
      .from("letters")
      .insert({ user_id: fixture.userId, pregnancy_id: pregnancyId, gestational_week: 20, body: "Dear little one," });
    await context.addCookies(fixture.cookies);

    await page.goto("/me/privacy");
    await page.getByRole("button", { name: "Delete pregnancy journey" }).click();
    await page.getByRole("button", { name: "Yes, delete this journey" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const remainingPregnancy = await admin.from("pregnancies").select("id").eq("id", pregnancyId).maybeSingle();
    expect(remainingPregnancy.data).toBeNull();

    const letters = await admin.from("letters").select("id, pregnancy_id").eq("user_id", fixture.userId);
    expect(letters.data).toHaveLength(1);
    expect(letters.data![0]!.pregnancy_id).toBeNull();

    const profile = await admin.from("profiles").select("id").eq("id", fixture.userId).maybeSingle();
    expect(profile.data).not.toBeNull();
  });

  test("delete account starts with a re-authentication step, not an immediate destructive action", async ({
    page,
    context,
    baseURL,
  }) => {
    fixture = await createOnboardedSession({ baseURL: baseURL! });
    await grantConsents(fixture.userId);
    await context.addCookies(fixture.cookies);

    await page.goto("/me/privacy");
    await page.getByRole("button", { name: "Delete account" }).click();

    await expect(page.getByRole("dialog", { name: "Confirm it's you" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Yes, delete my account" })).toHaveCount(0);

    const profile = await admin.from("profiles").select("id").eq("id", fixture.userId).maybeSingle();
    expect(profile.data).not.toBeNull();
  });
});
