"use client";

import BrandingDialogFrame from "./BrandingDialogFrame";
import BrandingIcon from "./BrandingIcon";
import styles from "./BrandingDialog.module.css";
import {
  IMAGE_MAX_INPUT_BYTES,
  IMAGE_UPLOAD_ACCEPT,
  ImageUploadError,
  prepareBrandingImage,
} from "@/utils/image-upload";
import type { BrandingImage, BrandingMediaKind } from "@/types/event/branding";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";

interface BrandingUploadDialogProps {
  identityAsset?: "icon" | "wordmark";
  kind: BrandingMediaKind;
  onClose: () => void;
  onSelect: (image: BrandingImage) => boolean;
}

/** TailAdmin DropZone adapted to a single confirmed branding image. */
export default function BrandingUploadDialog({
  kind,
  identityAsset,
  onClose,
  onSelect,
}: BrandingUploadDialogProps) {
  const t = useTranslations("eventBranding");
  const s = useTranslations("eventSetup");
  const visual = useTranslations("eventBrandVisual");
  const [selected, setSelected] = useState<BrandingImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const preparation = useRef<AbortController | null>(null);
  useEffect(() => () => preparation.current?.abort(), []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    maxFiles: 1,
    maxSize: identityAsset ? 5 * 1024 * 1024 : IMAGE_MAX_INPUT_BYTES - 1,
    accept: identityAsset
      ? { "image/png": [".png"], "image/svg+xml": [".svg"] }
      : IMAGE_UPLOAD_ACCEPT,
    onDropRejected: (rejected) => {
      preparation.current?.abort();
      preparation.current = null;
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
      preparation.current?.abort();
      const controller = new AbortController();
      preparation.current = controller;
      setBusy(true);
      setError(null);
      setSelected(null);
      try {
        const { name, url } = await prepareBrandingImage(file, {
          maxDimension: kind === "logo" ? 512 : 2560,
          signal: controller.signal,
        });
        if (preparation.current === controller && !controller.signal.aborted)
          setSelected({ name, url });
      } catch (error) {
        if (preparation.current === controller && !controller.signal.aborted)
          setError(error instanceof ImageUploadError ? error.code : "fileRead");
      } finally {
        if (preparation.current === controller) setBusy(false);
      }
    },
  });
  return (
    <BrandingDialogFrame
      title={
        identityAsset
          ? visual("uploadIdentity", { name: s(identityAsset) })
          : t(kind === "logo" ? "uploadLogo" : "uploadBanner")
      }
      variant="asset"
      onClose={onClose}
      actions={
        <>
          <button type="button" onClick={onClose}>
            {t("cancel")}
          </button>
          {(!identityAsset || selected) && (
            <button
              type="button"
              disabled={!selected || busy}
              onClick={() => {
                if (selected && !onSelect(selected)) setError("fileStorage");
              }}
            >
              {visual("confirmImage")}
            </button>
          )}
        </>
      }
    >
      <div className={styles.formContent}>
        <div
          {...getRootProps()}
          className={styles.drop}
          data-asset="true"
          data-dragging={isDragActive}
        >
          <input {...getInputProps()} aria-label={t("chooseFile")} />
          {selected ? (
            <Image
              src={selected.url}
              alt={selected.name}
              width={160}
              height={88}
              unoptimized
              className="h-20"
            />
          ) : (
            <BrandingIcon name="upload" size={28} />
          )}
          <span>{t("chooseFile")}</span>
        </div>
        <p>
          {identityAsset
            ? s("identityHint")
            : t(kind === "logo" ? "logoHint" : "bannerHint")}
        </p>
        <p role="status">
          {busy ? t("reading") : (selected?.name ?? visual("noSelection"))}
        </p>
        {error && (
          <p role="alert" className={styles.error}>
            {identityAsset && (error === "fileSize" || error === "fileType")
              ? s("identityHint")
              : t(error)}
          </p>
        )}
      </div>
    </BrandingDialogFrame>
  );
}
