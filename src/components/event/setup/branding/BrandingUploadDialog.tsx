"use client";

import BrandingDialogFrame from "./BrandingDialogFrame";
import BrandingCropFrame from "./BrandingCropFrame";
import BrandingIcon from "./BrandingIcon";
import styles from "./BrandingDialog.module.css";
import {
  identityCropFrames,
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

interface Props {
  identityAsset?: keyof typeof identityCropFrames;
  initialImage?: BrandingImage | null;
  kind: BrandingMediaKind;
  onClose: () => void;
  onSelect: (image: BrandingImage) => boolean;
}
type Selection = { image: BrandingImage; file?: File };
const centered = { x: 50, y: 50 };
const identityTypes = { "image/png": [".png"], "image/svg+xml": [".svg"] };

/** TailAdmin single-file dropzone with a locked crop when editing a brand identity. */
export default function BrandingUploadDialog({
  kind,
  identityAsset,
  initialImage,
  onClose,
  onSelect,
}: Props) {
  const t = useTranslations("eventBranding");
  const s = useTranslations("eventSetup");
  const visual = useTranslations("eventBrandVisual");
  const [selected, setSelected] = useState<Selection | null>(
    initialImage ? { image: initialImage } : null,
  );
  const [position, setPosition] = useState(centered);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const preparation = useRef<AbortController | null>(null);
  const cropStage = useRef<HTMLDivElement>(null);
  const cropAsset = identityAsset ?? (kind === "logo" ? "icon" : undefined);
  const frame = cropAsset && identityCropFrames[cropAsset];
  const cropping = Boolean(frame && selected);
  useEffect(() => () => preparation.current?.abort(), []);

  async function prepare(work: (signal: AbortSignal) => Promise<void>) {
    preparation.current?.abort();
    const controller = new AbortController();
    preparation.current = controller;
    setBusy(true);
    setError(null);
    try {
      await work(controller.signal);
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof ImageUploadError ? cause.code : "fileRead");
    } finally {
      if (preparation.current === controller) {
        preparation.current = null;
        if (!controller.signal.aborted) setBusy(false);
      }
    }
  }
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    multiple: false,
    maxFiles: 1,
    maxSize: identityAsset ? 5 * 1024 * 1024 : IMAGE_MAX_INPUT_BYTES - 1,
    accept: identityAsset ? identityTypes : IMAGE_UPLOAD_ACCEPT,
    onDropRejected: (rejected) => {
      preparation.current?.abort();
      preparation.current = null;
      setBusy(false);
      const codes = rejected.flatMap(({ errors }) =>
        errors.map(({ code }) => code),
      );
      setError(
        codes.includes("file-too-large")
          ? "fileSize"
          : codes.includes("too-many-files")
            ? "fileCount"
            : "fileType",
      );
    },
    onDropAccepted: ([file]) => {
      if (!file) return;
      void prepare(async (signal) => {
        if (identityAsset && !Object.hasOwn(identityTypes, file.type))
          throw new ImageUploadError("fileType");
        const image = await prepareBrandingImage(file, {
          maxDimension: kind === "logo" ? 512 : 2560,
          optimize: !cropAsset,
          signal,
        });
        if (signal.aborted) return;
        setSelected({ image, file });
        setPosition(centered);
        setZoom(1);
      });
    },
  });

  function apply() {
    if (!selected || busy) return;
    const existing = cropStage.current?.querySelector("img");
    const unchanged =
      !selected.file &&
      zoom === 1 &&
      existing?.naturalWidth &&
      frame &&
      existing.naturalWidth * frame.height ===
        existing.naturalHeight * frame.width;
    if (!cropAsset || unchanged) {
      if (!onSelect(selected.image)) setError("fileStorage");
      return;
    }
    void prepare(async (signal) => {
      let file = selected.file;
      if (!file) {
        const response = await globalThis.fetch(selected.image.url, { signal });
        if (!response.ok) throw new ImageUploadError("fileRead");
        const blob = await response.blob();
        file = new File([blob], selected.image.name, { type: blob.type });
      }
      const image = await prepareBrandingImage(file, {
        maxDimension: 512,
        identityCrop: { asset: cropAsset, ...position, zoom },
        signal,
      });
      if (!signal.aborted && !onSelect(image)) setError("fileStorage");
    });
  }
  return (
    <BrandingDialogFrame
      title={
        cropping
          ? visual("cropIdentity", {
              name: identityAsset ? s(identityAsset) : t("logo"),
            })
          : identityAsset
            ? visual("uploadIdentity", { name: s(identityAsset) })
            : t(kind === "logo" ? "uploadLogo" : "uploadBanner")
      }
      variant={cropping ? "crop" : "asset"}
      onClose={onClose}
      actions={
        <>
          <button type="button" onClick={onClose}>
            {t("cancel")}
          </button>
          <button type="button" disabled={!selected || busy} onClick={apply}>
            {visual(cropping ? "confirmCrop" : "confirmImage")}
          </button>
        </>
      }
    >
      <div className={styles.formContent}>
        <input {...getInputProps()} aria-label={t("chooseFile")} />
        {cropping && frame && selected ? (
          <>
            <p>{visual("positionHint", { ratio: frame.ratio })}</p>
            <div
              ref={cropStage}
              className={styles.cropStage}
              data-identity="true"
            >
              <BrandingCropFrame
                ratio={frame.width / frame.height}
                src={selected.image.url}
                name={selected.image.name}
                position={position}
                onPosition={setPosition}
                zoom={zoom}
                disabled={busy}
                keyboardLabel={visual("cropKeyboard")}
              />
              <p className={styles.cropHint}>{visual("dragCrop")}</p>
            </div>
            <label className={styles.zoom}>
              <span>{visual("cropZoom")}</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                disabled={busy}
                value={zoom}
                aria-valuetext={`${Math.round(zoom * 100)}%`}
                onChange={(event) => setZoom(Number(event.target.value))}
              />
              <span>{Math.round(zoom * 100)}%</span>
            </label>
            <button
              type="button"
              className={styles.control}
              onClick={open}
              disabled={busy}
            >
              {t("chooseFile")}
            </button>
          </>
        ) : (
          <div
            {...getRootProps({ role: "button" })}
            className={styles.drop}
            data-asset="true"
            data-dragging={isDragActive}
          >
            {selected ? (
              <Image
                src={selected.image.url}
                alt={selected.image.name}
                width={160}
                height={80}
                unoptimized
              />
            ) : (
              <BrandingIcon name="upload" size={28} />
            )}
            <span>{t("chooseFile")}</span>
          </div>
        )}
        <p>
          {identityAsset
            ? s("identityHint")
            : t(kind === "logo" ? "logoHint" : "bannerHint")}
        </p>
        <p role="status">
          {busy
            ? t("reading")
            : (selected?.image.name ?? visual("noSelection"))}
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
