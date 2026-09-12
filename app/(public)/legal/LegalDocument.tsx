import { readFileSync } from "node:fs";
import ReactMarkdown from "react-markdown";
import { getLocale } from "@/i18n/locale";
import { LanguageSwitcher } from "@/components/patterns/LanguageSwitcher";
import { changeLocale } from "@/app/actions/locale";

const ALLOWED_ELEMENTS = ["h1", "h2", "h3", "p", "ul", "ol", "li", "strong", "em", "a", "blockquote"];

/**
 * Restrained register (design doc §6): no illustration, no motion, no
 * texture-motif, generous white space. Shared by both legal pages rather than
 * duplicated, the way AuthForm backs both the sign-up and sign-in screens.
 */
export async function LegalDocument({ slug }: { slug: "privacy" | "terms" }) {
  const locale = await getLocale();
  // Read at request time, not build time: a docs-only edit should not require
  // a redeploy to appear, and this is a handful of small local files, not a
  // hot path.
  const markdown = readFileSync(`content/legal/${slug}.${locale}.md`, "utf8");

  return (
    <div className="flex flex-col gap-lg bg-surface-raised p-lg text-text-primary">
      <div className="prose max-w-none text-body">
        <ReactMarkdown allowedElements={ALLOWED_ELEMENTS}>{markdown}</ReactMarkdown>
      </div>
      <LanguageSwitcher current={locale} onSelect={changeLocale} />
    </div>
  );
}
