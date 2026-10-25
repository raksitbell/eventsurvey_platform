import { TimeIcon } from "@/icons";

export default function TimeField() {
  return (
    <div className="flex w-60 items-center justify-between border-b border-gray-300 pb-2 text-sm text-gray-400">
      <span>Time</span>
      <TimeIcon className="h-5 w-5 text-gray-400" />
    </div>
  );
}

