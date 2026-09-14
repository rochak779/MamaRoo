import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PrivacyScreen, type PrivacyScreenProps } from "@/app/(app)/me/privacy/PrivacyScreen";
import { PRODUCT_NAME } from "@/lib/config";
import en from "@/i18n/en.json";

const interpolated = (template: string) => template.replaceAll("{productName}", PRODUCT_NAME);

const absent = { granted: false, version: null, grantedAt: null };

const baseProps: PrivacyScreenProps = {
  email: "priya@example.com",
  locale: "en",
  consents: {
    terms: { granted: true, version: "2026-09-12", grantedAt: "2026-09-01T00:00:00.000Z" },
    privacy: { granted: true, version: "2026-09-12", grantedAt: "2026-09-01T00:00:00.000Z" },
    optional_data_sharing: { granted: true, version: "2026-09-12", grantedAt: "2026-09-01T00:00:00.000Z" },
    analytics: { ...absent },
  },
  activePregnancyId: "p1",
  onWithdrawConsent: vi.fn().mockResolvedValue({ ok: true }),
  onRequestExport: vi.fn().mockResolvedValue({ ok: true, data: { meta: { generatedAt: "2026-09-14T00:00:00.000Z", schemaVersion: "1" }, tables: { profiles: [] } } }),
  onDeletePregnancyJourney: vi.fn().mockResolvedValue({ ok: true }),
  onSendCode: vi.fn().mockResolvedValue({ ok: true }),
  onVerifyCode: vi.fn().mockResolvedValue({ ok: true }),
  onDeleteAccount: vi.fn().mockResolvedValue({ ok: true }),
  onSignOut: vi.fn().mockResolvedValue(undefined),
};

function renderScreen(overrides: Partial<PrivacyScreenProps> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Kolkata">
      <PrivacyScreen {...baseProps} {...overrides} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  global.URL.createObjectURL = vi.fn(() => "blob:mock");
  global.URL.revokeObjectURL = vi.fn();
});

describe("PrivacyScreen — consent review", () => {
  it("shows terms and privacy as granted with no withdraw control", () => {
    renderScreen();
    const grantedDates = screen.getAllByText(/Agreed on/);
    // terms, privacy, and the currently-granted optional_data_sharing all carry a date.
    expect(grantedDates.length).toBe(3);
    // Once each for terms and privacy, the two required keys.
    expect(screen.getAllByText(interpolated(en.mePrivacy.consentRequiredHint))).toHaveLength(2);
  });

  it("shows a withdraw button for a granted optional key, and none for one never granted", () => {
    renderScreen();
    const withdrawButtons = screen.getAllByRole("button", { name: en.mePrivacy.withdraw });
    // Only optional_data_sharing is currently granted; analytics is absent, so it gets no withdraw control.
    expect(withdrawButtons).toHaveLength(1);
    expect(screen.getByText(en.mePrivacy.consentNotShared)).toBeInTheDocument();
  });

  it("withdrawing an optional consent calls the action and updates the displayed state", async () => {
    const onWithdrawConsent = vi.fn().mockResolvedValue({ ok: true });
    renderScreen({ onWithdrawConsent });

    fireEvent.click(screen.getByRole("button", { name: en.mePrivacy.withdraw }));

    await waitFor(() => expect(onWithdrawConsent).toHaveBeenCalledWith("optional_data_sharing", "en"));
    await waitFor(() => expect(screen.queryByRole("button", { name: en.mePrivacy.withdraw })).not.toBeInTheDocument());
  });

  it("shows an error and keeps the button when withdrawal fails", async () => {
    const onWithdrawConsent = vi.fn().mockResolvedValue({ ok: false, error: "boom" });
    renderScreen({ onWithdrawConsent });

    fireEvent.click(screen.getByRole("button", { name: en.mePrivacy.withdraw }));

    await waitFor(() => expect(screen.getByText(en.mePrivacy.withdrawError)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: en.mePrivacy.withdraw })).toBeInTheDocument();
  });
});

describe("PrivacyScreen — export", () => {
  it("downloads a JSON file of her export on request", async () => {
    const onRequestExport = vi.fn().mockResolvedValue({
      ok: true,
      data: { meta: { generatedAt: "2026-09-14T00:00:00.000Z", schemaVersion: "1" }, tables: { profiles: [{ id: "u1" }] } },
    });
    renderScreen({ onRequestExport });

    fireEvent.click(screen.getByRole("button", { name: en.mePrivacy.exportButton }));

    await waitFor(() => expect(onRequestExport).toHaveBeenCalled());
    await waitFor(() => expect(global.URL.createObjectURL).toHaveBeenCalled());
  });

  it("shows an error when export fails", async () => {
    const onRequestExport = vi.fn().mockResolvedValue({ ok: false, error: "boom" });
    renderScreen({ onRequestExport });

    fireEvent.click(screen.getByRole("button", { name: en.mePrivacy.exportButton }));

    await waitFor(() => expect(screen.getByText(en.mePrivacy.exportError)).toBeInTheDocument());
  });
});

describe("PrivacyScreen — delete pregnancy journey", () => {
  it("does nothing until the confirm sheet is confirmed", () => {
    const onDeletePregnancyJourney = vi.fn();
    renderScreen({ onDeletePregnancyJourney });

    fireEvent.click(screen.getByRole("button", { name: en.mePrivacy.deleteJourneyButton }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onDeletePregnancyJourney).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: en.mePrivacy.cancel }));
    expect(onDeletePregnancyJourney).not.toHaveBeenCalled();
  });

  it("calls the action with the active pregnancy id on confirm", async () => {
    const onDeletePregnancyJourney = vi.fn().mockResolvedValue({ ok: true });
    renderScreen({ onDeletePregnancyJourney, activePregnancyId: "p-42" });

    fireEvent.click(screen.getByRole("button", { name: en.mePrivacy.deleteJourneyButton }));
    fireEvent.click(screen.getByRole("button", { name: en.mePrivacy.deleteJourneyConfirm }));

    await waitFor(() => expect(onDeletePregnancyJourney).toHaveBeenCalledWith("p-42"));
  });

  it("renders no delete-journey card when there is no active pregnancy", () => {
    renderScreen({ activePregnancyId: null });
    expect(screen.queryByRole("button", { name: en.mePrivacy.deleteJourneyButton })).not.toBeInTheDocument();
  });
});

describe("PrivacyScreen — delete account", () => {
  it("walks send code -> verify -> type confirmation word -> delete, then signs out", async () => {
    const onSendCode = vi.fn().mockResolvedValue({ ok: true });
    const onVerifyCode = vi.fn().mockResolvedValue({ ok: true });
    const onDeleteAccount = vi.fn().mockResolvedValue({ ok: true });
    const onSignOut = vi.fn().mockResolvedValue(undefined);
    renderScreen({ onSendCode, onVerifyCode, onDeleteAccount, onSignOut });

    fireEvent.click(screen.getByRole("button", { name: en.mePrivacy.deleteAccountButton }));
    expect(screen.getByText(/priya@example\.com/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: en.mePrivacy.reauthSendCode }));
    await waitFor(() => expect(onSendCode).toHaveBeenCalledWith("priya@example.com"));

    fireEvent.change(await screen.findByLabelText(en.mePrivacy.reauthCodeLabel), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: en.mePrivacy.reauthVerify }));
    await waitFor(() => expect(onVerifyCode).toHaveBeenCalledWith("priya@example.com", "123456"));

    const wordInput = await screen.findByPlaceholderText(en.mePrivacy.confirmDeleteWordPlaceholder);
    fireEvent.change(wordInput, { target: { value: "DELETE" } });
    fireEvent.click(screen.getByRole("button", { name: en.mePrivacy.confirmDeleteButton }));

    await waitFor(() => expect(onDeleteAccount).toHaveBeenCalledWith("DELETE"));
    await waitFor(() => expect(onSignOut).toHaveBeenCalled());
  });

  it("shows an error and stays on the code step when verification fails", async () => {
    const onSendCode = vi.fn().mockResolvedValue({ ok: true });
    const onVerifyCode = vi.fn().mockResolvedValue({ ok: false, code: "invalid_code" });
    renderScreen({ onSendCode, onVerifyCode });

    fireEvent.click(screen.getByRole("button", { name: en.mePrivacy.deleteAccountButton }));
    fireEvent.click(screen.getByRole("button", { name: en.mePrivacy.reauthSendCode }));
    fireEvent.change(await screen.findByLabelText(en.mePrivacy.reauthCodeLabel), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: en.mePrivacy.reauthVerify }));

    await waitFor(() => expect(screen.getByText(en.mePrivacy.reauthError)).toBeInTheDocument());
    expect(screen.queryByPlaceholderText(en.mePrivacy.confirmDeleteWordPlaceholder)).not.toBeInTheDocument();
  });

  it("disables the confirm button until the typed word matches exactly (case-insensitively)", async () => {
    renderScreen();

    fireEvent.click(screen.getByRole("button", { name: en.mePrivacy.deleteAccountButton }));
    fireEvent.click(screen.getByRole("button", { name: en.mePrivacy.reauthSendCode }));
    fireEvent.change(await screen.findByLabelText(en.mePrivacy.reauthCodeLabel), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: en.mePrivacy.reauthVerify }));

    const wordInput = await screen.findByPlaceholderText(en.mePrivacy.confirmDeleteWordPlaceholder);
    const confirmButton = screen.getByRole("button", { name: en.mePrivacy.confirmDeleteButton });

    fireEvent.change(wordInput, { target: { value: "delet" } });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(wordInput, { target: { value: "delete" } });
    expect(confirmButton).not.toBeDisabled();
  });
});
