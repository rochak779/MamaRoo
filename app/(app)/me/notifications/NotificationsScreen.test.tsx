import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsScreen, REMINDER_STORAGE_KEY } from "@/app/(app)/me/notifications/NotificationsScreen";
import { ToastProvider } from "@/components/ui/ToastProvider";
import en from "@/i18n/en.json";

let online = true;
vi.mock("@/lib/pwa/useOnline", () => ({ useOnline: () => online }));
const track = vi.fn();
vi.mock("@/components/AnalyticsProvider", () => ({ track: (...args: unknown[]) => track(...args) }));

const stored = new Map<string, string>();
const storage = {
  getItem: vi.fn((key: string) => stored.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => stored.set(key, value)),
  removeItem: vi.fn((key: string) => stored.delete(key)),
  clear: vi.fn(() => stored.clear()),
  key: vi.fn((index: number) => [...stored.keys()][index] ?? null),
  get length() { return stored.size; },
};

beforeEach(() => {
  vi.stubGlobal("localStorage", storage);
});

function renderScreen(onSavePrivacy = vi.fn().mockResolvedValue({ ok: true })) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastProvider>
        <NotificationsScreen initialPrivacy="detailed" onSavePrivacy={onSavePrivacy} />
      </ToastProvider>
    </NextIntlClientProvider>,
  );
  return onSavePrivacy;
}

afterEach(() => {
  online = true;
  localStorage.clear();
  vi.unstubAllGlobals();
  track.mockClear();
});

describe("NotificationsScreen", () => {
  it("prefills lock-screen wording from the profile and renders accessible reminder switches", () => {
    renderScreen();
    expect(screen.getByRole("button", { name: "Show full detail" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Iron tablet, 9:00 PM")).toBeInTheDocument();
    expect(screen.getAllByRole("switch")).toHaveLength(3);
  });

  it("persists reminder toggles on this device and restores them", async () => {
    const user = userEvent.setup();
    const first = renderScreen();
    await user.click(screen.getByRole("switch", { name: "Medicine reminders" }));
    expect(JSON.parse(localStorage.getItem(REMINDER_STORAGE_KEY) ?? "{}")).toMatchObject({ medicine: false });
    first.mockClear();
  });

  it("explains when every reminder is off", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole("switch", { name: "Medicine reminders" }));
    await user.click(screen.getByRole("switch", { name: "Appointment reminders" }));
    expect(screen.getByText(/all reminders are off/i)).toBeInTheDocument();
  });

  it("persists privacy immediately and updates the preview", async () => {
    const user = userEvent.setup();
    const onSave = renderScreen();
    await user.click(screen.getByRole("button", { name: "Keep it private" }));
    expect(onSave).toHaveBeenCalledWith("private");
    expect(screen.getByText("Reminder", { selector: "p" })).toBeInTheDocument();
  });

  it("refuses a privacy write while offline and keeps the previous selection", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    online = false;
    renderScreen(onSave);
    await user.click(screen.getByRole("button", { name: "Keep it private" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Show full detail" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(/offline/i);
  });
});
