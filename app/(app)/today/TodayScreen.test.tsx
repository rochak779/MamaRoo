import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { TodayScreen, type TodayScreenProps } from "@/app/(app)/today/TodayScreen";
import en from "@/i18n/en.json";
import type { Transcriber } from "@/lib/speech/transcribe";

vi.mock("@/components/AnalyticsProvider", () => ({ track: vi.fn() }));

const unavailableTranscriber: Transcriber = { isAvailable: () => false, start: () => () => {} };
const availableTranscriber: Transcriber = { isAvailable: () => true, start: () => () => {} };

const baseProps: TodayScreenProps = {
  displayName: "Priya",
  week: 24,
  babyCount: 1,
  isPostTerm: false,
  stage: { lottieUrl: "/stage-6.json", staticSrc: "/stage-6.svg" },
  reminders: [],
  reading: [],
  showWeeklyReflection: false,
  weeklyReflectionText: "",
  showCheckupNudge: false,
  transcriber: unavailableTranscriber,
  onSubmitCheckin: vi.fn().mockResolvedValue({ ok: true, severity: null, guidance: null }),
  mealPreviewKey: "weeklyMealPlan.monday.breakfast",
  doctorName: null,
  clinicName: null,
};

function renderScreen(overrides: Partial<TodayScreenProps> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Kolkata">
      <TodayScreen {...baseProps} {...overrides} />
    </NextIntlClientProvider>,
  );
}

describe("TodayScreen", () => {
  it("greets her by name and shows her week", () => {
    renderScreen();
    expect(screen.getByText(/Priya/)).toBeInTheDocument();
    expect(screen.getByText(/24/)).toBeInTheDocument();
  });

  it("renders one baby illustration for a single pregnancy", () => {
    renderScreen({ babyCount: 1 });
    const illustrations = screen.getAllByRole("img");
    expect(illustrations).toHaveLength(1);
    expect(illustrations[0]).toHaveAccessibleName(/week 24/i);
  });

  it("renders two baby illustrations for a twin pregnancy, with plural alt text", () => {
    renderScreen({ babyCount: 2 });
    const illustrations = screen.getAllByRole("img");
    expect(illustrations).toHaveLength(2);
    expect(illustrations[0]).toHaveAccessibleName(/babies/i);
  });

  it("shows only the most pressing reminder, with gentle wording", () => {
    renderScreen({
      reminders: [
        { kind: "dose", refId: "m1", medicineName: "Iron tablet", scheduledTime: "20:00", isOverdue: true },
        { kind: "appointment", refId: "a1", title: "Scan", daysAhead: 3, scheduledAt: "2026-09-14T10:00:00+05:30" },
      ],
    });
    expect(screen.getByText(/Iron tablet/)).toBeInTheDocument();
    expect(screen.queryByText(/Scan/)).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/missed|failed|you forgot/i);
  });

  it("shows a calm empty line rather than an empty card when there is nothing due", () => {
    renderScreen({ reminders: [] });
    expect(screen.getByTestId("next-reminder")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /iron tablet|scan/i })).not.toBeInTheDocument();
  });

  it("opens the medicine quick action sheet when the dose reminder is tapped", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderScreen({
      reminders: [
        { kind: "dose", refId: "m1", medicineName: "Iron tablet", scheduledTime: "20:00", isOverdue: true },
      ],
    });
    await user.click(screen.getByTestId("next-reminder"));
    expect(screen.getByRole("heading", { name: /iron tablet/i })).toBeInTheDocument();
  });

  it("renders up to two reading cards linking to the right slug", () => {
    renderScreen({
      reading: [
        { id: "c1", slug: "nutrition-tip", title: "Nutrition", summary: "Eat well", kind: "article" },
        { id: "c2", slug: "walk-tip", title: "Walk", summary: "Move a little", kind: "article" },
      ],
    });
    expect(screen.getByRole("link", { name: /nutrition/i })).toHaveAttribute(
      "href",
      "/today/listen/nutrition-tip",
    );
  });

  it("links the Meal Plan card to its own screen", () => {
    renderScreen();
    expect(screen.getByRole("link", { name: /meal plan/i })).toHaveAttribute("href", "/today/meal-plan");
  });

  it("links to the activity feed", () => {
    renderScreen();
    expect(screen.getByRole("link", { name: en.today.seeLoggedBefore })).toHaveAttribute(
      "href",
      "/today/activity",
    );
  });

  it("shows the feeling box with a text field, chips and no mic when unavailable", () => {
    renderScreen({ transcriber: unavailableTranscriber });
    expect(screen.getByTestId("feeling-box")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: en.today.feeling.voiceButton })).not.toBeInTheDocument();
  });

  it("shows the mic control when the transcriber is available", () => {
    renderScreen({ transcriber: availableTranscriber });
    expect(screen.getByRole("button", { name: en.today.feeling.voiceButton })).toBeInTheDocument();
  });

  it("renders the weekly reflection and checkup nudge only when their conditions are true", () => {
    renderScreen({ showWeeklyReflection: true, weeklyReflectionText: "Rest well this week." });
    expect(screen.getByText("Rest well this week.")).toBeInTheDocument();
    expect(screen.queryByText(en.today.checkupNudgeTitle)).not.toBeInTheDocument();
  });

  it("links the checkup nudge to the suggested-questions screen", () => {
    renderScreen({ showCheckupNudge: true });
    expect(screen.getByText(en.today.checkupNudgeTitle).closest("a")).toHaveAttribute(
      "href",
      "/care/questions",
    );
  });

  it("renders no texture-motif on this screen", () => {
    renderScreen();
    expect(screen.queryByTestId("texture-motif")).not.toBeInTheDocument();
  });

  it("carries exactly one primary-emphasis element", () => {
    renderScreen();
    expect(screen.getAllByTestId("primary-emphasis")).toHaveLength(1);
  });

  // TodayPage (a Server Component) must be able to pass saveCheckin itself as
  // onSubmitCheckin -- wrapping it in a closure to remap field names is what
  // crashed /today ("Event handlers cannot be passed to Client Component
  // props"), since only a real "use server" reference can cross that
  // boundary. That only works if this prop already matches saveCheckin's own
  // { body, feeling, inputMethod } shape, so the remapping happens here
  // instead, on the client side of the boundary.
  it("calls onSubmitCheckin with saveCheckin's own shape (body, not text)", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    const onSubmitCheckin = vi.fn().mockResolvedValue({ ok: true, severity: null, guidance: null });
    renderScreen({ onSubmitCheckin });

    await user.type(screen.getByRole("textbox"), "Feeling steady");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSubmitCheckin).toHaveBeenCalledWith({ body: "Feeling steady", feeling: null, inputMethod: "text" });
  });

  it("renders the post-term holding state instead of the normal screen", () => {
    renderScreen({ isPostTerm: true });
    expect(screen.getByTestId("today-edge-state")).toBeInTheDocument();
    expect(screen.queryByTestId("feeling-box")).not.toBeInTheDocument();
  });
});
