<h1 align="center">EventSurvey Platform</h1>

<p align="center">
  ระบบจัดอีเวนต์และแบบสอบถาม — สร้างงาน เปิดลงทะเบียน ส่งแบบสอบถาม ดูสรุปผล จบในที่เดียว
</p>

<p align="center">
  <a href="https://github.com/raksitbell/eventsurvey_platform/actions/workflows/codeql.yml"><img src="https://github.com/raksitbell/eventsurvey_platform/actions/workflows/codeql.yml/badge.svg" alt="CodeQL"></a>
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" alt="Next.js 16">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
</p>

## OVERVIEW

หน้าเว็บ (frontend) ของ **Event + Survey Management Platform** ตามเอกสาร SRS v1.0.0

คนจัดงานสร้างงานอีเวนต์ เปิดให้คนลงทะเบียน ส่งแบบสอบถามให้ผู้เข้าร่วมตอบ แล้วดูสรุปผลและออกรายงาน — ทำได้จากระบบเดียว รองรับงานแบบเปิดและแบบส่วนตัว พร้อมระบบสิทธิ์ที่ให้คนจัดงานตั้งทีมงานและกำหนดได้ว่าใครทำอะไรได้

ผู้ใช้ 4 กลุ่ม: ผู้ดูแลระบบ · คนจัดงาน · ทีมงานของคนจัดงาน · ผู้เข้าร่วมงาน

> [!NOTE]
> กฎการเขียนโค้ดของโปรเจกต์นี้อยู่ใน **[`AGENTS.md`](AGENTS.md)** — โครงสร้างโฟลเดอร์, การทำหลายภาษา, การใช้ธีมและสี, การแตกไฟล์ component และข้อห้ามที่มาจากปัญหาที่เคยเจอจริง

## TECHNOLOGY

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind,nodejs,vercel&theme=dark&perline=8">
    <source media="(prefers-color-scheme: light)" srcset="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind,nodejs,vercel&theme=light&perline=8">
    <img src="https://skillicons.dev/icons?i=nextjs,react,ts,tailwind,nodejs,vercel&perline=8" alt="Next.js, React, TypeScript, Tailwind CSS, Node.js, Vercel">
  </picture>
</p>

| ส่วน | ใช้ | หมายเหตุ |
|---|---|---|
| Framework | **Next.js 16** (App Router) | ตั้งค่าไว้ทั้ง Turbopack และ webpack |
| UI | **React 19** · **TypeScript** (strict) | — |
| Styling | **Tailwind CSS v4** | ธีมอยู่ใน `src/app/globals.css` ไม่มี `tailwind.config` |
| หลายภาษา | **next-intl v4** | ไทย (ค่าเริ่มต้น) / อังกฤษ — ไม่มี `/th` `/en` ใน URL |
| Graph | **ApexCharts** | ต้อง import แบบ dynamic เท่านั้น |
| Drag & Drop | **react-dnd** | เตรียมไว้ให้ตัวสร้างแบบฟอร์ม |
| Confirmation | **SweetAlert2** | ใช้ผ่าน `useConfirm()` |
| Development | mock API ภายนอก | <https://eventmockapi.vercel.app> |

ต้องมี **Node.js 20.9 ขึ้นไป**

## SETUP INSTRUCTION

```bash
npm install
```

สร้างไฟล์ `.env.local` ใส่ที่อยู่ของ mock API:

```bash
MOCK_API_BASE_URL=https://eventmockapi.vercel.app
NEXT_PUBLIC_API_BASE_URL=https://eventmockapi.vercel.app
```

```bash
npm run dev
```

เปิด <http://localhost:3000/login> แล้วล็อกอินด้วยบัญชีทดลอง — รหัสผ่านทุกบัญชีคือ `password123`

| อีเมล | บทบาท | เข้าไปเจอหน้า |
|---|---|---|
| `admin@example.com` | ผู้ดูแลระบบ | `/admin` |
| `owner@example.com` | คนจัดงาน | `/event` |
| `nicha@example.com` | ทีมงานของคนจัดงาน | `/event` |

| คำสั่ง | ใช้ทำอะไร |
|---|---|
| `npm run dev` | รันบนเครื่องตัวเอง แก้โค้ดแล้วเห็นผลทันที |
| `npm run dev:webpack` | เหมือนด้านบน แต่ใช้ตัว build แบบเดิม เผื่อ Turbopack มีปัญหา |
| `npm run build` | สร้างไฟล์สำหรับขึ้นเซิร์ฟเวอร์จริง |
| `npm run start` | รันเวอร์ชันที่ build แล้ว |
| `npm run lint` | ตรวจโค้ดว่าผิดกฎที่ตั้งไว้ไหม |

---

> [!IMPORTANT]
> ก่อนเขียนโค้ดบรรทัดแรก อ่าน [`AGENTS.md`](AGENTS.md) ให้จบ
> ข้อห้ามในนั้นส่วนใหญ่มาจากกรณีที่เคยทำแล้วเว็บค้างหรือพังจริงในโปรเจกต์นี้ ไม่ใช่กฎที่ตั้งขึ้นลอย ๆ
