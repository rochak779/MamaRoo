import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { Start } from "@/app/(public)/start/Start";
import { PRODUCT_NAME } from "@/lib/config";
import en from "@/i18n/en.json";
import hi from "@/i18n/hi.json";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function renderScreen(next: string | null = null, locale: "en" | "hi" = "en") {
  const messages = locale === "hi" ? hi : en;
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Start next={next} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  push.mockReset();
});

describe("Start", () => {
  it("renders the supplied welcome content through the selected locale", () => {
    renderScreen();

    expect(screen.getByRole("img", { name: `${PRODUCT_NAME} logo` })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: `Welcome to ${PRODUCT_NAME}` })).toBeInTheDocument();
    expect(screen.getByText("Your pregnancy journey, made a little easier.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Follow your baby's growth, understand the changes in your body, and keep everything important in one calm place.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "You do not have to figure it all out today. We will take it one day at a time, together.",
      ),
    ).toBeInTheDocument();
  });

  it("renders Hindi copy after Hindi was selected", () => {
    renderScreen(null, "hi");

    expect(screen.getByRole("heading", { name: `${PRODUCT_NAME} में आपका स्वागत है` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "गर्भावस्था की मेरी यात्रा शुरू करें" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "मेरा खाता पहले से है" })).toBeInTheDocument();
  });

  it("sends a new user to sign up and a returning user to sign in", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByRole("button", { name: "Start my pregnancy journey" }));
    expect(push).toHaveBeenLastCalledWith("/signup");
    await user.click(screen.getByRole("button", { name: "I already have an account" }));
    expect(push).toHaveBeenLastCalledWith("/signin");
  });

  it("carries a deep-link target through both choices", async () => {
    const user = userEvent.setup();
    renderScreen("/care/summary");

    await user.click(screen.getByRole("button", { name: "Start my pregnancy journey" }));
    expect(push).toHaveBeenLastCalledWith("/signup?next=%2Fcare%2Fsummary");
    await user.click(screen.getByRole("button", { name: "I already have an account" }));
    expect(push).toHaveBeenLastCalledWith("/signin?next=%2Fcare%2Fsummary");
  });
});
