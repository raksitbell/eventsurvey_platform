"use client";
import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import BrandingMaterialPreview from "./BrandingMaterialPreview";
import Button from "@/components/ui/button/Button";
import { useModal } from "@/hooks/useModal";
import { eventBrandingSchema } from "@/core/event/branding";
import { eventColorForeground } from "@/core/event/participant-colors";
import type { BrandingColorKey, EventBranding } from "@/types/event/branding";
import BrandingUploadDialog from "./BrandingUploadDialog";
import BrandingColorPicker from "./BrandingColorPicker";

type ColorKey = BrandingColorKey | "gradientEnd" | "footerColor";
interface Props {
  branding: EventBranding;
  bannerUrl: string | null;
  onClose: () => void;
  onSave: (changes: Partial<EventBranding>) => boolean;
}
const platforms = [
  "Facebook",
  "Instagram",
  "X",
  "TikTok",
  "YouTube",
  "LINE",
  "LinkedIn",
  "Website",
  "Other",
];
export default function SetupBrandingDialog({
  branding,
  bannerUrl,
  onClose,
  onSave,
}: Props) {
  const t = useTranslations("eventSetup"),
    b = useTranslations("eventBranding");
  const [value, setValue] = useState(branding);
  const [error, setError] = useState("");
  const [key, setKey] = useState<ColorKey>("primary");
  const picker = useModal(),
    upload = useModal();
  const id = useId();
  function change(changes: Partial<EventBranding>) {
    setValue((v) => ({ ...v, ...changes }));
    setError("");
  }
  const isWordmark = value.identity === "wordmark";

  const mode = value.backgroundMode ?? "solid";
  const channels = value.channels ?? [];
  function color(field: ColorKey) {
    return (
      value[field] ??
      (field === "footerColor" ? value.primary : value.secondary)
    );
  }
  function swatch(field: ColorKey) {
    return (
      <button
        type="button"
        key={field}
        className="event-option text-start"
        style={{
          background: color(field),
          color: eventColorForeground(color(field)),
        }}
        onClick={() => {
          setKey(field);
          picker.openModal();
        }}
      >
        {t(field)} · {color(field)}
      </button>
    );
  }
  if (picker.isOpen)
    return (
      <BrandingColorPicker
        colorKey={
          key === "footerColor"
            ? "primary"
            : key === "gradientEnd"
              ? "secondary"
              : key
        }
        value={color(key)}
        onSelect={(c) => change({ [key]: c })}
        onClose={picker.closeModal}
      />
    );
  if (upload.isOpen)
    return (
      <BrandingUploadDialog
        kind="logo"
        identityAsset
        onClose={upload.closeModal}
        onSelect={(image) => {
          change({ [isWordmark ? "wordmark" : "logo"]: image });
          upload.closeModal();
          return true;
        }}
      />
    );
  return (
    <Modal
      isOpen
      onClose={onClose}
      labelledBy={id}
      className="max-h-full max-w-3xl space-y-4 overflow-y-auto"
    >
      <h2 id={id} className="text-xl font-bold">
        {t("branding")}
      </h2>
      <label className="block">
        {t("organizer")}
        <input
          className="event-input"
          value={value.organizer ?? ""}
          maxLength={255}
          onChange={(e) => change({ organizer: e.target.value })}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {(["icon", "wordmark"] as const).map((identity) => (
          <button
            type="button"
            key={identity}
            className="event-option"
            aria-pressed={(value.identity ?? "icon") === identity}
            onClick={() => change({ identity })}
          >
            {t(identity)}
          </button>
        ))}
        <Button variant="outline" onClick={upload.openModal}>
          {b("upload")}
        </Button>
      </div>
      {!isWordmark && (
        <label className="block">
          {t("tagline")}
          <input
            className="event-input"
            maxLength={500}
            value={value.tagline ?? ""}
            onChange={(e) => change({ tagline: e.target.value })}
          />
        </label>
      )}
      <section className="space-y-2">
        <h3>{t("channels")}</h3>
        {channels.map((channel, index) => (
          <div key={index} className="flex flex-wrap gap-2">
            <select
              className="event-option"
              aria-label={t("platform")}
              value={channel.platform}
              onChange={(e) =>
                change({
                  channels: channels.map((c, i) =>
                    i === index ? { ...c, platform: e.target.value } : c,
                  ),
                })
              }
            >
              {platforms.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <input
              type="url"
              aria-label={t("channelUrl")}
              placeholder="https://…"
              className="event-input min-w-32 flex-1"
              value={channel.url}
              onChange={(e) =>
                change({
                  channels: channels.map((c, i) =>
                    i === index ? { ...c, url: e.target.value } : c,
                  ),
                })
              }
            />
            <button
              type="button"
              aria-label={t("removeChannel")}
              onClick={() =>
                change({ channels: channels.filter((_, i) => i !== index) })
              }
            >
              ×
            </button>
          </div>
        ))}
        <Button
          variant="outline"
          disabled={channels.length >= 12}
          onClick={() =>
            change({
              channels: [...channels, { platform: platforms[0], url: "" }],
            })
          }
        >
          {t("addChannel")}
        </Button>
      </section>
      <section className="space-y-2">
        <h3>{t("background")}</h3>
        <div className="flex flex-wrap gap-2">
          {(["solid", "gradient", "blur"] as const).map((m) => (
            <button
              type="button"
              key={m}
              className="event-option"
              disabled={m === "blur" && !bannerUrl}
              aria-pressed={mode === m}
              onClick={() => change({ backgroundMode: m })}
            >
              {t(m)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {mode !== "blur" && swatch("secondary")}
          {mode === "gradient" && (
            <>
              {swatch("gradientEnd")}
              <button
                type="button"
                className="event-option"
                onClick={() =>
                  change({ gradientAngle: value.gradientAngle === 90 ? 0 : 90 })
                }
              >
                {value.gradientAngle ?? 0}°
              </button>
            </>
          )}
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!value.transparentChrome}
            onChange={(e) => change({ transparentChrome: e.target.checked })}
          />
          {t("transparent")}
        </label>
        <div className="flex flex-wrap gap-2">
          {!value.transparentChrome && (
            <>
              {swatch("primary")}
              {swatch("footerColor")}
            </>
          )}
          {swatch("accent")}
        </div>
      </section>
      <BrandingMaterialPreview branding={value} bannerUrl={bannerUrl} />
      {error && (
        <p role="alert" className="text-error-600 dark:text-error-400">
          {t(error)}
        </p>
      )}
      <footer className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          {b("cancel")}
        </Button>
        <Button
          onClick={() => {
            if (!eventBrandingSchema.safeParse(value).success)
              setError("invalidBrand");
            else if (onSave(value)) onClose();
            else setError("saveError");
          }}
        >
          {t("saveBrand")}
        </Button>
      </footer>
    </Modal>
  );
}
