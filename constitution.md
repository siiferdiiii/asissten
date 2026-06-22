# AI Constitution

## Purpose

Dokter Assistant adalah aplikasi internal untuk membantu asisten dokter mengelola jadwal, perjalanan, hotel, packing list, tugas, dokumen, dan reminder.

## Golden Rules

1. Jangan membuat fitur yang tidak tertulis dalam PRD.
2. Jangan membuat tabel database yang tidak ada pada schema.prisma.
3. Jangan membuat endpoint yang tidak ada pada api-spec.md.
4. Jangan membuat event realtime yang tidak ada pada socket_event.md.
5. Jangan mengubah role dan permission tanpa persetujuan.
6. Jangan mengganti stack teknologi tanpa persetujuan.

## Missing Specification Policy

Jika spesifikasi tidak tersedia:

* STOP
* Jelaskan informasi yang hilang
* Minta klarifikasi

Dilarang membuat asumsi sendiri.

## Source of Truth Priority

Urutan prioritas dokumen:

1. constitution.md
2. business-rules.md
3. schema.prisma
4. api-spec.md
5. socket_event.md
6. prd.md
7. design.md

Jika terjadi konflik antar dokumen, gunakan urutan prioritas di atas.

## Architecture Lock

Frontend:

* Next.js
* TypeScript
* TailwindCSS
* React Query

Backend:

* NestJS
* Prisma
* PostgreSQL

Realtime:

* Socket.io

Queue:

* BullMQ

Storage:

* Cloudflare R2

Maps:

* Google Maps API

WhatsApp:

* AppSheet Indonesia API

Dilarang mengganti teknologi tanpa persetujuan eksplisit.

## Code Quality Rules

* TypeScript strict mode
* No any
* DTO validation wajib
* Prisma transaction untuk operasi kritikal
* Error handling wajib
* Audit log wajib untuk mutation utama
