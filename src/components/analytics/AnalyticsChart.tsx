"use client";
import { useTheme } from "@/context/ThemeContext";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { ApexOptions } from "apexcharts";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
interface Props {
  points: { label: string; count: number }[];
  type?: "bar" | "pie";
}
export default function AnalyticsChart({ points, type = "bar" }: Props) {
  const { theme } = useTheme();
  const t = useTranslations("analytics");
  const options: ApexOptions = {
    chart: {
      toolbar: { show: false },
      fontFamily: "inherit",
      animations: { enabled: false },
    },
    colors: ["#465fff", "#12b76a", "#f79009"],
    labels: points.map((p) => p.label),
    xaxis: { categories: points.map((p) => p.label) },
    yaxis: { decimalsInFloat: 0, min: 0 },
    dataLabels: { enabled: false },
    theme: { mode: theme },
    noData: { text: t("empty") },
    tooltip: { enabled: false },
  };
  return (
    <Chart
      type={type}
      height={260}
      options={options}
      series={
        type === "pie"
          ? points.map((p) => p.count)
          : [{ name: t("responses"), data: points.map((p) => p.count) }]
      }
    />
  );
}
