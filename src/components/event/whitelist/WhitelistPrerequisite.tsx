import { LockClosedIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface WhitelistPrerequisiteProps {
  builderHref?: string;
}

export default function WhitelistPrerequisite({
  builderHref,
}: WhitelistPrerequisiteProps) {
  const t = useTranslations("eventWhitelist");
  return (
    <section className="es-list-prerequisite">
      <LockClosedIcon aria-hidden="true" className="es-list-lock-icon" />
      <h2>{t("uniqueRequiredTitle")}</h2>
      <p>{t("missingUniqueField")}</p>
      {builderHref && (
        <Link href={builderHref} className="es-list-configure">{t("configureUniqueField")}</Link>
      )}
    </section>
  );
}
