import type { CSSProperties } from "react";
import { bannerObjectPosition } from "@/core/event/banner-layout";
import { savedFormBranding } from "@/core/event/branding";
import { eventColorForeground, participantColors } from "@/core/event/participant-colors";
import { applySetupLocalMedia, setupLocalMediaKey } from "@/core/event/setup-media-local";
import type { EventWorkspace } from "@/types/event/workspace";

export function formCanvasStyle(workspace: EventWorkspace, locale: string, userId?: string): CSSProperties {
  const { setup } = workspace;
  const saved = savedFormBranding(setup, locale, workspace.content?.defaultLocale);
  let appearance = workspace.formAppearance ?? saved;
  if (workspace.canEditEvent && userId && !setup?.publication && setup?.pendingMedia?.[locale]?.includes("banner")) {
    appearance = applySetupLocalMedia(saved, setupLocalMediaKey(userId, workspace.eventId, locale), ["banner"]);
  }
  const colors = participantColors(appearance);
  const bannerUrl = appearance.banner?.url ?? workspace.bannerUrl;
  return {
    "--form-background": appearance.secondary,
    "--form-gradient": appearance.backgroundMode === "gradient"
      ? `linear-gradient(${appearance.gradientAngle ?? 0}deg, ${appearance.secondary}, ${appearance.gradientEnd ?? appearance.primary})`
      : "none",
    "--form-banner": appearance.backgroundMode === "blur" && bannerUrl ? `url(${JSON.stringify(bannerUrl)})` : "none",
    "--form-banner-position": bannerObjectPosition(appearance.banner?.cropPosition),
    "--form-accent": appearance.accent,
    "--form-on-accent": eventColorForeground(appearance.accent),
    "--form-control": colors["--participant-control-text"],
    "--form-link": colors["--participant-link"],
  } as CSSProperties;
}
