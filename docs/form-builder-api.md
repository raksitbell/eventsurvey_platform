# Form Builder API

BFF ใต้ `/api/event/forms*` สำหรับสร้าง / อ่าน / แก้ / เปลี่ยนสถานะ / soft-delete ฟอร์ม  
Payload หลักตรงกับ state ของ Form Builder (`src/types/event/form.ts` — `head` + `questions`)

Browser เรียกแค่ `/api/...` — ไม่เรียก mock ตรง

---

## Auth

ทุก endpoint ต้องมี session cookie ของพื้นที่ event (`event_owner` / `sub_user` หรือ super_admin ที่กำลัง impersonate)

| รายการ | ค่า |
|---|---|
| Cookie name | `event_surway_session` |
| Value | URL-encoded JSON: `{ "userId", "role", "realRole", "impersonating" }` |
| สิทธิ์ฟอร์ม | `role_permissions`: `manage_registration_form` / `manage_survey_form` ตาม `type` |
| สมาชิกอีเวนต์ | `users.event_id` ต้องตรงกับฟอร์ม / `eventId` ที่ส่ง |

ตัวอย่าง cookie (Pim — draft Community Meetup):

```bash
COOKIE=$(python3 -c 'import urllib.parse,json; print(urllib.parse.quote(json.dumps({
  "userId":"2fe6a003-59af-5f7d-a768-e8539b43f837",
  "role":"event_owner",
  "realRole":"event_owner",
  "impersonating":False
})))')
```

ใช้ใน curl: `-H "Cookie: event_surway_session=$COOKIE"`

---

## Seed ที่ใช้ทดสอบ (local mock)

| รายการ | ID |
|---|---|
| Event (draft meetup) | `550267c4-98f1-5ffc-94c6-81155429cd03` |
| Draft registration | `0486f101-9307-509d-a770-1f501a622503` |
| User (Pim / Event Admin) | `2fe6a003-59af-5f7d-a768-e8539b43f837` |
| Event (Tech Summit) | `452ac247-5c88-59ca-8de7-c5a329c71317` |
| Published registration | `89e426a3-3b34-50f1-821f-d485abab001b` |

Base URL ตัวอย่าง: `http://localhost:3000`

---

## Endpoints

| Method | Path | หน้าที่ |
|---|---|---|
| `GET` | `/api/event/forms?eventId=` | list ฟอร์มที่ยังไม่ soft-delete |
| `POST` | `/api/event/forms` | สร้าง draft (`Form` + `eventId`) |
| `GET` | `/api/event/forms/[id]` | รายละเอียดเต็ม (Form + meta) |
| `PUT` | `/api/event/forms/[id]` | แทนที่ definition — **เฉพาะ draft** และอีเวนต์ยังไม่เริ่ม |
| `PATCH` | `/api/event/forms/[id]/status` | เปลี่ยนสถานะ / ตารางเปิด-ปิด |
| `DELETE` | `/api/event/forms/[id]` | soft-delete (`deleted_at`) |

### HTTP status ที่พบบ่อย

| Code | เมื่อไหร่ |
|---|---|
| `200` / `201` / `204` | สำเร็จ (สร้าง / ลบตามลำดับ) |
| `400` | Zod ไม่ผ่าน / ยัง publish ไม่ได้ |
| `401` | ไม่มี session |
| `403` | เข้า event area ไม่ได้ / ไม่มีสิทธิ์จัดการฟอร์ม / คนละอีเวนต์ |
| `404` | ไม่พบฟอร์ม (หรือถูกลบแล้ว) |
| `409` | type ซ้ำในอีเวนต์ / แก้ definition ทั้งที่ไมใช่ draft / อีเวนต์เริ่มแล้ว |
| `502` | เรียก mock ไม่สำเร็จ |

---

## รูปข้อมูลหลัก

### Body ที่ UI ส่ง (`Form`)

```json
{
  "type": "registration",
  "head": {
    "en": { "title": "Meetup Registration", "description": "Fill in to join" },
    "th": { "title": "ลงทะเบียนมีตอัป", "description": "กรอกเพื่อเข้าร่วม" }
  },
  "questions": [
    {
      "question": {
        "id": "optional-uuid-when-updating",
        "type": "short_text",
        "display_order": 1,
        "min_number": 0,
        "max_number": 0,
        "min_length": 0,
        "max_length": 160,
        "required": true,
        "label": {
          "en": [
            {
              "label": "Full name",
              "placeholder": "e.g. Somchai",
              "choices": { "en": [], "th": [] }
            }
          ],
          "th": [
            {
              "label": "ชื่อ-นามสกุล",
              "placeholder": "เช่น สมชาย",
              "choices": { "en": [], "th": [] }
            }
          ]
        }
      }
    },
    {
      "question": {
        "type": "multiple_choice",
        "display_order": 2,
        "min_number": 0,
        "max_number": 0,
        "min_length": 0,
        "max_length": 0,
        "required": true,
        "label": {
          "en": [
            {
              "label": "Topic",
              "placeholder": "",
              "choices": {
                "en": [
                  { "id": "11111111-1111-4111-8111-111111111111", "label": "AI", "display_order": 1 },
                  { "id": "22222222-2222-4222-8222-222222222222", "label": "Web", "display_order": 2 }
                ],
                "th": [
                  { "id": "11111111-1111-4111-8111-111111111111", "label": "เอไอ", "display_order": 1 },
                  { "id": "22222222-2222-4222-8222-222222222222", "label": "เว็บ", "display_order": 2 }
                ]
              }
            }
          ],
          "th": [
            {
              "label": "หัวข้อ",
              "placeholder": "",
              "choices": { "en": [], "th": [] }
            }
          ]
        }
      }
    }
  ]
}
```

`type` ของคำถามที่รองรับ: `short_text` | `long_text` | `multiple_choice` | `dropdown` | `checkbox` | `date` | `time` | `rating`  
(`multiple_choice` ถูกแมปเป็น mock `radio`)

ตัวเลือก: FormBuilder แก้หลักที่ `label.en[0].choices.en` — ฝั่ง API อ่านชุดนั้นเป็นหลัก แล้วจับคู่ label ไทยจาก `choices.th` ตาม `id` / index

### Response (`FormRecord`)

คือ `Form` + metadata:

```json
{
  "id": "0486f101-9307-509d-a770-1f501a622503",
  "eventId": "550267c4-98f1-5ffc-94c6-81155429cd03",
  "type": "registration",
  "status": "draft",
  "opensAt": null,
  "closesAt": null,
  "acceptingResponses": false,
  "publishedAt": null,
  "createdAt": "2026-10-06T04:00:00Z",
  "updatedAt": "2026-10-20T04:00:00Z",
  "head": { "en": { "...": "..." }, "th": { "...": "..." } },
  "questions": [ "..." ]
}
```

---

## ตัวอย่างการยิง

ตั้งตัวแปรครั้งเดียว:

```bash
BASE=http://localhost:3000
EVENT=550267c4-98f1-5ffc-94c6-81155429cd03
DRAFT=0486f101-9307-509d-a770-1f501a622503
# COOKIE ตามหัวข้อ Auth
```

### 1) List ฟอร์มของอีเวนต์

```bash
curl -s -H "Cookie: event_surway_session=$COOKIE" \
  "$BASE/api/event/forms?eventId=$EVENT"
```

### 2) Get รายละเอียดตาม id

```bash
curl -s -H "Cookie: event_surway_session=$COOKIE" \
  "$BASE/api/event/forms/$DRAFT"
```

### 3) สร้างฟอร์ม (POST) — ต้องยังไม่มี type นั้นในอีเวนต์

```bash
curl -s -X POST \
  -H "Cookie: event_surway_session=$COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "550267c4-98f1-5ffc-94c6-81155429cd03",
    "type": "survey",
    "head": {
      "en": { "title": "Meetup Survey", "description": "" },
      "th": { "title": "แบบสอบถามมีตอัป", "description": "" }
    },
    "questions": [
      {
        "question": {
          "type": "rating",
          "display_order": 1,
          "min_number": 1,
          "max_number": 5,
          "min_length": 0,
          "max_length": 0,
          "required": true,
          "label": {
            "en": [{ "label": "Score", "placeholder": "", "choices": { "en": [], "th": [] } }],
            "th": [{ "label": "คะแนน", "placeholder": "", "choices": { "en": [], "th": [] } }]
          }
        }
      }
    ]
  }' \
  "$BASE/api/event/forms"
```

สำเร็จ → `201` + `FormRecord`  
type ซ้ำ → `409` `{ "error": "FORM_TYPE_EXISTS", ... }`

### 4) อัปเดต definition (PUT) — เฉพาะ draft

```bash
curl -s -X PUT \
  -H "Cookie: event_surway_session=$COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "registration",
    "head": {
      "en": { "title": "Meetup Registration (Updated)", "description": "test" },
      "th": { "title": "ลงทะเบียนมีตอัป (อัปเดต)", "description": "ทดสอบ" }
    },
    "questions": [
      {
        "question": {
          "type": "short_text",
          "display_order": 1,
          "min_number": 0,
          "max_number": 0,
          "min_length": 0,
          "max_length": 100,
          "required": true,
          "label": {
            "en": [{ "label": "Name", "placeholder": "", "choices": { "en": [], "th": [] } }],
            "th": [{ "label": "ชื่อ", "placeholder": "", "choices": { "en": [], "th": [] } }]
          }
        }
      }
    ]
  }' \
  "$BASE/api/event/forms/$DRAFT"
```

ถ้า `status !== "draft"` หรืออีเวนต์เริ่มแล้ว → `409`

### 5) เปลี่ยนสถานะ (PATCH)

Publish:

```bash
curl -s -X PATCH \
  -H "Cookie: event_surway_session=$COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"status":"published"}' \
  "$BASE/api/event/forms/$DRAFT/status"
```

ผลที่คาด: `status: "published"`, `acceptingResponses: true`, มี `publishedAt`

Pause:

```bash
curl -s -X PATCH \
  -H "Cookie: event_surway_session=$COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"status":"paused"}' \
  "$BASE/api/event/forms/$DRAFT/status"
```

ผลที่คาด: `acceptingResponses: false`

ตั้งตารางเปิด-ปิดพร้อมสถานะ:

```bash
curl -s -X PATCH \
  -H "Cookie: event_surway_session=$COOKIE" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "published",
    "opensAt": "2027-01-01T00:00:00.000Z",
    "closesAt": "2027-01-31T17:00:00.000Z",
    "acceptingResponses": true
  }' \
  "$BASE/api/event/forms/$DRAFT/status"
```

กฎ publish อย่างน้อย: มี title ทั้ง `th`/`en`, มี ≥1 question, ชนิด choice ต้องมี option ≥ 1 — ไม่ผ่าน → `400` `FORM_NOT_PUBLISHABLE`

### 6) Soft-delete (DELETE)

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE \
  -H "Cookie: event_surway_session=$COOKIE" \
  "$BASE/api/event/forms/<form-id>"
```

สำเร็จ → `204`  
list จะไม่โชว์ แต่แถวใน mock ยังอยู่พร้อม `deleted_at`

### 7) Validation error (Zod)

```bash
curl -s -X POST \
  -H "Cookie: event_surway_session=$COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"eventId":"bad","type":"registration"}' \
  "$BASE/api/event/forms"
```

ตัวอย่างตอบ:

```json
{
  "error": "VALIDATION_ERROR",
  "details": [
    { "path": "eventId", "message": "Invalid UUID" },
    { "path": "head", "message": "Invalid input: expected object, received undefined" }
  ]
}
```

---

## กฎสำคัญ (สั้นๆ)

- หนึ่งอีเวนต์มี registration + survey ได้อย่างละ 1 ฟอร์มที่ยังไม่ถูกลบ
- แก้ `questions` / `head` ผ่าน `PUT` ได้เฉพาะตอน `draft` และก่อน `events.starts_at`
- หลัง publish ใช้ `PATCH .../status` สำหรับ pause / close / ฯลฯ
- Soft-delete ไม่ลบ `form_submissions`
- ไม่มี `field_key` / `option_key` ใน schema ปัจจุบัน — uniqueness ของคำถามใช้ `display_order`

---

## ไฟล์อ้างอิงในโค้ด

| ชั้น | path |
|---|---|
| Types | `src/types/event/form.ts` |
| Zod | `src/core/validation/forms.ts` |
| Service | `src/services/event/forms.ts` |
| Routes | `src/app/api/event/forms/**` |
| Auth guard | `src/core/auth/api-guard.ts` (`denyUnlessEventFormManager`) |
