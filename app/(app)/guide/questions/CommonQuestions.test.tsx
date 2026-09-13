import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import { CommonQuestions } from "@/app/(app)/guide/questions/CommonQuestions";
import { PRODUCT_NAME } from "@/lib/config";
import type { GuideFaq, GuideScheme } from "@/lib/supabase/queries/guideFaqs";

const messages = {
  commonQuestions: {
    heading: "Common questions",
    citation: "Reviewed by {productName}'s medical team",
    schemesTitle: "Government schemes and support",
    schemesSubtitle: "Help you may be able to use, based on where you live.",
    backLabel: "Back to Guide",
  },
};

const faqs: GuideFaq[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    locale: "en",
    question: "Can I eat fruit at night",
    answer: "Yes, fruit at any time of day is fine during pregnancy.",
    sort_order: 10,
    is_active: true,
    created_at: "2026-09-13T00:00:00Z",
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    locale: "en",
    question: "Do I need to avoid all exercise",
    answer: "Gentle movement is usually encouraged, not avoided.",
    sort_order: 20,
    is_active: true,
    created_at: "2026-09-13T00:00:00Z",
  },
];

const schemes: GuideScheme[] = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    locale: "en",
    name: "Pradhan Mantri Matru Vandana Yojana",
    short_text: "Cash support for your first living child, paid in installments.",
    long_text: "You can receive five thousand rupees in three installments.",
    sort_order: 10,
    is_active: true,
    created_at: "2026-09-13T00:00:00Z",
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    locale: "en",
    name: "Janani Suraksha Yojana",
    short_text: "Cash assistance for institutional delivery.",
    long_text: "This scheme supports safe delivery in a hospital or health centre.",
    sort_order: 20,
    is_active: true,
    created_at: "2026-09-13T00:00:00Z",
  },
];

function renderScreen({ faqRows = faqs, schemeRows = schemes } = {}) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <CommonQuestions faqs={faqRows} schemes={schemeRows} />
    </NextIntlClientProvider>,
  );
}

describe("CommonQuestions", () => {
  it("starts every FAQ and scheme collapsed", () => {
    renderScreen();
    for (const item of [...faqs, ...schemes]) {
      const label = "question" in item ? item.question : item.name;
      expect(screen.getByRole("button", { name: new RegExp(label) })).toHaveAttribute("aria-expanded", "false");
    }
    expect(screen.queryByText(faqs[0]!.answer)).not.toBeInTheDocument();
    expect(screen.queryByText(schemes[0]!.long_text)).not.toBeInTheDocument();
  });

  it("keeps FAQ and scheme expansion state independent", async () => {
    renderScreen();
    const faq = screen.getByRole("button", { name: new RegExp(faqs[0]!.question) });
    const scheme = screen.getByRole("button", { name: new RegExp(schemes[0]!.name) });

    await userEvent.click(faq);
    expect(faq).toHaveAttribute("aria-expanded", "true");
    expect(scheme).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(faqs[0]!.answer)).toBeInTheDocument();

    await userEvent.click(scheme);
    expect(faq).toHaveAttribute("aria-expanded", "true");
    expect(scheme).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(schemes[0]!.long_text)).toBeInTheDocument();

    await userEvent.click(faq);
    expect(faq).toHaveAttribute("aria-expanded", "false");
    expect(scheme).toHaveAttribute("aria-expanded", "true");
  });

  it("shows the medical citation only for an expanded FAQ, never for a scheme", async () => {
    renderScreen();
    const citation = `Reviewed by ${PRODUCT_NAME}'s medical team`;
    expect(screen.queryByText(citation)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: new RegExp(schemes[0]!.name) }));
    expect(screen.queryByText(citation)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: new RegExp(faqs[0]!.question) }));
    expect(screen.getByText(citation)).toBeInTheDocument();
  });

  it("renders schemes when FAQs are empty and FAQs when schemes are empty", () => {
    const { unmount } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <CommonQuestions faqs={[]} schemes={schemes} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(messages.commonQuestions.schemesTitle)).toBeInTheDocument();
    expect(screen.getByText(schemes[0]!.name)).toBeInTheDocument();
    unmount();

    renderScreen({ faqRows: faqs, schemeRows: [] });
    expect(screen.getByText(faqs[0]!.question)).toBeInTheDocument();
    expect(screen.getByText(messages.commonQuestions.schemesTitle)).toBeInTheDocument();
  });
});
