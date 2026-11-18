import { useTranslations } from "next-intl";
import { PlusIcon } from "@heroicons/react/24/outline";

interface FloatingToolbarProps {
  topOffset: number;
  onAddQuestion: () => void;
}

export default function FloatingToolbar({
  topOffset,
  onAddQuestion,
}: FloatingToolbarProps) {
  const tbuilder = useTranslations("form.builder");

  return (
    <>
      {/* Desktop Floating Sidebar (moves alongside the active card) */}
      <aside
        style={{ transform: `translateY(${topOffset}px)` }}
        className="hidden flex-col gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-theme-xs transition-transform duration-200 ease-out md:flex dark:border-gray-800 dark:bg-gray-900"
      >
        <button
          type="button"
          title={tbuilder("addQuestion")}
          className="rounded-lg p-3 text-gray-600 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:text-gray-300 dark:hover:bg-brand-500/15 dark:hover:text-brand-400"
          onClick={onAddQuestion}
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </aside>

      {/* Mobile Bottom Action Bar */}
      <aside className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-center rounded-xl border border-gray-200 bg-white/95 p-2 shadow-theme-lg backdrop-blur-sm md:hidden dark:border-gray-800 dark:bg-gray-900/95">
        <button
          type="button"
          title={tbuilder("addQuestion")}
          onClick={onAddQuestion}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-brand-50 hover:text-brand-500 active:bg-brand-100 dark:text-gray-200 dark:hover:bg-brand-500/15"
        >
          <PlusIcon className="h-5 w-5" />
          <span>{tbuilder("addQuestion")}</span>
        </button>
      </aside>
    </>
  );
}
