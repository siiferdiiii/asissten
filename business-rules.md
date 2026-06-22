# Business Rules

## Version

v1.0

## Purpose

Dokumen ini adalah sumber kebenaran untuk seluruh aturan bisnis Dokter Assistant.

Jika terjadi konflik:

1. constitution.md
2. business-rules.md
3. schema.prisma
4. api-spec.md
5. socket_event.md
6. prd.md
7. design.md

AI generator tidak boleh membuat aturan bisnis baru tanpa persetujuan.

---

# 1. User & Role Rules

## BR-USER-001

Setiap user harus memiliki akun.

User tidak boleh mengakses sistem tanpa login.

---

## BR-USER-002

Role yang tersedia:

* owner_assistant
* assistant
* doctor
* viewer

Tidak boleh membuat role lain.

---

## BR-USER-003

Hak akses role:

### owner_assistant

Dapat:

* CRUD semua data
* Kelola anggota tim
* Kelola role anggota
* Melihat activity log
* Mengelola reminder

### assistant

Dapat:

* CRUD schedule
* CRUD trip
* CRUD hotel
* CRUD packing list
* CRUD task
* Upload dokumen

Tidak dapat:

* Mengelola anggota tim
* Mengubah role user

### doctor

Dapat:

* Melihat seluruh data miliknya
* Mengonfirmasi jadwal
* Melihat reminder
* Melihat packing list

Tidak dapat:

* Menghapus data
* Mengelola user
* Mengelola role

### viewer

Dapat:

* Melihat data

Tidak dapat:

* Membuat data
* Mengubah data
* Menghapus data

---

# 2. Schedule Rules

## BR-SCHEDULE-001

Jenis schedule:

* clinic
* surgery
* meeting
* conference
* flight
* personal

Tidak boleh membuat tipe baru.

---

## BR-SCHEDULE-002

Schedule boleh overlap.

Sistem hanya memberikan warning.

Sistem tidak boleh memblokir penyimpanan.

---

## BR-SCHEDULE-003

Status schedule:

* tentative
* confirmed
* cancelled

---

## BR-SCHEDULE-004

Doctor hanya boleh mengubah status:

tentative → confirmed

---

## BR-SCHEDULE-005

Event yang sudah cancelled tidak boleh kembali menjadi tentative atau confirmed.

---

## BR-SCHEDULE-006

Setiap schedule wajib memiliki:

* title
* start_datetime
* end_datetime
* timezone

---

# 3. Trip Rules

## BR-TRIP-001

Status trip:

* planning
* confirmed
* ongoing
* completed
* cancelled

---

## BR-TRIP-002

Trip dapat memiliki lebih dari satu hotel.

---

## BR-TRIP-003

Trip yang berstatus completed tidak boleh diedit.

Kecuali oleh owner_assistant.

---

## BR-TRIP-004

Trip yang cancelled tidak boleh otomatis berubah status.

---

## BR-TRIP-005

Tanggal akhir trip harus lebih besar atau sama dengan tanggal mulai.

---

# 4. Hotel Rules

## BR-HOTEL-001

Hotel harus terhubung ke trip.

Hotel tidak boleh berdiri sendiri.

---

## BR-HOTEL-002

Status hotel:

* searching
* booked
* confirmed
* cancelled

---

## BR-HOTEL-003

Tanggal check_out harus lebih besar dari check_in.

---

## BR-HOTEL-004

Platform booking hanya sebagai referensi.

Tidak ada sinkronisasi otomatis.

---

## BR-HOTEL-005

Hotel wajib menyimpan:

* nama
* alamat
* latitude
* longitude

Jika lokasi ditemukan dari Google Places.

---

# 5. Packing Rules

## BR-PACKING-001

Packing list dimiliki oleh satu trip.

---

## BR-PACKING-002

Template packing melakukan snapshot copy.

Perubahan template tidak mengubah packing list yang sudah dibuat.

---

## BR-PACKING-003

Progress packing dihitung:

jumlah item packed ÷ total item

---

## BR-PACKING-004

Doctor dapat melihat status packing.

Doctor tidak dapat mengubah template packing.

---

# 6. Task Rules

## BR-TASK-001

Status task:

* open
* in_progress
* done

---

## BR-TASK-002

Task dapat dikaitkan ke trip.

Task juga dapat berdiri sendiri.

---

## BR-TASK-003

Task overdue jika:

due_date < hari ini

dan

status ≠ done

---

## BR-TASK-004

Task selesai tidak otomatis dihapus.

---

# 7. Reminder Rules

## BR-REMINDER-001

Reminder dapat dibuat untuk:

* schedule_event
* trip
* hotel
* task

---

## BR-REMINDER-002

Reminder hanya dapat dikirim melalui:

* push notification
* whatsapp

Email tidak digunakan pada V1.

---

## BR-REMINDER-003

Reminder gagal harus tercatat dalam log.

Reminder tidak boleh hilang tanpa jejak.

---

## BR-REMINDER-004

Reminder yang sudah terkirim tidak boleh dikirim ulang kecuali dibuat ulang.

---

# 8. Document Rules

## BR-DOCUMENT-001

Tipe file:

* pdf
* jpg
* jpeg
* png
* heic

---

## BR-DOCUMENT-002

Ukuran maksimum file:

10 MB

---

## BR-DOCUMENT-003

File disimpan di Cloudflare R2.

Database hanya menyimpan metadata.

---

# 9. Realtime Rules

## BR-REALTIME-001

Semua perubahan data utama harus mengirim realtime event.

Entity:

* schedule
* trip
* hotel
* packing
* task

---

## BR-REALTIME-002

Realtime event dikirim setelah transaksi database berhasil.

---

## BR-REALTIME-003

Realtime event tidak boleh dikirim sebelum commit database.

---

# 10. Activity Log Rules

## BR-LOG-001

Mutation berikut wajib dicatat:

* create
* update
* delete

---

## BR-LOG-002

Entity yang wajib dicatat:

* schedule
* trip
* hotel
* packing_item
* task

---

## BR-LOG-003

Log harus menyimpan:

* actor_user_id
* entity_type
* entity_id
* action
* timestamp

---

# 11. Soft Delete Rules

## BR-SOFTDELETE-001

Entity berikut menggunakan soft delete:

* trip
* hotel
* task
* schedule

---

## BR-SOFTDELETE-002

Data soft delete tidak tampil pada query normal.

---

## BR-SOFTDELETE-003

Owner Assistant dapat melakukan restore data yang terhapus.

---

# 12. AI Generator Rules

## BR-AI-001

AI tidak boleh membuat role baru.

---

## BR-AI-002

AI tidak boleh membuat status baru.

---

## BR-AI-003

AI tidak boleh membuat tabel baru tanpa persetujuan.

---

## BR-AI-004

AI tidak boleh membuat endpoint baru tanpa api-spec.md.

---

## BR-AI-005

Jika spesifikasi tidak tersedia:

STOP

Minta klarifikasi.

Jangan membuat asumsi sendiri.
