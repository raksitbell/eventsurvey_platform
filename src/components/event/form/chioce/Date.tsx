import { CalenderIcon } from "@/icons";

export default function DateField() {
  return (
    <div className="flex w-60 items-center justify-between border-b border-gray-300 pb-2 text-sm text-gray-400">
      <span>Month, day, year</span>
      <CalenderIcon className="h-5 w-5 text-gray-400" />
    </div>
  );
}

