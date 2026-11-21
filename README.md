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

## Live Environments

| Environment | Branch | URL |
| --- | --- | --- |
| **Production** | [`main`](https://github.com/raksitbell/eventsurvey_platform/tree/main) | [eventsurvey.raksitbell.app](https://eventsurvey.raksitbell.app/) |
| **Preview** | [`dev`](https://github.com/raksitbell/eventsurvey_platform/tree/dev) | [Open dev Preview](https://eventsurvey-platform-git-dev-raksitbells-projects.vercel.app/) |

Vercel deploys `main` to Production and `dev` to Preview. The Preview URL follows the latest successful deployment of `dev` and may require Vercel sign-in. Each push also appears in GitHub's commit checks and [Deployments](https://github.com/raksitbell/eventsurvey_platform/deployments).

## ภาพรวม

EventSurvey เป็นหน้าเว็บของ **Event + Survey Management Platform** ตาม SRS v1.0.0 ผู้จัดสร้างอีเวนต์แบบเปิดหรือแบบส่วนตัว เปิดรับลงทะเบียน ส่งแบบสอบถามให้ผู้เข้าร่วม ดูสรุปผล และออกรายงานได้ในระบบเดียว ผู้จัดยังเพิ่มทีมงานและกำหนดสิทธิ์ของแต่ละคนได้

ระบบรองรับผู้ใช้ 4 กลุ่ม ได้แก่ ผู้ดูแลระบบ คนจัดงาน ทีมงานของคนจัดงาน และผู้เข้าร่วมงาน

## Setup Instructions

ต้องมี **Node.js 20.9 ขึ้นไป**

### Local Development

1. ติดตั้ง dependencies แล้วคัดลอกไฟล์ต้นแบบสำหรับการตั้งค่าครั้งแรก หากมี `.env.local` อยู่แล้ว ให้เติมเฉพาะค่าที่ขาดในไฟล์เดิม

   ```bash
   npm install
   [ -e .env.local ] || cp .env.example .env.local
   ```

2. ใช้ `openssl rand -hex 32` สร้างค่า `AUTH_SESSION_SECRET` แล้วใส่ผลลัพธ์ลงใน `.env.local` ค่าอื่นเริ่มจาก [ไฟล์ตัวอย่าง](.env.example) และปรับได้ตาม [ตาราง ENV](#environment-variables) ไฟล์ `.env.local` อยู่ใน `.gitignore`

3. เริ่ม Next.js แล้วเปิด <http://localhost:3000/login> ด้วย[บัญชีทดลอง](#บัญชีทดลอง)

   ```bash
   npm run dev
   ```

#### ทดสอบการสร้างหรือแก้ไขอีเวนต์

ใช้ [Event Mock API](https://github.com/Thanawatx01/event_mock_api) ที่เขียนข้อมูลลงไฟล์ได้ Mock API บน Vercel เก็บข้อมูลที่เขียนไว้ในหน่วยความจำของแต่ละ instance คำขอถัดไปจึงอาจมองไม่เห็นข้อมูลที่เพิ่งบันทึก

รันคำสั่งต่อไปนี้ใน repo ของ Mock API

```bash
npm ci
npm exec -- json-server --watch db.json --host 127.0.0.1 --port 3001
```

ตั้ง `MOCK_API_BASE_URL=http://127.0.0.1:3001` ใน `.env.local` ของ EventSurvey ก่อนเริ่ม Next.js เมื่อรัน `npm run dev` ระบบเก็บ Banner และรูป Branding ใน `.eventsurvey-media/` ของโปรเจกต์โดยอัตโนมัติ หากต้องการเก็บไว้นอกโปรเจกต์ ให้ตั้ง `EVENT_SETUP_MEDIA_DIR` เป็นพาธแบบ absolute

### Hosting

1. ตั้งค่าจาก [ตาราง ENV](#environment-variables) ในระบบจัดการ Environment Variables ของโฮสต์ สำหรับ Vercel ให้เลือก **Preview** หรือ **Production** ตามการใช้งาน [คู่มือ Environment Variables ของ Vercel](https://vercel.com/docs/environment-variables)
2. เก็บ `AUTH_SESSION_SECRET` และ `MAIL_PASSWORD` (เมื่อเปิดใช้ SMTP) ในช่อง secrets ของโฮสต์ ใช้ค่า session secret ที่สุ่มแยกกันในแต่ละ environment ตั้ง `APP_URL` เป็น HTTPS origin ที่ผู้รับอีเมลและผู้สแกน QR เปิดได้
3. ตั้ง `MOCK_API_BASE_URL` ให้โฮสต์เข้าถึงได้ และใช้ Mock API ที่บันทึกข้อมูลได้หากต้องสร้างหรือแก้ไขอีเวนต์
4. สำหรับรูป Branding บน Vercel ไปที่ **Project → Storage → Create Storage → Blob** เลือก **Private** และเชื่อมด้วย OIDC สร้าง store แยกสำหรับ Preview และ Production แล้วเลือกเฉพาะ environment ของแต่ละ store ใน **Projects → Update Project Connection** หากมีรูปบน volume เดิม ให้ทำตามขั้นตอนย้ายรูปด้านล่างก่อนสลับระบบ [คู่มือการเชื่อม Blob store](https://vercel.com/docs/vercel-blob/client-upload)
5. Deploy ด้วยค่าที่ตั้งไว้ การเปลี่ยน ENV บน Vercel มีผลกับ deployment ใหม่ ทดสอบบน Preview ด้วยแบนเนอร์ที่มีขนาดหลังเตรียมไฟล์มากกว่า 4.5 MB และต่ำกว่า 10 MiB เปิด Branding ใหม่หลัง Save แล้วเปิดอีเวนต์ทดสอบที่เผยแพร่แล้วจากเบราว์เซอร์ที่ยังไม่ได้เข้าสู่ระบบ ตรวจว่ารูปจาก draft เปิดได้เฉพาะผู้มีสิทธิ์

ลิงก์ที่เปิดข้ามเครื่องใช้อีเวนต์และฟอร์มจาก Mock API สำหรับการตั้งค่าและเผยแพร่อีเวนต์ ดู [การบันทึก Event Setup](#การบันทึก-event-setup)

### Environment Variables

| ตัวแปร | การใช้งาน |
|---|---|
| `AUTH_SESSION_SECRET` | **Secret ที่จำเป็น** สำหรับ session และลิงก์ตั้งรหัสผ่าน สร้างด้วย `openssl rand -hex 32` แยกตาม environment |
| `MOCK_API_BASE_URL` | URL ของ Mock API ที่เซิร์ฟเวอร์ใช้ ค่าเริ่มต้นสำหรับข้อมูลจำลองคือ `https://eventmockapi.vercel.app` |
| `TRIAL_DEMO_API_BASE_URL` | หากใช้ฐานข้อมูลเดโมแยกของตนเอง ให้ระบุ URL ตรงกับ Mock API ของเดโมนั้นเพื่อเปิดใช้รหัสผ่านทดลองสาธารณะ เว้นว่างเมื่อใช้ฐานข้อมูลจริง ส่วน Mock API ตัวอย่างของโครงการเปิดใช้ได้ทันที |
| `NEXT_PUBLIC_API_BASE_URL` | URL สำรองเมื่อไม่มี `MOCK_API_BASE_URL` ใช้เฉพาะค่าที่เปิดเผยได้ |
| `APP_URL` | Origin ของ EventSurvey สำหรับลิงก์ตั้งรหัสผ่าน ลิงก์อีเวนต์ และ QR ค่า local คือ `http://localhost:3000` ค่า hosting คือ HTTPS origin จริง |
| `EVENT_SETUP_DATA_SECRET` | คีย์เข้ารหัสข้อมูล Event Setup อย่างน้อย 32 อักขระ ใช้ค่าคงที่แยกตาม environment แนะนำให้ตั้งแยกจาก `AUTH_SESSION_SECRET` บน hosting |
| `EVENT_SETUP_MEDIA_PROVIDER` | เลือก `blob` สำหรับ Vercel Blob หรือ `disk` สำหรับ volume ถาวร เมื่อเว้นว่าง แอปบน Vercel ที่เชื่อม `BLOB_STORE_ID` จะใช้ Blob และ local development จะใช้ดิสก์ |
| `BLOB_STORE_ID` | Vercel กำหนดจากการเชื่อม private store ของ environment นั้น SDK ใช้ OIDC ของโปรเจกต์ฝั่งเซิร์ฟเวอร์ |
| `EVENT_SETUP_MEDIA_DIR` | พาธแบบ absolute ไปยัง volume ถาวรสำหรับโหมด `disk` และการอ่านรูปเดิมที่ยังอยู่บน volume เมื่อใช้ Blob บน self-hosted server |

คุกกี้ session มีอายุ 8 ชั่วโมงและถูกล้างเมื่อออกจากระบบ เมื่อเปลี่ยน `AUTH_SESSION_SECRET` ผู้ใช้ต้องเข้าสู่ระบบใหม่ และต้องออกลิงก์ตั้งรหัสผ่านใหม่สำหรับคำเชิญที่ยังไม่ได้ใช้

#### ส่งอีเมลตั้งรหัสผ่านด้วย Gmail (ทางเลือก)

| ตัวแปร | ค่า |
|---|---|
| `MAIL_HOST` | `smtp.gmail.com` |
| `MAIL_PORT` | `465` โดย Nodemailer ใช้ TLS สำหรับพอร์ตนี้ |
| `MAIL_USERNAME` | บัญชี Gmail ที่ใช้ส่ง |
| `MAIL_PASSWORD` | **Secret** สำหรับ Gmail App Password |
| `MAIL_FROM_ADDRESS` | ที่อยู่อีเมลผู้ส่ง |
| `MAIL_FROM_NAME` | ชื่อผู้ส่ง เช่น `EventSurvey` |

ตั้ง `APP_URL` ให้ผู้รับเปิดลิงก์ตั้งรหัสผ่านได้ เก็บค่า secret ไว้ใน `.env.local` หรือระบบ secrets ของโฮสต์ตามสภาพแวดล้อมที่ใช้

## การบันทึก Event Setup

- **Save Draft** เก็บ Event Details, Form Setup, Branding และ Whitelist ผ่าน Next.js API คำขอส่ง revision ของร่างเพื่อป้องกันการเขียนทับข้อมูลใหม่ การบันทึกร่างคงสถานะอีเวนต์เดิม
- **นำเข้า Whitelist** เลือก CSV หรือ XLSX โดยใส่คอลัมน์ `Unique ID` และเพิ่ม `Name` ได้ สำหรับ XLSX ให้ใช้ชีตแรกและใส่รหัสที่มีเลขศูนย์นำหน้าเป็นข้อความ ตรวจตัวอย่างก่อนกดนำเข้า แล้วกด Save เพื่อบันทึก
- **กู้ร่างเดิม** เปิด Event Setup หรือ Whitelist จากโปรไฟล์เบราว์เซอร์และ URL เดิม แล้วเลือกกู้ข้อมูล หน้าจอขอยืนยันเมื่อจะใช้ร่างเบราว์เซอร์แทนร่างเซิร์ฟเวอร์ การกู้ snapshot เก่าเก็บไว้เป็นข้อมูลกู้คืนส่วนตัวและไม่เผยแพร่อัตโนมัติ ร่างจากโหมดทดลองของอีเวนต์ที่ปิดการแก้ไขแล้วยังเก็บอยู่ในเบราว์เซอร์เดิม
- **Publish** ใช้ข้อมูลที่บันทึกจาก Event Setup และ Form Builder เพื่อสร้าง snapshot ของอีเวนต์ อีเวนต์สาธารณะเลือกเปิดได้ตั้งแต่ศูนย์ถึงสองฟอร์ม อีเวนต์ส่วนตัวใช้ฟอร์มลงทะเบียนและต้องมีผู้มีสิทธิ์อย่างน้อยหนึ่งคนก่อนเผยแพร่
- **การส่งฟอร์ม** หลังเผยแพร่ เซิร์ฟเวอร์ตรวจช่วงเวลา ความจุ และคำตอบก่อนบันทึก เมื่อลงทะเบียนสำเร็จ เบราว์เซอร์จะได้รับคุกกี้หลักฐานของอีเวนต์นั้น แบบสอบถามที่กำหนดให้ลงทะเบียนก่อนตอบจะเปิดเมื่อเซิร์ฟเวอร์ตรวจพบรายการลงทะเบียนที่ยังมีผล โหมด Preview ใช้ดูตัวอย่างเท่านั้น
- **คำตอบที่ยังไม่ส่ง** เบราว์เซอร์เก็บร่างใน `sessionStorage` ของแท็บเดิม โดยแยกตามอีเวนต์ ฟอร์ม และสิทธิ์ผู้เข้าร่วม สำหรับฟอร์มส่วนตัวให้ยืนยันตัวตนเดิมก่อนกลับมากรอกต่อ ระบบล้างร่างเมื่อเซิร์ฟเวอร์ยืนยันการส่งสำเร็จ
- **ภาษาคอนเทนต์** หน้าผู้เข้าร่วมและ Preview ใช้คำแปลอีเวนต์ทั้งชุดตามภาษา `lang` ถ้าไม่มีภาษานั้นจะใช้ชุดภาษาหลักของอีเวนต์ ช่องที่เว้นว่างจะคงว่าง ชื่อฟอร์ม คำถาม และตัวเลือกใช้ภาษาเดียวกัน โดยเลือกชุดไทยหรืออังกฤษที่ครบ เมื่อเลือกภาษาที่ Form Builder ไม่รองรับ จะลองภาษาหลักของอีเวนต์ก่อน แล้วจึงใช้ชุดที่ครบ ลิงก์และ QR ไปฟอร์มส่งต่อภาษาคอนเทนต์โดยแยกจากภาษาเมนู Portal
- **รูป** รองรับ PNG, JPEG, WebP, AVIF, GIF และ BMP เบราว์เซอร์แปลง SVG เป็น PNG ก่อนส่ง เมื่อใช้ Blob เซิร์ฟเวอร์ตรวจสิทธิ์ของอีเวนต์ก่อนออก signed URL ให้เบราว์เซอร์อัปโหลดตรง แล้วตรวจไฟล์จริงก่อนส่ง URL ถาวรให้ draft เมื่ออัปโหลดไม่สำเร็จ เบราว์เซอร์เดิมเก็บรูปได้สูงสุด 1 MiB ต่อรูป ให้ลองอัปโหลดอีกครั้งหรือนำรูปที่รออัปโหลดออกก่อนเผยแพร่
- **การโฮสต์** เมื่อรับคำตอบจริง ให้ตั้ง `MOCK_API_BASE_URL` ไปยัง API ที่เข้าถึงได้เฉพาะฝั่งเซิร์ฟเวอร์และเก็บข้อมูลลงที่จัดเก็บถาวร สำหรับ JSON Server ให้ใช้ Next.js หนึ่ง instance ที่เขียน Event Setup เพราะ JSON Server ไม่มีการเขียนแบบ compare-and-set ข้อมูล Event Setup ใน Mock API ถูกเข้ารหัสด้วย `EVENT_SETUP_DATA_SECRET` หรือ `AUTH_SESSION_SECRET` เมื่อไม่ตั้งคีย์แยก เก็บคีย์เดิมไว้เพื่อให้อ่านร่าง ข้อมูลเผยแพร่ และหลักฐานการลงทะเบียนหลังรีสตาร์ตหรือ deploy ใหม่ได้

### ย้ายรูป Branding จาก volume เดิมไป Vercel Blob

ใช้ขั้นตอนนี้เมื่อ draft หรือ snapshot ใช้ URL `/api/event/setup/media/<uuid>` จาก volume เดิม ทำงานจากเครื่องที่อ่าน volume และเชื่อม private store เป้าหมายได้

1. เก็บสำเนา volume และบันทึกรายการ UUID จากร่างและข้อมูลที่เผยแพร่ทุกภาษาของ environment นั้น แต่ละโฟลเดอร์ `<uuid>/` มี `data` และ `metadata.json` ซึ่งระบุ `eventId`, `type` และ `size` ดูฟิลด์ Branding ที่อ้าง URL เพื่อระบุ `kind` เป็น `logo`, `wordmark` หรือ `banner` ตรวจว่าไฟล์ต้นทางมีชนิดและขนาดตรงกับ metadata
2. สร้าง pathname รูปเป็น `event-setup/media/<eventKey>/<kind>/<uuid>.<ext>` โดย `eventKey` คือ `Buffer.from(eventId, "utf8").toString("base64url")` และ `ext` คือส่วนหลัง `image/` ของ MIME เช่น `jpeg` ตั้งค่า CLI ให้ชี้ไปยัง store ของ environment เป้าหมาย
3. คัดลอกไบต์ต้นฉบับด้วย `vercel blob put <uuid>/data --pathname <pathname> --content-type <type> --access private` แล้วดาวน์โหลดลงไฟล์ชั่วคราวด้วย `vercel blob get <pathname> --access private --output <temporary-file>` เทียบ SHA-256 ของทั้งสองไฟล์ด้วย `shasum -a 256` หาก pathname มีอยู่แล้ว ให้ดาวน์โหลดมาตรวจ checksum ก่อนใช้ไฟล์นั้นต่อ หากต่างกันให้หยุดตรวจสอบ UUID และ store [คำสั่ง Vercel Blob CLI](https://vercel.com/docs/cli/blob)
4. เมื่อ checksum ตรง ให้สร้างไฟล์ JSON ชั่วคราวที่คัด `eventId`, `type`, `size` จาก metadata เดิมและเติม `kind` จากข้อ 1 อัปโหลดเป็น `event-setup/metadata/<uuid>.json` ด้วย `--access private --content-type application/json` อ่าน manifest กลับมาเทียบค่าทั้งสี่ฟิลด์ กรณีที่มี manifest อยู่แล้ว ให้ตรวจข้อมูลเดิมก่อนดำเนินการต่อ
5. ตรวจรายการรูปอีกครั้งขณะสลับผู้เขียนไปยัง Blob เพื่อเก็บรูปที่เพิ่งบันทึก เปิด URL เดิมจากร่างด้วยบัญชีผู้จัดที่มีสิทธิ์ และเปิดรูปใน snapshot จากหน้าผู้เข้าร่วม ตรวจ checksum ของรูปที่ส่งผ่าน URL เดิมเทียบกับต้นทาง เก็บ volume ต้นฉบับและบัญชีรายการไว้สำหรับการกู้คืน

## บัญชีทดลอง

Mock API และบัญชีในตารางใช้ข้อมูลจำลองสำหรับ development รหัสผ่านของทุกบัญชีคือ `password123`

| อีเมล | บทบาท | เข้าไปเจอหน้า |
|---|---|---|
| `admin@example.com` | ผู้ดูแลระบบ (`platform_admin`) | `/admin` |
| `thanawat@example.com` | คนจัดงาน (`event_admin`) | `/event` |
| `kittisak@example.com` | ทีมงานของคนจัดงาน (`event_sub_user`) | `/event` |

ในระบบเดโม เปิด **การกำหนดค่าระบบ → จัดการบัญชีทดลอง → เพิ่มบัญชีทดลอง** ฟอร์มจะเลือกใช้รหัสผ่านทดลองสาธารณะไว้ให้ เมื่อเลือกบัญชีนี้ที่หน้าเข้าสู่ระบบ ระบบจะเติมอีเมลและรหัสผ่านให้ทันทีแม้ใช้เบราว์เซอร์ใหม่ ทุกคนที่เลือกบัญชีจะเข้าใช้สิทธิ์ตามบทบาทที่กำหนดได้ สำหรับบัญชีคนจัดงานและทีมงาน ให้ผูกอีเวนต์เพื่อให้บัญชีปรากฏในรายการเข้าสู่ระบบ หากเลือกกำหนดรหัสผ่านเอง ผู้ใช้จะต้องมีรหัสผ่านนั้น

## คำสั่งที่ใช้บ่อย

| คำสั่ง | ใช้ทำอะไร |
|---|---|
| `npm run dev` | รันบนเครื่องตัวเอง แก้โค้ดแล้วเห็นผลทันที |
| `npm run dev:webpack` | เหมือนด้านบน แต่ใช้ตัว build แบบเดิม เผื่อ Turbopack มีปัญหา |
| `npm run build` | สร้างไฟล์สำหรับขึ้นเซิร์ฟเวอร์จริง |
| `npm run start` | รันเวอร์ชันที่ build แล้ว |
| `npm run lint` | ตรวจโค้ดว่าผิดกฎที่ตั้งไว้ไหม |
| `npm test` | รันชุดทดสอบสิทธิ์และการปกปิด PII ด้วยข้อมูลจำลอง |

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

ชุดทดสอบใช้ fixture ในหน่วยความจำเพื่อตรวจ service, permissions, การคำนวณ และ CSV โดยไม่เขียนข้อมูลไปยัง API ภายนอก

```bash
node --test tests/*.cjs
```

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

## Data Model

- [Schema DBML](schema.dbml) — Logical Data Model ของระบบ
- [Schema Guide (GitHub Wiki)](https://github.com/raksitbell/eventsurvey_platform/wiki/Schema-DBML) — หน้าที่ของแต่ละตารางและความสัมพันธ์ของข้อมูล
- [Public Database Diagram](https://dbdiagram.io/d/eventsurvey_platform-system-diagram-6ad97841f65bbc60f6fafa5d) — ดู Diagram แบบ Interactive

## แนวทางพัฒนา

อ่าน [`AGENTS.md`](AGENTS.md) ก่อนเริ่มแก้โค้ด คู่มือครอบคลุมโครงสร้างโฟลเดอร์ การทำหลายภาษา การใช้ธีมและสี การแยก component และข้อกำหนดที่มาจากปัญหาที่เคยเกิดกับเว็บและโปรเจกต์
