"use client";

import { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

const series = [
  {
    name: "Responses",
    data: [42, 58, 51, 76, 64, 88, 71],
  },
];

export default function ResponseActivityChart() {
  const t = useTranslations("adminHome");

  const options: ApexOptions = {
    colors: ["#465fff"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 260,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "42%",
        borderRadius: 8,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 0 },
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
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#98a2b3",
          fontSize: "12px",
        },
      },
    },
    grid: {
      borderColor: "#e4e7ec",
      strokeDashArray: 4,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    fill: { opacity: 1 },
    tooltip: {
      y: {
        formatter: (value: number) => `${value}`,
      },
    },
    legend: { show: false },
  };

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <ReactApexChart options={options} series={series} type="bar" height={260} />
    </div>
  );
}
