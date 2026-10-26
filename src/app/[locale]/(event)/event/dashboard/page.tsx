"use client";

import { useState } from "react";

export default function EventDashboardPage() {
  // 1. จำลองข้อมูลตัวเลขสถิติ (KPIs)
  const [stats] = useState({
    totalResponses: 1284,
    registrations: 856,
    surveys: 428,
    completionRate: "94.2%",
  });

  return (
    <div className="space-y-6">
      {/* ──────────────────────────────────────────
          ส่วนที่ 1: Header ด้านบนสุด
      ────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-medium text-success-700 dark:bg-success-500/10 dark:text-success-400">
              <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
              กำลังเปิดใช้งาน (Live)
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            แดชบอร์ดภาพรวมกิจกรรม
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            สรุปข้อมูลสถิติและการมีส่วนร่วมของผู้เข้าร่วมกิจกรรมแบบเรียลไทม์
          </p>
        </div>

        {/* ปุ่มคำสั่งด่วน */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={() => alert("คลิกส่งออกรายงาน")}
          >
            CSV
          </button>
          <button
            type="button"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
            onClick={() => alert("คลิกเพิ่มแบบฟอร์ม")}
          >
             สร้างฟอร์มใหม่
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────
          ส่วนที่ 2: การ์ดตัวเลขสรุป (KPI Cards Grid)
      ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* การ์ด 1: ยอดคำตอบทั้งหมด */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/3">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            คำตอบทั้งหมด
          </span>
          <div className="mt-3 flex items-baseline justify-between">
            <h3 className="text-3xl font-semibold text-gray-900 dark:text-white">
              {stats.totalResponses.toLocaleString()}
            </h3>
            <span className="text-xs font-medium text-success-600 dark:text-success-400">
              +14.8% ↑
            </span>
          </div>
        </div>

        {/* การ์ด 2: การลงทะเบียน */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/3">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            ลงทะเบียนเข้าร่วม
          </span>
          <div className="mt-3 flex items-baseline justify-between">
            <h3 className="text-3xl font-semibold text-gray-900 dark:text-white">
              {stats.registrations.toLocaleString()}
            </h3>
            <span className="text-xs text-gray-400">67% ของทั้งหมด</span>
          </div>
        </div>

        {/* การ์ด 3: แบบสอบถาม */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/3">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            ทำแบบสอบถามแล้ว
          </span>
          <div className="mt-3 flex items-baseline justify-between">
            <h3 className="text-3xl font-semibold text-gray-900 dark:text-white">
              {stats.surveys.toLocaleString()}
            </h3>
            <span className="text-xs font-medium text-success-600 dark:text-success-400">
              +8.2% ↑
            </span>
          </div>
        </div>

        {/* การ์ด 4: อัตราตอบสมบูรณ์ */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/3">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            อัตราการตอบสมบูรณ์
          </span>
          <div className="mt-3 flex items-baseline justify-between">
            <h3 className="text-3xl font-semibold text-gray-900 dark:text-white">
              {stats.completionRate}
            </h3>
            <span className="text-xs text-gray-400">ยอดเยี่ยม</span>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────
          ส่วนที่ 3: พื้นที่แสดงกราฟ (Placeholder / กราฟ)
      ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/3">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              แนวโน้มคำตอบรายวัน
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              สถิติการส่งคำตอบในช่วง 7 วันล่าสุด
            </p>
          </div>
        </div>

        {/* ตัวอย่างแท่งกราฟจำลองแบบ CSS (ก่อนใส่ ApexCharts) */}
        <div className="flex h-56 items-end justify-between gap-3 pt-6">
          {[
            { day: "จันทร์", val: 40 },
            { day: "อังคาร", val: 65 },
            { day: "พุธ", val: 55 },
            { day: "พฤหัส", val: 80 },
            { day: "ศุกร์", val: 70 },
            { day: "เสาร์", val: 95 },
            { day: "อาทิตย์", val: 85 },
          ].map((item) => (
            <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {item.val}
              </span>
              <div
                className="w-full rounded-t-lg bg-brand-500 transition-all hover:bg-brand-600"
                style={{ height: `${item.val * 1.8}px` }}
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {item.day}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ──────────────────────────────────────────
          ส่วนที่ 4: ตารางกิจกรรมล่าสุด (Recent Activity Table)
      ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/3">
        <div className="border-b border-gray-100 p-6 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            คำตอบที่ส่งเข้ามาล่าสุด
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3 text-start font-medium">รหัส</th>
                <th className="px-6 py-3 text-start font-medium">ชื่อแบบฟอร์ม</th>
                <th className="px-6 py-3 text-start font-medium">เวลาที่ส่ง</th>
                <th className="px-6 py-3 text-start font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 dark:divide-gray-800 dark:text-gray-300">
              <tr>
                <td className="px-6 py-4 font-mono text-xs">#SUB-001</td>
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                  แบบลงทะเบียนเข้างานสัมมนา
                </td>
                <td className="px-6 py-4 text-xs text-gray-500">5 นาทีที่แล้ว</td>
                <td className="px-6 py-4">
                  <span className="rounded-md bg-success-50 px-2.5 py-1 text-xs font-medium text-success-700 dark:bg-success-500/10 dark:text-success-400">
                    เสร็จสมบูรณ์
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-mono text-xs">#SUB-002</td>
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                  แบบประเมินความพึงพอใจ
                </td>
                <td className="px-6 py-4 text-xs text-gray-500">20 นาทีที่แล้ว</td>
                <td className="px-6 py-4">
                  <span className="rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                    ยืนยันแล้ว
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
