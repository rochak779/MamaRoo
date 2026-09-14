import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { addDays, todayInAppZone } from "@/lib/domain/dates";
import { lmpFromEdd } from "@/lib/domain/pregnancy";
import {
  admin,
  createOnboardedSession,
  type OnboardedFixture,
} from "./helpers/todaySession";

async function grantRequiredConsents(userId: string) {
  const { error } = await admin.from("consents").insert([
    { user_id: userId, consent_key: "terms", granted: true, version: "v1", locale: "en" },
    { user_id: userId, consent_key: "privacy", granted: true, version: "v1", locale: "en" },
  ]);
  expect(error).toBeNull();
}

test.describe("Me hub and everyday settings", () => {
  let fixture: OnboardedFixture | undefined;

  test.afterEach(async () => {
    await fixture?.cleanup();
    fixture = undefined;
  });

  test("links the hub and edits the onboarding-owned profile and pregnancy rows", async ({
    page,
    context,
    baseURL,
  }) => {
    fixture = await createOnboardedSession({ baseURL: baseURL! });
    await grantRequiredConsents(fixture.userId);
    const { error: profileSeedError } = await admin
      .from("profiles")
      .update({
        birth_year: 1998,
        city: "Lucknow",
        height_cm: 164,
        doctor_name: "Dr Priya Sharma",
        clinic_name: "Sunrise Clinic",
      })
      .eq("id", fixture.userId);
    expect(profileSeedError).toBeNull();
    await context.addCookies(fixture.cookies);

    await page.goto("/me");
    await expect(page.getByRole("heading", { name: "More" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Privacy and data/ })).toHaveAttribute("href", "/me/privacy");
    await expect(page.getByText("Support", { exact: true })).toHaveCount(0);

    await page.goto("/me/personal");
    await expect(page.getByLabel("Name")).toHaveValue("Priya");
    // exact: true -- Playwright's getByLabel substring-matches by default, and
    // "Language" (the language-switcher section's own accessible name, below on
    // this same page) contains "age" as a literal substring.
    await expect(page.getByLabel("Age", { exact: true })).toHaveValue(
      String(Number(todayInAppZone().slice(0, 4)) - 1998),
    );
    await expect(page.getByLabel("City")).toHaveValue("Lucknow");
    await page.getByLabel("Mobile number").fill("9876543210");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toContainText("Saved");
    await expect(page.getByRole("link", { name: /Emergency contacts/ })).toHaveAttribute("href", "/me/prep");
    await expect(page.getByLabel("Contact name")).toHaveCount(0);

    const profile = await admin
      .from("profiles")
      .select("display_name,birth_year,city,height_cm,mobile_number")
      .eq("id", fixture.userId)
      .single();
    expect(profile.error).toBeNull();
    expect(profile.data).toMatchObject({
      display_name: "Priya",
      birth_year: 1998,
      city: "Lucknow",
      height_cm: 164,
      mobile_number: "9876543210",
    });

    await page.goto("/me/pregnancy");
    await expect(page.getByText("Originally calculated from last period")).toBeVisible();
    const correctedDueDate = addDays(todayInAppZone(), 120);
    await page.getByLabel("Due date").fill(correctedDueDate);
    await page.getByRole("button", { name: "From a scan" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toContainText("Saved");

    const pregnancy = await admin
      .from("pregnancies")
      .select("edd,edd_source,lmp_date")
      .eq("user_id", fixture.userId)
      .eq("status", "active")
      .single();
    expect(pregnancy.error).toBeNull();
    expect(pregnancy.data).toMatchObject({
      edd: correctedDueDate,
      edd_source: "scan",
      lmp_date: lmpFromEdd(correctedDueDate),
    });
  });

  test("persists notification privacy and has no serious accessibility violations", async ({
    page,
    context,
    baseURL,
  }) => {
    fixture = await createOnboardedSession({ baseURL: baseURL! });
    await grantRequiredConsents(fixture.userId);
    await context.addCookies(fixture.cookies);

    for (const path of ["/me", "/me/personal", "/me/pregnancy", "/me/notifications"]) {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical"))
        .toEqual([]);
    }

    await page.getByRole("button", { name: "Full detail" }).click();
    await expect(page.getByRole("status")).toContainText("Saved");
    const profile = await admin
      .from("profiles")
      .select("notification_privacy")
      .eq("id", fixture.userId)
      .single();
    expect(profile.data?.notification_privacy).toBe("detailed");
  });

  test("persists a language change and refreshes the translated screen", async ({
    page,
    context,
    baseURL,
  }) => {
    fixture = await createOnboardedSession({ baseURL: baseURL! });
    await grantRequiredConsents(fixture.userId);
    await context.addCookies(fixture.cookies);

    await page.goto("/me/personal");
    await page.getByRole("button", { name: "हिंदी" }).click();
    await expect(page.getByRole("heading", { name: "मेरी जानकारी" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "मेरी जानकारी" })).toBeVisible();

    const profile = await admin.from("profiles").select("locale").eq("id", fixture.userId).single();
    expect(profile.data?.locale).toBe("hi");
  });
});
