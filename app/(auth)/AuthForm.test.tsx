import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/en.json";
import { AuthForm } from "@/app/(auth)/AuthForm";

const sendOtp = vi.fn();
const verifyOtp = vi.fn();
const startGoogle = vi.fn();

function renderForm(mode: "signup" | "signin" = "signup") {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AuthForm mode={mode} onSendOtp={sendOtp} onVerifyOtp={verifyOtp} onGoogle={startGoogle} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  sendOtp.mockReset().mockResolvedValue({ ok: true });
  verifyOtp.mockReset().mockResolvedValue({ ok: true });
  startGoogle.mockReset();
});

describe("AuthForm", () => {
  it("asks for an email first", () => {
    renderForm();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("type", "email");
  });

  it("refuses to send a code to an address that is not an email", async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(sendOtp).not.toHaveBeenCalled();
    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
  });

  it("moves to the code step after sending", async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "her@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(await screen.findByLabelText(/6-digit code/i)).toBeInTheDocument();
  });

  it("tells her the code expired, specifically, not just that something failed", async () => {
    verifyOtp.mockResolvedValue({ ok: false, code: "expired" });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "her@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    await userEvent.type(await screen.findByLabelText(/6-digit code/i), "123456");
    await userEvent.click(screen.getByRole("button", { name: /verify/i }));
    expect(await screen.findByText(/that code has expired/i)).toBeInTheDocument();
  });

  it("tells her the code was wrong, separately from expiry", async () => {
    verifyOtp.mockResolvedValue({ ok: false, code: "invalid_code" });
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "her@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    await userEvent.type(await screen.findByLabelText(/6-digit code/i), "000000");
    await userEvent.click(screen.getByRole("button", { name: /verify/i }));
    expect(await screen.findByText(/that code is not right/i)).toBeInTheDocument();
  });

  it("explains the wait instead of letting her hammer resend", async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "her@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    const resend = await screen.findByRole("button", { name: /resend/i });
    expect(resend).toBeDisabled();
    expect(resend).toHaveAccessibleDescription(/wait/i);
  });

  it("suggests checking the spam folder, because that is the most common real failure", async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "her@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(await screen.findByText(/check your spam folder/i)).toBeInTheDocument();
  });

  it("offers Google as an alternative on both modes", async () => {
    renderForm("signin");
    await userEvent.click(screen.getByRole("button", { name: /continue with google/i }));
    expect(startGoogle).toHaveBeenCalledOnce();
  });

  it("shows a resend failure during the code step, not silently", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderForm();
      await userEvent.type(screen.getByLabelText(/email/i), "her@example.com");
      await userEvent.click(screen.getByRole("button", { name: /send/i }));
      await screen.findByLabelText(/6-digit code/i);

      sendOtp.mockResolvedValueOnce({ ok: false, code: "rate_limited" });
      act(() => void vi.advanceTimersByTime(60_000));

      const resend = screen.getByRole("button", { name: /resend/i });
      expect(resend).toBeEnabled();
      await userEvent.click(resend);

      expect(await screen.findByText(/too many attempts/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("recovers from a network failure sending the code, instead of hanging forever", async () => {
    sendOtp.mockRejectedValueOnce(new Error("network down"));
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "her@example.com");
    const sendButton = screen.getByRole("button", { name: /send/i });
    await userEvent.click(sendButton);

    expect(await screen.findByText(/could not reach the server/i)).toBeInTheDocument();
    expect(sendButton).not.toBeDisabled();
    expect(screen.queryByLabelText(/6-digit code/i)).not.toBeInTheDocument();
  });

  it("recovers from a network failure verifying the code, instead of hanging forever", async () => {
    verifyOtp.mockRejectedValueOnce(new Error("network down"));
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "her@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    await userEvent.type(await screen.findByLabelText(/6-digit code/i), "123456");
    const verifyButton = screen.getByRole("button", { name: /verify/i });
    await userEvent.click(verifyButton);

    expect(await screen.findByText(/could not reach the server/i)).toBeInTheDocument();
    expect(verifyButton).not.toBeDisabled();
  });

  it("confirms she is signed in after a successful verify, without navigating anywhere", async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/email/i), "her@example.com");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    await userEvent.type(await screen.findByLabelText(/6-digit code/i), "123456");
    await userEvent.click(screen.getByRole("button", { name: /verify/i }));

    expect(await screen.findByText(/you are signed in/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/6-digit code/i)).not.toBeInTheDocument();
  });
});
