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
    <>
      {/* Desktop Floating Sidebar (moves alongside the active card) */}
      <aside
        style={{ transform: `translateY(${topOffset}px)` }}
        className="hidden flex-col gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm transition-transform duration-200 ease-out md:flex"
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

      {/* Mobile Bottom Action Bar */}
      <aside className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-center rounded-xl border border-gray-200 bg-white/95 p-2 shadow-lg backdrop-blur-sm md:hidden">
        <button
          type="button"
          title="Add question"
          onClick={onAddQuestion}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-indigo-50 hover:text-[#5C54D1] active:bg-indigo-100"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Add question</span>
        </button>
      </aside>
    </>
  );
}
