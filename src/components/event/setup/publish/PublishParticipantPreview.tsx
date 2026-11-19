"use client";

import ParticipantPreviewLanguage from "@/components/event/participant/ParticipantPreviewLanguage";
import ParticipantDisplayPreview from "@/components/event/participant/ParticipantDisplayPreview";
import { afterSaved } from "@/core/event/draft";
import { useModal } from "@/hooks/useModal";
import useParticipantPreviewLanguage from "@/hooks/useParticipantPreviewLanguage";
import type { ParticipantEventData } from "@/types/event/participant";
import { EyeIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

interface PublishParticipantPreviewProps extends ParticipantEventData {
  onOpen: () => boolean | Promise<boolean>;
  disabled?: boolean;
}

export default function PublishParticipantPreview({
  onOpen,
  disabled,
  ...data
}: PublishParticipantPreviewProps) {
  const t = useTranslations("eventSetup");
  const preview = useTranslations("eventPreview");
  const publish = useTranslations("eventPublish");
  const { isOpen, openModal, closeModal } = useModal();
  const [opening, setOpening] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialogTitle = useId();
  const { content, translation, contentLocale, selectLanguage } =
    useParticipantPreviewLanguage(data.draft);
  const languageControl = content.translations.length > 1 && (
    <ParticipantPreviewLanguage
      content={content}
      value={translation.localeCode}
      onChange={selectLanguage}
    />
  );

  useEffect(() => {
    if (!isOpen || !dialog.current) return;
    const panel = dialog.current;
    const body = globalThis.document.body;
    const overflow = body.style.overflow;
    const origin = trigger.current;
    panel.showModal();
    body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => {
      panel.close();
      body.style.overflow = overflow;
      origin?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  async function openPreview() {
    setOpening(true);
    try {
      await afterSaved(onOpen, openModal);
    } finally {
      setOpening(false);
    }
  }

  return (
    <section className="publish-card publish-preview">
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{t("displayPreview")}</h2>
        {languageControl}
      </div>
      <div
        inert
        aria-hidden="true"
        className="w-full max-w-md overflow-hidden rounded-preview-control"
      >
        <ParticipantDisplayPreview
          {...data}
          contentLocale={contentLocale}
        />
      </div>
      <button
        type="button"
        ref={trigger}
        className="publish-preview__link"
        aria-haspopup="dialog"
        disabled={disabled || opening}
        onClick={openPreview}
      >
        <EyeIcon className="size-4 shrink-0" aria-hidden="true" />
        {t("fullscreen")}
      </button>
      {isOpen && (
        <dialog
          ref={dialog}
          className="publish-preview-dialog"
          data-banner-layout={data.branding.layout ?? "portrait"}
          aria-labelledby={dialogTitle}
          onCancel={(event) => {
            event.preventDefault();
            closeModal();
          }}
        >
          <header className="publish-preview-dialog__header">
            <div className="min-w-0 flex-1">
              <h2 id={dialogTitle}>{preview("title")}</h2>
              <p>{preview("description")}</p>
            </div>
            <button
              type="button"
              ref={closeButton}
              onClick={closeModal}
              aria-label={publish("close")}
              className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg border border-preview-border bg-white dark:border-gray-700 dark:bg-gray-900"
            >
              <XMarkIcon className="size-5" aria-hidden="true" />
            </button>
            {languageControl && (
              <div className="flex basis-full">{languageControl}</div>
            )}
          </header>
          <div
            role="region"
            aria-label={preview("viewport")}
            tabIndex={0}
            className="publish-preview-dialog__viewport"
          >
            <ParticipantDisplayPreview
              {...data}
              contentLocale={contentLocale}
            />
          </div>
        </dialog>
      )}
    </section>
  );
}
