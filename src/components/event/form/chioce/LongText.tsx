const LONG_TEXT_MAX_LENGTH = 5000;

export default function LongText() {
  return (
    <div className="flex flex-col gap-1">
      <textarea
        disabled
        maxLength={LONG_TEXT_MAX_LENGTH}
        placeholder="Long answer text"
        className="mt-2 w-full border-b border-gray-300 bg-transparent pb-1 text-sm text-gray-600 transition-all placeholder:text-gray-400"
      />
      <div className="flex justify-end text-xs text-gray-400">
        0 / {LONG_TEXT_MAX_LENGTH}
      </div>
    </div>
  );
}
