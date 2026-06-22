# Frontend & UI/UX Specification

> **Status:** Draft v0.1 — fokus halaman web app (Next.js). Bagian backend/API/database akan jadi dokumen terpisah.
> **Nama aplikasi:** _belum ditentukan, isi di sini_

## 1. Ringkasan Produk

Aplikasi internal untuk membantu seorang personal assistant mengelola seluruh kebutuhan operasional seorang dokter spesialis: jadwal (klinik, operasi, meeting, konferensi), perjalanan dinas (hotel, itinerary), packing list, dan tugas administratif lainnya. Tiga jenis pengguna berbagi data yang sama secara real-time: asisten utama (pengelola penuh), dokter (terutama melihat + sedikit aksi), dan asisten lain (akses operasional terbatas).

## 2. Role & Pengguna

| Role | Deskripsi | Akses Umum |
|---|---|---|
| `owner_assistant` | Asisten utama / pembuat akun | Full CRUD semua modul + kelola anggota tim |
| `assistant` | Asisten tambahan | Full CRUD modul operasional (jadwal, hotel, packing, tugas); tidak bisa kelola tim/pengaturan dokter |
| `doctor` | Dokter yang bersangkutan | Read di semua modul, plus aksi terbatas (konfirmasi jadwal tentative, tandai tugas pribadinya sendiri selesai) |
| `viewer` | Akses lihat-saja (role cadangan) | Read-only semua modul |

> **Asumsi yang perlu dikonfirmasi:** persis aksi apa yang boleh dilakukan role `doctor` di luar read — lihat catatan permission di tiap halaman bagian 6, dan Pertanyaan Terbuka di bagian 8.

## 3. Tech Stack & Konvensi Frontend

- **Framework:** Next.js (App Router), dikonfigurasi sebagai PWA
- **Styling:** Tailwind CSS
- **State server/cache:** React Query (TanStack Query) — semua data dari API lewat `useQuery`/`useMutation`
- **Realtime:** Socket.io client — connect setelah login, join room `doctor:{doctorProfileId}`; event masuk memicu `invalidateQueries`/`setQueryData` plus toast singkat
- **Maps:** Google Maps Static API (mini map di card hotel), Google Places Autocomplete (form input hotel)
- **Struktur folder:** `app/(auth)/...` untuk halaman login/invite, `app/(dashboard)/...` sebagai route group dengan shell utama (sidebar+topbar). Tiap halaman punya folder sendiri (`page.tsx` + `components/` lokal); komponen yang dipakai lintas halaman masuk `components/shared/`

## 4. Arah Desain Visual

Dunia produk ini berisi dokumen perjalanan, jadwal lintas zona waktu, dan keputusan cepat yang diambil sambil bergerak — bukan aplikasi yang dipakai santai. Arahnya: tenang, presisi, terasa seperti instrumen kerja, bukan dashboard SaaS generik (gradient ungu, ilustrasi 3D, dll).

**Palet warna**

| Token | Hex | Pemakaian |
|---|---|---|
| `--ink` | `#1C2430` | Teks utama, heading |
| `--paper` | `#F6F5F2` | Background halaman |
| `--surface` | `#FFFFFF` | Background card |
| `--runway` | `#2E5266` | Warna utama / tombol aksi / link aktif |
| `--boarding` | `#C98A3E` | Aksen terbatas — indikator live/realtime, highlight mendesak |
| `--signal-green` | `#3F7D58` | Status confirmed / done |
| `--signal-red` | `#B6473D` | Status cancelled / overdue |

**Tipografi**
- Display/heading: **Space Grotesk** atau **General Sans** — tegas, tidak terlalu tebal
- Body: **Inter** atau **IBM Plex Sans** — sangat terbaca di ukuran kecil
- Data (jam, tanggal, kode booking, nomor STR): **IBM Plex Mono** / **JetBrains Mono** dengan `font-variant-numeric: tabular-nums`

**Signature element:** semua data bersifat "waktu" atau "kode referensi" (jam jadwal, tanggal check-in/out, kode booking, hitung mundur ke event berikutnya) konsisten pakai font monospace di seluruh app — penanda visual yang terikat langsung ke sifat produk (dokumen perjalanan/itinerary), bukan dekorasi sembarang.

## 5. Information Architecture

```
/login
/invite/[token]              -> terima undangan, set password
/(dashboard)/
  /dashboard                 -> Beranda
  /schedule                  -> Jadwal
  /trips                     -> Daftar Trip
  /trips/[tripId]            -> Detail Trip (tab: Itinerary, Hotel, Packing, Dokumen)
  /tasks                     -> Tugas
  /documents                 -> Dokumen (global)
  /team                      -> Tim (hanya owner_assistant)
  /notifications             -> Notifikasi
  /settings                  -> Pengaturan
```

Navigasi: sidebar kiri (collapsible di lebar tablet/mobile) berisi 8 item di atas — "Tim" disembunyikan untuk role selain `owner_assistant`. Topbar: bell notifikasi (dropdown 5 terbaru + "lihat semua"), avatar+menu akun.

## 6. Halaman & Komponen

### 6.1 Dashboard (`/dashboard`)
**Tujuan:** ringkasan situasi hari ini dalam satu pandangan.

```
┌─────────────────────────────────────────────────┐
│ Selamat siang, Sarah         [+ Jadwal] [+ Tugas]│
├─────────────────────────────────────────────────┤
│ JADWAL HARI INI                                  │
│ 09:00  Klinik — RS Premier          [confirmed]  │
│ 14:30  Meeting — Tim Riset          [tentative]  │
├─────────────────────────┬─────────────────────────┤
│ TRIP MENDATANG          │ TUGAS MENDESAK          │
│ Konferensi Singapura    │ ☐ Konfirmasi visa       │
│ 5–8 Jul · Hotel: ✓      │ ☐ Print boarding pass   │
│ Packing: 8/14           │                         │
├─────────────────────────┴─────────────────────────┤
│ AKTIVITAS TERBARU                                 │
│ · Rina menambahkan hotel baru — Trip Singapura    │
└─────────────────────────────────────────────────┘
```

Bagian: header (salam + tombol cepat) · Jadwal Hari Ini (list diurut waktu, jam pakai font monospace, badge status, klik → detail) · Trip Mendatang (card: nama, tanggal, badge hotel, progress bar packing) · Tugas Mendesak (checkbox langsung dari dashboard) · Aktivitas Terbaru (5 entri activity log terakhir).

**Empty state:** kalau tidak ada jadwal hari ini → ilustrasi + "Tidak ada jadwal hari ini", bukan teks generik.
**Permission:** semua role lihat versi sama; tombol "Tambah" disembunyikan untuk `doctor`/`viewer`.

### 6.2 Jadwal (`/schedule`)
Toggle tampilan **Kalender** (bulan/minggu/hari) vs **List** (kronologis per tanggal). Filter: tipe event, trip terkait, status. Event card: judul, badge tipe (warna beda per tipe), waktu (monospace), lokasi, badge status, ikon kalau recurring. Klik → panel detail (slide-over, bukan modal penuh, supaya konteks list tetap terlihat): semua field, dokumen terlampir, edit/hapus, riwayat reminder. Tombol "Tambah Jadwal" → form dengan toggle "Event berulang?".

**Permission:** `doctor`/`viewer` tidak lihat tombol tambah/edit/hapus, tapi punya tombol "Konfirmasi" khusus untuk event tentative miliknya.

### 6.3 Daftar Trip (`/trips`)
Grid/list card: judul, destinasi, tanggal, status badge, indikator hotel (booked/belum), indikator packing (progress %). Filter status. Tombol "Buat Trip Baru" (disembunyikan untuk `doctor`/`viewer`).

### 6.4 Detail Trip (`/trips/[tripId]`)
Header: judul, destinasi, tanggal, status, tombol edit. Empat tab:

- **Itinerary** — reuse komponen list dari halaman Jadwal, terfilter ke `trip_id` ini.
- **Hotel** — card per hotel:

```
┌───────────────────────────────┐
│ [Agoda]  Marina Bay Sands     │
│ ──────────────────────────── │
│  [ mini map ]                 │
│ Check-in   05 Jul   14:00     │
│ Check-out  08 Jul   12:00     │
│ Kode: AGD-88213X     [booked] │
│         [ Datangi → ]         │
└───────────────────────────────┘
```

  Field: nama, alamat, badge platform (Traveloka/Agoda/Booking.com/lainnya), tanggal check-in/out (monospace), badge booking_status, kode booking. Mini map pakai Google Maps Static, dan tombol "Datangi" construct URL `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}&destination_place_id={placeId}` dan buka tab baru. Form "Tambah Hotel" pakai Google Places Autocomplete (isi nama+alamat+koordinat sekaligus).
- **Packing List** — checklist dikelompokkan per kategori, progress bar di atas, tombol "Muat dari Template" dan "Tambah Item Custom".
- **Dokumen** — file terkait trip ini, upload button, preview/download per item.

**Permission:** `doctor`/`viewer` read-only di semua tab (lihat Pertanyaan Terbuka #1 soal packing).

### 6.5 Tugas (`/tasks`)
List dikelompokkan per status (Open/In Progress/Done, masing-masing collapsible). Task card: judul, due date (highlight kalau overdue), badge priority, avatar assignee, link trip terkait. Filter: assignee, priority, trip. Tombol "Tambah Tugas". Klik → slide-over edit.

**Permission:** `doctor` bisa ubah status tugas yang assigned ke dirinya saja; tidak bisa assign ke orang lain atau hapus.

### 6.6 Dokumen (`/documents`)
Tabel: nama file, ikon tipe, entity terkait (tag/link ke trip/hotel/event), diupload oleh, tanggal. Filter per tipe entity. Upload baru (opsi link ke entity tertentu atau berdiri sendiri).

### 6.7 Tim (`/team`)
Khusus `owner_assistant`. List member: avatar, nama, badge role, status (active/invited). Tombol "Undang Anggota Baru" (email + pilih role). Aksi per member: ubah role, cabut akses.

### 6.8 Notifikasi (`/notifications`)
Dropdown topbar: 5 terbaru + "Lihat Semua". Halaman penuh: feed kronologis dikelompokkan (Hari ini/Kemarin/Minggu ini), tandai dibaca per-item atau semua, filter unread-only.

### 6.9 Pengaturan (`/settings`)
Profil Saya (nama, avatar, telepon, email) · Preferensi Notifikasi (toggle channel: push, WhatsApp, email) · Profil Dokter (spesialisasi, no. STR, timezone default — editable hanya untuk `owner_assistant`) · Keamanan (ubah password).

### 6.10 Auth (`/login`, `/invite/[token]`)
Login: email+password, link "Lupa password". Accept invite: set nama+password setelah klik link undangan.

## 7. Pola UI Global

- **Realtime:** event Socket.io masuk → toast singkat ("Hotel baru ditambahkan ke Trip Singapura") + update otomatis tanpa refresh
- **Loading:** skeleton yang meniru bentuk konten asli, bukan spinner polos
- **Empty state:** spesifik per konteks halaman, bukan "No data" generik
- **Error:** jelaskan apa yang terjadi + langkah berikutnya ("Gagal menyimpan jadwal — coba lagi" bukan "Error 500")
- **Microcopy:** kata kerja aktif ("Simpan Jadwal" bukan "Submit"), nama aksi konsisten dari tombol sampai konfirmasi (tombol "Undang" → toast "Undangan terkirim")
- **Responsive:** sidebar collapse jadi bottom-nav/hamburger di lebar < 768px — tetap harus nyaman dibuka cepat dari browser HP

## 8. Pernyataan Keputusan

1. Role `doctor` boleh centang packing list miliknya sendiri
2. Halaman Tim — role `assistant` biasa lihat daftar tim versi read-only
3. Search global di topbar — perlu di v1
4. Activity log lengkap (audit trail penuh) — perlu halaman/tab terpisah