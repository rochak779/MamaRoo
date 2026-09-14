import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Card, CardBody, CardTruncatedText } from "@/components/ui/Card";

describe("Card", () => {
  it("renders as a non-interactive container by default", () => {
    render(<Card>Content</Card>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("becomes a button when interactive, so it is keyboard reachable", async () => {
    const onClick = vi.fn();
    render(
      <Card interactive onClick={onClick}>
        Tap me
      </Card>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Tap me" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("marks the selected state with a border, not only a colour", () => {
    render(
      <Card interactive selected>
        Chosen
      </Card>,
    );
    const card = screen.getByRole("button");
    expect(card).toHaveAttribute("data-selected", "true");
    expect(card.className).toContain("border-accent-secondary");
  });

  it("allows a screen to opt into a coral selected border", () => {
    render(
      <Card interactive selected selectedAccent="coral">
        Chosen
      </Card>,
    );
    expect(screen.getByRole("button").className).toContain("border-accent-primary");
  });

  it("dims content when disabled and blocks interaction", async () => {
    const onClick = vi.fn();
    render(
      <Card interactive disabled onClick={onClick}>
        Off
      </Card>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("CardBody", () => {
  it("stacks its children and stays composable inside a Card", () => {
    render(
      <Card>
        <CardBody>
          <span>Top</span>
          <span>Bottom</span>
        </CardBody>
      </Card>,
    );
    expect(screen.getByText("Top")).toBeInTheDocument();
    expect(screen.getByText("Bottom")).toBeInTheDocument();
  });
});

describe("CardTruncatedText", () => {
  it("shows short text in full with no control", () => {
    render(<CardTruncatedText text="Folic acid" maxChars={40} showMoreLabel="Show more" />);
    expect(screen.getByText("Folic acid")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("truncates long text and reveals it on request, never clipping silently", async () => {
    const long =
      "Iron and folic acid tablet taken after lunch with a full glass of water every day";
    render(<CardTruncatedText text={long} maxChars={30} showMoreLabel="Show more" />);
    expect(screen.queryByText(long)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(screen.getByText(long)).toBeInTheDocument();
  });
});
