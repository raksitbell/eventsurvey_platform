interface FormHeaderCardProps {
  title: string;
  description: string;
  isActive: boolean;
  sectionRef: (el: HTMLDivElement | null) => void;
  onSelect: () => void;
  onChangeTitle: (title: string) => void;
  onChangeDescription: (description: string) => void;
}

export default function FormHeaderCard({
  title,
  description,
  isActive,
  sectionRef,
  onSelect,
  onChangeTitle,
  onChangeDescription,
}: FormHeaderCardProps) {
  return (
    <div
      ref={sectionRef}
      onClick={onSelect}
      className={`relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all ${
        isActive
          ? "border-gray-300 border-s-4 border-s-[#5C54D1]"
          : "border-gray-200"
      }`}
    >
      {/* Top Border Line */}
      <div className="absolute top-0 start-0 h-[8px] w-full bg-[#5C54D1]"></div>

      <div className="px-6 pt-10 pb-4">
        <input
          type="text"
          value={title}
          onFocus={onSelect}
          onChange={(e) => onChangeTitle(e.target.value)}
          className="w-full border-b border-transparent bg-transparent pb-1 text-3xl font-semibold text-gray-800 transition-all placeholder:text-gray-400 hover:border-gray-200 focus:border-b-2 focus:border-[#5C54D1] focus:outline-none"
        />

        <input
          type="text"
          value={description}
          onFocus={onSelect}
          onChange={(e) => onChangeDescription(e.target.value)}
          className="mt-2 w-full border-b border-transparent bg-transparent pb-1 text-sm text-gray-600 transition-all placeholder:text-gray-400 hover:border-gray-200 focus:border-b-2 focus:border-[#5C54D1] focus:outline-none"
        />
      </div>
    </div>
  );
}

