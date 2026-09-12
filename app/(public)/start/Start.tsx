"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BrandFilters } from "@/components/landing/Brand";
import { PRODUCT_NAME } from "@/lib/config";
import startLogo from "@/public/brand/logo-icon.png";
import "@/styles/start.css";

export interface StartProps {
  /** A deep-link target to resume after authentication, carried through untouched. */
  next: string | null;
}

/** Welcome choice shown after language selection and before authentication. */
export function Start({ next }: StartProps) {
  const router = useRouter();
  const t = useTranslations("start");

  function goTo(path: "/signup" | "/signin") {
    router.push(next ? `${path}?next=${encodeURIComponent(next)}` : path);
  }

  return (
    <main className="start-screen">
      <BrandFilters />
      <Image
        src={startLogo}
        alt={t("logoAlt", { productName: PRODUCT_NAME })}
        width={590}
        height={773}
        sizes="120px"
        className="start-logo"
        preload
        unoptimized
      />

      <h1 className="start-title">{t("title", { productName: PRODUCT_NAME })}</h1>
      <div className="start-copy">
        <p>{t("bodyLine1")}</p>
        <p>{t("bodyLine2")}</p>
        <p>{t("bodyLine3")}</p>
      </div>

      <div className="start-spacer" />

      <div className="start-actions">
        <button type="button" className="start-button start-button-primary" onClick={() => goTo("/signup")}>
          {t("primaryAction")}
        </button>
        <button
          type="button"
          className="start-button start-button-secondary"
          onClick={() => goTo("/signin")}
        >
          {t("secondaryAction")}
        </button>
      </div>
    </main>
  );
}
