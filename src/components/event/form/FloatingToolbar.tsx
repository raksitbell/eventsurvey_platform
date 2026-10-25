import { PlusIcon } from "@/icons";

interface FloatingToolbarProps {
  topOffset: number;
  onAddQuestion: () => void;
}

export default function FloatingToolbar({
  topOffset,
  onAddQuestion,
}: FloatingToolbarProps) {
  return (
    <aside
      style={{ transform: `translateY(${topOffset}px)` }}
      className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm transition-transform duration-200 ease-out"
    >
      <button
        type="button"
        title="Add question"
        className="rounded-lg p-3 text-gray-600 transition-colors hover:bg-indigo-50 hover:text-[#5C54D1]"
        onClick={onAddQuestion}
      >
        <PlusIcon />
      </button>
    </aside>
  );
}

