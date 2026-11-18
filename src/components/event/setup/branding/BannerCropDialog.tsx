"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
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
  const id = useId();
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
      .then((res) => res.blob())
      .then((blob) => {
        if (current)
          setFile(
            (old) =>
              old ?? new File([blob], "banner.webp", { type: blob.type }),
          );
      })
      .catch(() => {
        if (current) setError("fileRead");
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
  return (
    <Modal
      isOpen
      onClose={onClose}
      labelledBy={id}
      className="max-h-full max-w-xl space-y-4 overflow-y-auto"
    >
      <h2 id={id} className="text-lg font-bold">
        {b("uploadBanner")}
      </h2>
      <p>
        {size.ratio} · {size.width} × {size.height} px
      </p>
      <input
        className="event-input"
        type="file"
        accept={Object.keys(IMAGE_UPLOAD_ACCEPT).join(",")}
        disabled={busy}
        aria-label={b("chooseFile")}
        onChange={(e) => {
          const next = e.target.files?.[0];
          if (!next) return;
          const issue = imageUploadError(next);
          setError(issue ?? "");
          setFile(issue ? null : next);
          setPosition(50);
        }}
      />
      {file && url && (
        <>
          <div
            className="mx-auto w-full max-w-64 overflow-hidden rounded-xl"
            style={{ aspectRatio: size.width / size.height }}
          >
            <Image
              unoptimized
              src={url}
              alt={file.name}
              width={size.width}
              height={size.height}
              className="size-full object-cover"
              style={{ objectPosition: position + "% " + position + "%" }}
            />
          </div>
          <label className="block">
            {t("cropPosition")}
            <input
              className="block w-full"
              type="range"
              min="0"
              max="100"
              value={position}
              disabled={busy}
              onChange={(e) => setPosition(Number(e.target.value))}
            />
          </label>
        </>
      )}
      {error && (
        <p role="alert" className="text-error-600 dark:text-error-400">
          {error === "cropSize"
            ? t("cropSize", { width: size.width, height: size.height })
            : b(error)}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          {b("cancel")}
        </Button>
        <Button disabled={!file || busy} onClick={() => void apply()}>
          {busy ? b("reading") : b("useImage")}
        </Button>
      </div>
    </Modal>
  );
}
