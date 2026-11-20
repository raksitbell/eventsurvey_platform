import FormBuilder from "@/components/event/form/FormBuilder";
import {
  formBuilderReturn,
  type FormBuilderEntryQuery,
} from "@/core/event/form-builder-navigation";
import { getTranslations } from "next-intl/server";

export default async function SurveyPage({
  searchParams,
}: {
  searchParams: Promise<FormBuilderEntryQuery>;
}) {
  const [query, t] = await Promise.all([searchParams, getTranslations("form.editorBack")]);
  const back = formBuilderReturn(query, false);
  return <FormBuilder type="survey" backHref={back.href} backLabel={t(back.origin)} />;
}
