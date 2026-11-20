"use client";

import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import {
  contentLanguageCodes,
  normalizeContentLocale,
} from "@/core/event/content";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";

interface EventLanguagePickerProps {
  uiLocale: string;
  existing: readonly string[];
  onAdd: (code: string) => void;
}

export default function EventLanguagePicker({
  uiLocale,
  existing,
  onAdd,
}: EventLanguagePickerProps) {
  const t = useTranslations("eventHome.details.languages");
  const id = useId();
  const listId = id + "-options";
  const [query, setQuery] = useState("");
  const [activeCode, setActiveCode] = useState<string | null>(null);

  useEffect(() => {
    globalThis.document.getElementById(id)?.focus({ preventScroll: true });
  }, [id]);

  const languages = useMemo(() => {
    const displayOptions = { type: "language", fallback: "none" } as const;
    const localizedNames = new Intl.DisplayNames(uiLocale, displayOptions);
    const englishNames = new Intl.DisplayNames("en", displayOptions);
    const collator = new Intl.Collator(uiLocale);
    return contentLanguageCodes
      .map((code) => {
        const englishName = englishNames.of(code);
        const name = localizedNames.of(code) ?? englishName ?? code;
        return { code, name, searchText: `${name} ${englishName ?? ""}`.toLowerCase() };
      })
      .sort((a, b) => collator.compare(a.name, b.name));
  }, [uiLocale]);

  const search = query.trim().toLowerCase();
  const exactCode = normalizeContentLocale(search);
  const results = search
    ? languages.filter(({ code, searchText }) =>
        exactCode ? code === exactCode : code.startsWith(search) || searchText.includes(search),
      )
    : [];
  const matches = results.filter(({ code }) => !existing.includes(code)).slice(0, 5);
  const active = matches.find(({ code }) => code === activeCode);
  const optionId = (code: string) => listId + "-" + code;

  function handleSearchKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter") {
      event.preventDefault();
      const selection = active ?? (matches.length === 1 ? matches[0] : undefined);
      if (selection) onAdd(selection.code);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (!matches.length) return;
    const index = active ? matches.indexOf(active) : -1;
    const nextIndex = event.key === "ArrowDown"
      ? (index + 1) % matches.length
      : index <= 0 ? matches.length - 1 : index - 1;
    const { code } = matches[nextIndex];
    setActiveCode(code);
    globalThis.document
      .getElementById(optionId(code))
      ?.scrollIntoView({ block: "nearest" });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="mb-0 font-semibold">
          {t("add")}
        </Label>
        <a
          href="https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes"
          target="_blank"
          rel="noreferrer"
          aria-label={t("codeHelpLink")}
          title={t("codeHelpLink")}
          className="grid size-8 shrink-0 place-items-center rounded-md text-event-action hover:bg-event-subtle focus-visible:outline-2 focus-visible:outline-event-action dark:text-brand-300 dark:hover:bg-gray-800"
        >
          <InformationCircleIcon className="size-5" aria-hidden="true" />
        </a>
      </div>
      <Input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={matches.length > 0}
        aria-controls={listId}
        aria-activedescendant={active ? optionId(active.code) : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={t("search")}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveCode(null);
        }}
        onKeyDown={handleSearchKeys}
        className="text-portal-body! placeholder:text-event-display-muted dark:placeholder:text-gray-400"
      />
      <ul
        id={listId}
        role="listbox"
        aria-label={t("add")}
        hidden={!matches.length}
        className="max-h-40 overflow-y-auto rounded-picker border border-event-display-border dark:border-gray-600"
      >
        {matches.map(({ code, name }) => (
          <li
            key={code}
            id={optionId(code)}
            role="option"
            aria-selected={active?.code === code}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onAdd(code)}
            className="flex min-h-9 cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm text-event-display-text hover:bg-event-subtle aria-selected:bg-event-subtle dark:text-white/90 dark:hover:bg-gray-800 dark:aria-selected:bg-gray-800"
          >
            <span>{name}</span>
            <span className="shrink-0 font-semibold text-event-display-muted dark:text-gray-300">
              {code.toUpperCase()}
            </span>
          </li>
        ))}
      </ul>
      {!!search && !matches.length && (
        <p role="status" className="text-portal-caption text-event-display-muted dark:text-gray-300">
          {results.length ? t("duplicate") : t("noResults")}
        </p>
      )}
    </div>
  );
}
