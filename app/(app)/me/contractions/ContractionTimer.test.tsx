import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ContractionTimer, type ContractionTimerProps } from "@/app/(app)/me/contractions/ContractionTimer";
import { EVENTS } from "@/lib/analytics/events";
import en from "@/i18n/en.json";

vi.mock("@/components/AnalyticsProvider", () => ({ track: vi.fn() }));
vi.mock("@/lib/pwa/useOnline", () => ({ useOnline: () => mockOnline }));

let mockOnline = true;

const baseProps: ContractionTimerProps = {
  session: { id: "s1", contractions: [], isNew: true },
  week: 38,
  onStartContraction: vi.fn().mockResolvedValue({ ok: true, contraction: { id: "c1", startedAt: new Date().toISOString(), durationSeconds: null } }),
  onStopContraction: vi.fn().mockResolvedValue({ ok: true, contraction: { id: "c1", startedAt: new Date().toISOString(), durationSeconds: 60 } }),
};

function renderTimer(overrides: Partial<ContractionTimerProps> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Kolkata">
      <ContractionTimer {...baseProps} {...overrides} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  mockOnline = true;
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ContractionTimer", () => {
  it("starting then stopping produces one contraction with a duration", async () => {
    const startedAt = new Date("2026-11-20T02:00:00.000Z").toISOString();
    const onStartContraction = vi.fn().mockResolvedValue({ ok: true, contraction: { id: "c1", startedAt, durationSeconds: null } });
    const onStopContraction = vi.fn().mockResolvedValue({ ok: true, contraction: { id: "c1", startedAt, durationSeconds: 60 } });
    renderTimer({ onStartContraction, onStopContraction });

    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /stop/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /stop/i }));
    await waitFor(() => expect(onStopContraction).toHaveBeenCalledWith("c1", startedAt));
    await waitFor(() => expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument());
  });

  it("derives elapsed time from the stored timestamp, not a running counter, surviving unmount and remount", async () => {
    vi.useFakeTimers();
    const startedAt = new Date("2026-11-20T02:00:00.000Z").toISOString();
    vi.setSystemTime(new Date(startedAt));

    const { unmount } = renderTimer({
      session: { id: "s1", contractions: [{ id: "c1", startedAt, durationSeconds: null }], isNew: false },
    });
    expect(screen.getByText("00:00")).toBeInTheDocument();

    unmount();
    // The phone "slept" for 90 seconds while nothing was mounted to keep a counter ticking.
    vi.setSystemTime(new Date(new Date(startedAt).getTime() + 90_000));

    renderTimer({
      session: { id: "s1", contractions: [{ id: "c1", startedAt, durationSeconds: null }], isNew: false },
    });
    expect(screen.getByText("01:30")).toBeInTheDocument();
  });

  it("renders a never-stopped contraction as in progress without corrupting the averages", () => {
    renderTimer({
      session: {
        id: "s1",
        contractions: [
          { id: "c0", startedAt: new Date(Date.now() - 10 * 60_000).toISOString(), durationSeconds: 50 },
          { id: "c1", startedAt: new Date().toISOString(), durationSeconds: null },
        ],
        isNew: false,
      },
    });
    expect(screen.getByRole("button", { name: /stop/i })).toBeInTheDocument();
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it("renders a null-safe empty state when there are no contractions yet", () => {
    renderTimer();
    expect(screen.getByText(en.me.contractions.emptyState)).toBeInTheDocument();
  });

  it("shows the 5-1-1 note with a disclaimer only when the pattern is met", () => {
    const now = new Date("2026-11-20T03:10:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const fiveOneOne = Array.from({ length: 13 }, (_, i) => ({
      id: `c${i}`,
      startedAt: new Date(now.getTime() - (65 - i * 5) * 60_000).toISOString(),
      durationSeconds: 60,
    }));
    renderTimer({ session: { id: "s1", contractions: fiveOneOne, isNew: false } });
    expect(screen.getByTestId("disclaimer")).toBeInTheDocument();
  });

  it("does not show the 5-1-1 note when the pattern is not met", () => {
    renderTimer({
      session: {
        id: "s1",
        contractions: [{ id: "c1", startedAt: new Date(Date.now() - 5 * 60_000).toISOString(), durationSeconds: 40 }],
        isNew: false,
      },
    });
    expect(screen.queryByTestId("disclaimer")).not.toBeInTheDocument();
  });

  it("resumes an open contraction from an earlier visit as running", () => {
    const startedAt = new Date(Date.now() - 45_000).toISOString();
    renderTimer({
      session: { id: "s1", contractions: [{ id: "c1", startedAt, durationSeconds: null }], isNew: false },
    });
    expect(screen.getByRole("button", { name: /stop/i })).toBeInTheDocument();
  });

  it("refuses to start a contraction while offline and reports offline_write_blocked", async () => {
    const { track } = await import("@/components/AnalyticsProvider");
    mockOnline = false;
    const onStartContraction = vi.fn().mockResolvedValue({ ok: true, contraction: { id: "c1", startedAt: new Date().toISOString(), durationSeconds: null } });
    renderTimer({ onStartContraction });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(onStartContraction).not.toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith(EVENTS.offline_write_blocked, { feature: "contraction" });
  });

  it("refuses to record (stop) a contraction while offline and reports offline_write_blocked", async () => {
    const { track } = await import("@/components/AnalyticsProvider");
    mockOnline = false;
    const onStopContraction = vi.fn();
    renderTimer({
      session: { id: "s1", contractions: [{ id: "c1", startedAt: new Date().toISOString(), durationSeconds: null }], isNew: false },
      onStopContraction,
    });
    fireEvent.click(screen.getByRole("button", { name: /stop/i }));
    expect(onStopContraction).not.toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith(EVENTS.offline_write_blocked, { feature: "contraction" });
  });

  it("emits contraction_session_started with the week only, once, for a new session", async () => {
    const { track } = await import("@/components/AnalyticsProvider");
    renderTimer({ session: { id: "s1", contractions: [], isNew: true }, week: 38 });
    await waitFor(() => expect(track).toHaveBeenCalledWith(EVENTS.contraction_session_started, { week: 38 }));
    expect(track).toHaveBeenCalledTimes(1);
  });

  it("does not emit contraction_session_started when resuming an existing session", async () => {
    const { track } = await import("@/components/AnalyticsProvider");
    renderTimer({ session: { id: "s1", contractions: [], isNew: false }, week: 38 });
    expect(track).not.toHaveBeenCalledWith(EVENTS.contraction_session_started, expect.anything());
  });
});
