"use client";
import EventCapacitySettings from "./EventCapacitySettings";
import Switch from "@/components/form/switch/Switch";
import Button from "@/components/ui/button/Button";
import { useConfirm } from "@/hooks/useConfirm";
import type { EventDraft } from "@/types/event/setup";
import type { EventWorkspace } from "@/types/event/workspace";
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
    if (!value && draft.isPrivate) return;
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
    <section className="space-y-4">
      <fieldset disabled={readOnly} className="grid grid-cols-2 gap-2">
        <legend className="mb-2 font-semibold">{s("access")}</legend>
        {([false, true] as const).map((value) => (
          <button
            type="button"
            className="event-option"
            key={String(value)}
            aria-pressed={draft.isPrivate === value}
            onClick={() =>
              onChange(
                value
                  ? { isPrivate: true, hasRegistration: true }
                  : { isPrivate: false },
              )
            }
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
          <div key={kind} className="event-section space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor={kind + "-on"} className="font-medium">
                {label}
              </label>
              <Switch
                id={kind + "-on"}
                label={label}
                checked={enabled}
                disabled={
                  readOnly || (registration && draft.isPrivate && enabled)
                }
                onChange={(value) =>
                  registration
                    ? void toggleRegistration(value)
                    : onChange({ hasSurvey: value })
                }
              />
            </div>
            {enabled && (
              <Button
                variant="outline"
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
            {registration && draft.isPrivate && enabled && (
              <Button
                variant="outline"
                disabled={!workspace.canManageWhitelist}
                onClick={onOpenWhitelist}
              >
                {t("manageWhitelist")}
              </Button>
            )}
            {!registration && enabled && (
              <label className="flex items-center gap-2 text-sm">
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
          </div>
        );
      })}
      {(draft.hasRegistration || draft.hasSurvey) && (
        <EventCapacitySettings
          draft={draft}
          readOnly={readOnly}
          onChange={onChange}
        />
      )}
    </section>
  );
}
