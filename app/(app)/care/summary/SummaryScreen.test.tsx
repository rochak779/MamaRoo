import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SummaryScreen } from "@/app/(app)/care/summary/SummaryScreen";
import { EVENTS } from "@/lib/analytics/events";
import type { SummaryModel } from "@/lib/domain/summary";
import en from "@/i18n/en.json";

const track = vi.fn();
vi.mock("@/components/AnalyticsProvider", () => ({ track: (...args: unknown[]) => track(...args) }));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const useOnline = vi.fn(() => true);
vi.mock("@/lib/pwa/useOnline", () => ({ useOnline: () => useOnline() }));

function model(): SummaryModel {
  return {
    header: { name: "Aarti Verma", week: 24, day: 3, edd: "2026-12-12", doctorName: null, clinicName: null },
    circumstances: { multiplicity: "single", twinType: null, isIvf: false, hasComplication: false },
    medicines: [],
    lastAppointment: null,
    nextAppointment: null,
    advice: [],
    adviceRemainderCount: 0,
    careTasks: [],
    vitals: { weight: null, bloodPressure: [] },
    reports: [],
    checkins: [],
    markedQuestions: [],
    provenanceKey: "provenanceLine",
  };
}

function renderScreen() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SummaryScreen model={model()} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  track.mockClear();
  refresh.mockClear();
  useOnline.mockReturnValue(true);
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("SummaryScreen", () => {
  it("starts idle, showing the generate prompt rather than the document", () => {
    renderScreen();
    expect(screen.getByText("This pulls together everything I have tracked, ready to show my doctor.")).toBeInTheDocument();
    expect(screen.queryByTestId("summary-screen")?.textContent).not.toContain("Pregnancy circumstances");
  });

  it("moves idle -> generating -> ready when 'Generate my summary' is tapped, then tracks summary_viewed with the week only", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getByText("Generate my summary"));
    expect(screen.getByText("Putting it all together")).toBeInTheDocument();

    await act(async () => {
      void vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("Pregnancy circumstances")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith(EVENTS.summary_viewed, { week: 24 });
  });

  it("calls window.print and tracks summary_printed when the PDF action is used", async () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByText("Generate my summary"));
    await act(async () => {
      void vi.advanceTimersByTime(1000);
    });

    await user.click(screen.getByText("PDF"));

    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith(EVENTS.summary_printed, { week: 24 });
  });

  it("shows the offline note instead of sharing when WhatsApp is tapped while offline", async () => {
    useOnline.mockReturnValue(false);
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByText("Generate my summary"));
    await act(async () => {
      void vi.advanceTimersByTime(1000);
    });

    await user.click(screen.getByText("WhatsApp"));

    expect(
      screen.getByText("WhatsApp needs the internet to send. Viewing here or downloading as a PDF still works without it."),
    ).toBeInTheDocument();
  });

  it("re-fetches server data and re-shows the generating state when Refresh is tapped", async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByText("Generate my summary"));
    await act(async () => {
      void vi.advanceTimersByTime(1000);
    });

    await user.click(screen.getByText("Refresh"));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Putting it all together")).toBeInTheDocument();
  });
});
