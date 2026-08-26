# SILAB — Sistem Informasi Laboratorium Robotika

Laboratorium Robotika, Fakultas Teknik, Universitas Islam Malang.

Sistem ini menggantikan pencatatan Google Form + Google Sheets dengan tiga
perbaikan yang tidak bisa dilakukan di dalam Google Form: **titip absen dapat
dicegah**, **hak akses berjenjang**, dan **rekap kontribusi yang tidak rapuh**.
Keluarannya adalah bukti sah untuk klaim Kredit Poin Kinerja Mahasiswa
(U-Point) yang diaudit Program Studi.

Spesifikasi lengkap ada di [`SPEC.md`](SPEC.md). Rencana pengerjaan dan status
tiap milestone ada di [`docs/ROADMAP.md`](docs/ROADMAP.md).

> **Baru pertama kali mencoba di laptop sendiri?** Langsung ke
> [bagian 3 — Panduan pemula](#3-mencoba-di-laptop-sendiri-panduan-pemula).
> Di sana tertulis apa saja yang perlu dipasang dan perintahnya satu per satu.

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

## 3. Mencoba di laptop sendiri (panduan pemula)

Bagian ini untuk yang baru pertama kali membuka proyek ini. Ikuti berurutan;
tidak ada langkah yang boleh dilewati.

### 3.1 Pasang tiga perkakas ini dulu

| Perkakas | Unduh dari | Cara memastikan sudah terpasang |
|---|---|---|
| **Node.js 22 LTS** | <https://nodejs.org> (pilih **LTS**) | `node -v` menampilkan `v22.x` |
| **Git** | <https://git-scm.com/downloads> | `git --version` |
| **Docker Desktop** | <https://www.docker.com/products/docker-desktop/> | `docker --version` |

Docker dipakai untuk menjalankan PostgreSQL tanpa perlu memasangnya sendiri.
Kalau Anda sudah punya PostgreSQL 16 di laptop, Docker boleh dilewati — lihat
bagian 3.5.

> **Tutup lalu buka lagi Command Prompt** sesudah memasang Node.js dan Git.
> Jendela yang sudah terbuka belum mengenal perintah baru.
>
> Di Windows, **jalankan Docker Desktop** dan tunggu ikonnya berhenti berputar
> sebelum melanjutkan.

### 3.2 Ambil proyeknya

Jangan bekerja di `C:\Windows\System32`. Pindah dulu ke folder milik Anda:

```cmd
cd %USERPROFILE%\Documents
git clone https://github.com/ananghabibi/SISLAB_ROBOTIKA.git silab
cd silab
```

Di macOS atau Linux, ganti baris pertama menjadi `cd ~/Documents`.

Mulai sekarang **semua perintah dijalankan dari dalam folder `silab` itu**.
Kalau Command Prompt ditutup, buka lagi dan ketik `cd %USERPROFILE%\Documents\silab`
sebelum mengetik perintah apa pun.

### 3.3 Pasang dan siapkan

```cmd
npm install
node scripts/siapkan-env.mjs
```

`npm install` mengunduh pustaka yang dibutuhkan — sekali jalan, beberapa menit.

`siapkan-env.mjs` membuat berkas `.env` beserta seluruh kunci rahasianya, lalu
**menampilkan kata sandi untuk masuk pertama kali**. Catat kata sandi itu.
Bila terlanjur hilang, buka berkas `.env` dan lihat baris
`SEED_KEPALA_LAB_PASSWORD`.

### 3.4 Nyalakan basis data dan isi datanya

```cmd
docker compose -f docker-compose.dev.yml up -d
npx prisma migrate deploy
npx prisma db seed
```

Baris pertama menyalakan PostgreSQL di latar belakang. Baris kedua membuat
seluruh tabel. Baris ketiga memasukkan 6 squad, 39 anggota, dan 1 periode
aktif — hasilnya tercetak di layar.

### 3.5 Bila memakai PostgreSQL sendiri, bukan Docker

Lewati `docker compose`, buat basis data kosong bernama `silab`, lalu sesuaikan
baris `DATABASE_URL` di `.env` dengan nama pengguna dan kata sandi PostgreSQL
Anda:

```
DATABASE_URL="postgresql://postgres:katasandianda@localhost:5432/silab?schema=public"
```

Sesudah itu lanjutkan dengan `npx prisma migrate deploy` dan `npx prisma db seed`.

### 3.6 Jalankan

```cmd
npm run dev
```

Buka <http://localhost:3000> di peramban. Masuk lewat formulir **bagian bawah**
(di bawah tulisan "atau akun dosen"):

- Surel: `anang.habibi@unisma.ac.id`
- Kata sandi: yang tercetak pada langkah 3.3

Untuk menghentikan aplikasi, tekan `Ctrl + C` di Command Prompt.
Untuk menghentikan basis data: `docker compose -f docker-compose.dev.yml down`.

### 3.7 Mencoba peran lain

Seeder hanya memberi kata sandi kepada akun dosen; anggota mahasiswa memakai
Google. Supaya perbedaan menu antarperan bisa dicoba sekarang, pasang kata
sandi sementara. Buka Command Prompt **kedua** di folder yang sama (biarkan
`npm run dev` tetap berjalan di jendela pertama):

```cmd
npm run sandi -- 22301053005@student.unisma.ac.id KataSandiUji2026
npm run sandi -- 22301053029@student.unisma.ac.id KataSandiUji2026
npm run sandi -- 22501053005@student.unisma.ac.id KataSandiUji2026
```

Berturut-turut: Koordinator Operasional, Ketua Squad KRTI VTOL, dan Anggota
biasa. Masuk bergantian dengan keempat akun itu — menunya akan berbeda. Coba
juga mengetik langsung alamat `http://localhost:3000/peran` sebagai Anggota:
hasilnya 403, karena penolakan terjadi di peladen, bukan sekadar menyembunyikan
menu.

### 3.8 Kalau ada yang gagal

| Pesan | Artinya | Yang harus dilakukan |
|---|---|---|
| `'git' is not recognized` / `'npm' is not recognized` | Perkakasnya belum terpasang, atau Command Prompt belum dibuka ulang | Pasang, lalu tutup dan buka lagi Command Prompt |
| `fatal: not a git repository` | Anda belum berada di dalam folder proyek | `cd %USERPROFILE%\Documents\silab` |
| `error during connect` / `docker daemon is not running` | Docker Desktop belum menyala | Jalankan Docker Desktop, tunggu sampai siap |
| `Can't reach database server at localhost:5432` | Basis data belum menyala, atau `DATABASE_URL` salah | `docker compose -f docker-compose.dev.yml up -d` |
| `port is already allocated` | Ada PostgreSQL lain memakai port 5432 | Hentikan yang lain, atau ikuti bagian 3.5 |
| `EADDRINUSE :3000` | Port 3000 sudah dipakai | Tutup aplikasi yang memakainya, atau `set PORT=3001` lalu `npm run dev` |
| `Surel atau kata sandi salah` | Kata sandi keliru, atau akun itu belum punya kata sandi | Lihat `SEED_KEPALA_LAB_PASSWORD` di `.env`, atau pakai `npm run sandi` |
| `Konfigurasi autentikasi belum lengkap` | `.env` belum dibuat | `node scripts/siapkan-env.mjs` |

### 3.9 Perintah lain yang berguna

| Perintah | Kegunaan |
|---|---|
| `npm run typecheck` | Periksa tipe TypeScript |
| `npm test` | Jalankan uji Vitest |
| `npm run build` | Build produksi |
| `npm run db:studio` | Jelajahi isi basis data lewat peramban |
| `npm run db:migrate` | Buat dan terapkan migrasi baru |
| `npm run sandi -- <surel> <sandi>` | Pasang kata sandi seorang anggota |
| `npm run db:reset` | Kosongkan dan isi ulang basis data dari awal |

Selama pengembangan di laptop, `LAB_NETWORK_BYPASS` boleh diisi `true` agar
pemeriksaan subnet dilewati. **Nilai ini wajib `false` di laboratorium.**

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

### Jalur 1 — surel + kata sandi (akun dosen)

Jalur ini tidak memerlukan kredensial Google, jadi inilah cara tercepat untuk
masuk pertama kali dan untuk menguji sistem.

Seeder memasang kata sandi bagi akun berperan `KEPALA_LAB` dan `PENGAWAS`,
diambil dari `SEED_KEPALA_LAB_PASSWORD` di `.env` (bawaan:
`ubah-setelah-login-pertama`).

| Kolom | Nilai bawaan hasil seeder |
|---|---|
| Surel | `anang.habibi@unisma.ac.id` — kolom `email` baris pertama `data/seed-data.csv` |
| Kata sandi | isi `SEED_KEPALA_LAB_PASSWORD` |

Kalau surel di CSV sudah diganti ke surel yang sebenarnya, pakai yang itu —
sistem mencocokkannya **persis**.

**Segera setelah berhasil masuk:** buka **Profil → Keamanan akun** dan ganti
kata sandi bawaan.

### Jalur 2 — Google kampus (anggota mahasiswa)

Perlu `AUTH_GOOGLE_ID` dan `AUTH_GOOGLE_SECRET` dari Google Cloud Console
(OAuth client ID bertipe Web), dengan Authorized redirect URI:

```
http://localhost:3000/api/auth/callback/google      # pengembangan
http://<alamat-mini-pc>/api/auth/callback/google    # laboratorium
```

Surel di luar `ALLOWED_EMAIL_DOMAINS` ditolak, begitu pula surel kampus yang
belum terdaftar sebagai anggota. Pesan galatnya menjelaskan yang mana.

### Memasang kata sandi anggota lain

Peran selain dosen tidak diberi kata sandi oleh seeder — mereka memakai Google.
Untuk memulihkan kata sandi dosen yang lupa, atau untuk **menguji perbedaan
menu antarperan sebelum Google OAuth disiapkan**, pakai utilitas berikut:

```bash
# pengembangan
npm run sandi -- 22301053005@student.unisma.ac.id KataSandiUji2026

# di laboratorium
docker compose exec app npx tsx scripts/set-sandi.ts <surel> <kata-sandi>
```

Kata sandi minimal 10 karakter. Setiap pemasangan tercatat di audit log; isi
kata sandinya sendiri tidak pernah ikut tercatat.

Surel tiap peran dapat dilihat di `data/seed-data.csv`, atau lewat:

```bash
npm run db:studio     # buka tabel users, saring kolom role
```

### Kalau gagal masuk

| Pesan | Sebabnya |
|---|---|
| Surel atau kata sandi salah, atau akun ini tidak aktif | Kata sandi keliru, akun belum punya kata sandi, atau statusnya `NONAKTIF`/`LULUS` |
| Surel ini belum terdaftar sebagai anggota | Surel Google tidak ada di tabel `users` — perbaiki `data/seed-data.csv` lalu jalankan ulang seeder |
| Gunakan surel kampus | Domainnya di luar `ALLOWED_EMAIL_DOMAINS` |
| Konfigurasi autentikasi belum lengkap | `AUTH_SECRET` atau kredensial Google kosong di `.env` |

Anggota berstatus `NONAKTIF` atau `LULUS` tidak dapat masuk. Untuk menutup
akses seseorang, ubah statusnya — jangan hapus akunnya, karena riwayat
absensinya harus tetap utuh.

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

scripts/set-sandi.ts      Utilitas memasang kata sandi dari peladen
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
