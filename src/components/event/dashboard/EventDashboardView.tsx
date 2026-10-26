"use client";

import AnalyticsHeading from "@/components/event/dashboard/AnalyticsHeading";
import EventFooter from "@/components/event/dashboard/EventFooter";
import KeyInsightsCard from "@/components/event/dashboard/KeyInsightsCard";
import MetricCardsGrid from "@/components/event/dashboard/MetricCardsGrid";
import RegistrationTrendChart from "@/components/event/dashboard/RegistrationTrendChart";

export default function EventDashboardView() {
  return (
    <div className="space-y-6">
      {/* 1. Main Analytics Heading & Description */}
      <AnalyticsHeading />

      {/* 2. 4 KPI Metric Cards Grid */}
      <MetricCardsGrid />

      {/* 3. Main Two-Column Row: Registration Trend Chart (left) & Key Insights (right) */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RegistrationTrendChart />
        </div>
        <div className="lg:col-span-1">
          <KeyInsightsCard />
        </div>
      </div>

      {/* 4. Footer with Copyright & Privacy Policy */}
      <EventFooter />
    </div>
  );
}
