"use client";
import type { AnalyticsData, Filters } from "@/types/event/analytics";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { useTranslations } from "next-intl";
interface Props {
  data: AnalyticsData;
  value: Filters;
  onChange: (value: Filters) => void;
  onApply: () => void;
  busy: boolean;
}
const selectClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200";
export default function AnalyticsFilters({
  data,
  value,
  onChange,
  onApply,
  busy,
}: Props) {
  const t = useTranslations("analytics");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply();
      }}
      className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 md:grid-cols-2 xl:grid-cols-5 dark:border-gray-800 dark:bg-gray-900"
    >
      <div>
        <Label htmlFor="analytics-event">{t("event")}</Label>
        <select
          id="analytics-event"
          className={selectClass}
          value={value.eventId}
          onChange={(e) => onChange({ ...value, eventId: e.target.value })}
        >
          <option value={data.event.id}>{data.event.title}</option>
        </select>
      </div>
      <div>
        <Label htmlFor="analytics-form">{t("form")}</Label>
        <select
          id="analytics-form"
          className={selectClass}
          value={value.formId}
          onChange={(e) => onChange({ ...value, formId: e.target.value })}
        >
          <option value="">{t("allForms")}</option>
          {data.forms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="analytics-from">{t("from")}</Label>
        <Input
          id="analytics-from"
          type="date"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="analytics-to">{t("to")}</Label>
        <Input
          id="analytics-to"
          type="date"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
      </div>
      <div className="flex items-end">
        <Button type="submit" disabled={busy}>
          {t("apply")}
        </Button>
      </div>
      <p className="text-sm text-gray-500 md:col-span-2 xl:col-span-5 dark:text-gray-400">
        {t("scopeNote", { timezone: data.event.timezone })}
      </p>
    </form>
  );
}
