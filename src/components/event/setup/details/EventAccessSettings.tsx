"use client";
import EventCapacitySettings from "./EventCapacitySettings";
import EventFormSchedule from "./EventFormSchedule";
import Switch from "@/components/form/switch/Switch";
import Button from "@/components/ui/button/Button";
import { useConfirm } from "@/hooks/useConfirm";
import type { EventDraft } from "@/types/event/setup";
import type { EventWorkspace } from "@/types/event/workspace";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

interface Props {
  draft: EventDraft;
  workspace: EventWorkspace;
  readOnly: boolean;
  onChange: (changes: Partial<EventDraft>) => void;
  onOpenWhitelist: () => void;
  onOpenBuilder: (kind: "registration" | "survey") => void;
}
export default function EventAccessSettings({
  draft,
  workspace,
  readOnly,
  onChange,
  onOpenWhitelist,
  onOpenBuilder,
}: Props) {
  const t = useTranslations("eventHome.details");
  const s = useTranslations("eventSetup");
  const { confirm } = useConfirm();
  async function toggleRegistration(value: boolean) {
    if (
      !value &&
      draft.surveyAccess === "registered_only" &&
      !(await confirm({
        title: s("disableRegistration"),
        message: s("disableHint"),
        appearance: "event",
        variant: "warning",
        confirmLabel: s("disable"),
      }))
    )
      return;
    onChange({ hasRegistration: value });
  }
  return (
    <section id="event-access" tabIndex={-1} className="es-access">
      <fieldset disabled={readOnly} className="grid grid-cols-2 gap-2">
        <legend className="mb-2 font-semibold">{s("access")}</legend>
        {([false, true] as const).map((value) => (
          <button
            type="button"
            className="event-option"
            key={String(value)}
            aria-pressed={draft.isPrivate === value}
            onClick={() => onChange({ isPrivate: value })}
          >
            {t(value ? "private" : "public")}
          </button>
        ))}
      </fieldset>
      {(["registration", "survey"] as const).map((kind) => {
        const registration = kind === "registration";
        const enabled = registration ? draft.hasRegistration : draft.hasSurvey;
        const label = t(registration ? "hasRegistration" : "hasSurvey");
        return (
          <section
            key={kind}
            className="es-feature"
            aria-labelledby={kind + "-label"}
            id={!registration && !enabled ? "survey-schedule" : undefined}
            tabIndex={!registration && !enabled ? -1 : undefined}
          >
            <div className="flex items-center justify-between">
              <label
                htmlFor={kind + "-on"}
                id={kind + "-label"}
                className={`es-icon-label es-${kind}-label`}
              >
                {label}
              </label>
              <Switch
                id={kind + "-on"}
                label={label}
                checked={enabled}
                disabled={readOnly}
                onChange={(value) =>
                  registration
                    ? void toggleRegistration(value)
                    : onChange({ hasSurvey: value })
                }
              />
            </div>
            {!registration && enabled && (
              <label className="es-survey-requirement">
                <input
                  type="checkbox"
                  checked={draft.surveyAccess === "registered_only"}
                  disabled={readOnly || !draft.hasRegistration}
                  onChange={(e) =>
                    onChange({
                      surveyAccess: e.target.checked
                        ? "registered_only"
                        : "public",
                    })
                  }
                />
                {s("registeredOnly")}
              </label>
            )}
            {enabled && (
              <Button
                variant="outline"
                className="es-builder-link"
                disabled={
                  readOnly ||
                  !(registration
                    ? workspace.canManageWhitelist
                    : workspace.canManageSurveyForm)
                }
                onClick={() => onOpenBuilder(kind)}
              >
                {s(registration ? "buildRegistration" : "buildSurvey")}
              </Button>
            )}
            {enabled &&
              (registration || draft.surveyAccess !== "registered_only") && (
                <EventCapacitySettings
                  kind={kind}
                  readOnly={readOnly}
                  capacity={
                    (registration
                      ? draft.registrationCapacity
                      : draft.surveyCapacity) ?? null
                  }
                  onChange={(limit) =>
                    onChange(
                      registration
                        ? { registrationCapacity: limit }
                        : { surveyCapacity: limit },
                    )
                  }
                />
              )}
            {enabled && (
              <EventFormSchedule kind={kind} draft={draft} readOnly={readOnly} onChange={onChange} />
            )}
            {registration && draft.isPrivate && !enabled && (
              <p className="text-theme-xs text-gray-600 dark:text-gray-400">
                {t("privateRegistrationHint")}
              </p>
            )}
            {registration && draft.isPrivate && enabled && (
              <Button
                className="es-whitelist-link"
                startIcon={<UserGroupIcon className="size-4.5 shrink-0" aria-hidden="true" />}
                disabled={readOnly || !workspace.canManageWhitelist}
                onClick={onOpenWhitelist}
              >
                {t("manageWhitelist")}
              </Button>
            )}
          </section>
        );
      })}
    </section>
  );
}
