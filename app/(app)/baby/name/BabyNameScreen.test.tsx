import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BabyNameScreen, type BabyNameScreenProps } from "@/app/(app)/baby/name/BabyNameScreen";
import { ToastProvider } from "@/components/ui/ToastProvider";
import en from "@/i18n/en.json";
import { FORBIDDEN } from "@/tests/guards/pcpndt-terms";

const useOnline = vi.fn(() => true);
vi.mock("@/lib/pwa/useOnline", () => ({ useOnline: () => useOnline() }));

const catalog = [
  { id: "20000000-0000-4000-8000-000000000001", name: "Aditi", meaning: "Boundless" },
  { id: "20000000-0000-4000-8000-000000000002", name: "Noor", meaning: "Light" },
  { id: "20000000-0000-4000-8000-000000000003", name: "Tara", meaning: "Star" },
];

function renderScreen(overrides: Partial<BabyNameScreenProps> = {}) {
  const props: BabyNameScreenProps = {
    babyCount: 1,
    catalog,
    initialFavoriteIds: [],
    initialNames: [],
    onSaveNames: vi.fn().mockResolvedValue({ ok: true, names: [] }),
    onSetFavorite: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  };
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ToastProvider>
        <BabyNameScreen {...props} />
      </ToastProvider>
    </NextIntlClientProvider>,
  );
  return props;
}

beforeEach(() => useOnline.mockReset().mockReturnValue(true));

describe("BabyNameScreen", () => {
  it("renders only naming controls and never offers a prohibited profile field", () => {
    renderScreen();
    expect(screen.getByRole("heading", { name: en.babyName.title })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.queryByLabelText(new RegExp(FORBIDDEN.join("|"), "i"))).not.toBeInTheDocument();
  });

  it("renders a gentle empty state when the catalog has no suggestions", () => {
    renderScreen({ catalog: [] });
    expect(screen.getByText(en.babyName.emptyCatalog)).toBeInTheDocument();
    expect(screen.getByTestId("texture-motif")).toBeInTheDocument();
  });

  it("filters by typed name or meaning and explains an empty search", async () => {
    renderScreen();
    await userEvent.click(screen.getByRole("tab", { name: en.babyName.tabs.find }));
    const search = screen.getByRole("searchbox", { name: en.babyName.searchLabel });
    await userEvent.type(search, "lig");
    expect(screen.getByText("Noor")).toBeInTheDocument();
    expect(screen.queryByText("Aditi")).not.toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, "zzzz");
    expect(screen.getByText(en.babyName.noResults)).toBeInTheDocument();
  });

  it("toggles a favorite once and reflects the new state", async () => {
    const onSetFavorite = vi.fn().mockResolvedValue({ ok: true });
    renderScreen({ onSetFavorite });
    const toggle = screen.getByRole("button", { name: en.babyName.favoriteAdd.replace("{name}", "Aditi") });
    await userEvent.click(toggle);
    expect(onSetFavorite).toHaveBeenCalledTimes(1);
    expect(onSetFavorite).toHaveBeenCalledWith({ babyNameId: catalog[0]!.id, favorite: true });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle.className).toContain("[&_svg]:fill-current");
  });

  it("opens a detail view with the localized meaning and favorite control", async () => {
    renderScreen({ initialFavoriteIds: [catalog[0]!.id] });
    await userEvent.click(screen.getByRole("button", { name: en.babyName.openDetail.replace("{name}", "Aditi") }));
    expect(screen.getByRole("heading", { name: "Aditi" })).toBeInTheDocument();
    expect(screen.getByText("Boundless")).toBeInTheDocument();
    const favorite = screen.getByRole("button", { name: en.babyName.favoriteRemove.replace("{name}", "Aditi") });
    expect(favorite).toHaveAttribute("aria-pressed", "true");
    expect(favorite).toHaveAttribute("data-variant", "primary");
  });

  it("saves one trimmed custom name exactly once even if the button receives two clicks", async () => {
    let finish!: (value: { ok: true; names: string[] }) => void;
    const onSaveNames = vi.fn(() => new Promise<{ ok: true; names: string[] }>((resolve) => { finish = resolve; }));
    renderScreen({ onSaveNames });
    await userEvent.click(screen.getByRole("tab", { name: en.babyName.tabs.add }));
    await userEvent.type(screen.getByRole("textbox", { name: en.babyName.customLabel }), "  अदिति  ");
    const save = screen.getByRole("button", { name: en.babyName.saveCustom });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(onSaveNames).toHaveBeenCalledTimes(1);
    expect(onSaveNames).toHaveBeenCalledWith({ names: ["अदिति"] });
    finish({ ok: true, names: ["अदिति"] });
    expect(await screen.findByText("अदिति")).toBeInTheDocument();
  });

  it("lets a twin pregnancy keep two names and prevents a third", async () => {
    const onSaveNames = vi.fn().mockResolvedValue({ ok: true, names: ["Aditi", "Noor"] });
    const props = renderScreen({ babyCount: 2, initialNames: ["Aditi"], onSaveNames });
    await userEvent.click(screen.getByRole("tab", { name: en.babyName.tabs.add }));
    await userEvent.type(screen.getByRole("textbox", { name: en.babyName.customLabel }), "Noor");
    await userEvent.click(screen.getByRole("button", { name: en.babyName.saveCustom }));
    expect(props.onSaveNames).toHaveBeenCalledWith({ names: ["Aditi", "Noor"] });

    const fullSave = vi.fn();
    renderScreen({ babyCount: 2, initialNames: ["Aditi", "Noor"], onSaveNames: fullSave });
    const screens = screen.getAllByTestId("baby-name-screen");
    const latest = screens.at(-1) as HTMLElement;
    await userEvent.click(within(latest).getByRole("tab", { name: en.babyName.tabs.add }));
    await userEvent.type(within(latest).getByRole("textbox", { name: en.babyName.customLabel }), "Tara");
    await userEvent.click(within(latest).getByRole("button", { name: en.babyName.saveCustom }));
    expect(fullSave).not.toHaveBeenCalled();
    expect(within(latest).getByRole("alert")).toHaveTextContent(en.babyName.errors.tooManyTwins);
  });

  it("sets a catalog name from detail with one action call", async () => {
    const onSaveNames = vi.fn().mockResolvedValue({ ok: true, names: ["Noor"] });
    renderScreen({ onSaveNames });
    await userEvent.click(screen.getByRole("button", { name: en.babyName.openDetail.replace("{name}", "Noor") }));
    await userEvent.click(screen.getByRole("button", { name: en.babyName.useName.replace("{name}", "Noor") }));
    expect(onSaveNames).toHaveBeenCalledTimes(1);
    expect(onSaveNames).toHaveBeenCalledWith({ names: ["Noor"] });
  });

  it("shows field and connectivity errors without throwing", async () => {
    const onSaveNames = vi.fn().mockResolvedValue({ ok: false, errors: { names: "too_long" } });
    renderScreen({ onSaveNames });
    await userEvent.click(screen.getByRole("tab", { name: en.babyName.tabs.add }));
    await userEvent.type(screen.getByRole("textbox", { name: en.babyName.customLabel }), "Aditi");
    await userEvent.click(screen.getByRole("button", { name: en.babyName.saveCustom }));
    expect(screen.getByRole("alert")).toHaveTextContent(en.babyName.errors.tooLong);

    useOnline.mockReturnValue(false);
    renderScreen();
    expect(screen.getAllByText(en.babyName.offline).at(-1)).toBeInTheDocument();
  });
});
