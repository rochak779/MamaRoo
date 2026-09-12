import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/en.json";
import { ConsentForm } from "@/app/(auth)/consent/ConsentForm";

const onSubmit = vi.fn();

function renderForm() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ConsentForm onSubmit={onSubmit} onLocaleChange={vi.fn()} locale="en" />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => onSubmit.mockReset().mockResolvedValue(undefined));

describe("ConsentForm", () => {
  it("shows a plain-language summary above the full text", () => {
    renderForm();
    const summary = screen.getByTestId("consent-summary");
    const full = screen.getByTestId("consent-links");
    expect(summary.compareDocumentPosition(full) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("starts with every optional consent unchecked", () => {
    renderForm();
    expect(screen.getByRole("checkbox", { name: /share with my doctor/i })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /help improve the app/i })).not.toBeChecked();
  });

  it("keeps the optional consents separate from the required one", () => {
    renderForm();
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("blocks continuing until the required consent is given, and explains why", async () => {
    renderForm();
    const submit = screen.getByRole("button", { name: /agree and continue/i });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAccessibleDescription(/agree to the terms/i);
    await userEvent.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits exactly the consents she chose", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("checkbox", { name: /i agree to the terms/i }));
    await userEvent.click(screen.getByRole("checkbox", { name: /help improve the app/i }));
    await userEvent.click(screen.getByRole("button", { name: /agree and continue/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      baseline: true,
      optionalDataSharing: false,
      analytics: true,
    });
  });

  it("offers the language switcher, because consent language matters most here", () => {
    renderForm();
    expect(screen.getByRole("button", { name: "हिंदी" })).toBeInTheDocument();
  });

  it("renders no illustration and no motif, per the restrained register", () => {
    renderForm();
    expect(screen.queryByTestId("texture-motif")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("makes the policy links tertiary, not competing with the primary action", () => {
    renderForm();
    expect(screen.getByRole("link", { name: /privacy policy/i }).className).not.toContain("bg-accent-primary");
  });
});
