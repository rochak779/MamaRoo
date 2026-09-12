import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageSelect } from "@/app/(public)/welcome/LanguageSelect";
import { EVENTS } from "@/lib/analytics/events";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const track = vi.fn();
vi.mock("@/components/AnalyticsProvider", () => ({ track: (...args: unknown[]) => track(...args) }));

const onChooseLocale = vi.fn();

function renderScreen(next: string | null = null) {
  return render(<LanguageSelect next={next} onChooseLocale={onChooseLocale} />);
}

beforeEach(() => {
  push.mockReset();
  onChooseLocale.mockReset();
  track.mockReset();
});

describe("LanguageSelect", () => {
  it("offers Hindi and English, each labelled in its own script, in fixed English chrome", () => {
    renderScreen();
    expect(screen.getByText("Choose your language")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /हिंदी/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /English/ })).toBeInTheDocument();
  });

  it("starts with Continue disabled, since nothing is selected yet", () => {
    renderScreen();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("enables Continue once a language is selected", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole("button", { name: /हिंदी/ }));
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("marks the selected card, and only one at a time", async () => {
    const user = userEvent.setup();
    renderScreen();
    const hindi = screen.getByRole("button", { name: /हिंदी/ });
    const english = screen.getByRole("button", { name: /English/ });
    await user.click(hindi);
    expect(hindi).toHaveAttribute("aria-pressed", "true");
    expect(english).toHaveAttribute("aria-pressed", "false");
    await user.click(english);
    expect(hindi).toHaveAttribute("aria-pressed", "false");
    expect(english).toHaveAttribute("aria-pressed", "true");
  });

  it("commits the chosen locale and advances only once Continue is pressed", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole("button", { name: /हिंदी/ }));
    expect(onChooseLocale).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onChooseLocale).toHaveBeenCalledWith("hi");
    expect(push).toHaveBeenCalledWith("/start");
  });

  it("captures language_chosen with the picked locale", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole("button", { name: /हिंदी/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(track).toHaveBeenCalledWith(EVENTS.language_chosen, { locale: "hi" });
  });

  it("carries a deep-link target through to sign up", async () => {
    const user = userEvent.setup();
    renderScreen("/care/summary");
    await user.click(screen.getByRole("button", { name: /English/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(push).toHaveBeenCalledWith("/start?next=%2Fcare%2Fsummary");
  });
});
