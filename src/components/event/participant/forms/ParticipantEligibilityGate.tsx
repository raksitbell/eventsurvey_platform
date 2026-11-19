"use client";

import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import type { PublicForm } from "@/types/event/public-event";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";

interface Props {
  gate: Extract<PublicForm, { status: "eligibility" }>;
  locale: "th" | "en";
  accessChanged: boolean;
  verify: (data: FormData) => Promise<PublicForm>;
  onResult: (result: PublicForm, value: string) => void;
}

export default function ParticipantEligibilityGate({ gate, locale, accessChanged, verify, onResult }: Props) {
  const t = useTranslations("publicParticipantForm");
  const inputId = useId();
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<"eligibilityMismatch" | "recheckError" | null>(accessChanged ? "eligibilityMismatch" : null);
  const label = gate.label[locale] || gate.label[locale === "en" ? "th" : "en"] || t("identifier");

  async function check(data: FormData) {
    if (submitting.current) return;
    const value = String(data.get("identifier") ?? "").trim();
    if (!value) {
      setError("eligibilityMismatch");
      return;
    }
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await verify(data);
      if (result.status === "eligibility") {
        setError("eligibilityMismatch");
        return;
      }
      onResult(result, value);
    } catch {
      setError("recheckError");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <form action={check} noValidate className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h1 className="text-title-sm font-semibold">{t("verifyEligibility")}</h1>
      <div>
        <Label htmlFor={inputId}>{label}</Label>
        <Input
          id={inputId}
          name="identifier"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          type={gate.fieldType === "email" ? "email" : "text"}
          inputMode={gate.fieldType === "number" ? "decimal" : undefined}
          autoComplete={gate.fieldType === "email" ? "email" : "off"}
          maxLength={500}
          disabled={pending}
          aria-invalid={error === "eligibilityMismatch"}
          aria-describedby={error ? inputId + "-error" : undefined}
        />
      </div>
      {error && <p id={inputId + "-error"} role="alert" className="text-theme-sm text-error-600 dark:text-error-400">{t(error)}</p>}
      <Button type="submit" disabled={pending} className="bg-(--participant-accent)! text-(--participant-on-accent)!">{t("verifyIdentifier")}</Button>
    </form>
  );
}
