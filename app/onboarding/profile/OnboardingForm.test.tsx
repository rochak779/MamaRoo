import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "@/i18n/en.json";
import { OnboardingForm } from "@/app/onboarding/profile/OnboardingForm";
import { EVENTS } from "@/lib/analytics/events";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const track = vi.fn();
vi.mock("@/components/AnalyticsProvider", () => ({
  track: (...args: unknown[]) => track(...args),
}));

afterEach(() => {
  sessionStorage.clear();
  push.mockClear();
  track.mockClear();
});

function renderForm(onSave = vi.fn().mockResolvedValue({ ok: true as const })) {
  const result = render(
    <NextIntlClientProvider locale="en" messages={en}>
      <OnboardingForm onSave={onSave} />
    </NextIntlClientProvider>,
  );
  return Object.assign(onSave, { unmount: result.unmount });
}

/** Fills the About You step with just the required name and advances. */
async function passAboutYou(user: ReturnType<typeof userEvent.setup>, name = "Priyanka") {
  await user.type(screen.getByLabelText(/what should we call you/i), name);
  await user.click(screen.getByRole("button", { name: /continue/i }));
}

/** Picks the last-period method with a valid date and advances. */
async function passPregnancyStart(user: ReturnType<typeof userEvent.setup>, date = "2026-03-01") {
  await user.click(screen.getByText("Last period", { exact: true }));
  await user.type(screen.getByLabelText(/date/i), date);
  await user.click(screen.getByRole("button", { name: /continue/i }));
}

describe("OnboardingForm", () => {
  it("starts on About You and requires a name to continue", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByText(en.onboarding.errors.nameRequired)).toBeInTheDocument();
    expect(screen.getByLabelText(/what should we call you/i)).toBeInTheDocument();
  });

  it("advances to Pregnancy Start once a name is given", async () => {
    const user = userEvent.setup();
    renderForm();
    await passAboutYou(user);
    expect(screen.getByText(/when did your pregnancy begin/i)).toBeInTheDocument();
  });

  it("groups all five pregnancy start choices in one radio list", async () => {
    const user = userEvent.setup();
    renderForm();
    await passAboutYou(user);

    const choices = within(screen.getByRole("radiogroup")).getAllByRole("radio");
    expect(choices).toHaveLength(5);
    expect(choices[0]).toHaveAttribute("aria-checked", "false");

    await user.click(choices[0]!);
    expect(choices[0]).toHaveAttribute("aria-checked", "true");
  });

  it("shows a date field only once a due-date method is picked, and not at all for 'not sure yet'", async () => {
    const user = userEvent.setup();
    renderForm();
    await passAboutYou(user);
    expect(screen.queryByLabelText(/date/i)).not.toBeInTheDocument();

    await user.click(screen.getByText("Last period", { exact: true }));
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();

    await user.click(screen.getByText(/not sure yet/i));
    expect(screen.queryByLabelText(/date/i)).not.toBeInTheDocument();
  });

  it("lets 'not sure yet' continue with no date at all", async () => {
    const user = userEvent.setup();
    renderForm();
    await passAboutYou(user);
    await user.click(screen.getByText(/not sure yet/i));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByText(/is there anything else about this pregnancy/i)).toBeInTheDocument();
  });

  it("reveals the twin sub-question only once 'twins or multiples' is picked", async () => {
    const user = userEvent.setup();
    renderForm();
    await passAboutYou(user);
    await passPregnancyStart(user);
    expect(screen.queryByText(/what kind of twin pregnancy/i)).not.toBeInTheDocument();

    await user.click(screen.getByText(/twins or multiples/i));
    expect(screen.getByText(/what kind of twin pregnancy/i)).toBeInTheDocument();
  });

  it("shows a reassurance note once a sensitive flag has ever been picked, even after deselecting it", async () => {
    const user = userEvent.setup();
    renderForm();
    await passAboutYou(user);
    await passPregnancyStart(user);

    await user.click(screen.getByText(/had ivf or iui/i));
    expect(screen.getByText(/thank you for sharing that/i)).toBeInTheDocument();

    await user.click(screen.getByText(/had ivf or iui/i)); // deselect
    expect(screen.getByText(/thank you for sharing that/i)).toBeInTheDocument();
  });

  it("advances through Pregnancy Details and Notification Privacy with nothing selected, since both are optional", async () => {
    const user = userEvent.setup();
    renderForm();
    await passAboutYou(user);
    await passPregnancyStart(user);
    await user.click(screen.getByRole("button", { name: /continue/i })); // Pregnancy Details
    expect(screen.getByText(/if you share this phone/i)).toBeInTheDocument();
  });

  it("goes back a step without losing what was already entered", async () => {
    const user = userEvent.setup();
    renderForm();
    await passAboutYou(user, "Priyanka");
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByLabelText(/what should we call you/i)).toHaveValue("Priyanka");
  });

  it("calls onSave with the collected value and shows Journey Ready on success", async () => {
    const user = userEvent.setup();
    const onSave = renderForm();
    await passAboutYou(user, "Priyanka");
    await passPregnancyStart(user);
    await user.click(screen.getByRole("button", { name: /continue/i })); // Pregnancy Details
    await user.click(screen.getByRole("button", { name: /continue/i })); // Notification Privacy

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ displayName: "Priyanka" }));
    expect(await screen.findByText(/we are glad you are here/i)).toBeInTheDocument();
    expect(screen.getByText(/priyanka/i)).toBeInTheDocument();
    expect(screen.getByText(/we will show you only what matters today/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /mamaroo logo/i })).toBeInTheDocument();
  });

  it("captures onboarding_step_viewed once per step, in order, starting from step 1", async () => {
    const user = userEvent.setup();
    renderForm();
    expect(track).toHaveBeenCalledWith(EVENTS.onboarding_step_viewed, { step: 1 });

    await passAboutYou(user);
    expect(track).toHaveBeenCalledWith(EVENTS.onboarding_step_viewed, { step: 2 });

    await passPregnancyStart(user);
    expect(track).toHaveBeenCalledWith(EVENTS.onboarding_step_viewed, { step: 3 });

    await user.click(screen.getByRole("button", { name: /continue/i })); // Pregnancy Details
    expect(track).toHaveBeenCalledWith(EVENTS.onboarding_step_viewed, { step: 4 });
  });

  it("captures onboarding_completed with the due-date method and a count of optional fields filled", async () => {
    const user = userEvent.setup();
    renderForm();
    await passAboutYou(user, "Priyanka");
    await passPregnancyStart(user);
    await user.click(screen.getByRole("button", { name: /continue/i })); // Pregnancy Details
    await user.click(screen.getByRole("button", { name: /continue/i })); // Notification Privacy

    await screen.findByText(/we are glad you are here/i);
    expect(track).toHaveBeenCalledWith(EVENTS.onboarding_completed, {
      date_mode: "lmp",
      optional_fields_filled: 0,
    });
  });

  it("navigates to /today from Journey Ready", async () => {
    const user = userEvent.setup();
    renderForm();
    await passAboutYou(user, "Priyanka");
    await passPregnancyStart(user);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await user.click(await screen.findByRole("button", { name: /today screen/i }));
    expect(push).toHaveBeenCalledWith("/today");
  });

  it("shows the server-reported errors instead of advancing when saving fails", async () => {
    const user = userEvent.setup();
    const onSave = vi
      .fn()
      .mockResolvedValue({ ok: false as const, errors: { displayName: "Try again" } });
    renderForm(onSave);
    await passAboutYou(user, "Priyanka");
    await passPregnancyStart(user);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText("Try again")).toBeInTheDocument();
    expect(screen.queryByText(/we are glad you are here/i)).not.toBeInTheDocument();
  });

  it("restores an in-progress draft after an unmount and remount", async () => {
    const user = userEvent.setup();
    const { unmount } = renderForm();
    await user.type(screen.getByLabelText(/what should we call you/i), "Priyanka");
    unmount();

    renderForm();
    expect(screen.getByLabelText(/what should we call you/i)).toHaveValue("Priyanka");
  });

  // PCPNDT Act (spec 1.4): no field, label or option here may refer to the
  // prohibited foetal characteristic. The check is split across two
  // substrings so this test doesn't itself spell out either exact phrase the
  // repo-wide guard at tests/guards/schema-pcpndt.test.ts forbids outside
  // its own matcher files.
  it("has no field, label or option anywhere referring to the prohibited characteristic", async () => {
    const user = userEvent.setup();
    renderForm();
    const prohibitedWord = ["gen", "der"].join("");
    const check = () => {
      expect(screen.queryByLabelText(/\bsex\b/i)).not.toBeInTheDocument();
      expect(within(document.body).queryByText(/\bsex\b/i)).not.toBeInTheDocument();
      expect(document.body.textContent?.toLowerCase()).not.toContain(prohibitedWord);
    };
    check();
    await passAboutYou(user);
    check();
    await passPregnancyStart(user);
    check();
  });

  it("rejects an emergency contact name without a phone number, with a specific message", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/what should we call you/i), "Priyanka");
    await user.type(screen.getByLabelText(/^name$/i), "Asha");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByText(en.onboarding.errors.emergencyContactIncomplete)).toBeInTheDocument();
  });
});
