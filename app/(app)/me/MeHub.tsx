"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Icon } from "@/components/ui/Icon";
import { ListRow } from "@/components/patterns/ListRow";

export interface MeHubProps {
  displayName: string;
  week: number;
  onSignOut: () => Promise<void>;
}

const ROWS = [
  { key: "personalInfo", href: "/me/personal", icon: "User" },
  { key: "pregnancyInfo", href: "/me/pregnancy", icon: "Heart" },
  { key: "pregnancyPreparation", href: "/me/prep", icon: "BagSimple" },
  { key: "notifications", href: "/me/notifications", icon: "Bell" },
  { key: "privacy", href: "/me/privacy", icon: "ShieldCheck" },
] as const;

export function MeHub({ displayName, week, onSignOut }: MeHubProps) {
  const t = useTranslations("meHub");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const initial = displayName.trim().charAt(0).toLocaleUpperCase() || "?";
  const profileLine = displayName.trim()
    ? t("profileLine", { name: displayName.trim(), week })
    : t("profileLineNoName", { week });

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-lg py-screen">
      <h1 className="font-display text-h1 font-bold text-text-primary">{t("title")}</h1>

      <Link
        href="/me/personal"
        className="tap-target flex items-center gap-md rounded-md bg-peach px-md py-md text-text-primary shadow-3 transition-shadow duration-(--motion-fast) hover:shadow-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
      >
        <span
          aria-hidden="true"
          className="flex size-[50px] shrink-0 items-center justify-center rounded-full bg-surface-raised font-display text-h2 font-bold text-accent-primary"
        >
          {initial}
        </span>
        <span className="min-w-0 flex-1 font-display text-body font-bold">{profileLine}</span>
        <Icon name="CaretRight" size="inline" className="shrink-0" />
      </Link>

      <div className="overflow-hidden rounded-md bg-surface-raised px-md shadow-1">
        {ROWS.map((row) => (
          <ListRow
            key={row.key}
            title={t(row.key)}
            href={row.href}
            iconName={row.icon}
            trailing={<Icon name="CaretRight" size="inline" className="text-text-primary/40" />}
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-md bg-surface-raised px-md shadow-1">
        <ListRow
          title={t("contractions")}
          href="/me/contractions"
          iconName="Timer"
          trailing={<Icon name="CaretRight" size="inline" className="text-text-primary/40" />}
        />
        <ListRow title={t("logOut")} iconName="SignOut" onClick={() => setLogoutOpen(true)} />
      </div>

      <BottomSheet open={logoutOpen} onClose={() => setLogoutOpen(false)} title={t("logOutTitle")}>
        <div className="flex flex-col gap-md text-center">
          <p className="text-body-sm text-text-secondary">{t("logOutBody")}</p>
          <div className="grid grid-cols-2 gap-sm">
            <Button variant="secondary" className="rounded-full" onClick={() => setLogoutOpen(false)}>
              {t("cancel")}
            </Button>
            <Button className="rounded-full" onClick={() => void onSignOut()}>
              {t("confirmLogOut")}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
