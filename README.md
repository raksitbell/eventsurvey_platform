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

## DATA MODEL

- [Schema DBML](schema.dbml) — Logical Data Model ของระบบ
- [Schema Guide (GitHub Wiki)](https://github.com/raksitbell/eventsurvey_platform/wiki/Schema-DBML) — หน้าที่ของแต่ละตารางและความสัมพันธ์ของข้อมูล
- [Public Database Diagram](https://dbdiagram.io/d/eventsurvey_platform-system-diagram-6ad97841f65bbc60f6fafa5d) — ดู Diagram แบบ Interactive

## TECHNOLOGY

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://skillicons.dev/icons?i=nextjs%2Creact%2Cts%2Ctailwind%2Cnodejs%2Cvercel&theme=dark&perline=8">
    <source media="(prefers-color-scheme: light)" srcset="https://skillicons.dev/icons?i=nextjs%2Creact%2Cts%2Ctailwind%2Cnodejs%2Cvercel&theme=light&perline=8">
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

สร้างไฟล์ `.env.local` สำหรับ Mock API, session และโดเมนลิงก์อีเวนต์

```bash
MOCK_API_BASE_URL=https://eventmockapi.vercel.app
NEXT_PUBLIC_API_BASE_URL=https://eventmockapi.vercel.app
AUTH_SESSION_SECRET=<ค่าที่สร้างจาก openssl rand -hex 32>
APP_URL=http://localhost:3000
```

ใช้ secret สุ่มแยกตาม environment และตั้งค่าใน Vercel ก่อน deploy คุกกี้มีอายุ 8 ชั่วโมงและถูกล้างเมื่อออกจากระบบ การเปลี่ยน secret จะทำให้ session และลิงก์ตั้งรหัสผ่านที่ออกด้วยค่าเดิมหมดอายุ ผู้ใช้ demo ต้องเข้าสู่ระบบใหม่และต้องออกลิงก์ใหม่สำหรับคำเชิญเก่าที่ยังไม่ได้ใช้

Mock API และบัญชีทดลองใช้สำหรับ development ด้วยข้อมูลจำลอง

ตั้ง `APP_URL` เป็น HTTPS origin ของเว็บ Demo จริงเมื่อต้องการสแกนจากมือถือ ใช้อีเวนต์และฟอร์มที่มีอยู่ใน Mock API เพื่อเปิดลิงก์ข้ามเครื่อง การตั้งค่าที่บันทึกใน LocalStorage ของผู้จัดจะแสดงใน Preview ของเบราว์เซอร์นั้น

```bash
npm run dev
```

เปิด <http://localhost:3000/login> แล้วล็อกอินด้วยบัญชีทดลอง — รหัสผ่านทุกบัญชีคือ `password123`

| อีเมล | บทบาท | เข้าไปเจอหน้า |
|---|---|---|
| `admin@example.com` | ผู้ดูแลระบบ (`platform_admin`) | `/admin` |
| `thanawat@example.com` | คนจัดงาน (`event_admin`) | `/event` |
| `kittisak@example.com` | ทีมงานของคนจัดงาน (`event_sub_user`) | `/event` |

| คำสั่ง | ใช้ทำอะไร |
|---|---|
| `npm run dev` | รันบนเครื่องตัวเอง แก้โค้ดแล้วเห็นผลทันที |
| `npm run dev:webpack` | เหมือนด้านบน แต่ใช้ตัว build แบบเดิม เผื่อ Turbopack มีปัญหา |
| `npm run build` | สร้างไฟล์สำหรับขึ้นเซิร์ฟเวอร์จริง |
| `npm run start` | รันเวอร์ชันที่ build แล้ว |
| `npm run lint` | ตรวจโค้ดว่าผิดกฎที่ตั้งไว้ไหม |
| `npm test` | รันชุดทดสอบสิทธิ์และการปกปิด PII ด้วยข้อมูลจำลอง |

---

> [!IMPORTANT]
> ก่อนเขียนโค้ดบรรทัดแรก อ่าน [`AGENTS.md`](AGENTS.md) ให้จบ
> ข้อห้ามในนั้นส่วนใหญ่มาจากกรณีที่เคยทำแล้วเว็บค้างหรือพังจริงในโปรเจกต์นี้ ไม่ใช่กฎที่ตั้งขึ้นลอย ๆ

## Event Dashboard และรายงาน

Dashboard เปิดให้ผู้ใช้ที่มีสิทธิ์ `manage_dashboard` เมื่ออีเวนต์อยู่ในสถานะ `scheduled`, `open` หรือ `closed` ตาม lifecycle ของ Mock API สิทธิ์ของแต่ละฟอร์มกำหนดว่าผู้ใช้จะเห็นคำตอบชุดใด และ BFF ปกปิดค่า PII ก่อนส่งข้อมูลให้หน้าเว็บและไฟล์ส่งออก

| หน้า | การทำงาน |
|---|---|
| `/event/dashboard` | แสดงวิดเจ็ตที่เผยแพร่ โดยคำนวณจากคำตอบ API ของกิจกรรมปัจจุบัน |
| `/event/dashboard/builder` | เพิ่ม/ย้าย/ปรับความกว้าง/ตั้งค่าวิดเจ็ต บันทึกฉบับร่างในอุปกรณ์ หรือเผยแพร่ผ่าน API |
| `/event/responses` | ค้นหาคำตอบแบบสำรวจ ดูรายละเอียด และส่งออก CSV |
| `/event/exports` | CSV คำตอบและสรุปจากแบบฟอร์มสถานะ `scheduled`, `open` หรือ `closed` พร้อมรายงานสำหรับพิมพ์หรือบันทึก PDF |
| `/event/trash` | แสดงถังขยะ กู้คืนแบบฟอร์มภายใน 30 วันตามสิทธิ์ (ไม่กู้คืนคำตอบ) |

ทุกหน้ารองรับไทย/อังกฤษและ dark mode ใช้ BFF `/api/event/data`, `/api/event/dashboard` และ `/api/event/trash` ฉบับร่างเก็บการตั้งค่าวิดเจ็ตใน localStorage แยกตามผู้ใช้และอีเวนต์ การเผยแพร่บันทึกใน `dashboard_layouts` และ `dashboard_widgets` ของ Mock API

Mock API เก็บ `grid_span` และ `date_range_days` สำหรับขนาดวิดเจ็ตและช่วงวันที่ ข้อมูลเดิมยังอ่านได้จาก `grid_w`, `display_size` และ `date_type` การเผยแพร่เขียนวิดเจ็ตชุดใหม่พร้อม `publication_revision` ให้ครบก่อนสลับ `published_widget_ids` ใน layout จึงยังอ่านชุดเดิมได้หากการเขียนชุดใหม่สะดุด

เส้นทางในเว็บใต้ `/event/analytics` เปิดหน้าที่สอดคล้องกันของ Dashboard ส่วน Legacy API `/api/event/analytics` ต้องใช้ข้อมูล `dashboard_data` และ `audit_logs` จึงคืน `503` เมื่อ Mock API ไม่มีทรัพยากรเหล่านี้ หน้า Trash ใช้ข้อมูลฟอร์มที่ถูก soft-delete จึงแสดงฟอร์มที่กู้คืนได้แม้ Mock API ไม่มี `trash_items`

ทดสอบ service, permissions, การคำนวณ และ CSV ด้วย fixture ในหน่วยความจำ (ไม่เขียนข้อมูลไปยัง API ภายนอก):

```bash
node --test tests/*.cjs
```
