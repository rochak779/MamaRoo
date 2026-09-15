import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LettersScreen,
  type LettersScreenProps,
} from "@/app/(app)/baby/letters/LettersScreen";
import { ToastProvider } from "@/components/ui/ToastProvider";
import en from "@/i18n/en.json";

const useOnline = vi.fn(() => true);
vi.mock("@/lib/pwa/useOnline", () => ({ useOnline: () => useOnline() }));

const letters = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    pregnancyId: "pregnancy-1",
    gestationalWeek: 26,
    body: "Dear little one,\n\nToday I felt you move after breakfast.",
    createdAt: "2026-09-12T10:00:00Z",
    updatedAt: "2026-09-12T10:00:00Z",
  },
];

function renderScreen(overrides: Partial<LettersScreenProps> = {}) {
  const props: LettersScreenProps = {
    initialLetters: letters,
    sensitiveMode: false,
    onCreate: vi.fn(),
    onUpdate: vi.fn(),
    ...overrides,
  };
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastProvider>
        <LettersScreen {...props} />
      </ToastProvider>
    </NextIntlClientProvider>,
  );
  return props;
}

beforeEach(() => useOnline.mockReset().mockReturnValue(true));

describe("LettersScreen", () => {
  it("lists each letter with a localized date, week, and opening-line preview", () => {
    renderScreen();
    expect(screen.getByRole("heading", { name: en.letters.title })).toBeInTheDocument();
    expect(screen.getByText("Week 26 · 12 September 2026")).toBeInTheDocument();
    const preview = screen.getByText("Dear little one,");
    expect(preview).toBeInTheDocument();
    expect(preview.className).toContain("font-letter");
    expect(preview.closest("button")?.querySelector('[data-testid="icon"]')).toBeNull();
    expect(screen.queryByText(/Today I felt you move/)).not.toBeInTheDocument();
  });

  it("creates a trimmed letter and returns to the updated list", async () => {
    const created = {
      ...letters[0]!,
      id: "10000000-0000-4000-8000-000000000002",
      gestationalWeek: 27,
      body: "Hello, little one.\n\nA second paragraph.",
      createdAt: "2026-09-13T10:00:00Z",
      updatedAt: "2026-09-13T10:00:00Z",
    };
    const onCreate = vi.fn().mockResolvedValue({ ok: true, letter: created });
    renderScreen({ initialLetters: [], onCreate });

    await userEvent.click(screen.getByRole("button", { name: en.letters.writeLetter }));
    const editor = screen.getByRole("textbox", { name: en.letters.bodyLabel });
    await userEvent.type(editor, "  Hello, little one.\n\nA second paragraph.  ");
    await userEvent.click(screen.getByRole("button", { name: en.letters.save }));

    expect(onCreate).toHaveBeenCalledWith({ body: "Hello, little one.\n\nA second paragraph." });
    expect(await screen.findByText("Hello, little one.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("reads the full body and edits the same letter with a prefilled composer", async () => {
    const onUpdate = vi.fn().mockResolvedValue({
      ok: true,
      letter: { ...letters[0]!, body: "Dear little one,\n\nYou moved again today." },
    });
    renderScreen({ onUpdate });

    await userEvent.click(screen.getByRole("button", { name: /Read your letter/ }));
    expect(screen.getByTestId("letter-body-read")).toHaveTextContent("Dear little one, Today I felt you move after breakfast.");
    await userEvent.click(screen.getByRole("button", { name: en.letters.edit }));

    const editor = screen.getByRole("textbox", { name: en.letters.bodyLabel });
    expect(editor).toHaveValue(letters[0]!.body);
    await userEvent.clear(editor);
    await userEvent.type(editor, "Dear little one,\n\nYou moved again today.");
    await userEvent.click(screen.getByRole("button", { name: en.letters.saveChanges }));

    expect(onUpdate).toHaveBeenCalledWith({
      letterId: letters[0]!.id,
      body: "Dear little one,\n\nYou moved again today.",
    });
    expect(await screen.findByText("Dear little one,")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("suppresses every write entry point in sensitive-moment mode", async () => {
    renderScreen({ sensitiveMode: true });
    expect(screen.queryByRole("button", { name: en.letters.writeLetter })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Read your letter/ }));
    expect(screen.queryByRole("button", { name: en.letters.edit })).not.toBeInTheDocument();
  });

  it("shows a gentle empty state when no letters exist", () => {
    renderScreen({ initialLetters: [] });
    expect(screen.getByText(en.letters.empty)).toBeInTheDocument();
    expect(screen.getByTestId("texture-motif")).toBeInTheDocument();
  });

  it("shows field errors instead of throwing", async () => {
    const onCreate = vi.fn().mockResolvedValue({ ok: false, errors: { body: "too_long" } });
    renderScreen({ initialLetters: [], onCreate });
    await userEvent.click(screen.getByRole("button", { name: en.letters.writeLetter }));
    await userEvent.type(screen.getByRole("textbox", { name: en.letters.bodyLabel }), "Hello");
    await userEvent.click(screen.getByRole("button", { name: en.letters.save }));
    expect(screen.getByRole("alert")).toHaveTextContent(en.letters.errors.tooLong);
  });
});
