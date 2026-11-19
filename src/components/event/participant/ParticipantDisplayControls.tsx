"use client";

import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useState } from "react";
interface ParticipantDisplayControlsProps {
  portrait: boolean;
  immersive: boolean;
  onToggleOrientation: () => void;
  onToggleImmersive: () => void;
}
export default function ParticipantDisplayControls({
  portrait,
  immersive,
  onToggleOrientation,
  onToggleImmersive,
}: ParticipantDisplayControlsProps) {
  const t = useTranslations("participantEvent");
  const [hidden, setHidden] = useState(false);
  const controls = hidden
    ? [
        {
          label: "showControls",
          Icon: EyeIcon,
          action: () => setHidden(false),
          pressed: false,
        },
      ]
    : [
        {
          label: portrait ? "landscape" : "portrait",
          Icon: portrait ? ComputerDesktopIcon : DevicePhoneMobileIcon,
          action: onToggleOrientation,
          pressed: portrait,
        },
        {
          label: immersive ? "restoreChrome" : "immersive",
          Icon: immersive ? ArrowsPointingInIcon : ArrowsPointingOutIcon,
          action: onToggleImmersive,
          pressed: immersive,
        },
        {
          label: "hideControls",
          Icon: EyeSlashIcon,
          action: () => setHidden(true),
          pressed: false,
        },
      ];
  return (
    <div
      className="fixed end-3 bottom-6 z-40 flex flex-col gap-2.5"
      style={{
        insetInlineEnd: `max(calc(var(--spacing) * 3), calc((100vw - var(--container-participant-${portrait ? "mobile" : "desktop"})) / 2 + var(--spacing) * 3))`,
      }}
    >
      {controls.map(({ label, Icon, action, pressed }) => (
        <button
          key={label}
          type="button"
          onClick={action}
          aria-label={t(label)}
          title={t(label)}
          aria-pressed={pressed}
          className="flex size-12 items-center justify-center rounded-full border border-(--participant-accent) bg-white text-(--participant-control-text) shadow-theme-md hover:bg-event-subtle dark:border-brand-400 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
        >
          <Icon className="size-6" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
