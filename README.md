# EventSurvey Platform

Frontend ของ **Event + Survey Management Platform** (SRS v1.0.0)  
แอปสำหรับสร้างและบริหารอีเวนต์ การลงทะเบียน และการตอบแบบสอบถาม พร้อม Dashboard สรุปผลและส่งออกรายงาน

- SRS: [Software Requirement Specification (Draft)](https://docs.google.com/document/d/1iNZTqeIchjKrGc6Cm_lpYVGl5y6Mp--KHQrXXUgzPa0/edit)
- Mock API: [https://eventmockapi.vercel.app](https://eventmockapi.vercel.app)

## Product overview (จาก SRS)

ระบบรองรับอีเวนต์แบบ Public/Private, Form Engine, Branding, Fine-Grained RBAC (รวม Sub-User / Approver & Publisher), Dynamic Masking ของข้อมูล Sensitive, Soft Delete / PDPA และ Access Gate สำหรับ Private Event ที่ผูกกับ Whitelist

### วัตถุประสงค์หลัก

1. ให้ Event Owner จัดการอีเวนต์และแบบสอบถามได้จากระบบเดียว
2. ให้ Participant ดู Event ลงทะเบียน และตอบ Survey ตามสิทธิ์
3. ให้ผู้จัดงานดูสรุปและออกรายรายงานได้

## Roles (IAM RBAC)

| Role | สิทธิ์หลัก (SRS) |
|---|---|
| `participant` | ดู Event, ลงทะเบียน, ตอบ Survey (ตาม Public/Private) |
| `event_owner` | จัดการ Sub-User, Event, Survey, Dashboard |
| `sub_user` | สิทธิ์ตาม Custom Role ที่ Owner กำหนด (เข้าถึง/ดู/สร้าง/แก้ไข + Approver & Publisher) |
| `super_admin` | จัดการ Owner และระบบทั้งหมด รวมสิทธิ์ Sensitive Data |

ในพอร์ทัลปัจจุบัน:

| Path | Role | หมายเหตุ |
|---|---|---|
| `/login` | guest | หน้าเข้าสู่ระบบ |
| `/admin` | `super_admin` | Platform overview |
| `/admin/users` | `super_admin` | จัดการ / สวมสิทธิ์ผู้ใช้ |
| `/event` | `event_owner`, `sub_user` | พื้นที่อีเวนต์ |

`participant` เข้าพอร์ทัลนี้ไม่ได้ (ใช้หน้าสาธารณะภายหลัง)  
`super_admin` เข้า `/event` ได้ผ่านการสวมสิทธิ์จาก `/admin/users`

## Business rules ที่เกี่ยวข้อง (SRS)

| ID | สรุป |
|---|---|
| BR-001 | Event Owner มี **Active Event** (Published และอยู่ในช่วง Start–End) ได้ทีละ 1 งาน |
| BR-003 | Private Event ต้องผ่าน Access Gate / Whitelist |
| BR-004 | Publish Event ได้เมื่อไม่มีฟอร์ม หรือฟอร์มทั้งหมด Approved (รองรับ Self-approve / Force Approve + Audit) |
| BR-005 | แต่ละ Event มี Registration / Survey ได้ไม่เกินอย่างละ 1 (หรือไม่มีเลย / มีอย่างใดอย่างหนึ่ง) |
| BR-006–009 | Soft Delete, Form Engine inputs, Sensitive Masking ที่ API, Audit Log |

> Mock seed ปัจจุบันจัดให้ owner ละ 1 event (และ sub_user อยู่ event เดียว) เพื่อสะท้อนการใช้งานจริงใน UI admin; ข้อจำกัด Active Concurrent ตาม BR-001 บังคับที่ backend เมื่อมี lifecycle เต็มรูปแบบ

## สถานะการพัฒนา (frontend นี้)

**มีแล้ว (MVP scaffold)**

- Login + session (localStorage) + i18n `th` / `en`
- `/admin` overview (KPI จาก mock) และ `/admin/users` พร้อม impersonation
- `/event` shell สำหรับ owner / sub_user
- BFF `/api/*` ผูกข้อมูลจาก mock API (`users`, `events`, `event_users`, `roles`, `forms`, `submissions`)

**ยังไม่อยู่ใน frontend นี้ (ตาม Must Have ของ SRS — ทำต่อ)**

- Form Engine 9 types, Lifecycle Approval, Access Gate / Whitelist
- Component Dashboard, PDF Report, Dynamic Masking UI
- Branding / Banner, QR Code, Cookie Banner, Soft Delete flows ใน UI

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 · next-intl v4
- ApexCharts (dashboard charts)

## Getting started

### Prerequisites

- Node.js 20.9 หรือใหม่กว่า

### Setup

```bash
npm install
```

สร้างไฟล์ `.env.local`:

```bash
MOCK_API_BASE_URL=https://eventmockapi.vercel.app
NEXT_PUBLIC_API_BASE_URL=https://eventmockapi.vercel.app
```

Frontend เรียก `/api/*` ของโปรเจกต์เอง แล้ว Route Handler ดึง/ผูกข้อมูลจาก mock API

```bash
npm run dev
```

เปิด [http://localhost:3000/login](http://localhost:3000/login)

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |

## Demo accounts

รหัสผ่านทุกบัญชี: `password123`

| Email | Role | Landing |
|---|---|---|
| `admin@example.com` | `super_admin` | `/admin` |
| `owner@example.com` | `event_owner` | `/event` |
| `nicha@example.com` | `sub_user` | `/event` |

## Project structure

```
src/
├── app/[locale]/
│   ├── (auth)/login/       # login (full-width)
│   ├── (admin)/admin/      # super_admin area
│   └── (event)/event/      # event_owner / sub_user area
├── app/api/                # BFF route handlers
├── components/             # admin, auth, ui, …
├── core/                   # api client, auth helpers
├── services/               # data binding by area (peer of types/)
├── types/                  # types by area (peer of services/)
├── context/ i18n/ messages/ layout/
└── …
```

รายละเอียดสำหรับ AI agents: [`AGENTS.md`](./AGENTS.md)

## Backend / mock API

เอกสารและ seed อยู่ที่โปรเจกต์ `event_mock_api`:

- `BACKEND_TECHNICAL_DOCUMENTATION.md`
- Deployed base URL: `https://eventmockapi.vercel.app`
