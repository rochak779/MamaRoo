import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PregnancyInfoForm, type PregnancyInfoFormProps } from "@/app/(app)/me/pregnancy/PregnancyInfoForm";
import { ToastProvider } from "@/components/ui/ToastProvider";
import en from "@/i18n/en.json";

let online = true;
vi.mock("@/lib/pwa/useOnline", () => ({ useOnline: () => online }));
const track = vi.fn();
vi.mock("@/components/AnalyticsProvider", () => ({ track: (...args: unknown[]) => track(...args) }));

const initial: PregnancyInfoFormProps["initial"] = {
  dueDate: "2026-12-12",
  dueDateSource: "lmp",
  pregnancyFlags: ["single"],
  twinType: null,
  babyNames: ["Tara"],
  isFirstPregnancy: true,
  prePregnancyWeightKg: 62,
  doctorName: "Dr Priya Sharma",
  clinicName: "Sunrise Clinic",
};

function renderForm(overrides: Partial<PregnancyInfoFormProps> = {}) {
  const props: PregnancyInfoFormProps = {
    initial,
    today: "2026-09-14",
    onSave: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  };
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastProvider>
        <PregnancyInfoForm {...props} />
      </ToastProvider>
    </NextIntlClientProvider>,
  );
  return props;
}

afterEach(() => {
  online = true;
  track.mockClear();
});

describe("PregnancyInfoForm", () => {
  it("prefills the existing pregnancy and profile values", () => {
    renderForm();
    expect(screen.getByLabelText("Due date")).toHaveValue("2026-12-12");
    expect(screen.getByLabelText("Baby name")).toHaveValue("Tara");
    expect(screen.getByLabelText("Pre-pregnancy weight (kg)")).toHaveValue(62);
    expect(screen.getByLabelText("Doctor")).toHaveValue("Dr Priya Sharma");
    expect(screen.getByLabelText("Clinic or hospital")).toHaveValue("Sunrise Clinic");
    expect(screen.getByRole("button", { name: "First pregnancy" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Originally calculated from last period")).toBeInTheDocument();
  });

  it("preserves the onboarding due-date source when saving unrelated details", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue({ ok: true });
    renderForm({ onSave });
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ dueDateSource: "lmp" }));
  });

  it("updates the displayed pregnancy week immediately when the due date changes", async () => {
    const user = userEvent.setup();
    renderForm();
    expect(screen.getByText("Week 27")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Due date"));
    await user.type(screen.getByLabelText("Due date"), "2026-11-28");
    expect(screen.getByText("Week 29")).toBeInTheDocument();
  });

  it("reveals twin details and a second baby-name field when twins are selected", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Twins or multiples" }));
    expect(screen.getByText("What kind of twin pregnancy?")).toBeInTheDocument();
    expect(screen.getByLabelText("Second baby name")).toBeInTheDocument();
  });

  it("saves a due-date correction as scan/manual and all reused values together", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue({ ok: true });
    renderForm({ onSave });
    await user.click(screen.getByRole("button", { name: "From a scan" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({
      dueDate: "2026-12-12",
      dueDateSource: "scan",
      pregnancyFlags: ["single"],
      twinType: null,
      babyNames: ["Tara"],
      isFirstPregnancy: true,
      prePregnancyWeightKg: "62",
      doctorName: "Dr Priya Sharma",
      clinicName: "Sunrise Clinic",
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Saved");
  });

  it("refuses saving while offline", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    online = false;
    renderForm({ onSave });
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/offline/i);
  });
});
