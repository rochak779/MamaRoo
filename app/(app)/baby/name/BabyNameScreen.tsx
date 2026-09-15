"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  saveBabyNames,
  setBabyNameFavorite,
  type SaveBabyNamesResult,
  type SetBabyNameFavoriteResult,
} from "@/app/actions/babyName";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/ToastProvider";
import {
  babyNameDetail,
  chooseBabyName,
  searchBabyNames,
  toggleFavoriteId,
  type BabyNameOption,
  type BabyNameValidationError,
} from "@/lib/domain/babyNames";
import { useOnline } from "@/lib/pwa/useOnline";

type Mode = "suggestions" | "add" | "find";

export interface BabyNameScreenProps {
  babyCount: 1 | 2;
  catalog: BabyNameOption[];
  initialFavoriteIds: string[];
  initialNames: string[];
  onSaveNames?: (input: { names: unknown }) => Promise<SaveBabyNamesResult>;
  onSetFavorite?: (input: {
    babyNameId: string;
    favorite: boolean;
  }) => Promise<SetBabyNameFavoriteResult>;
}

function NameRow({
  option,
  favorite,
  onOpen,
  onFavorite,
  favoriteLabel,
  openLabel,
  disabled,
}: {
  option: BabyNameOption;
  favorite: boolean;
  onOpen: () => void;
  onFavorite: () => void;
  favoriteLabel: string;
  openLabel: string;
  disabled: boolean;
}) {
  return (
    <article className="flex items-center gap-md rounded-[16px] bg-surface-raised px-md py-sm shadow-1">
      <button
        type="button"
        aria-label={openLabel}
        onClick={onOpen}
        className="tap-target flex min-w-0 flex-1 flex-col justify-center gap-xs rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
      >
        <span className="font-body text-body font-semibold text-text-primary">{option.name}</span>
        <span className="text-caption text-text-secondary">{option.meaning}</span>
      </button>
      <button
        type="button"
        aria-label={favoriteLabel}
        aria-pressed={favorite}
        disabled={disabled}
        onClick={onFavorite}
        className={`tap-target inline-flex shrink-0 items-center justify-center rounded-full transition-[color,transform] duration-(--motion-fast) ease-standard active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary disabled:opacity-40 ${
          favorite ? "text-accent-primary [&_svg]:fill-current" : "bg-transparent text-text-primary"
        }`}
      >
        <Icon name="Heart" size="inline" weight={favorite ? "duotone" : "regular"} />
      </button>
    </article>
  );
}

export function BabyNameScreen({
  babyCount,
  catalog,
  initialFavoriteIds,
  initialNames,
  onSaveNames = saveBabyNames,
  onSetFavorite = setBabyNameFavorite,
}: BabyNameScreenProps) {
  const t = useTranslations("babyName");
  const { show } = useToast();
  const online = useOnline();
  const savingRef = useRef(false);
  const [mode, setMode] = useState<Mode>("suggestions");
  const [favoriteIds, setFavoriteIds] = useState(() => [...new Set(initialFavoriteIds)]);
  const [chosenNames, setChosenNames] = useState(initialNames);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [favoritePendingId, setFavoritePendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeName = activeId ? babyNameDetail(catalog, activeId) : null;
  const filtered = searchBabyNames(catalog, query);
  const tabs = [
    { id: "suggestions", label: t("tabs.suggestions") },
    { id: "add", label: t("tabs.add") },
    { id: "find", label: t("tabs.find") },
  ];

  function validationMessage(kind: BabyNameValidationError): string {
    if (kind === "too_many")
      return babyCount === 2 ? t("errors.tooManyTwins") : t("errors.tooManySingleton");
    if (kind === "too_long") return t("errors.tooLong");
    if (kind === "duplicate") return t("errors.duplicate");
    if (kind === "empty") return t("errors.empty");
    return t("errors.invalid");
  }

  async function persistNames(nextNames: string[]) {
    if (!online) {
      setError(t("offline"));
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const result = await onSaveNames({ names: nextNames });
      if (result.ok) {
        setChosenNames(result.names);
        setCustomName("");
        setMode("suggestions");
        setActiveId(null);
        show(t("savedToast"));
      } else if ("errors" in result && result.errors.names) {
        setError(validationMessage(result.errors.names));
      } else {
        setError(t("errors.save"));
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function choose(name: string) {
    const result = chooseBabyName({ current: chosenNames, name, babyCount });
    if (!result.ok) {
      setError(validationMessage(result.error));
      return;
    }
    await persistNames(result.value);
  }

  async function toggleFavorite(option: BabyNameOption) {
    if (!online || favoritePendingId) {
      if (!online) setError(t("offline"));
      return;
    }
    const favorite = !favoriteIds.includes(option.id);
    setFavoritePendingId(option.id);
    setError(null);
    const result = await onSetFavorite({ babyNameId: option.id, favorite });
    setFavoritePendingId(null);
    if (!result.ok) {
      setError(t("errors.favorite"));
      return;
    }
    setFavoriteIds((current) => toggleFavoriteId(current, option.id));
    show(favorite ? t("favoriteSavedToast") : t("favoriteRemovedToast"));
  }

  function favoriteLabel(option: BabyNameOption): string {
    return favoriteIds.includes(option.id)
      ? t("favoriteRemove", { name: option.name })
      : t("favoriteAdd", { name: option.name });
  }

  if (activeName) {
    const isFavorite = favoriteIds.includes(activeName.id);
    const isChosen = chosenNames.some(
      (name) =>
        name.normalize("NFKC").toLocaleLowerCase() ===
        activeName.name.normalize("NFKC").toLocaleLowerCase(),
    );
    const atTwinLimit = babyCount === 2 && chosenNames.length >= 2 && !isChosen;

    return (
      <section
        data-testid="baby-name-screen"
        className="mx-auto flex min-h-[calc(100dvh-140px)] w-full max-w-[680px] flex-col gap-lg py-screen selection:bg-blush selection:text-text-primary"
        aria-labelledby="baby-name-detail-title"
      >
        <button
          type="button"
          aria-label={t("backToList")}
          onClick={() => {
            setActiveId(null);
            setError(null);
          }}
          className="tap-target inline-flex w-fit items-center justify-center rounded-full bg-surface-raised text-text-primary shadow-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
        >
          <Icon name="ArrowLeft" size="inline" />
        </button>

        <div className="flex flex-1 flex-col items-center gap-md pt-xl text-center">
          <h1
            id="baby-name-detail-title"
            className="font-display text-display font-semibold text-text-primary"
          >
            {activeName.name}
          </h1>
          <p className="max-w-[38ch] text-body text-text-secondary">{activeName.meaning}</p>
          {isChosen && (
            <p className="text-body-sm font-medium text-accent-secondary">{t("chosenMarker")}</p>
          )}
          {error && (
            <p role="alert" className="max-w-[36ch] text-body-sm text-alert">
              {error}
            </p>
          )}
          <div className="mt-md flex w-full max-w-[360px] flex-col gap-sm">
            <Button
              type="button"
              variant={isFavorite ? "primary" : "secondary"}
              aria-label={favoriteLabel(activeName)}
              aria-pressed={isFavorite}
              disabled={!online || favoritePendingId === activeName.id}
              {...(!online ? { disabledReason: t("offline") } : {})}
              onClick={() => void toggleFavorite(activeName)}
              className="w-full [&_svg]:fill-current"
            >
              <Icon name="Heart" size="inline" weight={isFavorite ? "duotone" : "regular"} />
              {isFavorite ? t("favoriteSaved") : t("favoriteSave")}
            </Button>
            <Button
              type="button"
              variant="tertiary"
              loading={saving}
              disabled={isChosen || atTwinLimit || !online}
              {...(!online
                ? { disabledReason: t("offline") }
                : atTwinLimit
                  ? { disabledReason: t("errors.tooManyTwins") }
                  : isChosen
                    ? { disabledReason: t("chosenMarker") }
                    : {})}
              onClick={() => void choose(activeName.name)}
              className="w-full"
            >
              {isChosen ? t("chosenMarker") : t("useName", { name: activeName.name })}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="baby-name-screen"
      className="mx-auto flex w-full max-w-[680px] flex-col gap-lg py-screen selection:bg-blush selection:text-text-primary"
      aria-labelledby="baby-name-title"
    >
      <header className="flex items-center gap-md">
        <Link
          href="/baby"
          aria-label={t("backToBaby")}
          className="tap-target inline-flex items-center justify-center rounded-full bg-surface-raised text-text-primary shadow-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
        >
          <Icon name="ArrowLeft" size="inline" />
        </Link>
        <h1 id="baby-name-title" className="font-display text-h1 font-semibold text-text-primary">
          {t("title")}
        </h1>
      </header>

      {!online && (
        <p
          role="status"
          className="rounded-sm bg-surface px-md py-sm text-body-sm text-text-secondary"
        >
          {t("offline")}
        </p>
      )}

      {chosenNames.length > 0 && (
        <section aria-labelledby="chosen-names-title">
          <h2 id="chosen-names-title" className="sr-only">
            {babyCount === 2 ? t("chosenTitleTwins") : t("chosenTitle")}
          </h2>
          <ul className="flex flex-wrap gap-sm">
            {chosenNames.map((name) => (
              <li
                key={name}
                className="inline-flex min-h-[48px] items-center gap-xs rounded-full bg-surface-raised pl-md shadow-1"
              >
                <span className="text-body font-medium">{name}</span>
                <button
                  type="button"
                  aria-label={t("removeName", { name })}
                  disabled={saving || !online}
                  onClick={() => void persistNames(chosenNames.filter((item) => item !== name))}
                  className="tap-target inline-flex items-center justify-center rounded-full text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary disabled:opacity-40"
                >
                  <Icon name="X" size="inline" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="rounded-full bg-surface-raised p-xs shadow-1 [&_[role=tablist]]:gap-0 [&_[role=tab]]:flex-1 [&_[role=tab]]:rounded-full [&_[role=tab]]:font-semibold [&_[role=tab][aria-selected=true]]:bg-accent-secondary">
        <Tabs
          tabs={tabs}
          activeId={mode}
          onChange={(next) => {
            setMode(next as Mode);
            setError(null);
          }}
        />
      </div>

      {mode === "suggestions" &&
        (catalog.length === 0 ? (
          <EmptyState iconName="Heart" message={t("emptyCatalog")} />
        ) : (
          <div className="flex flex-col gap-sm">
            {catalog.map((option) => (
              <NameRow
                key={option.id}
                option={option}
                favorite={favoriteIds.includes(option.id)}
                disabled={!online || favoritePendingId === option.id}
                openLabel={t("openDetail", { name: option.name })}
                favoriteLabel={favoriteLabel(option)}
                onOpen={() => {
                  setActiveId(option.id);
                  setError(null);
                }}
                onFavorite={() => void toggleFavorite(option)}
              />
            ))}
          </div>
        ))}

      {mode === "add" && (
        <div className="flex flex-col gap-sm">
          <Input
            id="custom-baby-name"
            label={t("customLabel")}
            placeholder={t("customPlaceholder")}
            value={customName}
            maxLength={61}
            autoComplete="off"
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? "custom-baby-name-error" : "custom-baby-name-hint"}
            onChange={(event) => {
              setCustomName(event.target.value);
              setError(null);
            }}
            className="bg-surface-raised caret-accent-primary"
          />
          {error ? (
            <p id="custom-baby-name-error" role="alert" className="text-caption text-alert">
              {error}
            </p>
          ) : (
            <p id="custom-baby-name-hint" className="text-caption text-text-secondary">
              {t("customHint")}
            </p>
          )}
          <Button
            type="button"
            loading={saving}
            disabled={!customName.trim() || !online}
            {...(!online
              ? { disabledReason: t("offline") }
              : !customName.trim()
                ? { disabledReason: t("errors.empty") }
                : {})}
            onClick={() => void choose(customName)}
            className="mt-md w-full rounded-full"
          >
            {t("saveCustom")}
          </Button>
        </div>
      )}

      {mode === "find" && (
        <div className="flex flex-col gap-md">
          <Input
            id="baby-name-search"
            type="search"
            label={t("searchLabel")}
            placeholder={t("searchPlaceholder")}
            value={query}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            className="rounded-full bg-surface-raised pl-lg caret-accent-primary shadow-1"
          />
          {filtered.length === 0 ? (
            <p className="py-xl text-center text-body-sm text-text-secondary">{t("noResults")}</p>
          ) : (
            <div className="flex flex-col gap-sm">
              {filtered.map((option) => (
                <NameRow
                  key={option.id}
                  option={option}
                  favorite={favoriteIds.includes(option.id)}
                  disabled={!online || favoritePendingId === option.id}
                  openLabel={t("openDetail", { name: option.name })}
                  favoriteLabel={favoriteLabel(option)}
                  onOpen={() => {
                    setActiveId(option.id);
                    setError(null);
                  }}
                  onFavorite={() => void toggleFavorite(option)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {error && mode !== "add" && (
        <p role="alert" className="text-body-sm text-alert">
          {error}
        </p>
      )}
    </section>
  );
}
