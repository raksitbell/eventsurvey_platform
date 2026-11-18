"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import BrandingDialogFrame from "./BrandingDialogFrame";
import BrandingIcon from "./BrandingIcon";
import styles from "./BrandingDialog.module.css";
import { bannerLayouts, type BannerLayout } from "@/core/event/banner-layout";
import {
  imageUploadError,
  convertImageToWebp,
  ImageUploadError,
  IMAGE_UPLOAD_ACCEPT,
} from "@/utils/image-upload";
import type { BrandingImage } from "@/types/event/branding";
import Image from "next/image";

interface Props {
  initialBanner?: string;
  layout: BannerLayout;
  onClose: () => void;
  onApply: (image: BrandingImage) => boolean;
}
export default function BannerCropDialog({
  layout,
  initialBanner,
  onClose,
  onApply,
}: Props) {
  const t = useTranslations("eventSetup"),
    b = useTranslations("eventBranding");
  const visual = useTranslations("eventBrandVisual");
  const inputId = useId();
  const drag = useRef<{
    start: number;
    position: number;
    overflow: number;
    horizontal: boolean;
  } | null>(null);
  const [cropping, setCropping] = useState(!!initialBanner);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [position, setPosition] = useState(50);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!file) return;
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    if (!initialBanner) return;
    let current = true;
    const controller = new AbortController();
    fetch(initialBanner, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("fileRead");
        return res.blob();
      })
      .then((blob) => {
        if (current)
          setFile(
            (old) =>
              old ?? new File([blob], "banner.webp", { type: blob.type }),
          );
      })
      .catch(() => {
        if (current) {
          setCropping(false);
          setError("fileRead");
        }
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [initialBanner]);
  const size = bannerLayouts[layout];
  async function apply() {
    if (!file || busy) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    try {
      const { url, name } = await convertImageToWebp(file, {
        crop: { ...size, position: position / 100 },
        maxWidth: size.width,
        maxHeight: size.height,
        signal: controller.signal,
      });
      if (!controller.signal.aborted && !onApply({ url, name }))
        setError("fileStorage");
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof ImageUploadError ? e.code : "fileConvert");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  const picker = (
    <input
      id={inputId}
      type="file"
      className="sr-only"
      disabled={busy}
      aria-label={b("chooseFile")}
      accept={Object.keys(IMAGE_UPLOAD_ACCEPT).join(",")}
      onChange={(event) => {
        const next = event.target.files?.[0];
        if (!next) return;
        const issue = imageUploadError(next);
        setError(issue ?? "");
        setFile(issue ? null : next);
        setPosition(50);
        event.target.value = "";
      }}
    />
  );

  return (
    <BrandingDialogFrame
      title={
        cropping
          ? visual("cropTitle", { ratio: size.ratio })
          : b("uploadBanner")
      }
      variant={cropping ? "crop" : "banner"}
      onClose={onClose}
      actions={
        <>
          <button type="button" onClick={onClose}>
            {b("cancel")}
          </button>
          <button
            type="button"
            disabled={!file || !url || busy}
            onClick={() => {
              if (cropping) void apply();
              else setCropping(true);
            }}
          >
            {busy
              ? b("reading")
              : visual(cropping ? "confirmCrop" : "confirmImage")}
          </button>
        </>
      }
    >
      <div className={styles.formContent}>
        {cropping ? (
          <>
            <p>{visual("positionHint", { ratio: size.ratio })}</p>
            <div className={styles.cropStage}>
              <div
                className={styles.cropFrame}
                style={{
                  aspectRatio: size.width / size.height,
                  width: `min(100cqw, calc((100cqh - 32px) * ${size.width / size.height}), ${(352 * size.width) / size.height}px)`,
                }}
                onPointerDown={(event) => {
                  const frame = event.currentTarget;
                  const img = frame.querySelector("img");
                  if (busy || !img?.naturalWidth) return;
                  const scale = Math.max(
                    frame.clientWidth / img.naturalWidth,
                    frame.clientHeight / img.naturalHeight,
                  );
                  const excessX = img.naturalWidth * scale - frame.clientWidth;
                  const excessY =
                    img.naturalHeight * scale - frame.clientHeight;
                  const horizontal = excessX > excessY;
                  drag.current = {
                    start: horizontal ? event.clientX : event.clientY,
                    position,
                    overflow: Math.max(1, horizontal ? excessX : excessY),
                    horizontal,
                  };
                  frame.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if (!drag.current) return;
                  const { start, position, overflow, horizontal } =
                    drag.current;
                  const delta =
                    (horizontal ? event.clientX : event.clientY) - start;
                  setPosition(
                    Math.max(
                      0,
                      Math.min(100, position - (100 * delta) / overflow),
                    ),
                  );
                }}
                onLostPointerCapture={() => {
                  drag.current = null;
                }}
              >
                {file && url && (
                  <Image
                    unoptimized
                    fill
                    draggable={false}
                    src={url}
                    alt={file.name}
                    className="object-cover"
                    style={{ objectPosition: `${position}% ${position}%` }}
                  />
                )}
              </div>
              <label className={styles.cropHint}>
                {visual("dragCrop")}
                <span className="sr-only">{t("cropPosition")}</span>
                <input
                  type="range"
                  className="sr-only"
                  aria-label={t("cropPosition")}
                  min="0"
                  max="100"
                  step={1}
                  value={position}
                  disabled={busy}
                  onChange={(event) => setPosition(Number(event.target.value))}
                />
              </label>
            </div>
            <p>
              {visual("cropMinimum", {
                width: size.width,
                height: size.height,
              })}
            </p>
            {error && (
              <button
                type="button"
                className={styles.control}
                onClick={() => {
                  setCropping(false);
                  setError("");
                }}
              >
                {b("chooseFile")}
              </button>
            )}
          </>
        ) : (
          <>
            <label className={styles.drop} htmlFor={inputId}>
              {picker}
              <BrandingIcon name="upload" size={28} />
              {b("chooseFile")}
            </label>
            <p>{visual("chooseLayout")}</p>
            <p>{visual("bannerHint")}</p>
            <p role="status">{file?.name ?? visual("noBannerSelection")}</p>
          </>
        )}
        {error && (
          <p role="alert" className={styles.error}>
            {error === "cropSize"
              ? t("cropSize", { width: size.width, height: size.height })
              : b(error)}
          </p>
        )}
      </div>
    </BrandingDialogFrame>
  );
}
