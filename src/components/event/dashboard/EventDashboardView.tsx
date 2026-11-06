"use client";

import KeyInsightsCard from "@/components/event/dashboard/KeyInsightsCard";
import MetricCardsGrid from "@/components/event/dashboard/MetricCardsGrid";
import RegistrationTrendChart from "@/components/event/dashboard/RegistrationTrendChart";
import ReportShell from "@/components/event/reports/ReportShell";

export default function EventDashboardView() {
  return (
    <ReportShell section="analytics" wide>
      <div className="space-y-6">
        {/* 1. 4 KPI Metric Cards Grid */}
        <MetricCardsGrid />

        {/* 2. Main Two-Column Row: Registration Trend Chart (left) & Key Insights (right) */}
        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RegistrationTrendChart />
          </div>
          <div className="lg:col-span-1">
            <KeyInsightsCard />
          </div>
        </div>
      </div>
    </ReportShell>
  );
}
