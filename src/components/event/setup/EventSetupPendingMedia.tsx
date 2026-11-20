import Button from "@/components/ui/button/Button";
import type { EventSetupMediaKind } from "@/types/event/setup";
import { useTranslations } from "next-intl";

interface EventSetupPendingMediaProps {
  kinds: readonly EventSetupMediaKind[];
  onDiscard: (kind: EventSetupMediaKind) => void;
  disabled?: boolean;
}

export default function EventSetupPendingMedia({
  kinds,
  onDiscard,
  disabled,
}: EventSetupPendingMediaProps) {
  const t = useTranslations("eventSetup");
  const branding = useTranslations("eventBranding");
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {kinds.map((kind) => (
        <Button
          key={kind}
          variant="outline"
          disabled={disabled}
          onClick={() => onDiscard(kind)}
        >
          {t("mediaDiscardPending", {
            name: kind === "wordmark" ? t("wordmark") : branding(kind),
          })}
        </Button>
      ))}
    </div>
  );
}
