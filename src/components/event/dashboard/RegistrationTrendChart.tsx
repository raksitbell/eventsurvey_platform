"use client";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export default function RegistrationTrendChart() {
  const t = useTranslations("eventAnalytics.chart");

  const series = [
    {
      name: t("seriesName"),
      // Matches the visual bar heights from the mockup screenshot:
      // Mon (~38), Tue (~64), Wed (~48), Thu (~82), Fri (~76), Sat (~114 - strongest), Sun (~92)
      data: [38, 64, 48, 82, 76, 114, 92],
    },
  ];

  const options: ApexOptions = {
    colors: ["#465fff"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 280,
      toolbar: { show: false },
      sparkline: { enabled: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "38%",
        borderRadius: 8,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: false },
    xaxis: {
      categories: [
        t("days.mon"),
        t("days.tue"),
        t("days.wed"),
        t("days.thu"),
        t("days.fri"),
        t("days.sat"),
        t("days.sun"),
      ],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: "#98a2b3",
          fontSize: "12px",
          fontWeight: 400,
        },
      },
    },
    yaxis: {
      show: false,
    },
    grid: {
      show: true,
      borderColor: "#f2f4f7",
      strokeDashArray: 3,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
      padding: {
        top: 0,
        right: 10,
        bottom: 0,
        left: 10,
      },
    },
    fill: { opacity: 1 },
    tooltip: {
      theme: "light",
      y: {
        formatter: (value: number) => `${value} registrations`,
      },
    },
    legend: { show: false },
  };

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/3">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          {t("title")}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("subtitle")}
        </p>
      </div>

      <div className="w-full pt-2">
        <ReactApexChart
          options={options}
          series={series}
          type="bar"
          height={280}
        />
      </div>
    </div>
  );
}
