import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PrepChecklist, type PrepChecklistProps } from "@/app/(app)/me/prep/PrepChecklist";
import { EVENTS } from "@/lib/analytics/events";
import en from "@/i18n/en.json";

vi.mock("@/components/AnalyticsProvider", () => ({ track: vi.fn() }));
vi.mock("@/lib/pwa/useOnline", () => ({ useOnline: () => mockOnline }));

let mockOnline = true;

const items = [
  { id: "me-clothes", category: "me", label: "Comfortable clothes and nightwear", sortOrder: 10, isActive: true },
  { id: "me-charger", category: "me", label: "Phone charger", sortOrder: 30, isActive: true },
  { id: "baby-outfit", category: "baby", label: "Going home outfit", sortOrder: 10, isActive: true },
];

const baseProps: PrepChecklistProps = {
  items,
  progress: [],
  contacts: [{ id: "c1", name: "Amma", phone: "9123456780" }],
  birthNotes: "",
  pregnancyId: "p1",
  onToggleItem: vi.fn().mockResolvedValue({ ok: true }),
  onAddContact: vi.fn().mockResolvedValue({ ok: true, contact: { id: "c2", name: "Ramesh", phone: "9876543210" } }),
  onUpdateContact: vi.fn().mockResolvedValue({ ok: true, contact: { id: "c1", name: "Amma", phone: "9123456780" } }),
  onDeleteContact: vi.fn().mockResolvedValue({ ok: true }),
  onSaveBirthNotes: vi.fn().mockResolvedValue({ ok: true }),
};

function renderChecklist(overrides: Partial<PrepChecklistProps> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Kolkata">
      <PrepChecklist {...baseProps} {...overrides} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  mockOnline = true;
  vi.clearAllMocks();
});

describe("PrepChecklist", () => {
  it("renders each non-empty category as a heading with its items", () => {
    renderChecklist();
    expect(screen.getByRole("heading", { name: en.me.prep.categoryMe })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: en.me.prep.categoryBaby })).toBeInTheDocument();
    expect(screen.getByText("Comfortable clothes and nightwear")).toBeInTheDocument();
    expect(screen.getByText("Going home outfit")).toBeInTheDocument();
  });

  it("renders no heading for a category with no items", () => {
    renderChecklist({ items: items.filter((i) => i.category !== "baby") });
    expect(screen.queryByRole("heading", { name: en.me.prep.categoryBaby })).not.toBeInTheDocument();
  });

  it("ticking an item calls onToggleItem, updates the ring, and emits checklist_item_toggled", async () => {
    const { track } = await import("@/components/AnalyticsProvider");
    const onToggleItem = vi.fn().mockResolvedValue({ ok: true });
    renderChecklist({ onToggleItem });

    expect(screen.getByText("0%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Comfortable clothes and nightwear" }));

    await waitFor(() => expect(onToggleItem).toHaveBeenCalledWith("me-clothes", true));
    expect(track).toHaveBeenCalledWith(EVENTS.checklist_item_toggled, { category: "me", done: true });
    await waitFor(() => expect(screen.getByText("33%")).toBeInTheDocument());
  });

  it("is optimistic and reverts with an ErrorBanner when the save fails", async () => {
    const onToggleItem = vi.fn().mockResolvedValue({ ok: false, error: "failed" });
    renderChecklist({ onToggleItem });

    fireEvent.click(screen.getByRole("button", { name: "Comfortable clothes and nightwear" }));
    await waitFor(() => expect(screen.getByText("33%")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("0%")).toBeInTheDocument());
  });

  it("blocks ticking while offline with an explanation, and does not call the server", () => {
    mockOnline = false;
    const onToggleItem = vi.fn();
    renderChecklist({ onToggleItem });

    fireEvent.click(screen.getByRole("button", { name: "Comfortable clothes and nightwear" }));
    expect(onToggleItem).not.toHaveBeenCalled();
    expect(screen.getByText(en.me.prep.offlineToggleError)).toBeInTheDocument();
  });

  it("renders the static documents-to-carry list from copy, not per-user rows", () => {
    renderChecklist();
    expect(screen.getByText(en.me.prep.documentIdentification)).toBeInTheDocument();
    expect(screen.getByText(en.me.prep.documentInsurance)).toBeInTheDocument();
    expect(screen.getByText(en.me.prep.documentRecords)).toBeInTheDocument();
  });

  it("renders existing emergency contacts with a call link", () => {
    renderChecklist();
    const link = screen.getByRole("link", { name: /9123456780/ });
    expect(link).toHaveAttribute("href", "tel:9123456780");
  });

  it("adds a contact once name and phone are both valid", async () => {
    const onAddContact = vi.fn().mockResolvedValue({ ok: true, contact: { id: "c2", name: "Ramesh", phone: "9876543210" } });
    renderChecklist({ onAddContact });

    fireEvent.click(screen.getByRole("button", { name: en.me.prep.addContact }));
    const nameInputs = screen.getAllByPlaceholderText(en.me.prep.contactNamePlaceholder);
    const phoneInputs = screen.getAllByPlaceholderText(en.me.prep.contactPhonePlaceholder);
    const draftName = nameInputs[nameInputs.length - 1]!;
    const draftPhone = phoneInputs[phoneInputs.length - 1]!;

    fireEvent.change(draftName, { target: { value: "Ramesh" } });
    fireEvent.change(draftPhone, { target: { value: "9876543210" } });
    fireEvent.blur(draftPhone);

    await waitFor(() => expect(onAddContact).toHaveBeenCalledWith("Ramesh", "9876543210"));
  });

  it("removes a contact", async () => {
    const onDeleteContact = vi.fn().mockResolvedValue({ ok: true });
    renderChecklist({ onDeleteContact });

    fireEvent.click(screen.getByRole("button", { name: en.me.prep.removeContact }));
    await waitFor(() => expect(onDeleteContact).toHaveBeenCalledWith("c1"));
  });

  it("saves birth notes and shows a saved confirmation", async () => {
    const onSaveBirthNotes = vi.fn().mockResolvedValue({ ok: true });
    renderChecklist({ onSaveBirthNotes });

    fireEvent.change(screen.getByPlaceholderText(en.me.prep.notesPlaceholder), {
      target: { value: "Would like skin-to-skin right after birth." },
    });
    fireEvent.click(screen.getByRole("button", { name: en.me.prep.saveNotes }));

    await waitFor(() => expect(onSaveBirthNotes).toHaveBeenCalledWith("p1", "Would like skin-to-skin right after birth."));
    await waitFor(() => expect(screen.getByText(en.me.prep.notesSaved)).toBeInTheDocument());
  });
});
