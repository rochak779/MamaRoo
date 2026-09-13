import { expect, test } from "@playwright/test";
import { admin, createOnboardedSession, type OnboardedFixture } from "./helpers/todaySession";

// Seeds two medicines, one appointment, one advice entry and two vitals for a
// real onboarded user (see helpers/todaySession.ts), then opens the printable
// Doctor Visit Summary and asserts every value renders -- against real,
// RLS-scoped Supabase data, the same way she would see it.

test.describe("Doctor Visit Summary", () => {
  let fixture: OnboardedFixture | undefined;

  test.afterEach(async () => {
    await fixture?.cleanup();
    fixture = undefined;
  });

  test("shows every seeded value, then hides navigation and chrome under print media", async ({ page, context, baseURL }) => {
    fixture = await createOnboardedSession({ baseURL: baseURL! });
    const userId = fixture.userId;

    const { error: medicinesError } = await admin.from("medicines").insert([
      {
        user_id: userId,
        name: "Iron and folic acid",
        dosage: "1 tablet",
        schedule_times: ["21:00:00"],
        start_date: "2026-01-01",
        is_active: true,
      },
      {
        user_id: userId,
        name: "Calcium",
        dosage: "1 tablet",
        schedule_times: ["21:00:00"],
        start_date: "2026-01-01",
        is_active: true,
      },
    ]);
    expect(medicinesError).toBeNull();

    const { error: appointmentError } = await admin.from("appointments").insert({
      user_id: userId,
      title: "Checkup",
      doctor_name: "Dr. Priya Sharma",
      clinic_name: "Sunrise Clinic",
      scheduled_at: "2026-09-24T09:00:00.000Z",
      status: "upcoming",
    });
    expect(appointmentError).toBeNull();

    const { data: advice, error: adviceError } = await admin
      .from("doctor_advice")
      .insert({ user_id: userId, type: "other", is_reminder: false })
      .select("id")
      .single();
    expect(adviceError).toBeNull();
    const { error: adviceUpdateError } = await admin.from("doctor_advice_updates").insert({
      user_id: userId,
      advice_id: advice!.id,
      body: "Rest well and stay hydrated",
      doctor_name: "Dr. Priya Sharma",
      input_method: "text",
    });
    expect(adviceUpdateError).toBeNull();

    const { error: vitalsError } = await admin.from("vitals").insert([
      { user_id: userId, measured_on: "2026-09-08", kind: "weight", value_1: 61 },
      { user_id: userId, measured_on: "2026-09-12", kind: "bp", value_1: 121, value_2: 79 },
    ]);
    expect(vitalsError).toBeNull();

    await context.addCookies(fixture.cookies);
    await page.goto("/care/summary");
    await page.getByText("Generate my summary").click();

    await expect(page.getByText("Iron and folic acid", { exact: false })).toBeVisible();
    await expect(page.getByText("Calcium", { exact: false })).toBeVisible();
    await expect(page.getByText("Dr. Priya Sharma, Sunrise Clinic", { exact: false })).toBeVisible();
    await expect(page.getByText("Rest well and stay hydrated")).toBeVisible();
    await expect(page.getByText("61 kg", { exact: false })).toBeVisible();
    await expect(page.getByText("121/79", { exact: false })).toBeVisible();
    await expect(page.getByText("has not been medically verified", { exact: false })).toBeVisible();

    await page.emulateMedia({ media: "print" });
    await expect(page.locator("nav")).toBeHidden();
    await expect(page.getByText("Generate my summary").or(page.getByRole("button", { name: "PDF" }))).toBeHidden();
    await expect(page.getByText("Iron and folic acid", { exact: false })).toBeVisible();
  });
});
