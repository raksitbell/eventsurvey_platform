"use client";

interface SwitchProps {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

/** Adapted from TailAdmin free Switch with a controlled, keyboard-accessible input. */
export default function Switch({
  id,
  label,
  checked,
  disabled = false,
  onChange,
}: SwitchProps) {
  return (
    <label
      htmlFor={id}
      className={`relative inline-flex shrink-0 ${disabled ? "cursor-default" : "cursor-pointer"}`}
    >
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-label={label}
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        aria-hidden="true"
        className={`block h-6 w-12 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-event-action/50 ${checked ? "bg-event-action dark:bg-brand-500" : "bg-gray-400 dark:bg-gray-600"}`}
      />
      <span
        aria-hidden="true"
        className={`absolute start-1 top-1 size-4 rounded-full bg-white shadow-theme-sm transition ${checked ? "translate-x-6 rtl:-translate-x-6" : "translate-x-0"}`}
      />
    </label>
  );
}
