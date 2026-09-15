"use client";

import { useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/en.json";
import hi from "@/i18n/hi.json";
import type { Locale } from "@/lib/config";
import { SEVERITIES } from "@/lib/domain/severity";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardTruncatedText } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Toggle } from "@/components/ui/Toggle";
import { Tabs } from "@/components/ui/Tabs";
import { ToastProvider, useToast } from "@/components/ui/ToastProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Icon } from "@/components/ui/Icon";
import { LanguageSwitcher } from "@/components/patterns/LanguageSwitcher";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Skeleton, SkeletonCard } from "@/components/patterns/Skeleton";
import { ErrorBanner } from "@/components/patterns/ErrorBanner";
import { SectionHeader } from "@/components/patterns/SectionHeader";
import { DisclaimerBanner } from "@/components/patterns/DisclaimerBanner";
import { ListRowGroup } from "@/components/patterns/ListRow";
import { IllustrationContainer } from "@/components/patterns/IllustrationContainer";
import { StageProgress } from "@/components/patterns/StageProgress";
import { SeverityBadge } from "@/components/patterns/SeverityBadge";
import { AudioIndicator } from "@/components/patterns/AudioIndicator";

const MESSAGES: Record<Locale, typeof en> = { en, hi };
const ICON_NAMES = ["Baby", "Heart", "Calendar", "Pill"];
const LIST_ITEMS = Array.from({ length: 20 }, (_, i) => ({
  id: String(i),
  title: `Item ${i + 1}`,
  subtitle: "1 tablet after lunch",
}));

function LocaleSection({ locale }: { locale: Locale }) {
  const suffix = locale;
  const [tab, setTab] = useState("one");
  const [checked, setChecked] = useState(true);
  const [toggled, setToggled] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [switcherLocale, setSwitcherLocale] = useState<Locale>(locale);
  const [playing, setPlaying] = useState(false);
  const { show } = useToast();

  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
      <section lang={locale} className="flex flex-col gap-lg border-t border-divider pt-lg">
        <h2 className="text-h1 font-display font-medium">
          {locale === "en" ? "English" : "हिंदी"}
        </h2>

        <SectionHeader action={<Button variant="tertiary">See all</Button>}>Primitives</SectionHeader>

        <div className="flex flex-wrap gap-sm">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="tertiary">Tertiary</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Loading</Button>
          <Button disabled disabledReason="Add a due date first">
            Disabled
          </Button>
        </div>

        <div className="flex flex-wrap gap-sm">
          <Card className="max-w-[220px]">
            <CardBody>
              <p className="text-body">Static card</p>
            </CardBody>
          </Card>
          <Card interactive className="max-w-[220px]" onClick={() => {}}>
            <CardBody>
              <p className="text-body">Interactive card</p>
            </CardBody>
          </Card>
          <Card interactive selected className="max-w-[220px]" onClick={() => {}}>
            <CardBody>
              <p className="text-body">Selected card</p>
            </CardBody>
          </Card>
          <Card interactive disabled className="max-w-[220px]" onClick={() => {}}>
            <CardBody>
              <p className="text-body">Disabled card</p>
            </CardBody>
          </Card>
        </div>

        <Card className="max-w-[320px]">
          <CardBody>
            <CardTruncatedText
              text="This is a long note that should truncate after a certain number of characters and offer a way to read the rest."
              maxChars={40}
              showMoreLabel="Show more"
            />
          </CardBody>
        </Card>

        <div className="flex flex-col gap-sm">
          <Input id={`input-${suffix}`} label="Baby's name" placeholder="e.g. Chintu" />
          <Input id={`input-hint-${suffix}`} label="Weight (kg)" hint="Enter your latest weighing" />
          <Input id={`input-error-${suffix}`} label="Due date" error="Enter a valid date" />
        </div>

        <div className="flex flex-col gap-sm">
          <Checkbox
            id={`checkbox-${suffix}`}
            label="I agree to the consent terms"
            checked={checked}
            onCheckedChange={setChecked}
          />
          <Checkbox id={`checkbox-disabled-${suffix}`} label="Disabled option" checked={false} onCheckedChange={() => {}} disabled />
          <Toggle id={`toggle-${suffix}`} label="Reminders" checked={toggled} onCheckedChange={setToggled} />
        </div>

        <Tabs
          tabs={[
            { id: "one", label: "Today" },
            { id: "two", label: "My Baby" },
          ]}
          activeId={tab}
          onChange={setTab}
        />

        <div className="flex flex-wrap items-center gap-sm">
          <Button variant="secondary" onClick={() => show(locale === "en" ? "Saved" : "सहेज लिया")}>
            Trigger toast
          </Button>
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Open bottom sheet
          </Button>
        </div>

        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Bottom sheet demo">
          <p className="text-body">Sheet content for the {locale} locale.</p>
        </BottomSheet>

        <div className="flex flex-wrap items-center gap-md">
          {ICON_NAMES.map((name) => (
            <Icon key={name} name={name} size="default" />
          ))}
          <Icon name="Heart" size="hero" weight="duotone" className="text-accent-primary" />
        </div>

        <LanguageSwitcher current={switcherLocale} onSelect={setSwitcherLocale} />

        <SectionHeader>Composites</SectionHeader>

        <EmptyState
          iconName="Pill"
          message="Nothing here yet. Add your first medicine when you're ready."
          action={<Button variant="secondary">Add medicine</Button>}
        />

        <div className="flex flex-col gap-sm">
          <Skeleton lines={3} />
          <SkeletonCard />
        </div>

        <ErrorBanner
          message="We could not load your medicines."
          nextStep="Check your connection and try again."
          onRetry={() => {}}
        />

        <DisclaimerBanner>From reviewed guidance, not a diagnosis.</DisclaimerBanner>

        <ListRowGroup items={LIST_ITEMS} initialCount={5} showMoreLabel="Show more" />

        <IllustrationContainer
          lottieUrl={`/gallery-placeholder-${suffix}.json`}
          staticSrc="/motif.svg"
          alt="Placeholder illustration of your baby at this stage"
        />

        <StageProgress stage={4} totalStages={9} label="Stage 4 of 9" />

        <div className="flex flex-wrap gap-sm">
          {SEVERITIES.map((severity) => (
            <SeverityBadge key={severity} severity={severity} />
          ))}
        </div>

        <div className="relative h-[56px] w-[56px]">
          <AudioIndicator playing={playing} onPlay={() => setPlaying((p) => !p)} label="Listen to this article" />
        </div>
      </section>
    </NextIntlClientProvider>
  );
}

export function ComponentGallery() {
  const [scaled, setScaled] = useState(false);

  return (
    <ToastProvider>
      <main className="flex flex-col gap-lg p-screen">
        <div className="flex items-center justify-between gap-sm">
          <h1 className="text-display font-display font-medium">Component gallery</h1>
          <Button variant="secondary" onClick={() => setScaled((s) => !s)}>
            {scaled ? "100% text" : "200% text"}
          </Button>
        </div>
        <div className={scaled ? "text-[200%]" : undefined}>
          <LocaleSection locale="en" />
          <LocaleSection locale="hi" />
        </div>
      </main>
    </ToastProvider>
  );
}
