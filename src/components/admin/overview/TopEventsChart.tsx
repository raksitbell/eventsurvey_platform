"use client";

import Skeleton from "@/components/ui/skeleton/Skeleton";
import type { AdminOverviewResponse } from "@/types/admin/overview";
import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => <Skeleton className="h-[280px] w-full rounded-xl" />,
});

type TopEventsChartProps = {
  topEvents: AdminOverviewResponse["topEvents"] | null;
  isLoading?: boolean;
};

export default function TopEventsChart({
  topEvents,
  isLoading = false,
}: TopEventsChartProps) {
  const t = useTranslations("adminHome");

  if (isLoading) {
    return (
      <div className="space-y-4 py-2" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-28 shrink-0" />
            <Skeleton className="h-6 flex-1 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (!topEvents || topEvents.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
        {t("topEventsEmpty")}
      </p>
    );
  }

  const categories = topEvents.map((row) => row.title);
  const series = [
    {
      name: t("topEventsSeries"),
      data: topEvents.map((row) => row.responseCount),
    },
  ];

  const options: ApexOptions = {
    colors: ["#465fff"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 280,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 6,
        barHeight: "55%",
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      labels: {
        style: {
          colors: "#98a2b3",
          fontSize: "12px",
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#667085",
          fontSize: "12px",
        },
        maxWidth: 160,
      },
    },
    grid: {
      borderColor: "#e4e7ec",
      strokeDashArray: 4,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    tooltip: {
      y: {
        formatter: (value: number) => String(value),
      },
    },
    legend: { show: false },
  };

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <ReactApexChart options={options} series={series} type="bar" height={280} />
    </div>
  );
}
