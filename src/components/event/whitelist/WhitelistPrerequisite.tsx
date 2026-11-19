import { LockClosedIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { Link } from "@/i18n/navigation";

interface WhitelistPrerequisiteProps {
  builderHref?: string;
  onBack: () => void;
  backLabel: string;
}

export default function WhitelistPrerequisite({
  builderHref,
  onBack,
  backLabel,
}: WhitelistPrerequisiteProps) {
  const t = useTranslations("eventWhitelist");
  return (
    <section className="es-list-prerequisite">
      <LockClosedIcon aria-hidden="true" className="es-list-lock-icon" />
      <h1 id="setup-whitelist-title">{t("uniqueRequiredTitle")}</h1>
      <p>{t("missingUniqueField")}</p>
      <div className="es-list-prerequisite-actions">
        <Button variant="outline" onClick={onBack}>{backLabel}</Button>
        {builderHref && (
          <Link href={builderHref} className="es-list-configure">{t("configureUniqueField")}</Link>
        )}
      </div>
    </section>
  );
}
