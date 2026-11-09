"use client";

import type { AdminOverviewResponse } from "@/types/admin/overview";
import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

type Growth = AdminOverviewResponse["growth"];

type PlatformGrowthChartProps = {
  growth: Growth | null;
};

function withForecastGap(history: number[], forecast: number[]): number[] {
  if (history.length === 0) return forecast;
  return [history[history.length - 1], ...forecast];
}

export default function PlatformGrowthChart({ growth }: PlatformGrowthChartProps) {
  const t = useTranslations("adminHome");

  if (!growth) {
    return (
      <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
        {t("growthEmpty")}
      </p>
    );
  }

  const categories = [
    ...growth.categories,
    ...growth.forecastCategories,
  ];

  const series = [
    {
      name: t("growth.series.users"),
      data: [...growth.series.users, ...Array(growth.forecastCategories.length).fill(null)],
    },
    {
      name: t("growth.series.events"),
      data: [...growth.series.events, ...Array(growth.forecastCategories.length).fill(null)],
    },
    {
      name: t("growth.series.responses"),
      data: [
        ...growth.series.responses,
        ...Array(growth.forecastCategories.length).fill(null),
      ],
    },
    {
      name: t("growth.series.usersForecast"),
      data: [
        ...Array(Math.max(growth.categories.length - 1, 0)).fill(null),
        ...withForecastGap(growth.series.users, growth.forecast.users),
      ],
    },
    {
      name: t("growth.series.eventsForecast"),
      data: [
        ...Array(Math.max(growth.categories.length - 1, 0)).fill(null),
        ...withForecastGap(growth.series.events, growth.forecast.events),
      ],
    },
    {
      name: t("growth.series.responsesForecast"),
      data: [
        ...Array(Math.max(growth.categories.length - 1, 0)).fill(null),
        ...withForecastGap(growth.series.responses, growth.forecast.responses),
      ],
    },
  ];

  const options: ApexOptions = {
    colors: ["#465fff", "#12b76a", "#f79009", "#465fff", "#12b76a", "#f79009"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "line",
      height: 320,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    stroke: {
      curve: "smooth",
      width: [3, 3, 3, 2, 2, 2],
      dashArray: [0, 0, 0, 6, 6, 6],
    },
    markers: {
      size: [4, 4, 4, 0, 0, 0],
      hover: { size: 5 },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: "#98a2b3",
          fontSize: "12px",
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#98a2b3",
          fontSize: "12px",
        },
        formatter: (value: number) => String(Math.round(value)),
      },
      min: 0,
    },
    grid: {
      borderColor: "#e4e7ec",
      strokeDashArray: 4,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
      fontSize: "12px",
      labels: { colors: "#667085" },
      markers: { size: 8 },
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value: number | undefined) =>
          value == null || Number.isNaN(value) ? "—" : String(value),
      },
    },
  };

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <ReactApexChart options={options} series={series} type="line" height={320} />
    </div>
  );
}
