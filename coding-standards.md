# Coding Standards

## Version

v1.0

---

# 1. General Rules

## CS-001

Seluruh project wajib menggunakan:

* TypeScript
* Strict Mode

Dilarang menonaktifkan strict mode.

---

## CS-002

Dilarang menggunakan:

```ts
any
```

Gunakan:

```ts
unknown
```

atau tipe yang jelas.

---

## CS-003

Semua source code menggunakan Bahasa Inggris.

Tidak boleh menggunakan Bahasa Indonesia untuk:

* variable
* function
* class
* interface
* enum

---

# 2. Naming Convention

## Variable

Gunakan:

```ts
camelCase
```

Contoh:

```ts
doctorProfileId
tripStatus
```

---

## Function

Gunakan:

```ts
camelCase
```

Contoh:

```ts
createTrip()
sendReminder()
```

---

## Class

Gunakan:

```ts
PascalCase
```

Contoh:

```ts
TripService
ReminderProcessor
```

---

## Interface

Gunakan:

```ts
PascalCase
```

Contoh:

```ts
TripDetail
CreateTripRequest
```

---

## Enum

Gunakan:

```ts
PascalCase
```

Contoh:

```ts
TripStatus
UserRole
```

---

# 3. Backend Standards

## CS-BE-001

Backend menggunakan:

* NestJS
* Prisma
* PostgreSQL

Tidak boleh menggunakan ORM lain.

---

## CS-BE-002

Setiap endpoint wajib memiliki:

* DTO Request
* DTO Response
* Validation

---

## CS-BE-003

Validation menggunakan:

* class-validator
* class-transformer

---

## CS-BE-004

Business logic harus berada di:

```txt
Service
```

Bukan di Controller.

---

## CS-BE-005

Controller hanya:

* menerima request
* memanggil service
* mengembalikan response

---

## CS-BE-006

Tidak boleh menulis query database di controller.

---

# 4. Prisma Standards

## CS-PRISMA-001

Akses database hanya melalui Prisma.

---

## CS-PRISMA-002

Operasi yang mengubah lebih dari satu entity wajib menggunakan:

```ts
prisma.$transaction()
```

---

## CS-PRISMA-003

Dilarang menggunakan raw SQL kecuali benar-benar diperlukan.

---

## CS-PRISMA-004

Semua tabel wajib memiliki:

```ts
createdAt
updatedAt
```

---

# 5. API Standards

## CS-API-001

Semua endpoint mengikuti api-spec.md.

Tidak boleh membuat endpoint baru tanpa spesifikasi.

---

## CS-API-002

Response format:

```json
{
  "success": true,
  "data": {}
}
```

---

## CS-API-003

Error format:

```json
{
  "success": false,
  "error": {
    "code": "APP-001",
    "message": "Permission denied"
  }
}
```

---

# 6. Frontend Standards

## CS-FE-001

Frontend menggunakan:

* Next.js
* App Router

---

## CS-FE-002

Data fetching menggunakan:

* React Query

Tidak menggunakan fetch langsung di component.

---

## CS-FE-003

Form menggunakan:

* React Hook Form

---

## CS-FE-004

Validation menggunakan:

* Zod

---

## CS-FE-005

Server state:

* React Query

Client state:

* React Context

Tidak menggunakan Redux.

---

# 7. Realtime Standards

## CS-RT-001

Realtime menggunakan:

* Socket.io

---

## CS-RT-002

Nama event mengikuti:

```txt
entity.action
```

Contoh:

```txt
trip.created
hotel.updated
task.deleted
```

---

## CS-RT-003

Event harus dikirim setelah database commit.

---

# 8. Logging Standards

## CS-LOG-001

Gunakan NestJS Logger.

---

## CS-LOG-002

Jangan log:

* password
* token
* api key

---

## CS-LOG-003

Semua error penting wajib tercatat.

---

# 9. Security Standards

## CS-SEC-001

Password wajib di-hash.

---

## CS-SEC-002

JWT wajib memiliki expiration.

---

## CS-SEC-003

Endpoint private wajib menggunakan authentication.

---

## CS-SEC-004

Role checking wajib dilakukan di backend.

Tidak boleh hanya di frontend.

---

# 10. Testing Standards

## CS-TEST-001

Semua service penting wajib memiliki unit test.

Prioritas:

* ScheduleService
* TripService
* ReminderService
* HotelService

---

## CS-TEST-002

Business rule penting wajib memiliki test.

---

# 11. AI Generator Rules

## CS-AI-001

AI tidak boleh membuat folder baru tanpa alasan jelas.

---

## CS-AI-002

AI tidak boleh mengubah struktur project tanpa persetujuan.

---

## CS-AI-003

AI harus mengikuti:

1. constitution.md
2. architecture.md
3. business-rules.md
4. coding-standards.md

---

## CS-AI-004

Jika spesifikasi tidak tersedia:

STOP

Minta klarifikasi.

Jangan membuat asumsi.
