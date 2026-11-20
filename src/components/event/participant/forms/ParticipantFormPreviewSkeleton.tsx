import Skeleton from "@/components/ui/skeleton/Skeleton";
import { bannerLayouts, type BannerLayout } from "@/core/event/banner-layout";
import "./participant-form.css";

interface Props {
  label: string;
  bannerLayout?: BannerLayout;
}

export default function ParticipantFormPreviewSkeleton({ label, bannerLayout }: Props) {
  const banner = bannerLayout && bannerLayouts[bannerLayout];
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className="participant-form-page @container/participant w-full bg-event-page motion-reduce:[&_.animate-pulse]:animate-none dark:bg-gray-950"
    >
      <div aria-hidden="true" className="flex min-h-18 items-center justify-between gap-4 bg-white px-4 @4xl/participant:px-16 dark:bg-gray-900">
        <Skeleton className="h-10 w-32" /><Skeleton className="h-8 w-14 rounded-full" />
      </div>
      <div aria-hidden="true" className="participant-form-body">
        {banner && (
          <Skeleton
            className="participant-form-banner w-full rounded-2xl"
            data-layout={bannerLayout}
            style={{ aspectRatio: `${banner.width}/${banner.height}` }}
          />
        )}
        <div className="w-full space-y-3 rounded-2xl p-5">
          <Skeleton className="h-5 w-28" /><Skeleton className="h-7 w-3/4" /><Skeleton className="h-4 w-2/3" />
        </div>
        <div className="w-full space-y-5 rounded-2xl border border-event-border bg-white p-5 @4xl/participant:p-8 dark:border-gray-700 dark:bg-gray-900">
          <Skeleton className="h-7 w-28 rounded-full" /><Skeleton className="h-7 w-3/5" />
          {[0, 1].map((index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-1/3" /><Skeleton className="h-11 w-full" />
            </div>
          ))}
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
