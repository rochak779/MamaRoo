import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { Timeline } from "@/app/(app)/baby/Timeline";
import en from "@/i18n/en.json";
import type { TimelineEntry } from "@/lib/domain/timeline";

function renderTimeline(entries: TimelineEntry[], onSelect = vi.fn()) {
  return render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Kolkata">
      <Timeline entries={entries} onSelect={onSelect} />
    </NextIntlClientProvider>,
  );
}

const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString();

function event(id: string, occurredAt: string): TimelineEntry {
  return { kind: "event", id, occurredAt, title: `Event ${id}`, body: null, eventType: "note" };
}

function milestone(id: string, occurredAt: string): TimelineEntry {
  return { kind: "milestone", id, occurredAt, week: 8, stage: 2, titleKey: "milestones.2" };
}

describe("Timeline", () => {
  it("shows an empty state with no texture-motif suppressed when there is nothing logged", () => {
    renderTimeline([]);
    expect(screen.getByTestId("texture-motif")).toBeInTheDocument();
  });

  it("renders a dot per entry within the default week-view window", () => {
    renderTimeline([event("e1", daysAgo(1)), event("e2", daysAgo(5))]);
    expect(screen.getAllByTestId("timeline-dot")).toHaveLength(2);
  });

  it("rings a milestone dot distinctly from an ordinary event dot", () => {
    renderTimeline([event("e1", daysAgo(1)), milestone("m1", daysAgo(2))]);
    const dots = screen.getAllByTestId("timeline-dot");
    expect(dots.find((d) => d.dataset.kind === "milestone")).toBeDefined();
    expect(dots.find((d) => d.dataset.kind === "event")).toBeDefined();
  });

  it("selects a dot on tap and reports the selection up", () => {
    const onSelect = vi.fn();
    renderTimeline([event("e1", daysAgo(1))], onSelect);
    fireEvent.click(screen.getByTestId("timeline-dot"));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" }));
    expect(screen.getByTestId("timeline-dot")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("timeline-dot").querySelector("span > span")?.className).toContain(
      "ring-accent-secondary",
    );
  });

  it("deselects on a second tap of the same dot", () => {
    const onSelect = vi.fn();
    renderTimeline([event("e1", daysAgo(1))], onSelect);
    const dot = screen.getByTestId("timeline-dot");
    fireEvent.click(dot);
    fireEvent.click(dot);
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it("opens a milestone explainer on tap", () => {
    renderTimeline([milestone("m1", daysAgo(1))]);
    fireEvent.click(screen.getByTestId("timeline-dot"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("collapses beyond 15 entries behind a show-more action", () => {
    const many = Array.from({ length: 20 }, (_, i) => event(`e${i}`, daysAgo(i)));
    renderTimeline(many);
    expect(screen.getAllByTestId("timeline-dot")).toHaveLength(15);
    expect(screen.getByTestId("timeline-show-more")).toBeInTheDocument();
  });

  it("reveals every entry once show-more is tapped", () => {
    const many = Array.from({ length: 20 }, (_, i) => event(`e${i}`, daysAgo(i)));
    renderTimeline(many);
    fireEvent.click(screen.getByTestId("timeline-show-more"));
    expect(screen.getAllByTestId("timeline-dot")).toHaveLength(20);
    expect(screen.queryByTestId("timeline-show-more")).not.toBeInTheDocument();
  });

  it("switches the look-back window when Day/Week/Month is tapped", () => {
    renderTimeline([event("recent", daysAgo(2)), event("old", daysAgo(60))]);
    expect(screen.getByRole("tab", { name: /week/i }).className).toContain("bg-accent-secondary");
    expect(screen.getAllByTestId("timeline-dot")).toHaveLength(2);
    fireEvent.click(screen.getByRole("tab", { name: /day/i }));
    expect(screen.getAllByTestId("timeline-dot")).toHaveLength(1);
  });
});
