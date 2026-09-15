import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContentDetail } from "@/components/content/ContentDetail";
import en from "@/i18n/en.json";
import { EVENTS } from "@/lib/analytics/events";
import type { ContentItemRow } from "@/lib/supabase/queries/content";
import { PRODUCT_NAME } from "@/lib/config";

const track = vi.fn();
vi.mock("@/components/AnalyticsProvider", () => ({
  track: (...args: unknown[]) => track(...args),
}));

// tests/guards/product-name.test.ts forbids the literal product name outside
// lib/config.ts, so this fixture builds the real citation copy from PRODUCT_NAME.
const CURATED_CITATION = `Reviewed by ${PRODUCT_NAME}'s medical team`;

const baseItem: ContentItemRow = {
  body_md: "A full transcript for reading along.",
  category: null,
  citation: CURATED_CITATION,
  created_at: "2026-09-12T00:00:00Z",
  duration_seconds: 290,
  id: "content-1",
  is_published: true,
  kind: "video",
  locale: "en",
  media_url: "https://example.com/media.mp4",
  narration_url: null,
  slug: "back-ache",
  summary: "A short summary.",
  tags: [],
  title: "Why your back aches now",
  week_max: 30,
  week_min: 20,
};

function renderDetail(
  overrides: Partial<ContentItemRow> = {},
  props: Partial<React.ComponentProps<typeof ContentDetail>> = {},
) {
  const item = { ...baseItem, ...overrides };
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ContentDetail
        item={item}
        isFallback={false}
        transcript={item.body_md}
        backHref="/today"
        backLabelKey="today.backToToday"
        context="today"
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => track.mockClear());

describe("ContentDetail", () => {
  it("renders a native inline video with controls and the playing caption", () => {
    const { container } = renderDetail();
    const video = container.querySelector("video");
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("src", baseItem.media_url);
    expect(screen.getByText(en.today.listen.playingCaption)).toBeInTheDocument();
  });

  it("renders the custom audio player and reveals an available read-along transcript", async () => {
    const user = userEvent.setup();
    const { container } = renderDetail({
      kind: "audio",
      media_url: "https://example.com/audio.mp3",
    });
    expect(container.querySelector("audio")).toHaveAttribute(
      "src",
      "https://example.com/audio.mp3",
    );
    expect(
      screen.getByRole("button", { name: en.today.listen.playContentLabel }),
    ).toBeInTheDocument();
    expect(screen.getByText(en.today.listen.playingCaption)).toBeInTheDocument();
    expect(screen.queryByText(baseItem.body_md!)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: en.today.listen.readAlong }));
    expect(screen.getByText(baseItem.body_md!)).toBeInTheDocument();
  });

  it("toggles the custom audio player's play/pause button as the element itself plays and pauses", async () => {
    const user = userEvent.setup();
    const { container } = renderDetail({
      kind: "audio",
      media_url: "https://example.com/audio.mp3",
    });
    const audio = container.querySelector("audio") as HTMLAudioElement;
    audio.play = vi.fn().mockImplementation(() => {
      fireEvent.play(audio);
      return Promise.resolve();
    });
    audio.pause = vi.fn().mockImplementation(() => {
      fireEvent.pause(audio);
    });

    await user.click(screen.getByRole("button", { name: en.today.listen.playContentLabel }));
    expect(
      screen.getByRole("button", { name: en.today.listen.pauseContentLabel }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: en.today.listen.pauseContentLabel }));
    expect(
      screen.getByRole("button", { name: en.today.listen.playContentLabel }),
    ).toBeInTheDocument();
  });

  it("tracks completion when the custom audio player's element ends", () => {
    const { container } = renderDetail({
      kind: "audio",
      media_url: "https://example.com/audio.mp3",
    });
    fireEvent.ended(container.querySelector("audio") as HTMLAudioElement);
    expect(track).toHaveBeenCalledWith(EVENTS.content_completed, { kind: "audio" });
  });

  it("switches to the text version, hides the player and shows the video-appropriate note", async () => {
    // baseItem.kind is "video" -- switchBackNoteVideo ("...switch back to the
    // video...") is correct here, not the audio-worded switchBackNote it
    // used to show for every kind regardless.
    const user = userEvent.setup();
    const { container } = renderDetail();
    await user.click(screen.getByRole("button", { name: en.today.listen.textLabel }));
    expect(container.querySelector("video")).not.toBeInTheDocument();
    expect(screen.getByText(baseItem.body_md!)).toBeInTheDocument();
    expect(screen.getByText(en.today.listen.switchBackNoteVideo)).toBeInTheDocument();
  });

  it("shows AudioIndicator only when a narration URL exists", () => {
    const withoutNarration = renderDetail();
    expect(
      screen.queryByRole("button", { name: en.today.listen.playLabel }),
    ).not.toBeInTheDocument();
    withoutNarration.unmount();

    renderDetail({ narration_url: "https://example.com/narration.mp3" });
    expect(screen.getByRole("button", { name: en.today.listen.playLabel })).toBeInTheDocument();
  });

  it("renders a null item as a not-found state with the supplied route", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ContentDetail
          item={null}
          isFallback={false}
          transcript={null}
          backHref="/today"
          backLabelKey="today.backToToday"
          context="today"
        />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getByRole("heading", { name: en.today.listen.notFoundTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(en.today.listen.notFoundBody)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: en.today.backToToday })).toHaveAttribute(
      "href",
      "/today",
    );
  });

  it("shows the item's own citation beneath the title, for every kind", () => {
    renderDetail({ citation: "Source: Mayo Clinic pregnancy guide" });
    expect(screen.getByText("Source: Mayo Clinic pregnancy guide")).toBeInTheDocument();
  });

  it("marks fallback-locale content", () => {
    renderDetail({}, { isFallback: true });
    expect(screen.getByText(en.common.englishOnly)).toBeInTheDocument();
  });

  it("tracks opening with kind and fallback status", () => {
    renderDetail({ kind: "audio" }, { isFallback: true });
    expect(track).toHaveBeenCalledWith(EVENTS.content_opened, {
      kind: "audio",
      is_fallback_locale: true,
    });
  });

  it("tracks completion when the native video ends", () => {
    const { container } = renderDetail();
    fireEvent.ended(container.querySelector("video") as HTMLVideoElement);
    expect(track).toHaveBeenCalledWith(EVENTS.content_completed, { kind: "video" });
  });

  it("tracks an article as completed immediately and restricts rendered markdown", () => {
    renderDetail({
      kind: "article",
      body_md: "## Helpful\n\n**Safe emphasis**\n\n<img src=x onerror=alert(1)>",
    });
    expect(screen.getByRole("heading", { name: "Helpful" })).toBeInTheDocument();
    expect(document.querySelector("img")).not.toBeInTheDocument();
    expect(track).toHaveBeenCalledWith(EVENTS.content_completed, { kind: "article" });
  });

  it("shows no eyebrow and no mode toggle for an article, regardless of context", () => {
    renderDetail({ kind: "article" });
    expect(screen.queryByText(en.today.listen.eyebrow)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: en.today.listen.textLabel }),
    ).not.toBeInTheDocument();
  });

  it("drops the Today eyebrow and uses topic-appropriate copy in the guide context", () => {
    renderDetail(
      { kind: "audio", media_url: "https://example.com/audio.mp3" },
      { context: "guide" },
    );
    expect(screen.queryByText(en.today.listen.eyebrow)).not.toBeInTheDocument();
    expect(screen.getByText(en.today.listen.playingCaptionOther)).toBeInTheDocument();
  });

  it("gives a video a real video/text switch, not the audio Listen label, with video-appropriate switch-back copy", async () => {
    const user = userEvent.setup();
    renderDetail({ kind: "video" }, { context: "guide" });
    expect(
      screen.queryByRole("button", { name: en.today.listen.listenLabel }),
    ).not.toBeInTheDocument();
    const modeSwitch = screen.getByRole("switch", { name: en.today.listen.textLabel });
    expect(modeSwitch).toHaveAttribute("aria-checked", "false");

    await user.click(modeSwitch);
    expect(modeSwitch).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(en.today.listen.switchBackNoteVideo)).toBeInTheDocument();
  });

  it("keeps the Guide video's expandable text version available independently of the mode switch", async () => {
    const user = userEvent.setup();
    renderDetail({ kind: "video" }, { context: "guide" });
    const readText = screen.getByRole("button", { name: en.guideContent.readTextVersion });
    expect(readText).toHaveAttribute("aria-expanded", "false");

    await user.click(readText);
    expect(readText).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(baseItem.body_md!)).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: en.today.listen.textLabel })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("takes both back label and target from props instead of hardcoding Today", () => {
    const today = renderDetail();
    expect(screen.getByRole("link", { name: en.today.backToToday })).toHaveAttribute(
      "href",
      "/today",
    );
    today.unmount();

    renderDetail({}, { backHref: "/reading", backLabelKey: "common.back" });
    expect(screen.getByRole("link", { name: en.common.back })).toHaveAttribute("href", "/reading");
  });
});
