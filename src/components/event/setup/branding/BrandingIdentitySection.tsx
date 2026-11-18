import Image from "next/image";
import { useTranslations } from "next-intl";
import type { EventBranding } from "@/types/event/branding";
import BrandingIcon from "./BrandingIcon";
import styles from "./BrandingDialog.module.css";

interface Props {
  value: EventBranding;
  change: (changes: Partial<EventBranding>) => void;
  onUpload: () => void;
  onPreview: () => void;
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

export default function BrandingIdentitySection({
  value,
  change,
  onUpload,
  onPreview,
}: Props) {
  const t = useTranslations("eventSetup");
  const visual = useTranslations("eventBrandVisual");
  const identity = value.identity ?? "icon";
  const asset = identity === "wordmark" ? value.wordmark : value.logo;
  const channels = value.channels ?? [];
  return (
    <section>
      <h3>
        <BrandingIcon name="identity" />
        {t("organizer")}
      </h3>
      <div className={styles.segments}>
        {(["icon", "wordmark"] as const).map((choice) => (
          <button
            key={choice}
            type="button"
            className={styles.control}
            aria-pressed={choice === identity}
            onClick={() => {
              change({ identity: choice });
              onPreview();
            }}
          >
            {t(choice)}
          </button>
        ))}
      </div>
      <div className={styles.assetRow} data-wordmark={identity === "wordmark"}>
        <button type="button" className={styles.assetButton} onClick={onUpload}>
          <BrandingIcon name="choose-banner" size={18} />
          {visual("uploadIdentity", { name: t(identity) })}
        </button>
        {(identity === "wordmark" || asset) && (
          <figure className={styles.identityPreview}>
            {asset && (
              <Image
                unoptimized
                src={asset.url}
                alt={asset.name}
                width={227}
                height={54}
                className="size-full object-contain"
              />
            )}
          </figure>
        )}
      </div>
      <label className={styles.field}>
        {t("organizer")}
        <input
          value={value.organizer ?? ""}
          maxLength={255}
          onChange={(e) => change({ organizer: e.target.value })}
        />
      </label>
      <label className={styles.field}>
        {t("tagline")}
        <input
          value={value.tagline ?? ""}
          maxLength={500}
          onChange={(e) => change({ tagline: e.target.value })}
        />
      </label>
      <div className={styles.social}>
        <h4>
          <BrandingIcon name="organizers" />
          {t("channels")}
          <small>{visual("optional")}</small>
        </h4>
        {channels.map((channel, index) => (
          <div key={index} className={styles.channel}>
            <select
              value={channel.platform}
              aria-label={t("platform")}
              onChange={(e) =>
                change({
                  channels: channels.map((c, i) =>
                    i === index ? { ...c, platform: e.target.value } : c,
                  ),
                })
              }
            >
              {platforms.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
            <input
              type="url"
              aria-label={t("channelUrl")}
              placeholder="https://…"
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
              <BrandingIcon name="close" size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className={styles.control}
          disabled={channels.length >= 12}
          onClick={() =>
            change({
              channels: [...channels, { platform: platforms[0], url: "" }],
            })
          }
        >
          <BrandingIcon name="add-channel" size={18} />
          {t("addChannel")}
        </button>
      </div>
    </section>
  );
}
