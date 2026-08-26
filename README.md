# SILAB — Sistem Informasi Laboratorium Robotika

Laboratorium Robotika, Fakultas Teknik, Universitas Islam Malang.

Sistem ini menggantikan pencatatan Google Form + Google Sheets dengan tiga
perbaikan yang tidak bisa dilakukan di dalam Google Form: **titip absen dapat
dicegah**, **hak akses berjenjang**, dan **rekap kontribusi yang tidak rapuh**.
Keluarannya adalah bukti sah untuk klaim Kredit Poin Kinerja Mahasiswa
(U-Point) yang diaudit Program Studi.

Spesifikasi lengkap ada di [`SPEC.md`](SPEC.md). Rencana pengerjaan dan status
tiap milestone ada di [`docs/ROADMAP.md`](docs/ROADMAP.md).

> **Status: Milestone 1 selesai.** Fondasi, autentikasi, dan hak akses sudah
> berjalan. Modul absensi, kontribusi, inventaris, piket, dan surat menyusul
> pada milestone berikutnya. Menu yang belum jadi tetap tampil sebagai halaman
> rintisan agar penjagaan hak aksesnya bisa diuji sejak sekarang.

---

## 1. Mengapa server ini harus berada di dalam laboratorium

Sistem dijalankan pada **satu mini PC atau laptop bekas yang menyala terus di
dalam laboratorium**, tersambung ke WiFi lab. Ini bukan penghematan biaya — ini
mekanisme keamanannya.

Absensi hanya menerima permintaan dari subnet laboratorium. Kalau seseorang
tidak berada di jangkauan WiFi lab, ia **secara fisik tidak bisa mencapai**
halaman absensi, sekalipun ia mengantongi kode harian dan token QR hasil
kiriman teman.

Karena itu: **jangan memindahkan aplikasi ini ke Vercel atau hosting cloud.**
Akses dari luar lab (dasbor, laporan) disediakan lewat Cloudflare Tunnel, dan
tunnel itu tidak boleh meneruskan `/api/attendance` maupun `/display`.

---

## 2. Menjalankan di laboratorium (produksi)

Prasyarat: Docker dan Docker Compose pada mesin lab.

```bash
git clone <url-repositori> silab
cd silab

cp .env.example .env
# Isi .env — lihat tabel di bagian 4. Wajib: POSTGRES_PASSWORD, AUTH_SECRET,
# AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, LAB_SUBNETS, QR_TOKEN_SECRET.
openssl rand -base64 32   # untuk AUTH_SECRET
openssl rand -hex 32      # untuk QR_TOKEN_SECRET dan CRON_SECRET

docker compose up -d --build
docker compose exec app npx prisma db seed   # sekali saja, saat pemasangan
```

Aplikasi tersedia di `http://<alamat-ip-mini-pc>` (port 80, lewat Caddy).
Migrasi basis data dijalankan otomatis setiap kontainer aplikasi mulai.

Perintah harian:

```bash
docker compose ps                 # status seluruh layanan
docker compose logs -f app        # log aplikasi
docker compose restart app        # muat ulang aplikasi
docker compose down               # hentikan semuanya (data tetap aman di volume)
```

### Mencari alamat IP dan subnet lab

`LAB_SUBNETS` harus berisi subnet WiFi laboratorium dalam notasi CIDR.

```bash
ip -4 addr show          # cari baris "inet 192.168.x.y/24"
```

Bila alamat mini PC `192.168.1.50/24`, maka `LAB_SUBNETS=192.168.1.0/24`.
Beberapa subnet dipisahkan koma. Salah mengisi nilai ini membuat **seluruh**
absensi ditolak — itu memang perilaku yang benar, dan pesan galatnya
menyebutkan alamat IP yang terbaca supaya mudah diperbaiki.

---

## 3. Menjalankan untuk pengembangan

```bash
npm install
cp .env.example .env         # arahkan DATABASE_URL ke PostgreSQL lokal
npx prisma migrate deploy
npx prisma db seed
npm run dev                  # http://localhost:3000
```

Selama pengembangan di laptop, isi `LAB_NETWORK_BYPASS=true` agar pemeriksaan
subnet dilewati. **Nilai ini wajib `false` di laboratorium.**

Perintah lain:

| Perintah | Kegunaan |
|---|---|
| `npm run typecheck` | Periksa tipe TypeScript |
| `npm test` | Jalankan uji Vitest |
| `npm run build` | Build produksi |
| `npm run db:studio` | Jelajahi basis data lewat Prisma Studio |
| `npm run db:migrate` | Buat dan terapkan migrasi baru |

---

## 4. Variabel lingkungan

| Variabel | Wajib | Keterangan |
|---|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | ya | Kredensial PostgreSQL |
| `DATABASE_URL` | ya | Dipakai Prisma. Di Compose host-nya `db` |
| `AUTH_SECRET` | ya | `openssl rand -base64 32` |
| `AUTH_URL` | ya | Alamat aplikasi yang terlihat pengguna |
| `AUTH_TRUST_HOST` | ya | `true` di belakang Caddy / Cloudflare Tunnel |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | ya | OAuth client dari Google Cloud Console |
| `ALLOWED_EMAIL_DOMAINS` | ya | Domain surel kampus, dipisah koma. **Kosong = semua login Google ditolak** |
| `LAB_SUBNETS` | ya | Subnet CIDR laboratorium |
| `LAB_NETWORK_BYPASS` | — | `true` hanya saat pengembangan |
| `QR_TOKEN_SECRET` | ya | Kunci HMAC token QR berputar |
| `QR_ROTATE_SECONDS`, `QR_MAX_AGE_SECONDS` | — | Bawaan 60 dan 90 detik |
| `CRON_SECRET` | ya | Melindungi endpoint terjadwal |
| `SEED_KEPALA_LAB_PASSWORD` | — | Kata sandi awal akun dosen |
| `TZ` | — | `Asia/Jakarta` |

---

## 5. Masuk ke sistem

Ada dua jalur, dan keduanya tunduk pada aturan yang sama: **surel harus sudah
terdaftar sebagai anggota.** Sistem tidak pernah membuat akun dari hasil login —
daftar anggota berasal dari SK Keanggotaan.

1. **Google kampus** — untuk anggota mahasiswa. Surel di luar
   `ALLOWED_EMAIL_DOMAINS` ditolak.
2. **Surel + kata sandi** — untuk akun dosen yang tidak memakai Google kampus.
   Seeder memasang kata sandi dari `SEED_KEPALA_LAB_PASSWORD`.

**Segera setelah pemasangan:** masuk sebagai Kepala Laboratorium, buka
**Profil → Keamanan akun**, dan ganti kata sandi bawaan.

Anggota berstatus `NONAKTIF` atau `LULUS` tidak dapat masuk. Untuk menutup akses
seseorang, ubah statusnya — jangan hapus akunnya, karena riwayat absensinya
harus tetap utuh.

---

## 6. Menambah anggota pada awal periode

### Cara yang dianjurkan: berkas CSV

Pemuatan daftar sekaligus dilakukan lewat dua berkas di folder `data/`, bukan
lewat kode:

- `data/squad-data.csv` — daftar squad dan NPM ketuanya
- `data/seed-data.csv` — daftar anggota

Kolom `prodi`, `fakultas`, `angkatan`, `semester`, dan `jenjang` boleh
dikosongkan; nilainya diturunkan dari NPM (lihat `src/lib/npm.ts`).

```bash
# 1. Sunting data/seed-data.csv dan data/squad-data.csv
# 2. Periksa isinya sebelum menyentuh basis data:
npm test                      # uji tests/seed-data.test.ts memeriksa berkasnya
# 3. Muat:
docker compose exec app npx prisma db seed
```

Seeder bersifat **idempoten**: anggota yang sudah ada diperbarui, bukan
diduplikasi, dan kata sandi yang sudah diganti sendiri tidak ditimpa.

> **Wajib dibaca sebelum periode baru.** Ejaan sejumlah nama pada berkas awal
> berbeda dengan SK Himpunan Mahasiswa untuk NPM yang sama, dan surel di
> dalamnya masih pola sementara. Cocokkan seluruh nama dan surel ke **SIAKAD**
> sebelum dimuat. Surel harus persis sama dengan surel Google kampus yang
> dipakai masuk.

### Menambah satu-dua orang di tengah periode

Masuk sebagai Kepala Laboratorium atau Koordinator Operasional, lalu
**Anggota → Tambah anggota**. Peran selain `ANGGOTA` hanya dapat diberikan
Kepala Laboratorium.

### Melepas anggota

Ubah **Status** menjadi `LULUS` atau `NONAKTIF`. Penghapusan hanya diizinkan
untuk baris yang salah masuk dan belum punya catatan kegiatan apa pun; sistem
menolaknya bila jejaknya sudah ada.

---

## 7. Cadangan dan pemulihan

### Cadangan otomatis

Layanan `backup` pada Docker Compose membuat dump terkompresi setiap hari pukul
**02:00 WIB** ke folder `./backups/`, dan menyimpan **30 hari terakhir**. Dump
lama hanya dibuang setelah dump baru berhasil, supaya kegagalan beruntun tidak
menghabiskan riwayat cadangan.

```bash
ls -lh backups/                          # lihat cadangan yang ada
docker compose logs backup | tail -20    # pastikan penjadwalnya hidup
```

> Salin isi `backups/` ke media lain (flashdisk atau penyimpanan awan
> laboratorium) secara berkala. Cadangan yang hanya tinggal di mesin yang sama
> tidak menolong saat mesin itu rusak.

### Cadangan manual sebelum tindakan berisiko

```bash
docker compose exec -T db pg_dump -U silab -d silab --clean --if-exists \
  | gzip -9 > backups/manual_$(date +%F_%H%M).sql.gz
```

### Memulihkan cadangan

```bash
# 1. Hentikan aplikasi agar tidak ada yang menulis selama pemulihan
docker compose stop app

# 2. Muat dump (--clean --if-exists di dalam dump akan mengosongkan lebih dulu)
gunzip -c backups/silab_2026-09-01_0200.sql.gz \
  | docker compose exec -T db psql -U silab -d silab

# 3. Nyalakan kembali
docker compose start app
docker compose logs -f app
```

Sesudah pulih, periksa jumlah anggota dan periode aktif di halaman dasbor.

---

## 8. Peta kode

```
prisma/schema.prisma      Model data lengkap (SPEC bagian 5)
prisma/migrations/        Migrasi terlacak, termasuk partial unique index
prisma/seed.ts            Seeder idempoten, membaca data/*.csv
data/*.csv                Data awal yang dirawat manusia, terpisah dari kode

src/auth.ts               Autentikasi: Google kampus + Credentials dosen
src/auth.config.ts        Bagian konfigurasi yang aman untuk runtime Edge
src/middleware.ts         Penjaga rute lapis pertama
src/lib/rbac.ts           MATRIKS HAK AKSES — terjemahan langsung SPEC 4.2
src/lib/rute.ts           Peta rute ke modul; dipakai middleware dan menu
src/lib/penjaga.ts        Penjagaan per halaman dan per baris data
src/lib/audit.ts          Penulisan audit log
src/lib/npm.ts            Turunan prodi, angkatan, dan jenjang dari NPM
src/lib/waktu.ts          Semua konversi UTC ke WIB terjadi di sini

tests/                    Uji Vitest untuk kebijakan akses dan data awal
```

### Cara mengubah hak akses

Ubah **satu tempat**: tabel `MATRIKS_AKSES` di `src/lib/rbac.ts`. Middleware,
menu, dan penjagaan halaman membaca tabel yang sama, jadi ketiganya ikut
berubah bersama. Jalankan `npm test` sesudahnya — `tests/rbac.test.ts` menjaga
aturan yang tidak boleh dilanggar (Pengawas tidak pernah menulis, hanya Kepala
Lab yang menerbitkan surat, tidak ada yang boleh menghapus absensi).

---

## 9. Batas yang disengaja

Berikut **tidak** dibangun, dan sebaiknya tetap begitu:

aplikasi Android/iOS asli · pengenalan wajah atau sidik jari · notifikasi
WhatsApp · modul keuangan · integrasi langsung SIAKAD · obrolan internal ·
modul multi-laboratorium

Satu lagi yang penting: **papan peringkat antaranggota sengaja tidak dibuat.**
Papan peringkat mengubah kontribusi menjadi kompetisi antarteman dan merusak
suasana kerja sama yang justru sedang dibangun.
