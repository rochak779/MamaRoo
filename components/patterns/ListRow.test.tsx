import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListRow, ListRowGroup } from "@/components/patterns/ListRow";

describe("ListRow", () => {
  it("renders its title and subtitle", () => {
    render(<ListRow title="Folic acid" subtitle="1 tablet after lunch" />);
    expect(screen.getByText("Folic acid")).toBeInTheDocument();
    expect(screen.getByText("1 tablet after lunch")).toBeInTheDocument();
  });

  it("becomes a button when tappable and meets the touch target", async () => {
    const onClick = vi.fn();
    render(<ListRow title="Folic acid" onClick={onClick} />);
    const row = screen.getByRole("button");
    expect(row.className).toContain("tap-target");
    await userEvent.click(row);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("supports a raised content-card row with a thumbnail", () => {
    render(
      <ListRow
        title="A guide article"
        href="/guide/checkups/article"
        variant="card"
        thumbnail={<span data-testid="thumbnail" />}
      />,
    );
    expect(screen.getByTestId("thumbnail")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "A guide article" })).toHaveClass("bg-surface-raised");
  });
});

describe("ListRowGroup", () => {
  const items = Array.from({ length: 22 }, (_, i) => ({ id: String(i), title: `Item ${i}` }));

  it("shows only the initial count and a show-more control for a long list", () => {
    render(<ListRowGroup items={items} initialCount={15} showMoreLabel="Show more" />);
    expect(screen.getAllByTestId("list-row")).toHaveLength(15);
    expect(screen.getByRole("button", { name: "Show more" })).toBeInTheDocument();
  });

  it("reveals the rest on request", async () => {
    render(<ListRowGroup items={items} initialCount={15} showMoreLabel="Show more" />);
    await userEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(screen.getAllByTestId("list-row")).toHaveLength(22);
  });

  it("shows no control when the list is short", () => {
    render(<ListRowGroup items={items.slice(0, 4)} initialCount={15} showMoreLabel="Show more" />);
    expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
  });
});
