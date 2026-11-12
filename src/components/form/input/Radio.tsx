import type { FC } from "react";

interface RadioProps {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  label: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  unavailable?: boolean;
  disabledReason?: string;
}

/** Adapted from TailAdmin free Radio; card presentation for event setup. */
const Radio: FC<RadioProps> = ({
  id,
  name,
  value,
  checked,
  label,
  onChange,
  disabled = false,
  unavailable = false,
  disabledReason,
}) => (
  <label
    htmlFor={id}
    title={disabledReason}
    className={`relative flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-lg border-2 px-3 py-2 text-theme-sm text-gray-800 transition focus-within:ring-2 focus-within:ring-event-action/40 dark:text-gray-200 ${checked ? "border-event-action bg-event-subtle dark:border-brand-400 dark:bg-gray-800" : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"} ${unavailable ? "cursor-not-allowed opacity-50" : disabled ? "cursor-default" : "cursor-pointer hover:border-event-action dark:hover:border-brand-400"}`}
  >
    <input
      id={id}
      name={name}
      type="radio"
      value={value}
      checked={checked}
      onChange={() => {
        if (!disabled && !unavailable) onChange(value);
      }}
      className="sr-only"
      disabled={disabled || unavailable}
    />
    <span className="min-w-0 break-words">{label}</span>
    <span
      aria-hidden="true"
      className={`flex size-3.5 shrink-0 items-center justify-center rounded-full border ${checked ? "border-event-action dark:border-brand-400" : "border-gray-400 dark:border-gray-500"}`}
    >
      {checked && (
        <span className="size-2 rounded-full bg-event-action dark:bg-brand-400" />
      )}
    </span>
  </label>
);
export default Radio;
