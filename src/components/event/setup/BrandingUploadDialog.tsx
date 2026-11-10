"use client";

import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import {
  IMAGE_MAX_INPUT_BYTES,
  IMAGE_UPLOAD_ACCEPT,
  ImageUploadError,
  convertImageToWebp,
} from "@/utils/image-upload";
import type { BrandingImage, BrandingMediaKind } from "@/types/event/branding";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";

interface BrandingUploadDialogProps {
  kind: BrandingMediaKind;
  onClose: () => void;
  onSelect: (image: BrandingImage) => boolean;
}

/** TailAdmin DropZone adapted to a single confirmed branding image. */
export default function BrandingUploadDialog({
  kind,
  onClose,
  onSelect,
}: BrandingUploadDialogProps) {
  const t = useTranslations("eventBranding");
  const titleId = useId();
  const [selected, setSelected] = useState<BrandingImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const conversion = useRef<AbortController | null>(null);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = globalThis.document.activeElement as HTMLElement | null;
    container.current?.querySelector<HTMLElement>("[tabindex='0']")?.focus();
    return () => {
      conversion.current?.abort();
      conversion.current = null;
      previous?.focus();
    };
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    maxFiles: 1,
    maxSize: IMAGE_MAX_INPUT_BYTES - 1,
    accept: IMAGE_UPLOAD_ACCEPT,
    onDropRejected: (rejected) => {
      conversion.current?.abort();
      conversion.current = null;
      setBusy(false);
      setSelected(null);
      setError(
        rejected.some((item) =>
          item.errors.some((issue) => issue.code === "file-too-large"),
        )
          ? "fileSize"
          : rejected.some((item) =>
                item.errors.some((issue) => issue.code === "too-many-files"),
              )
            ? "fileCount"
            : "fileType",
      );
    },
    onDropAccepted: async (files) => {
      const file = files[0];
      if (!file) return;
      conversion.current?.abort();
      const controller = new AbortController();
      conversion.current = controller;
      setBusy(true);
      setError(null);
      setSelected(null);
      try {
        const { name, url } = await convertImageToWebp(file, {
          maxWidth: kind === "logo" ? 512 : 1600,
          maxHeight: kind === "logo" ? 512 : 1600,
          signal: controller.signal,
        });
        if (conversion.current === controller && !controller.signal.aborted)
          setSelected({ name, url });
      } catch (error) {
        if (conversion.current === controller && !controller.signal.aborted)
          setError(
            error instanceof ImageUploadError ? error.code : "fileConvert",
          );
      } finally {
        if (conversion.current === controller) setBusy(false);
      }
    },
  });
  return (
    <Modal
      isOpen
      onClose={onClose}
      showCloseButton={false}
      className="max-w-xl"
      labelledBy={titleId}
      backdropClassName="bg-black/50"
    >
      <div
        ref={container}
        className="space-y-5"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = container.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled), [tabindex='0']",
          );
          if (!controls?.length) return;
          const first = controls[0],
            last = controls[controls.length - 1];
          if (event.shiftKey && globalThis.document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (
            !event.shiftKey &&
            globalThis.document.activeElement === last
          ) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <header>
          <h2
            id={titleId}
            className="text-xl font-bold text-gray-900 dark:text-white/90"
          >
            {t(kind === "logo" ? "uploadLogo" : "uploadBanner")}
          </h2>
          <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
            {t(kind === "logo" ? "logoHint" : "bannerHint")}
          </p>
        </header>
        <div
          {...getRootProps()}
          className={`flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-5 text-center focus-visible:ring-2 focus-visible:ring-event-action ${isDragActive ? "border-event-action bg-event-tile dark:border-brand-400 dark:bg-gray-800" : "border-event-border bg-event-subtle dark:border-gray-700 dark:bg-gray-800"}`}
        >
          <input {...getInputProps()} aria-label={t("chooseFile")} />
          {selected ? (
            <Image
              src={selected.url}
              alt={selected.name}
              width={160}
              height={120}
              unoptimized
              className="h-24 w-40 object-contain"
            />
          ) : (
            <ArrowUpTrayIcon
              className="size-7 text-event-action dark:text-brand-400"
              aria-hidden="true"
            />
          )}
          <p className="text-base font-semibold text-gray-800 dark:text-gray-200">
            {selected?.name ?? t("chooseFile")}
          </p>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            {t("dropFile")}
          </p>
        </div>
        {busy && (
          <p
            role="status"
            className="text-theme-sm text-gray-500 dark:text-gray-400"
          >
            {t("reading")}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="text-theme-sm text-error-600 dark:text-error-400"
          >
            {t(error)}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            disabled={!selected || busy}
            onClick={() => {
              if (selected && !onSelect(selected)) setError("fileStorage");
            }}
            className="bg-event-action dark:bg-event-action"
          >
            {t("useImage")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
