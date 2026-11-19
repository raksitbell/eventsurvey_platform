import Skeleton from "@/components/ui/skeleton/Skeleton";

export default function ParticipantFormPreviewSkeleton({ label }: { label: string }) {
  const card = "space-y-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900";

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className="rounded-xl bg-gray-50 p-4 motion-reduce:[&_.animate-pulse]:animate-none dark:bg-gray-950"
    >
      <div className="mx-auto max-w-2xl space-y-4">
        <div className={card}>
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        {[0, 1].map((index) => (
          <div key={index} className={card}>
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
