import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PersonalInfoForm, type PersonalInfoFormProps } from "@/app/(app)/me/personal/PersonalInfoForm";
import { ToastProvider } from "@/components/ui/ToastProvider";
import en from "@/i18n/en.json";

let online = true;
vi.mock("@/lib/pwa/useOnline", () => ({ useOnline: () => online }));
const track = vi.fn();
vi.mock("@/components/AnalyticsProvider", () => ({ track: (...args: unknown[]) => track(...args) }));

const initial: PersonalInfoFormProps["initial"] = {
  displayName: "Aarti",
  birthYear: 1998,
  city: "Lucknow",
  heightCm: 164.5,
  mobileNumber: "9876543210",
  locale: "en",
};

function renderForm(overrides: Partial<PersonalInfoFormProps> = {}) {
  const props: PersonalInfoFormProps = {
    initial,
    today: "2026-09-14",
    onSave: vi.fn().mockResolvedValue({ ok: true }),
    onLocaleChange: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  };
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastProvider>
        <PersonalInfoForm {...props} />
      </ToastProvider>
    </NextIntlClientProvider>,
  );
  return props;
}

afterEach(() => {
  online = true;
  track.mockClear();
});

describe("PersonalInfoForm", () => {
  it("prefills onboarding values and expresses birth_year as age", () => {
    renderForm();
    expect(screen.getByLabelText("Name")).toHaveValue("Aarti");
    expect(screen.getByLabelText("Age")).toHaveValue(28);
    expect(screen.getByLabelText("City")).toHaveValue("Lucknow");
    expect(screen.getByLabelText("Height (cm)")).toHaveValue(164.5);
    expect(screen.getByLabelText("Mobile number")).toHaveValue("9876543210");
  });

  it("replaces emergency-contact inputs with one link to the preparation screen", () => {
    renderForm();
    expect(screen.getByRole("link", { name: /emergency contacts/i })).toHaveAttribute("href", "/me/prep");
    expect(screen.queryByPlaceholderText(/contact name/i)).not.toBeInTheDocument();
  });

  it("saves edits through the action and reports success", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue({ ok: true });
    renderForm({ onSave });
    const name = screen.getByLabelText("Name");
    await user.clear(name);
    await user.type(name, "Priya");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith({
      displayName: "Priya",
      age: "28",
      city: "Lucknow",
      heightCm: "164.5",
      mobileNumber: "9876543210",
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Saved");
  });

  it("renders server field errors beside their inputs", async () => {
    const user = userEvent.setup();
    renderForm({
      onSave: vi.fn().mockResolvedValue({ ok: false, errors: { mobileNumber: "mobile_invalid" } }),
    });
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Enter a 10 digit mobile number.")).toBeInTheDocument();
    expect(screen.getByLabelText("Mobile number")).toHaveAttribute("aria-invalid", "true");
  });

  it("persists a language change", async () => {
    const user = userEvent.setup();
    const onLocaleChange = vi.fn().mockResolvedValue({ ok: true });
    renderForm({ onLocaleChange });
    await user.click(screen.getByRole("button", { name: "हिंदी" }));
    expect(onLocaleChange).toHaveBeenCalledWith("hi");
    expect(await screen.findByRole("status")).toHaveTextContent("Language changed");
  });

  it("refuses profile writes while offline", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    online = false;
    renderForm({ onSave });
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/offline/i);
  });
});
