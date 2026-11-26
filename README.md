# EventSurvey Platform

ระบบจัดอีเวนต์และแบบสอบถาม ผู้จัดตั้งค่าหน้างาน เปิดรับลงทะเบียน จัดการรายชื่อผู้มีสิทธิ์ และดูผลผ่านแดชบอร์ดหรือรายงาน ผู้เข้าร่วมเปิดหน้าอีเวนต์และแบบฟอร์มจากลิงก์หรือ QR โดยตรง

<p align="center">
  <a href="https://github.com/raksitbell/eventsurvey_platform/actions/workflows/codeql.yml"><img src="https://github.com/raksitbell/eventsurvey_platform/actions/workflows/codeql.yml/badge.svg" alt="CodeQL"></a>
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" alt="Next.js 16">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
</p>

## ทดลองใช้งาน

| สภาพแวดล้อม | สาขา | ลิงก์ |
| --- | --- | --- |
| Production | `main` | [eventsurvey.raksitbell.app](https://eventsurvey.raksitbell.app/) |
| Vercel Preview | `dev` | [เปิด dev Preview](https://eventsurvey-platform-git-dev-raksitbells-projects.vercel.app/) · ต้องลงชื่อเข้าใช้ Vercel และมีสิทธิ์เข้าถึง |

ในหน้าเข้าสู่ระบบ เลือก **Demo User** หรือกรอกบัญชีตัวอย่างต่อไปนี้จากชุดข้อมูล Mock API รหัสผ่านคือ `password123`

| อีเมล | บทบาท | หน้าหลังเข้าสู่ระบบ |
| --- | --- | --- |
| `admin@example.com` | ผู้ดูแลระบบ | `/admin` |
| `thanawat@example.com` | ผู้จัดอีเวนต์ | `/event` |
| `kittisak@example.com` | ทีมงานอีเวนต์ | `/event` |

## เริ่มพัฒนาบนเครื่อง

ต้องมี **Node.js 20.9 ขึ้นไป** และ npm รันคำสั่งต่อไปนี้จากโฟลเดอร์ EventSurvey

```bash
npm ci
[ -e .env.local ] || cp .env.example .env.local
openssl rand -hex 32
```

นำค่าที่ได้จาก `openssl` ไปใส่ใน `AUTH_SESSION_SECRET` ใน `.env.local` หากมีไฟล์และ secret อยู่แล้ว ให้ใช้ค่าเดิม จากนั้นเริ่มแอปและเปิด [หน้าเข้าสู่ระบบ](http://localhost:3000/login)

```bash
npm run dev
```

ค่าใน [`.env.example`](.env.example) ชี้ไปยัง Mock API เดโมที่ใช้ข้อมูลร่วมกัน ใช้ Mock API บนเครื่องเมื่อต้องการทดสอบการสร้างหรือแก้ไขอีเวนต์ การเผยแพร่ หรือการส่งคำตอบด้วยชุดข้อมูลแยก

### รัน Mock API บนเครื่อง

เปิดอีกเทอร์มินัลในโฟลเดอร์แม่ของ EventSurvey แล้วรันคำสั่งต่อไปนี้เพื่อให้ JSON Server บันทึกการเปลี่ยนแปลงลง `db.json` ของเครื่อง หากมี repo อยู่แล้ว ให้เริ่มจากคำสั่ง `cd`

```bash
git clone https://github.com/Thanawatx01/event_mock_api.git
cd event_mock_api
npm ci
npm exec -- json-server --watch db.json --host 127.0.0.1 --port 3001
```

ตั้ง `MOCK_API_BASE_URL=http://127.0.0.1:3001` ใน `.env.local` ของ EventSurvey แล้วเริ่ม `npm run dev` ใหม่ แอปจะเก็บรูป Branding บนเครื่องใน `.eventsurvey-media/` ตามค่าเริ่มต้นของ development

## คำสั่งพัฒนา

| คำสั่ง | ใช้สำหรับ |
| --- | --- |
| `npm run dev` | รัน Next.js ด้วย Turbopack |
| `npm run dev:webpack` | รันด้วย webpack |
| `npm run build` | สร้าง production build |
| `npm run start` | เปิด production build ที่สร้างแล้ว |
| `npm run lint` | ตรวจด้วย ESLint |
| `npm test` | รันชุดทดสอบ Node.js สำหรับ auth, Event Setup, ฟอร์มและการตอบฟอร์ม รายงาน และการปกปิดข้อมูลส่วนบุคคล |

## เทคโนโลยี

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

## เอกสารโครงการ

- **คู่มือและการโฮสต์** รวมตัวแปรสภาพแวดล้อม SMTP, Private Blob, การใช้งานบัญชีเดโม และรายละเอียดฟีเจอร์ [GitHub Wiki](https://github.com/raksitbell/eventsurvey_platform/wiki)
- **การทำงานของอีเวนต์** ตั้งแต่บันทึกร่างและ Publish จนถึงหน้าอีเวนต์ ฟอร์ม และรายงาน [Event Setup](https://github.com/raksitbell/eventsurvey_platform/wiki/Event-Setup) · [Participant](https://github.com/raksitbell/eventsurvey_platform/wiki/Participant) · [Dashboard & Reporting](https://github.com/raksitbell/eventsurvey_platform/wiki/Event-Dashboard-and-Reporting)
- **แนวทางพัฒนาและดีไซน์** โครงสร้างโค้ด การแปลภาษา ข้อกำหนดการทำงานใน repo และการออกแบบจอผู้เข้าร่วม [AGENTS.md](AGENTS.md) · [DESIGN.md](DESIGN.md)
- **แบบจำลองข้อมูลเชิงตรรกะ** สำหรับออกแบบฐานข้อมูล สัญญาที่แอปใช้กับ Mock API อ้างอิงจาก types และ services ใน `src/` [schema.dbml](schema.dbml) · [Schema Guide](https://github.com/raksitbell/eventsurvey_platform/wiki/Schema-DBML) · [Database Diagram](https://dbdiagram.io/d/eventsurvey_platform-system-diagram-6ad97841f65bbc60f6fafa5d)

เบราว์เซอร์เรียก `/api/*` ของ Next.js แล้วบริการฝั่งเซิร์ฟเวอร์จึงเรียก Mock API [Deployments](https://github.com/raksitbell/eventsurvey_platform/deployments)
