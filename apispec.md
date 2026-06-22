# API Specification

> **Status:** Draft v0.1
> **Base URL:** `/api/v1`
> **Dokumen terkait:** `prd.md` (functional requirements), `schema.prisma` (data model), `frontend-spec.md` (UI/UX)

---

## 1. Konvensi

### Authentication
Semua endpoint kecuali yang ditandai **Public** membutuhkan header:
```
Authorization: Bearer {accessToken}
```
- **Access token:** JWT, 15 menit, payload: `{ sub: userId }`
- **Refresh token:** httpOnly cookie `refreshToken`, 7 hari, dipakai di `POST /auth/refresh`
- Guard NestJS memverifikasi token, lalu resolve membership user ke `doctorProfileId` dari param/query/body

### NestJS Implementation Notes
- Guard `JwtAuthGuard` — verifikasi token di semua route protected
- Guard `DoctorProfileGuard` — extract `doctorProfileId` dari request, cek membership aktif user, inject `req.membership` (berisi role)
- Guard `RolesGuard` + decorator `@Roles('owner_assistant', 'assistant')` — cek role dari `req.membership`
- Interceptor `ActivityLogInterceptor` — global, otomatis catat mutation ke `activity_logs` (FR-23)

### Response Envelope

**Sukses — single resource:**
```json
{ "data": { ... } }
```

**Sukses — list dengan pagination offset:**
```json
{
  "data": [...],
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
}
```

**Sukses — list dengan cursor (activity logs):**
```json
{
  "data": [...],
  "meta": { "nextCursor": "string | null", "hasMore": true }
}
```

**Sukses dengan warning non-blocking (misal: overlap jadwal):**
```json
{
  "data": { ... },
  "warnings": [{ "type": "overlap", "conflictsWith": [...] }]
}
```

**Error:**
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Deskripsi singkat",
  "details": [{ "field": "email", "message": "must be an email" }]
}
```

### Format & Validasi
- Datetime: ISO 8601 dengan timezone (`2025-07-05T14:00:00+08:00`)
- Tanggal saja: `YYYY-MM-DD`
- ID: UUID v4 (string)
- Pagination default: `page=1`, `limit=20`, max `limit=100`

### Singkatan Role
**OA** = owner_assistant · **AS** = assistant · **DR** = doctor · **VI** = viewer

---

## 2. Reusable Schemas

Schemas ini direferensikan di seluruh dokumen. Implementasikan sebagai DTO/interface TypeScript.

### UserSummary
```ts
{ id: string; name: string; avatarUrl: string | null }
```

### UserDetail
```ts
{ id: string; name: string; email: string; phone: string | null; avatarUrl: string | null; createdAt: string }
```

### MembershipDetail
```ts
{
  id: string; userId: string; doctorProfileId: string;
  role: 'owner_assistant' | 'assistant' | 'doctor' | 'viewer';
  status: 'active' | 'invited' | 'revoked';
  user: UserSummary & { email: string }
}
```

### DoctorProfileDetail
```ts
{ id: string; userId: string; specialization: string; strNumber: string | null; defaultTimezone: string }
```

### TripSummary
```ts
{
  id: string; doctorProfileId: string; title: string;
  destinationCity: string; destinationCountry: string;
  startDate: string; endDate: string;
  status: 'planning' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled';
  createdBy: UserSummary; createdAt: string; updatedAt: string;
  _meta: { hotelCount: number; confirmedHotelCount: number; packingProgress: { packed: number; total: number } }
}
```

### TripDetail = TripSummary +
```ts
{ purpose: string | null }
```

### ScheduleEventDetail
```ts
{
  id: string; doctorProfileId: string; tripId: string | null;
  type: 'clinic' | 'surgery' | 'meeting' | 'conference' | 'flight' | 'personal';
  title: string; location: string | null;
  startDatetime: string; endDatetime: string; timezone: string;
  isRecurring: boolean; recurrenceRule: string | null;
  status: 'tentative' | 'confirmed' | 'cancelled';
  notes: string | null; createdBy: UserSummary; createdAt: string; updatedAt: string;
}
```

### HotelDetail
```ts
{
  id: string; tripId: string; name: string;
  formattedAddress: string | null; latitude: number | null; longitude: number | null; placeId: string | null;
  checkIn: string; checkOut: string;
  bookingStatus: 'searching' | 'booked' | 'confirmed' | 'cancelled';
  bookingReference: string | null; price: number | null; currency: string | null;
  platform: 'traveloka' | 'agoda' | 'booking_com' | 'other' | null;
  notes: string | null; createdAt: string; updatedAt: string;
}
```

### PackingItem
```ts
{ id: string; itemName: string; category: 'clothing' | 'document' | 'medical' | 'electronics' | 'toiletries' | 'other'; qty: number; isPacked: boolean }
```

### PackingListDetail
```ts
{ id: string; tripId: string; progress: { packed: number; total: number }; items: PackingItem[] }
```

### PackingTemplateDetail
```ts
{
  id: string; name: string; ownerUserId: string;
  items: Array<{ id: string; itemName: string; category: string; defaultQty: number }>
}
```

### TaskDetail
```ts
{
  id: string; doctorProfileId: string; tripId: string | null;
  title: string; description: string | null; dueDate: string | null;
  assignedTo: UserSummary | null; priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'done';
  isOverdue: boolean;    // computed: dueDate < today && status !== 'done'
  createdBy: UserSummary; createdAt: string; updatedAt: string;
}
```

### ReminderDetail
```ts
{
  id: string; entityType: 'schedule_event' | 'hotel' | 'task' | 'trip'; entityId: string;
  remindAt: string; channel: 'push' | 'whatsapp' | 'email';
  recipientUserId: string; status: 'pending' | 'sent' | 'failed';
  createdAt: string;
}
```

### NotificationDetail
```ts
{
  id: string; title: string; body: string;
  entityType: string | null; entityId: string | null;
  isRead: boolean; createdAt: string;
}
```

### DocumentDetail
```ts
{
  id: string; entityType: 'schedule_event' | 'hotel' | 'task' | 'trip'; entityId: string;
  fileUrl: string; fileType: string; fileSize: number;
  uploadedBy: UserSummary; uploadedAt: string;
}
```

### ActivityLogDetail
```ts
{
  id: string; actor: UserSummary;
  action: 'created' | 'updated' | 'deleted' | 'status_changed';
  entityType: string; entityId: string; createdAt: string;
}
```

---

## 3. Permission Matrix

| Operasi | OA | AS | DR | VI |
|---|:---:|:---:|:---:|:---:|
| Read semua resource | ✓ | ✓ | ✓ | ✓ |
| Create/edit/delete trip | ✓ | ✓ | ✗ | ✗ |
| Create/edit/delete schedule event | ✓ | ✓ | ✗ | ✗ |
| Konfirmasi event tentative | ✓ | ✓ | ✓ | ✗ |
| Create/edit/delete hotel | ✓ | ✓ | ✗ | ✗ |
| Toggle `isPacked` di packing item | ✓ | ✓ | ✓ | ✗ |
| Create/edit/delete packing item & template | ✓ | ✓ | ✗ | ✗ |
| Create/edit/delete task | ✓ | ✓ | ✗ | ✗ |
| Update `status` task yang diassign ke diri sendiri | ✓ | ✓ | ✓ | ✗ |
| Upload/delete dokumen | ✓ | ✓ | ✗ | ✗ |
| Kelola reminder | ✓ | ✓ | ✗ | ✗ |
| Undang/edit/revoke anggota tim | ✓ | ✗ | ✗ | ✗ |
| Edit profil dokter | ✓ | ✗ | ✗ | ✗ |

> RBAC dienforce di level Guard — bukan hanya di UI (FR-26).

---

## 4. Endpoints

---

### 4.1 Auth

#### `POST /auth/login` — Public
Login, kembalikan token.

**Body:**
```json
{ "email": "string", "password": "string" }
```

**Response 200:**
```json
{
  "data": {
    "accessToken": "string",
    "user": "UserDetail",
    "memberships": ["MembershipDetail"]
  }
}
```

> Refresh token di-set sebagai httpOnly cookie `refreshToken`.
> `memberships` disertakan agar client langsung tahu `doctorProfileId` yang tersedia tanpa request tambahan.

**Error:** `401` invalid credentials

---

#### `POST /auth/refresh` — Public (butuh cookie `refreshToken`)
Dapatkan access token baru.

**Response 200:**
```json
{ "data": { "accessToken": "string" } }
```

**Error:** `401` token invalid / expired / revoked

---

#### `POST /auth/logout` — Authenticated
Revoke refresh token, hapus cookie.

**Response 200:** `{ "data": { "success": true } }`

---

#### `POST /auth/forgot-password` — Public

**Body:** `{ "email": "string" }`

**Response 200:** `{ "data": { "message": "Jika email terdaftar, link reset telah dikirim." } }`

> Selalu return 200 untuk mencegah email enumeration.

---

#### `POST /auth/reset-password` — Public

**Body:** `{ "token": "string", "newPassword": "string" }`

**Response 200:** `{ "data": { "success": true } }`

**Error:** `400` token expired/invalid

---

#### `POST /auth/invite/accept` — Public
Terima undangan, buat akun, aktifkan membership.

**Body:** `{ "inviteToken": "string", "name": "string", "password": "string" }`

**Response 201:**
```json
{ "data": { "accessToken": "string", "user": "UserDetail" } }
```

> Jika email dari invite sudah punya akun → link ke akun tersebut, jangan buat duplikat.
> Refresh token di-set sebagai httpOnly cookie.

**Error:** `400` token expired/invalid, `409` email sudah terdaftar dengan password berbeda

---

### 4.2 Users

#### `GET /users/me`
**Role:** Semua

**Response 200:** `{ "data": UserDetail }`

---

#### `PATCH /users/me`
**Role:** Semua

**Body (semua opsional):** `{ "name": "string", "phone": "string" }`

**Response 200:** `{ "data": UserDetail }`

---

#### `PATCH /users/me/password`
**Role:** Semua

**Body:** `{ "currentPassword": "string", "newPassword": "string" }`

**Response 200:** `{ "data": { "success": true } }`

**Error:** `400` current password salah

---

#### `POST /users/me/avatar/presigned-url`
**Role:** Semua

**Body:** `{ "fileType": "image/jpeg | image/png | image/heic", "fileSize": "number (bytes)" }`

**Response 200:**
```json
{ "data": { "uploadUrl": "string", "key": "string", "expiresAt": "ISO8601" } }
```

> Setelah upload ke R2 sukses, client `PATCH /users/me` dengan body `{ "avatarKey": "string" }` untuk menyimpan URL.

**Error:** `400` file type tidak diizinkan, `400` ukuran > 5MB

---

### 4.3 Doctor Profiles

#### `GET /doctor-profiles/:id`
**Role:** Semua yang punya membership aktif ke doctorProfile ini

**Response 200:**
```json
{ "data": { "...DoctorProfileDetail": "", "user": "UserSummary" } }
```

---

#### `PATCH /doctor-profiles/:id`
**Role:** OA

**Body (semua opsional):** `{ "specialization": "string", "strNumber": "string", "defaultTimezone": "string" }`

**Response 200:** `{ "data": DoctorProfileDetail }`

---

### 4.4 Team (Memberships)

#### `GET /doctor-profiles/:doctorProfileId/members`
**Role:** Semua

**Response 200:** `{ "data": [MembershipDetail] }`

---

#### `POST /doctor-profiles/:doctorProfileId/members/invite`
**Role:** OA

**Body:** `{ "email": "string", "role": "assistant | doctor | viewer" }`

**Response 201:**
```json
{ "data": { "membership": "MembershipDetail", "inviteTokenExpiresAt": "ISO8601" } }
```

> Kirim email berisi link `/invite/{inviteToken}`. Token expire 7 hari.

**Error:** `409` email sudah jadi anggota aktif di doctorProfile ini

---

#### `PATCH /doctor-profiles/:doctorProfileId/members/:userId`
**Role:** OA

**Body:** `{ "role": "assistant | doctor | viewer" }`

**Response 200:** `{ "data": MembershipDetail }`

**Error:** `403` tidak bisa mengubah role diri sendiri (OA satu-satunya), `404` membership tidak ditemukan

---

#### `DELETE /doctor-profiles/:doctorProfileId/members/:userId`
**Role:** OA

> Set `status = revoked`. Record tidak dihapus (audit trail).

**Response 200:** `{ "data": { "success": true } }`

**Error:** `403` tidak bisa merevoke diri sendiri

---

### 4.5 Trips

#### `GET /trips`
**Role:** Semua

**Query params:**
| Param | Tipe | Req | Keterangan |
|---|---|:---:|---|
| `doctorProfileId` | uuid | ✓ | Scope ke profil dokter |
| `status` | enum | ✗ | planning \| confirmed \| ongoing \| completed \| cancelled |
| `search` | string | ✗ | Cari di `title`, `destinationCity` |
| `page` | int | ✗ | Default 1 |
| `limit` | int | ✗ | Default 20 |

**Response 200:** `{ "data": [TripSummary], "meta": { pagination } }`

---

#### `POST /trips`
**Role:** OA, AS

**Body:**
```json
{
  "doctorProfileId": "uuid",
  "title": "string",
  "destinationCity": "string",
  "destinationCountry": "string",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "purpose": "string (opsional)"
}
```

**Response 201:** `{ "data": TripDetail }`

**Error:** `400` `endDate` < `startDate`

---

#### `GET /trips/:id`
**Role:** Semua

**Response 200:** `{ "data": TripDetail }`

---

#### `PATCH /trips/:id`
**Role:** OA, AS

**Body (semua opsional):**
```json
{
  "title": "string",
  "destinationCity": "string",
  "destinationCountry": "string",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "purpose": "string",
  "status": "planning | confirmed | cancelled"
}
```

> Status `ongoing` dan `completed` hanya bisa di-set oleh background job (FR-7). Jika client mengirim nilai tersebut → `400`.

**Response 200:** `{ "data": TripDetail }`

---

#### `DELETE /trips/:id`
**Role:** OA, AS

> Cascade delete: hotels, schedule_events (ber-tripId ini), packing_list + items, documents, tasks terkait.

**Response 200:** `{ "data": { "success": true } }`

---

### 4.6 Schedule Events

#### `GET /schedule-events`
**Role:** Semua

**Query params:**
| Param | Tipe | Req | Keterangan |
|---|---|:---:|---|
| `doctorProfileId` | uuid | ✓ | |
| `from` | YYYY-MM-DD | ✗ | `startDatetime ≥ from` |
| `to` | YYYY-MM-DD | ✗ | `startDatetime ≤ to` |
| `type` | enum | ✗ | clinic \| surgery \| meeting \| conference \| flight \| personal |
| `tripId` | uuid | ✗ | Filter event milik trip tertentu |
| `status` | enum | ✗ | tentative \| confirmed \| cancelled |
| `page` | int | ✗ | |
| `limit` | int | ✗ | |

**Response 200:** `{ "data": [ScheduleEventDetail], "meta": { pagination } }`

---

#### `POST /schedule-events`
**Role:** OA, AS

**Body:**
```json
{
  "doctorProfileId": "uuid",
  "tripId": "uuid (opsional)",
  "type": "clinic | surgery | meeting | conference | flight | personal",
  "title": "string",
  "location": "string (opsional)",
  "startDatetime": "ISO8601",
  "endDatetime": "ISO8601",
  "timezone": "string (contoh: Asia/Jakarta)",
  "isRecurring": "boolean",
  "recurrenceRule": "string RRULE (opsional, required jika isRecurring=true)",
  "status": "tentative | confirmed",
  "notes": "string (opsional)"
}
```

**Response 201:**
```json
{
  "data": "ScheduleEventDetail",
  "warnings": [
    {
      "type": "overlap",
      "conflictsWith": [
        { "id": "uuid", "title": "string", "startDatetime": "ISO8601", "endDatetime": "ISO8601" }
      ]
    }
  ]
}
```

> Overlap bersifat non-blocking (FR-2). `warnings` = `[]` jika tidak ada konflik.

**Error:** `400` `endDatetime` < `startDatetime`

---

#### `GET /schedule-events/:id`
**Role:** Semua

**Response 200:** `{ "data": ScheduleEventDetail }`

---

#### `PATCH /schedule-events/:id`
**Role:** OA, AS (edit penuh); DR (hanya via endpoint `/confirm` di bawah)

**Query params:**
| Param | Nilai | Keterangan |
|---|---|---|
| `updateScope` | `this` \| `this_and_following` | Hanya relevan untuk recurring event. Default: `this` |

**Body (semua opsional):** Sama dengan POST, minus `doctorProfileId`.

**Response 200:** `{ "data": ScheduleEventDetail, "warnings": [...] }`

---

#### `DELETE /schedule-events/:id`
**Role:** OA, AS

**Query params:** `scope=this | this_and_following` (default: `this`)

**Response 200:** `{ "data": { "success": true } }`

---

#### `POST /schedule-events/:id/confirm`
**Role:** OA, AS, DR

> Shortcut konfirmasi: hanya mengubah `status → confirmed`. DR dapat menggunakan endpoint ini untuk event tentative.

**Response 200:** `{ "data": ScheduleEventDetail }`

**Error:** `400` event sudah `confirmed` atau `cancelled`; `403` DR mencoba konfirmasi event yang bukan milik doctorProfile-nya

---

### 4.7 Hotels

#### `GET /trips/:tripId/hotels`
**Role:** Semua

**Response 200:** `{ "data": [HotelDetail] }`

---

#### `POST /trips/:tripId/hotels`
**Role:** OA, AS

**Body:**
```json
{
  "name": "string",
  "formattedAddress": "string (opsional)",
  "latitude": "number (opsional)",
  "longitude": "number (opsional)",
  "placeId": "string (opsional, dari Google Places)",
  "checkIn": "YYYY-MM-DD",
  "checkOut": "YYYY-MM-DD",
  "bookingStatus": "searching | booked | confirmed | cancelled",
  "bookingReference": "string (opsional)",
  "price": "number (opsional)",
  "currency": "string (opsional, ISO 4217, contoh: IDR)",
  "platform": "traveloka | agoda | booking_com | other (opsional)",
  "notes": "string (opsional)"
}
```

**Response 201:** `{ "data": HotelDetail }`

**Error:** `400` `checkOut` ≤ `checkIn`

---

#### `GET /hotels/:id`
**Role:** Semua

**Response 200:** `{ "data": HotelDetail }`

---

#### `PATCH /hotels/:id`
**Role:** OA, AS

**Body (semua opsional):** Sama dengan POST.

**Response 200:** `{ "data": HotelDetail }`

---

#### `DELETE /hotels/:id`
**Role:** OA, AS

**Response 200:** `{ "data": { "success": true } }`

---

### 4.8 Packing

#### `GET /trips/:tripId/packing-list`
**Role:** Semua

> Create-on-read: jika packing list belum ada untuk trip ini, otomatis dibuat (list kosong).

**Response 200:** `{ "data": PackingListDetail }`

---

#### `POST /trips/:tripId/packing-list/load-template`
**Role:** OA, AS

**Body:** `{ "templateId": "uuid" }`

> Snapshot copy items dari template ke packing list (FR-13). Item yang sudah ada di list **tidak** di-overwrite — append saja. Perubahan template di kemudian hari tidak memengaruhi list yang sudah dibuat.

**Response 200:** `{ "data": PackingListDetail }`

**Error:** `404` template tidak ditemukan, `403` bukan pemilik template

---

#### `POST /trips/:tripId/packing-list/items`
**Role:** OA, AS

**Body:** `{ "itemName": "string", "category": "enum", "qty": "number (default 1)" }`

**Response 201:** `{ "data": PackingItem }`

---

#### `PATCH /packing-items/:id`
**Role:** OA, AS (edit penuh); DR (hanya field `isPacked`)

**Body (semua opsional):** `{ "itemName": "string", "category": "enum", "qty": "number", "isPacked": "boolean" }`

> DR yang mengirim field selain `isPacked` → `403`.

**Response 200:** `{ "data": PackingItem }`

---

#### `DELETE /packing-items/:id`
**Role:** OA, AS

**Response 200:** `{ "data": { "success": true } }`

---

#### `GET /packing-templates`
**Role:** OA, AS

> Hanya tampilkan template milik user yang sedang login (`ownerUserId = req.user.id`).

**Response 200:** `{ "data": [{ "id": "uuid", "name": "string", "itemCount": "number" }] }`

---

#### `POST /packing-templates`
**Role:** OA, AS

**Body:**
```json
{
  "name": "string",
  "items": [{ "itemName": "string", "category": "enum", "defaultQty": 1 }]
}
```

**Response 201:** `{ "data": PackingTemplateDetail }`

---

#### `GET /packing-templates/:id`
**Role:** OA, AS (hanya owner template)

**Response 200:** `{ "data": PackingTemplateDetail }`

---

#### `PATCH /packing-templates/:id`
**Role:** OA, AS (hanya owner)

**Body (opsional):** `{ "name": "string", "items": [...] }`

> Jika `items` dikirim → replace semua items (bukan partial update per item).

**Response 200:** `{ "data": PackingTemplateDetail }`

---

#### `DELETE /packing-templates/:id`
**Role:** OA, AS (hanya owner)

**Response 200:** `{ "data": { "success": true } }`

---

### 4.9 Tasks

#### `GET /tasks`
**Role:** Semua

**Query params:**
| Param | Tipe | Req | Keterangan |
|---|---|:---:|---|
| `doctorProfileId` | uuid | ✓ | |
| `status` | enum | ✗ | open \| in_progress \| done |
| `assignedTo` | uuid | ✗ | Filter per userId |
| `priority` | enum | ✗ | low \| medium \| high |
| `tripId` | uuid | ✗ | Task terkait trip tertentu |
| `isOverdue` | boolean | ✗ | `true` = dueDate < today && status ≠ done |
| `page` | int | ✗ | |
| `limit` | int | ✗ | |

**Response 200:** `{ "data": [TaskDetail], "meta": { pagination } }`

---

#### `POST /tasks`
**Role:** OA, AS

**Body:**
```json
{
  "doctorProfileId": "uuid",
  "tripId": "uuid (opsional)",
  "title": "string",
  "description": "string (opsional)",
  "dueDate": "YYYY-MM-DD (opsional)",
  "assignedToId": "uuid (opsional)",
  "priority": "low | medium | high",
  "status": "open | in_progress"
}
```

**Response 201:** `{ "data": TaskDetail }`

**Error:** `400` `assignedToId` bukan anggota aktif doctorProfile yang sama

---

#### `GET /tasks/:id`
**Role:** Semua

**Response 200:** `{ "data": TaskDetail }`

---

#### `PATCH /tasks/:id`
**Role:** OA, AS (edit penuh); DR (hanya field `status`, hanya task yang `assignedTo = req.user.id`)

**Body (semua opsional):** Sama dengan POST minus `doctorProfileId`.

> DR yang mengirim field selain `status` → `403`. DR yang mengubah task milik orang lain → `403`.

**Response 200:** `{ "data": TaskDetail }`

---

#### `DELETE /tasks/:id`
**Role:** OA, AS

**Response 200:** `{ "data": { "success": true } }`

---

### 4.10 Reminders

#### `GET /reminders`
**Role:** OA, AS

**Query params:** `entityType` (required), `entityId` (required)

**Response 200:** `{ "data": [ReminderDetail] }`

---

#### `POST /reminders`
**Role:** OA, AS

**Body:**
```json
{
  "entityType": "schedule_event | hotel | task | trip",
  "entityId": "uuid",
  "remindAt": "ISO8601",
  "channel": "push | whatsapp | email",
  "recipientUserId": "uuid"
}
```

**Response 201:** `{ "data": ReminderDetail }`

**Error:** `400` `remindAt` sudah lewat; `400` `recipientUserId` bukan anggota aktif

---

#### `PATCH /reminders/:id`
**Role:** OA, AS

**Body (opsional):** `{ "remindAt": "ISO8601", "channel": "enum" }`

> Hanya bisa edit reminder dengan `status = pending`.

**Response 200:** `{ "data": ReminderDetail }`

**Error:** `400` reminder sudah sent/failed

---

#### `DELETE /reminders/:id`
**Role:** OA, AS

> Hanya bisa hapus reminder dengan `status = pending`.

**Response 200:** `{ "data": { "success": true } }`

---

### 4.11 Documents

#### `GET /documents`
**Role:** Semua

**Query params:** `entityType` (required), `entityId` (required)

**Response 200:** `{ "data": [DocumentDetail] }`

---

#### `POST /documents/presigned-url`
**Role:** OA, AS

> Step 1 dari 2 — minta URL upload langsung ke R2.

**Body:**
```json
{
  "fileName": "string",
  "fileType": "application/pdf | image/jpeg | image/png | image/heic",
  "fileSize": "number (bytes)",
  "entityType": "schedule_event | hotel | task | trip",
  "entityId": "uuid"
}
```

**Response 200:**
```json
{ "data": { "uploadUrl": "string", "key": "string", "expiresAt": "ISO8601" } }
```

**Error:** `400` file type tidak diizinkan; `400` `fileSize` > 10485760 (10 MB)

---

#### `POST /documents`
**Role:** OA, AS

> Step 2 dari 2 — registrasi dokumen ke DB setelah upload ke R2 sukses.

**Body:**
```json
{
  "key": "string",
  "entityType": "schedule_event | hotel | task | trip",
  "entityId": "uuid",
  "fileName": "string",
  "fileType": "string",
  "fileSize": "number"
}
```

**Response 201:** `{ "data": DocumentDetail }`

---

#### `DELETE /documents/:id`
**Role:** OA, AS

> Hapus record di DB **dan** file dari R2.

**Response 200:** `{ "data": { "success": true } }`

---

### 4.12 Notifications

#### `GET /notifications`
**Role:** Semua

> Hanya kembalikan notifikasi milik `req.user.id`.

**Query params:** `isRead` (boolean, opsional), `page`, `limit`

**Response 200:** `{ "data": [NotificationDetail], "meta": { pagination } }`

---

#### `GET /notifications/unread-count`
**Role:** Semua

**Response 200:** `{ "data": { "count": 5 } }`

---

#### `PATCH /notifications/:id/read`
**Role:** Semua (hanya notifikasi milik sendiri)

**Response 200:** `{ "data": NotificationDetail }`

---

#### `PATCH /notifications/read-all`
**Role:** Semua

**Response 200:** `{ "data": { "updated": 12 } }`

---

### 4.13 Activity Logs

#### `GET /activity-logs`
**Role:** Semua

**Query params:**
| Param | Tipe | Req | Keterangan |
|---|---|:---:|---|
| `doctorProfileId` | uuid | ✓ | |
| `entityType` | string | ✗ | Filter by entity type |
| `entityId` | uuid | ✗ | Filter by specific entity |
| `cursor` | string | ✗ | Dari `meta.nextCursor` response sebelumnya |
| `limit` | int | ✗ | Default 20, max 50 |

**Response 200:**
```json
{
  "data": ["ActivityLogDetail"],
  "meta": { "nextCursor": "string | null", "hasMore": true }
}
```

---

## 5. Background Jobs

Bukan endpoint HTTP — diimplementasikan sebagai BullMQ workers di NestJS.

### `trip-status-sync`
**Jadwal:** Cron harian, 00:05 UTC (gunakan `@nestjs/schedule` + `@Cron`)

**Logic:**
```
FOR EACH trip WHERE status IN ('planning', 'confirmed', 'ongoing'):
  IF start_date <= today <= end_date → status = 'ongoing'
  IF end_date < today → status = 'completed'
  (abaikan trip berstatus 'cancelled')
```

Setelah update → emit Socket.io event `trip.statusChanged` ke room `doctor:{doctorProfileId}`.

---

### `reminder-dispatch`
**Jadwal:** Setiap 1 menit (`@Cron(CronExpression.EVERY_MINUTE)`)

**Logic:**
```
1. Query: reminders WHERE status = 'pending' AND remind_at <= NOW()
2. Untuk tiap reminder:
   a. Kirim ke channel (push / whatsapp / email)
   b. Jika sukses:
      - Set status = 'sent'
      - INSERT Notification { recipientUserId, title, body, entityType, entityId }
      - Emit socket event 'notification.created' ke room 'user:{recipientUserId}'
   c. Jika gagal (FR-19):
      - Set status = 'failed'
      - Log error
      - Jika channel = 'whatsapp' → retry sekali via 'push' (fallback)
```