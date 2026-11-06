"use client";

interface PreviewTimeProps {
  value: string;
  onChange: (value: string) => void;
}

export default function PreviewTime({ value, onChange }: PreviewTimeProps) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-800 focus:border-[#5C54D1] focus:outline-none"
    />
  );
}

