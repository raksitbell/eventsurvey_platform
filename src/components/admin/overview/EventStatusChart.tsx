"use client";

import type { AdminOverviewResponse } from "@/types/admin/overview";
import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

type EventStatusChartProps = {
  breakdown: AdminOverviewResponse["eventStatusBreakdown"] | null;
};

export default function EventStatusChart({ breakdown }: EventStatusChartProps) {
  const t = useTranslations("adminHome");

  if (!breakdown || breakdown.every((row) => row.count === 0)) {
    return (
      <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
        {t("eventStatusEmpty")}
      </p>
    );
  }

  const labels = breakdown.map((row) => t(`eventStatus.${row.status}`));
  const series = breakdown.map((row) => row.count);

  const options: ApexOptions = {
    colors: ["#465fff", "#98a2b3", "#f79009", "#12b76a", "#ee46bc"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "donut",
      height: 280,
      toolbar: { show: false },
    },
    labels,
    legend: {
      position: "bottom",
      fontSize: "12px",
      labels: { colors: "#667085" },
      markers: { size: 8 },
    },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: {
              show: true,
              label: t("eventStatusTotal"),
              fontSize: "12px",
              color: "#667085",
              formatter: () => String(series.reduce((sum, n) => sum + n, 0)),
            },
          },
        },
      },
    },
    tooltip: {
      y: {
        formatter: (value: number) => String(value),
      },
    },
  };

  return (
    <div className="event-status-chart max-w-full overflow-x-auto custom-scrollbar">
      <ReactApexChart options={options} series={series} type="donut" height={280} />
    </div>
  );
}
