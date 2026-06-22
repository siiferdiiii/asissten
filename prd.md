# PRD — Spesifikasi Fungsional, Data, & Arsitektur

> **Status:** Final v1.0 (Ready for Code Generation)
> **Dokumen terkait:** `design.md` (UI/UX, halaman, design system) — dokumen ini fokus ke business logic, data model, dan arsitektur teknis.
> **Nama aplikasi:** Dokter Assistant

---

## 1. Ringkasan & Latar Belakang

Saat ini seluruh koordinasi jadwal dokter, booking hotel, dan persiapan perjalanan dilakukan manual — tersebar di WhatsApp, catatan, dan komunikasi langsung. Pendekatan ini rawan human error (jadwal bentrok tidak terdeteksi, info hotel telat sampai ke dokter, item packing kelupaan) dan tidak scalable kalau tim asisten bertambah. Aplikasi ini jadi single source of truth untuk seluruh operasional tersebut, dengan akses realtime untuk dokter dan asisten lain.

---

## 2. Tujuan

- Satu sumber data untuk jadwal, trip, hotel, packing, dan tugas — menggantikan pencatatan tersebar.
- Dokter dan asisten lain mendapat update tanpa perlu bertanya manual (realtime).
- Mengurangi human error lewat validasi otomatis (deteksi bentrok jadwal, reminder terjadwal).
- Struktur data siap berkembang ke multi-dokter/tim asisten lebih besar di masa depan, meski V1 fokus 1 dokter.

---

## 3. Pengguna & Role

Sistem menerapkan Role-Based Access Control (RBAC) yang ketat di level backend (NestJS Guards) dan direfleksikan di frontend. Detail hak akses:

1. **`owner_assistant`**: Asisten utama / pembuat akun. Memiliki akses Full CRUD semua modul, manajemen anggota tim (invite, ubah role, revoke), melihat activity log lengkap, dan mengelola profil dokter.
2. **`assistant`**: Asisten tambahan / operasional. Memiliki akses Full CRUD untuk modul operasional (schedule, trip, hotel, packing list, tugas, dokumen). **Tidak dapat** mengelola anggota tim atau mengubah konfigurasi sensitif dokter. Dapat melihat halaman Tim dalam mode *Read-only*.
3. **`doctor`**: Dokter pemilik profil. Akses utama adalah *Read* di semua modul, ditambah aksi terbatas seperti konfirmasi jadwal *tentative*, mencentang item *packing list* pribadi, dan menandai tugas pribadinya selesai.
4. **`viewer`**: Akses cadangan untuk pihak ketiga. Bersifat *Read-only* di seluruh sistem.

---

## 4. Functional Requirements

### 4.1 Jadwal (Schedule)
- **FR-1** Tipe event didukung: `clinic`, `surgery`, `meeting`, `conference`, `flight`, `personal`.
- **FR-2** Sistem mendeteksi overlap waktu antar event pada `doctor_profile` yang sama dan menampilkan warning non-blocking saat create/edit (tidak mem-block, karena overlap kadang disengaja).
- **FR-3** Event recurring disimpan dengan RRULE (format iCal); saat edit, user memilih "hanya event ini" atau "event ini dan seterusnya".
- **FR-4** Lifecycle status: `tentative → confirmed → cancelled`. Role `assistant`/`owner_assistant` bisa set semua transisi; role `doctor` hanya bisa melakukan transisi `tentative → confirmed` untuk event miliknya sendiri.
- **FR-5** Setiap event menyimpan `timezone` sendiri (independen dari timezone device), karena dokter berpindah zona waktu.

### 4.2 Trip
- **FR-6** Lifecycle status: `planning → confirmed → ongoing → completed → cancelled`.
- **FR-7** Background job harian (cron) otomatis melakukan transisi status: `ongoing` jika `start_date ≤ hari ini ≤ end_date`, `completed` jika `end_date < hari ini` — kecuali status sudah `cancelled`.
- **FR-8** Satu trip mendukung banyak hotel (kasus multi-city/pindah hotel), masing-masing dengan rentang tanggal check-in dan check-out sendiri.

### 4.3 Hotel
- **FR-9** Lifecycle `booking_status`: `searching → booked → confirmed → cancelled`, diubah manual oleh assistant (booking dilakukan di luar sistem secara manual, sistem bertindak sebagai tracker dan aggregator informasi).
- **FR-10** Validasi: Tanggal `check_out` wajib hukumnya lebih besar dari `check_in`.
- **FR-11** Field `platform` menyimpan asal booking (`traveloka` / `agoda` / `booking_com` / `other`) sebagai referensi metadata.
- **FR-12** Hotel menyimpan `latitude`, `longitude`, `place_id` (dari Google Places Autocomplete saat input) untuk render mini map dan tombol "Datangi" (deep link Google Maps Directions).

### 4.4 Packing List
- **FR-13** Fitur "Muat dari Template" melakukan **snapshot copy** item dari `packing_template_items` ke `packing_items` milik trip tersebut — bukan referensi live, supaya perubahan template nanti tidak memengaruhi packing list yang sudah berjalan.
- **FR-14** Progress packing dihitung otomatis dengan rumus: (jumlah item `is_packed = true`) / (total item).
- **FR-15** Role `doctor` diberikan akses untuk mencentang/menandai (`is_packed = true/false`) item pada packing list miliknya sendiri secara realtime untuk konfirmasi mandiri, namun tidak diberikan hak akses menambah atau menghapus baris item baru.

### 4.5 Tugas (Tasks)
- **FR-16** Lifecycle status: `open → in_progress → done`.
- **FR-17** Task dianggap overdue jika `due_date < hari ini` dan `status ≠ done`.

### 4.6 Reminder & Notifikasi
- **FR-18** Default lead time untuk pengiriman reminder otomatis diatur mutlak berdasarkan tipe aktivitas:
  - **Jadwal Kegiatan (Clinic/Surgery/Meeting/Conference/Personal):** 2 jam sebelum acara dimulai.
  - **Jadwal Penerbangan (Flight):** 24 jam dan 5 jam sebelum keberangkatan.
  - **Batas Check-in Hotel:** 3 jam sebelum batas waktu check-in.
  - **Deadline Tugas (Tasks):** Jam 08:00 pagi di hari batas tenggat waktu (`due_date`).
- **FR-19** Job scheduler (BullMQ) mengecek tabel `reminders` setiap 1 menit untuk kondisi `remind_at ≤ now AND status = pending`, lalu mengeksekusi pengiriman.
- **FR-20** Jika pengiriman WhatsApp gagal (nomor invalid/API error), sistem wajib melakukan fallback otomatis ke push notification dan mencatat `status = failed` beserta detail error pada log.
- **FR-21** User dapat mengatur preferensi channel notifikasi per kategori (jadwal/tugas/hotel) di halaman Settings.

### 4.7 Dokumen
- **FR-22** Batas maksimal ukuran file dokumen yang diunggah diatur mutlak sebesar **10MB** per file. Format file yang diizinkan sistem hanya **PDF, JPG, PNG, dan HEIC**. Format di luar itu wajib ditolak oleh sistem dengan pesan validasi yang jelas.
- **FR-23** Dokumen disimpan di object storage S3-Compatible (Cloudflare R2); database hanya menyimpan URL + metadata hasil unggahan.

### 4.8 Activity Log
- **FR-24** Setiap operasi mutation (`create`, `update`, `delete`) pada entity utama (`schedule_events`, `hotels`, `trips`, `tasks`, `packing_items`) otomatis tercatat ke `activity_logs` lewat interceptor global di level backend.
- **FR-25** Halaman data Activity Log lengkap diletakkan pada menu navigasi terpisah bernama **"Log Aktivitas"** yang diisolasi khusus dan **hanya bisa diakses oleh role `owner_assistant`**.

### 4.9 Realtime & Akses
- **FR-26** Setiap client yang login membuka koneksi Socket.io dan join room `doctor:{doctorProfileId}` sesuai dengan token keanggotaannya.
- **FR-27** Setelah mutation berhasil disimpan di database (setelah DB commit), service backend wajib memancarkan event ke room terkait; client melakukan targeted cache invalidation (React Query) tanpa perlu refresh halaman total.
- **FR-28** Fitur Global Search di topbar dikeluarkan dari ruang lingkup V1. Pencarian data difokuskan secara lokal melalui filter dan kolom search di masing-masing tab modul operasional.

---

## 5. Data Model

```
users
  id (uuid, pk), name, email (unique), phone, password_hash, avatar_url, created_at

doctor_profiles
  id (uuid, pk), user_id -> users.id, specialization, str_number, default_timezone

memberships
  id (uuid, pk), user_id -> users.id, doctor_profile_id -> doctor_profiles.id,
  role (enum: owner_assistant | assistant | doctor | viewer),
  status (enum: active | invited | revoked)

trips
  id (uuid, pk), doctor_profile_id -> doctor_profiles.id, title,
  destination_city, destination_country, start_date, end_date, purpose,
  status (enum: planning | confirmed | ongoing | completed | cancelled),
  created_by -> users.id, deleted_at (nullable for soft delete)

schedule_events
  id (uuid, pk), doctor_profile_id -> doctor_profiles.id, trip_id -> trips.id (nullable),
  type (enum: clinic | surgery | meeting | conference | flight | personal),
  title, location, start_datetime (timestamptz), end_datetime (timestamptz), timezone,
  is_recurring (bool), recurrence_rule, status (enum: tentative | confirmed | cancelled),
  notes, created_by -> users.id, deleted_at (nullable for soft delete)

hotels
  id (uuid, pk), trip_id -> trips.id, name, formatted_address,
  latitude, longitude, place_id,
  check_in (date), check_out (date),
  booking_status (enum: searching | booked | confirmed | cancelled),
  booking_reference, price, currency, platform (enum: traveloka | agoda | booking_com | other), notes,
  deleted_at (nullable for soft delete)

packing_templates / packing_template_items
  template yang di-reuse: nama template + list default item per kategori

packing_lists / packing_items
  id (uuid, pk), trip_id -> trips.id (1:1 lewat packing_lists),
  item_name, category (enum: clothing | document | medical | electronics | toiletries | other),
  qty, is_packed (bool)

tasks
  id (uuid, pk), doctor_profile_id -> doctor_profiles.id, trip_id -> trips.id (nullable),
  title, description, due_date, assigned_to -> users.id,
  priority (enum: low | medium | high), status (enum: open | in_progress | done),
  created_by -> users.id, deleted_at (nullable for soft delete)

reminders                   -- polymorphic
  id (uuid, pk), entity_type (schedule_event | hotel | task | trip), entity_id (uuid),
  remind_at (timestamptz), channel (enum: push | whatsapp),
  recipient_user_id -> users.id, status (enum: pending | sent | failed)

documents                   -- polymorphic
  id (uuid, pk), entity_type, entity_id, file_url, file_type, file_size,
  uploaded_by -> users.id, uploaded_at

activity_logs
  id (uuid, pk), doctor_profile_id -> doctor_profiles.id, actor_user_id -> users.id,
  action (enum: create | update | delete), entity_type, entity_id, created_at
```

---

## 6. Arsitektur Teknis & Integrasi Eksternal

- **Backend Framework:** NestJS dengan arsitektur modular terbagi atas modul-modul inti sesuai representasi entitas data model.
- **Database & ORM:** PostgreSQL sebagai *Single Source of Truth* diakses menggunakan Prisma ORM. Semua penyimpanan data waktu wajib menggunakan format UTC di database, konversi zona waktu dilakukan di frontend.
- **WhatsApp Provider:** Sistem terintegrasi secara mutlak dengan **AppSheet Indonesia API** menggunakan autentikasi API Key resmi. Skema integrasi wajib mengikuti format komunikasi data yang didukung oleh provider tersebut untuk mengirim pesan teks dan media lampiran (voucher/tiket).
- **Realtime Layer:** Menggunakan Socket.io terintegrasi di NestJS Gateway dan React Query di sisi Next.js frontend untuk mekanisme *cache invalidation*.
- **Task Queue:** BullMQ didukung oleh Redis dijalankan untuk memproses antrean `reminder-dispatch` secara berkala setiap menit dan cron job harian `trip-status-sync`.

---

## 7. Non-Functional Requirements

- **Keamanan & Privasi Data:** Enkripsi *password* menggunakan standar Bcrypt/Argon2. Dokumen rahasia perjalanan dan pribadi dokter dilindungi menggunakan *Presigned URL* bertenggat waktu dari Cloudflare R2 untuk mencegah kebocoran data (mematuhi prinsip UU PDP).
- **Performa Sistem:** Operasi *read* pada API memiliki batas atas target respons < 300ms, sementara latensi pengiriman pesan realtime via socket maksimal 2 detik.
- **Reliabilitas Pengiriman:** Seluruh kegagalan pengiriman pada *job queue* wajib memicu mekanisme pencatatan error yang komprehensif tanpa memblokir antrean pesan lainnya (*silent failure prevention* dengan logging yang jelas).

---

## 8. Di Luar Scope (V1)

- Live search/booking hotel lewat API OTA langsung (Booking.com/Agoda).
- Parsing otomatis berkas/pesan berbasis AI (LLM-assisted parsing).
- Sinkronisasi dua arah otomatis dengan Google Calendar eksternal.

***

*Dokumen ini merupakan kesatuan aturan baku yang mengikat. AI generator dilarang mengubah struktur data model, mengubah fungsi role, atau menambahkan fitur baru di luar batasan spesifikasi yang tertulis di atas.*