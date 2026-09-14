import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { MeHub } from "@/app/(app)/me/MeHub";
import en from "@/i18n/en.json";

function renderHub(onSignOut = vi.fn().mockResolvedValue(undefined)) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <MeHub displayName="Aarti" week={24} onSignOut={onSignOut} />
    </NextIntlClientProvider>,
  );
  return onSignOut;
}

describe("MeHub", () => {
  it("personalizes the summary and wires every owned destination up front", () => {
    renderHub();
    expect(screen.getByText("Aarti, week 24")).toBeInTheDocument();

    const links = [
      ["Personal info", "/me/personal"],
      ["Pregnancy info", "/me/pregnancy"],
      ["Pregnancy preparation", "/me/prep"],
      ["Notifications", "/me/notifications"],
      ["Privacy and data", "/me/privacy"],
      ["Contraction timer", "/me/contractions"],
    ] as const;
    for (const [name, href] of links) {
      expect(screen.getByRole("link", { name: new RegExp(name, "i") })).toHaveAttribute("href", href);
    }
  });

  it("does not render the unscoped Support row", () => {
    renderHub();
    expect(screen.queryByText("Support")).not.toBeInTheDocument();
  });

  it("requires confirmation before signing out", async () => {
    const user = userEvent.setup();
    const onSignOut = renderHub();
    await user.click(screen.getByRole("button", { name: "Log out" }));
    expect(onSignOut).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: /are you sure/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Log out" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Log out" }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });
});
