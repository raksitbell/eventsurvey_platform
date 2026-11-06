const SHORT_TEXT_MAX_LENGTH = 255;

export default function ShortText() {
  return (
    <div className="flex flex-col gap-1">
      <input
        disabled
        maxLength={SHORT_TEXT_MAX_LENGTH}
        placeholder="Short answer text"
        className="mt-2 w-full border-b border-gray-300 bg-transparent pb-1 text-sm text-gray-600 transition-all placeholder:text-gray-400"
      />
      <div className="flex justify-end text-xs text-gray-400">
        0 / {SHORT_TEXT_MAX_LENGTH}
      </div>
    </div>
  );
}
