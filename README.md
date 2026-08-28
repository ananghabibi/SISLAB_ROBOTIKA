# SILAB — Sistem Informasi Laboratorium Robotika

Laboratorium Robotika, Fakultas Teknik, Universitas Islam Malang.

Sistem ini menggantikan pencatatan Google Form + Google Sheets dengan tiga
perbaikan yang tidak bisa dilakukan di dalam Google Form: **titip absen dapat
dicegah**, **hak akses berjenjang**, dan **rekap kontribusi yang tidak rapuh**.
Keluarannya adalah bukti sah untuk klaim Kredit Poin Kinerja Mahasiswa
(U-Point) yang diaudit Program Studi.

Spesifikasi lengkap ada di [`SPEC.md`](SPEC.md). Rencana pengerjaan dan status
tiap milestone ada di [`docs/ROADMAP.md`](docs/ROADMAP.md).

**Anggota dan pengurus laboratorium** tidak perlu membaca berkas ini — cara
memakai sistemnya ada di
[`docs/PANDUAN-PENGGUNA.md`](docs/PANDUAN-PENGGUNA.md). README ini untuk yang
memasang dan merawat peladennya.

> **Baru pertama kali mencoba di laptop sendiri?** Langsung ke
> [bagian 3 — Panduan pemula](#3-mencoba-di-laptop-sendiri-panduan-pemula).
> Di sana tertulis apa saja yang perlu dipasang dan perintahnya satu per satu.

> **Status: Milestone 3 selesai.** Fondasi, autentikasi, hak akses, **absensi
> tiga lapis**, serta **rekap kontribusi dan ekspor** sudah berjalan. Modul
> inventaris, piket, logbook, dan surat menyusul pada milestone berikutnya.
> Menu yang belum jadi tetap tampil sebagai halaman rintisan agar penjagaan hak
> aksesnya bisa diuji sejak sekarang.

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
| **PostgreSQL 16** | lihat bagian 3.4 — ada dua cara | `psql --version` |

Dua yang pertama wajib. Untuk basis data ada dua jalan: lewat Docker Desktop,
atau memasang PostgreSQL langsung. Bagian 3.4 menjelaskan keduanya — pilih satu
saja, jangan dua-duanya, karena keduanya memperebutkan port 5432.

> **Tutup lalu buka lagi Command Prompt** sesudah memasang perkakas apa pun.
> Jendela yang sudah terbuka belum mengenal perintah baru.

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
npm ci
node scripts/siapkan-env.mjs
```

`npm ci` mengunduh pustaka yang dibutuhkan — sekali jalan, beberapa menit.

> **Pakai `npm ci`, bukan `npm install`.** Keduanya sama-sama memasang pustaka,
> tetapi `npm ci` memasang **persis** versi yang tercatat di
> `package-lock.json`, sedangkan `npm install` boleh meresolusi ulang dan bisa
> menaikkan versi tanpa diminta. Proyek ini diuji pada Next.js 15.5.24; melompat
> ke versi mayor berikutnya mengubah perilaku yang belum pernah diuji di sini.

`siapkan-env.mjs` membuat berkas `.env` beserta seluruh kunci rahasianya, lalu
**menampilkan kata sandi untuk masuk pertama kali**. Catat kata sandi itu.

Perintah ini aman dijalankan berulang kali: nilai yang sudah ada tidak pernah
ditimpa, hanya baris yang masih kosong yang diisi. Jalankan lagi kapan pun Anda
lupa kata sandi masuk — ia akan mencetaknya lagi.

> **Berkas `.env` tidak terlihat di File Explorer** karena namanya diawali
> titik. Itu normal; berkasnya ada. Untuk memastikan dan membukanya:
>
> ```cmd
> dir /a
> notepad .env
> ```

### 3.4 Nyalakan basis data

Ada dua pilihan. **Pilihan A** lebih ringkas, tetapi butuh akses ke Docker Hub —
jaringan kampus dan kantor sering memblokirnya. Kalau Pilihan A gagal, pindah ke
**Pilihan B**; hasilnya sama saja.

#### Pilihan A — lewat Docker

```cmd
docker compose -f docker-compose.dev.yml up -d
```

Berhasil bila muncul `Container silab-db-dev  Started`.

Kalau yang muncul `failed to resolve reference "docker.io/library/postgres"`
atau `dialing auth.docker.io:443`, berarti jaringan Anda memblokir Docker Hub.
Jangan dilawan — langsung pakai Pilihan B.

#### Pilihan B — PostgreSQL dipasang langsung

1. Unduh pemasang PostgreSQL 16 untuk Windows dari
   <https://www.enterprisedb.com/downloads/postgres-postgresql-downloads>.
2. Jalankan pemasangnya. Tekan **Next** terus, dengan dua catatan:
   - **Password** untuk pengguna `postgres` — catat baik-baik.
   - **Port** biarkan `5432`. **Stack Builder** di akhir boleh dilewati.
3. Beri tahu aplikasi kata sandi itu:

   ```cmd
   node scripts/siapkan-env.mjs --sandi-db KATASANDIANDA
   ```

   Ganti `KATASANDIANDA` dengan kata sandi langkah 2. Perintah ini menulis
   ulang baris `DATABASE_URL` di `.env` untuk Anda, jadi berkasnya tidak perlu
   dibuka sendiri. Tanda baca di dalam kata sandi ditangani otomatis.

Basis data bernama `silab` tidak perlu dibuat sendiri — langkah berikutnya
membuatnya otomatis.

### 3.5 Buat tabel dan isi datanya

```cmd
npx prisma migrate deploy
npx prisma db seed
```

Baris pertama membuat basis data beserta seluruh tabelnya. Baris kedua
memasukkan 6 squad, 39 anggota, dan 1 periode aktif — hasilnya tercetak di
layar dan diakhiri `Selesai.`

### 3.6 Jalankan

```cmd
npm run dev
```

Buka <http://localhost:3000> di peramban. Masuk lewat formulir **bagian bawah**
(di bawah tulisan "atau akun dosen"):

- Surel: `anang.habibi@unisma.ac.id`
- Kata sandi: yang tercetak pada langkah 3.3

Untuk menghentikan aplikasi, tekan `Ctrl + C` di Command Prompt.

Basis data boleh dibiarkan menyala. Bila memakai Docker dan ingin
menghentikannya: `docker compose -f docker-compose.dev.yml down`. Bila memasang
PostgreSQL langsung, ia berjalan sebagai layanan Windows dan menyala sendiri
setiap laptop dihidupkan.

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
| `failed to resolve reference "docker.io/..."` / `dialing auth.docker.io:443` | Jaringan Anda memblokir Docker Hub | Pakai Pilihan B pada bagian 3.4 — pasang PostgreSQL langsung |
| `password authentication failed for user "postgres"` | Kata sandi pada `DATABASE_URL` keliru | Perbaiki baris `DATABASE_URL` di `.env` |
| `Can't reach database server at localhost:5432` | Basis data belum menyala, atau `DATABASE_URL` salah | `docker compose -f docker-compose.dev.yml up -d` |
| `port is already allocated` | Ada PostgreSQL lain memakai port 5432 | Hentikan yang lain, atau ikuti bagian 3.5 |
| `EADDRINUSE :3000` | Port 3000 sudah dipakai | Tutup aplikasi yang memakainya, atau `set PORT=3001` lalu `npm run dev` |
| `localhost:3000` kosong padahal alamat IP bisa dibuka | Windows menerjemahkan `localhost` ke IPv6 `::1`, sedangkan peladen mendengarkan IPv4 | Pakai `http://127.0.0.1:3000` |
| Muncul `Next.js 16.x` padahal proyek memakai 15.5.24 | `npm install` menaikkan versi tanpa diminta | `npm ci` — memasang persis versi yang terkunci |
| HP tidak bisa membuka alamat `172.x.x.x` | Bisa jadi adaptor virtual WSL/Hyper-V — tetapi blok itu juga dipakai WiFi kampus, jadi alamatnya belum tentu salah | `npm run alamat` memilah keduanya lewat gerbang bawaan. Cara manual: ambil alamat dari blok **Wireless LAN adapter Wi-Fi** pada `ipconfig`, abaikan blok `vEthernet`/`WSL` |
| `netsh` menerima aturan firewall tetapi tidak ada bedanya | Baris `LocalFirewallRules N/A (GPO-store only)` — laptop dikelola Group Policy, aturan buatan sendiri diabaikan | Pakai jalan memutar pada bagian 6.5: uji dengan kamera laptop, atau lewat terowongan Cloudflare |
| HP memuat terus lalu gagal walau firewall sudah dibuka | Ponsel berada di jaringan lain, atau router mengaktifkan *client isolation* | `npm run alamat -- <alamat-ip-ponsel>` menghitungnya memakai topeng yang sebenarnya. (Aturan "tiga angka pertama harus sama" hanya benar pada topeng /24; WiFi kampus lazim /20.) Bila sudah sejaringan dan tetap gagal, uji lewat hotspot ponsel — bila lewat hotspot berhasil, berarti routernya yang memisahkan perangkat |
| Alamat WiFi yang kemarin bisa, hari ini tidak | Windows menggolongkan ulang jaringan menjadi Public, yang memblokir sambungan masuk | `netsh advfirewall show currentprofile`; bila Public, ubah tipe jaringan menjadi Private |
| Tombol Pindai QR tidak membuka kamera | Halaman dibuka lewat `http`; peramban hanya mengizinkan kamera pada `https` atau `localhost` | Ikuti langkah `chrome://flags` pada bagian 6.5 huruf d |
| HP memuat terus padahal peladen berjalan | Skema tidak cocok — peladen `http` tetapi ponsel mencoba `https` (atau sebaliknya) karena mengingat kunjungan sebelumnya | Buka tab penyamaran dan ketik alamat lengkap dengan `http://` atau `https://` sesuai perintah yang sedang dijalankan |
| HP memuat terus lalu gagal di alamat WiFi yang benar | Windows Firewall menutup port 3000 | Command Prompt sebagai Administrator: `netsh advfirewall firewall add rule name="SILAB dev 3000" dir=in action=allow protocol=TCP localport=3000` |
| `@prisma/client did not initialize yet` | Klien Prisma belum dibuat — terjadi bila `npm install` sempat gagal di tengah jalan | `npx prisma generate` |
| `We detected multiple lockfiles` | Ada `package-lock.json` nyasar di folder rumah Anda, biasanya karena `npm install` pernah dijalankan di sana | Sekadar peringatan, boleh diabaikan. Bila ingin bersih: hapus `%USERPROFILE%\package-lock.json` |
| `Surel atau kata sandi salah` | Kata sandi keliru, atau akun itu belum punya kata sandi | Lihat `SEED_KEPALA_LAB_PASSWORD` di `.env`, atau pakai `npm run sandi` |
| `Konfigurasi autentikasi belum lengkap` | `.env` belum dibuat, atau `AUTH_SECRET` masih kosong | `node scripts/siapkan-env.mjs` |
| `.env` tidak kelihatan di File Explorer | Wajar — namanya diawali titik | `dir /a` untuk memastikan, `notepad .env` untuk membuka |

### 3.9 Perintah lain yang berguna

| Perintah | Kegunaan |
|---|---|
| `npm run typecheck` | Periksa tipe TypeScript |
| `npm test` | Jalankan uji Vitest |
| `npm run dev:https` | Jalankan dengan https, agar kamera ponsel bisa dipakai |
| `npm run alamat` | Cari alamat WiFi laptop untuk dibuka dari ponsel |
| `npm run alamat -- <ip-ponsel>` | Sama, sekalian menguji apakah ponsel itu sejaringan |
| `npm run test:e2e` | Jalankan uji Playwright (perlu peladen berjalan) |
| `npm run build` | Build produksi |
| `npm run db:studio` | Jelajahi isi basis data lewat peramban |
| `npm run db:migrate` | Buat dan terapkan migrasi baru |
| `npm run sandi -- <surel> <sandi>` | Pasang kata sandi seorang anggota |
| `npm run sandi:uji -- <sandi>` | Siapkan akun uji untuk tiap peran (hanya pengembangan) |
| `node scripts/siapkan-env.mjs` | Lengkapi `.env`, cetak ulang kata sandi masuk |
| `npm run db:reset` | Kosongkan dan isi ulang basis data dari awal |

Selama pengembangan di laptop, `LAB_NETWORK_BYPASS` boleh diisi `true` agar
pemeriksaan subnet dilewati. **Nilai ini wajib `false` di laboratorium.**

## 4. Variabel lingkungan

| Variabel | Wajib | Keterangan |
|---|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | ya | Kredensial PostgreSQL |
| `DATABASE_URL` | ya | Dipakai Prisma. Di Compose host-nya `db` |
| `AUTH_SECRET` | ya | `openssl rand -base64 32` |
| `AUTH_URL` | tidak | Diisi hanya bila ingin memaksa satu alamat tertentu. Bila dikosongkan, pengalihan mengikuti alamat yang benar-benar dipakai pengunjung |
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

### Akun uji untuk semua peran sekaligus

Seeder hanya memberi kata sandi kepada akun dosen; anggota mahasiswa memakai
Google. Untuk mencoba perbedaan menu dan penolakan hak akses antarperan tanpa
menyiapkan kredensial Google lebih dulu:

```cmd
npm run sandi:uji -- KataSandiUji2026
```

Satu wakil tiap peran akan memakai kata sandi yang Anda ketik itu:

| Peran | Surel | Nama |
|---|---|---|
| Kepala Laboratorium | `anang.habibi@unisma.ac.id` | Anang Habibi, S.ST., M.T. |
| Koordinator Operasional | `22301053005@student.unisma.ac.id` | Zaenal Abidin |
| Koordinator Riset | `22301053006@student.unisma.ac.id` | Ahmad Khoirudin |
| Koordinator Pengembangan | `22301053023@student.unisma.ac.id` | A Viki Adi S |
| Ketua Squad (KRTI VTOL) | `22301053029@student.unisma.ac.id` | M. Syiham Lazuardi Samson |
| Anggota | `22501053005@student.unisma.ac.id` | M. Arzak Alif Mubarok |

Tidak ada akun Pengawas pada data awal. Bila ingin mencobanya, ubah peran salah
satu anggota lewat halaman **Anggota**, lalu jalankan ulang perintah di atas.

> Perintah ini **menolak berjalan bila `NODE_ENV=production`**, dan kata
> sandinya wajib Anda ketik sendiri — tidak ada nilai bawaan. Satu kata sandi
> yang sama untuk enam peran hanya boleh ada di komputer pengembangan. Di
> laboratorium, pasang satu per satu dengan `npm run sandi`.

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

## 6. Menjalankan absensi harian

### 6.1 Layar laboratorium

Pasang satu monitor di dalam ruangan, buka <code>http://&lt;alamat-mini-pc&gt;/display</code>
dalam mode layar penuh (F11), dan biarkan menyala. Halaman itu menampilkan:

- jam besar WIB,
- **kode harian** enam karakter,
- **QR yang berganti tiap 60 detik**,
- daftar nama yang sedang berada di laboratorium.

Halaman ini tidak memerlukan login — tidak ada yang perlu masuk untuk melihat
jam di dinding. Yang menjaganya adalah lapis jaringan: ia hanya terbuka dari
dalam laboratorium.

> **Kode harian tidak boleh keluar dari ruangan itu.** Ia tidak pernah dikirim
> lewat API mana pun, tidak muncul di dasbor, dan tidak bisa dilihat anggota
> dari ponselnya. Kalau suatu saat ada permintaan "tolong kirim kodenya lewat
> WhatsApp", jawabannya tidak — permintaan itu persis yang dicegah sistem ini.

### 6.2 Cara anggota absen

1. Sambung ke WiFi laboratorium.
2. Buka **Absensi Saya**, tekan **Pindai QR**.
3. Arahkan kamera ke QR di layar.
4. Ketik kode harian yang tampil di layar, tekan **Catat absen masuk**.

Saat pulang, ulangi langkah yang sama; tombolnya berganti sendiri menjadi
**Absen pulang**. Sebelum sesi ditutup, dua pertanyaan **wajib** dijawab:

- **Apa yang Anda kerjakan hari ini?** Sedikitnya 15 karakter dalam kalimat
  yang bisa dibaca orang lain. Isian asal seperti `----------------` ditolak.
- **Kendala hari ini.** Wajib dijawab, tetapi jawabannya boleh nihil — centang
  **Tidak ada kendala**. Kolomnya lalu disimpan kosong, bukan diisi tanda
  hubung, supaya masih berarti saat direkap.

Keduanya diperiksa di peladen, bukan sekadar oleh formulir. Alasannya: sesi
tanpa keterangan tidak bisa dipertanggungjawabkan saat rekap kontribusi diaudit
Program Studi — yang tercatat hanya "hadir sekian jam", tanpa satu pun bukti
apa yang dikerjakan.

Satu sesi per orang per hari. Sesi yang lupa diakhiri tetap dihitung hadir,
tetapi durasinya nol — sistem tidak pernah mengarang jam pulang.

### 6.3 Ketiga lapis, dan apa yang terjadi bila salah satunya gagal

| Lapis | Yang diperiksa | Bila gagal |
|---|---|---|
| 1 — Jaringan | IP pemohon ada di dalam `LAB_SUBNETS` | Ditolak 403, percobaannya masuk audit log |
| 3 — Token QR | Tanda tangan sah, umur ≤ 90 detik, belum dipakai | Ditolak, diminta memindai ulang |
| 2 — Kode harian | Cocok dengan kode hari itu | Ditolak, tanpa membocorkan kode yang benar |

Ketiganya harus lolos bersamaan. **Jangan menonaktifkan salah satunya untuk
menyederhanakan keadaan** — lapis 2 sendirian bisa dikalahkan dengan memfoto
papan, lapis 3 hanya mempersempit jendela relai menjadi satu menit, dan lapis 1
yang menutupnya sama sekali.

### 6.4 Kode harian terbit sendiri

Kontainer `cron` memanggil aplikasi setiap pukul **00:01 WIB** untuk
menerbitkan kode hari itu. Bila mini PC mati semalaman dan panggilan itu
terlewat, laboratorium tetap aman: halaman `/display` menerbitkan kode begitu
layar dinyalakan.

```bash
docker compose logs cron | tail -20     # memastikan penjadwalnya hidup
```

### 6.5 Mencoba dari ponsel saat pengembangan

`localhost` di ponsel berarti ponsel itu sendiri, bukan laptop Anda. Ada tiga
hal yang harus beres, dan ketiganya wajib — bukan pilihan.

**a. Pakai alamat WiFi laptop, bukan localhost.** Cara tercepat menemukannya:

```cmd
npm run alamat
```

Perintah itu memisahkan alamat WiFi yang nyata dari adaptor virtual, dan
mencetak perintah untuk mengikat peladen ke alamat tersebut, misalnya:

```cmd
npm run dev -- -H 192.168.1.138
```

Mengikat secara tegas menghilangkan keraguan: bila ponsel tetap tidak bisa
membuka alamat itu, sebabnya sudah pasti jaringan, bukan pemilihan antarmuka.

Yang membedakan alamat nyata dari adaptor virtual adalah **gerbang bawaan**:
kartu WiFi memegangnya, adaptor WSL, Docker, dan Hyper-V tidak. Blok alamatnya
tidak dapat dijadikan patokan — WSL dan Docker memang mengambil alamat dari
`172.16.x.x`–`172.31.x.x`, tetapi sebagian WiFi kampus juga membagikan alamat
dari blok yang sama. Di WiFi UNISMA, misalnya, laptop mendapat alamat seperti
`172.16.15.117` dengan topeng `255.255.240.0`, dan alamat itu **benar**.

Bila ponsel sudah tersambung, sebutkan sekalian alamatnya supaya tidak perlu
menebak apakah keduanya sejaringan:

```cmd
npm run alamat -- 172.16.15.122
```

Perbandingannya memakai topeng jaringan yang sebenarnya. Ini penting: aturan
lisan &ldquo;tiga angka pertamanya harus sama&rdquo; hanya benar pada topeng
`/24`. Pada `/20` milik WiFi kampus, `172.16.3.9` dan `172.16.15.117` berada di
**satu** jaringan meski angka ketiganya berbeda jauh.

Perintah yang sama juga membaca `.env` dan memberi tahu bila subnet Anda belum
tercantum di `LAB_SUBNETS`. Tanpa peringatan itu gejalanya menyesatkan:
halamannya terbuka mulus di ponsel, QR terpindai, lalu absensi ditolak 403 —
oleh lapis 1, bukan oleh kerusakan. Menambah subnet kampus ke `LAB_SUBNETS`
hanya untuk mencoba di laptop; di laboratorium berlaku bagian 6.6 huruf b.

Cara panjangnya: Baris `Network:` yang
tercetak Next.js **belum tentu benar**: bila laptop punya WSL, Docker, atau
Hyper-V, yang tercetak sering justru alamat adaptor virtualnya, dan alamat itu
tidak dapat dihubungi ponsel.

Cari alamat WiFi yang sebenarnya:

```cmd
ipconfig
```

Cari blok **Wireless LAN adapter Wi-Fi** dan ambil baris `IPv4 Address`
(misalnya `172.16.15.117`). Abaikan blok bernama `vEthernet`, `WSL`, atau
`Default Switch` — dan perhatikan bahwa `ipconfig` menyebut blok itu apa
adanya, jadi nama bloknyalah yang menentukan, bukan angka alamatnya.

**b. Pastikan jaringan WiFi bertipe Private, bukan Public.** Ini penyebab yang
paling sering membuat alamat yang kemarin bisa dibuka mendadak tidak bisa:
Windows kadang menggolongkan ulang jaringan yang sama menjadi Public, dan profil
Public memblokir seluruh sambungan masuk. Periksa:

```cmd
netsh advfirewall show currentprofile
```

Bila judulnya `Public Profile Settings`, ubah lewat **Pengaturan → Network &
Internet → Wi-Fi → (nama jaringan) → Network profile type → Private**. Atau
lewat PowerShell sebagai Administrator:

```powershell
Set-NetConnectionProfile -InterfaceAlias "Wi-Fi" -NetworkCategory Private
```

Public sendiri belum tentu vonisnya. Yang sebenarnya memblokir adalah *tidak
adanya aturan Allow untuk profil yang sedang aktif* — jadi bila aturan
firewall Node.js Anda memang mencakup Public, ponsel tetap dapat masuk tanpa
profilnya diubah. `npm run alamat` memeriksa keduanya dan menyebutkan yang
mana yang berlaku. Ini penting di WiFi kampus, yang sering dikelola kebijakan
jaringan sehingga pilihan Private-nya kelabu: di sana membuka porta untuk
profil Public adalah jalan yang benar, bukan jalan pintas.

**c. Izinkan lewat Windows Firewall.** Saat pertama kali dijalankan, Windows
biasanya menanyakan izin — pilih **Allow**. Bila pertanyaannya sudah terlanjur
ditolak, buka *Windows Defender Firewall* → *Allow an app* dan izinkan Node.js
pada jaringan **Private**.

**d. Kamera memerlukan https.** Ini yang paling sering menghentikan orang.
Lewat `http://192.168.x.x:3000`, halamannya terbuka tetapi tombol
&ldquo;Pindai QR&rdquo; **tidak akan membuka kamera** — peramban hanya
mengizinkannya pada `https` atau `localhost`. Aplikasi menyebutkan hal ini apa
adanya bila terjadi, jadi jangan tertukar dengan gangguan jaringan.

`npm run dev:https` **tidak menolong untuk ponsel**: sertifikat yang dibuat
Next.js hanya mencakup `localhost`, sehingga ponsel menolaknya sebelum sempat
menawarkan &ldquo;Proceed&rdquo;.

Yang berhasil — dan sudah diuji sampai absensi tercatat — adalah memberi tahu
Chrome ponsel bahwa satu alamat itu boleh dianggap aman. Di Chrome ponsel buka:

```
chrome://flags/#unsafely-treat-insecure-origin-as-secure
```

Entri **&ldquo;Insecure origins treated as secure&rdquo;** punya **dua**
kendali, dan keduanya harus diisi:

1. **Kotak teks** → alamat lengkap berikut portnya, tanpa garis miring di akhir,
   misalnya `http://192.168.1.138:3000`
2. **Daftar pilihan** di bawahnya → ubah menjadi `Enabled`

Tekan **Relaunch**, lalu **tutup Chrome sepenuhnya** dari daftar aplikasi
terbaru dan buka lagi. Sesudah itu kamera berfungsi pada alamat tersebut.
Kembalikan ke `Disabled` setelah selesai menguji.

> Anggota laboratorium **tidak perlu melakukan ini**. Di laboratorium alamatnya
> sudah https lewat Caddy (Pilihan B pada `Caddyfile`), sehingga kamera langsung
> berfungsi begitu halaman dibuka. Langkah di atas hanya untuk laptop
> pengembangan yang tidak dapat memasang sertifikat tepercaya.

### Bila ponsel tetap tidak bisa menjangkau laptop

Sebelum menyerah, pisahkan dulu penyebabnya. **Dari ponsel**, buka halaman
pengaturan router, biasanya `http://192.168.1.1`:

- **Terbuka** → ponsel punya akses ke jaringan lokal, berarti yang menahan ada
  di sisi Windows.
- **Tidak terbuka** → routernya yang memisahkan perangkat (*client isolation*),
  dan tidak ada yang bisa diperbaiki dari sisi laptop.

#### Laptop yang dikelola terpusat

Jalankan:

```cmd
netsh advfirewall show currentprofile
```

Bila muncul baris `LocalFirewallRules  N/A (GPO-store only)`, laptop itu
dikendalikan Group Policy dan **aturan firewall yang Anda buat sendiri
diabaikan** — perintah `netsh ... add rule` diterima tanpa galat tetapi tidak
pernah berlaku. Lazim pada laptop inventaris kampus atau kantor. Tidak ada
perintah yang dapat menembusnya tanpa hak administrator domain.

#### Dua jalan memutar

**a. Uji pemindai QR di laptop sendiri.** Kamera bawaan laptop berfungsi penuh
pada `localhost`, dan itu sudah cukup membuktikan seluruh alur absensi:

```cmd
npm run dev:https
```

Buka `https://localhost:3000/display` di satu jendela dan
`https://localhost:3000/absensi` di jendela lain, lalu arahkan kamera laptop ke
QR di layar. Tidak perlu ponsel sama sekali.

**b. Terowongan keluar, untuk benar-benar mencoba dari ponsel.** Unduh
`cloudflared` dari <https://github.com/cloudflare/cloudflared/releases>
(`cloudflared-windows-amd64.exe`), lalu sementara `npm run dev` berjalan:

```cmd
cloudflared tunnel --url http://localhost:3000
```

Perintah itu mencetak alamat `https://sesuatu.trycloudflare.com` yang dapat
dibuka dari ponsel mana pun — sekaligus menyelesaikan syarat https untuk kamera,
karena terowongannya sudah bersertifikat.

> **Hentikan terowongan begitu selesai menguji** (Ctrl + C). Selama menyala,
> aplikasi Anda dapat dijangkau siapa saja yang tahu alamatnya, lengkap dengan
> akun uji berkata sandi yang sudah diketahui. Cara ini hanya untuk mencoba di
> laptop pengembangan, **tidak pernah** untuk laboratorium — di sana justru
> sifat lokal peladen yang menjadi pengamanannya.

**Catatan tentang WiFi kampus.** Banyak jaringan kampus mengaktifkan *client
isolation*, yang memblokir perangkat saling menghubungi walau berada di WiFi
yang sama. Bila ponsel tetap tidak dapat membuka alamat laptop padahal ketiga
langkah di atas sudah benar, kemungkinan besar itu sebabnya — dan itu satu
alasan lagi mengapa laboratorium sebaiknya punya access point sendiri.

---

### 6.6 Dua syarat jaringan yang menentukan sistem ini berhasil

Keduanya sering baru ketahuan setelah sistem dipasang. Selesaikan sebelum hari
pertama pemakaian.

#### a. Kamera ponsel memerlukan HTTPS

Peramban hanya mengizinkan akses kamera pada *secure context*: `https`, atau
`localhost`. Lewat `http://192.168.1.50` biasa, **pemindai QR tidak akan
terbuka di ponsel mana pun** — dan tidak selalu memberi pesan galat yang jelas.

Karena itu `Caddyfile` menyediakan dua pilihan, dan **Pilihan A (http polos)
hanya memadai untuk mencoba dari komputer laboratorium sendiri**. Untuk
pemakaian sehari-hari, pindah ke Pilihan B dengan nama host laboratorium.

Cara yang paling tidak merepotkan: sertifikat Let&rsquo;s Encrypt lewat tantangan
**DNS-01**. Cara ini tidak memerlukan peladen dapat dihubungi dari internet,
sehingga nama host boleh mengarah ke alamat lokal seperti `192.168.1.50`, dan
ponsel tetap memercayai sertifikatnya tanpa perlu memasang apa pun.

`tls internal` bawaan Caddy juga bisa, tetapi mengharuskan setiap ponsel
memasang sertifikat akar Caddy lebih dulu — merepotkan untuk 38 orang, dan
terulang setiap ada anggota baru.

#### b. Subnet lab harus benar-benar milik laboratorium

Lapis 1 hanya sekuat batas jaringannya. Kalau `LAB_SUBNETS` diisi subnet WiFi
kampus yang menjangkau seluruh fakultas, maka yang dijamin sistem bukan lagi
"orangnya ada di dalam laboratorium", melainkan "orangnya ada di suatu tempat
di kampus" — dan titip absen dari kantin menjadi mungkin lagi.

Yang dianjurkan: satu **router atau access point khusus laboratorium** dengan
subnetnya sendiri, misalnya `192.168.50.0/24`, dipasang di dalam ruangan
sehingga jangkauannya berhenti di dinding. Mini PC tersambung ke situ, dan
`LAB_SUBNETS` diisi subnet itu saja.

Bila untuk sementara terpaksa memakai WiFi kampus, sistemnya tetap berjalan —
tetapi lapis 1 melemah, dan lapis 2 serta 3 yang menanggung sisanya. Catat
keadaan itu, dan perbaiki begitu perangkatnya tersedia.

**Cara mengisi `LAB_SUBNETS` setiap kali jaringannya berganti.** Berlaku sama
untuk pindah dari laptop ke mini PC, dari WiFi kampus ke AP laboratorium, atau
sekadar AP-nya diganti:

1. Sambungkan **peladennya** — mini PC atau laptop yang menjalankan aplikasi —
   ke jaringan itu.
2. Jalankan `npm run alamat` di peladen tersebut, lalu salin blok pada kolom
   `jaringan`, misalnya `jaringan 172.16.0.0/20`. Itulah nilai `LAB_SUBNETS`.
3. Tulis di `.env`, dan pastikan bypass-nya mati:

   ```
   LAB_SUBNETS=172.16.0.0/20
   LAB_NETWORK_BYPASS=false
   ```

4. Jalankan ulang aplikasinya — `.env` hanya dibaca saat peladen mulai. Pada
   pemasangan Docker: `docker compose up -d --force-recreate app`.
5. Uji dari ponsel yang tersambung ke jaringan itu, dan sekali lagi dari ponsel
   yang **memakai data seluler** — yang kedua harus ditolak. Bila keduanya
   diterima, lapis 1 tidak sedang menjaga apa pun.

Yang perlu diperhatikan:

- Isinya **blok jaringan**, bukan alamat satu perangkat. Alamat peladen boleh
  berubah karena DHCP tanpa mengubah baris ini — tetapi alamat yang diketik
  pengguna ikut berubah, jadi peladen sebaiknya diberi alamat tetap.
- Boleh lebih dari satu blok, dipisah koma, bila laboratorium punya beberapa
  jaringan (misalnya 2,4 GHz dan 5 GHz yang tersubnet sendiri-sendiri).
- Menambahkan subnet WiFi kampus ke daftar ini di laboratorium sama dengan
  mematikan lapis 1 — lihat alinea di atas. Saat mencoba di laptop boleh;
  hapus lagi sebelum dipakai sungguhan.
- Topeng yang lazim: `255.255.255.0` berarti `/24`, `255.255.240.0` berarti
  `/20`, `255.255.0.0` berarti `/16`. `npm run alamat` sudah menghitungkannya.

---

### 6.7 Bila jaringan atau layar bermasalah

Koordinator Operasional membuka **Absensi Manual**, memilih anggota, mengisi
jam, dan **menulis alasan sedikitnya 25 karakter**. Setiap catatan diberi
penanda "Manual" yang selalu terlihat di rekap dan tercatat di audit log atas
nama pencatatnya.

Jalur ini sengaja dibuat merepotkan. Kalau ia mulai sering dipakai, yang perlu
diperbaiki adalah jaringan atau layarnya — bukan menambah kenyamanan di sana.

---

## 7. Skor kontribusi

### 7.1 Cara skor dihitung

```
skor = 40 × min(hariHadir / targetHadir, 1)
     + 20 × min(sesiBerbagi / targetSesiBerbagi, 1)
     + 20 × min(piket / targetPiket, 1)
     + 20 × min(entriLogbook / targetLogbook, 1)
     − 5  × alatBelumKembali

hasil akhir dibatasi pada rentang 0–100
```

Ambang kelulusan bawaan **70**, dan semuanya dapat diubah per periode oleh
Kepala Laboratorium di menu **Periode &amp; Target**.

Dua perilaku yang mudah disalahpahami:

- **Target bernilai nol berarti komponen itu tidak disyaratkan**, dan dianggap
  terpenuhi penuh — bukan dihitung nol. Menghukum anggota karena pengurus lupa
  mengisi target jelas keliru.
- **Skor tidak pernah negatif.** Potongan alat belum kembali dapat membuat
  hitungan mentahnya minus, tetapi hasil akhirnya dibatasi pada nol.

Rumus ini punya uji otomatisnya sendiri (`tests/skor.test.ts`), termasuk untuk
skor sempurna, skor nol, potongan yang membuat hasil negatif, dan target nol.
Jalankan `npm test` setiap kali rumusnya disentuh.

### 7.2 Siapa melihat skor siapa

| Peran | Yang terlihat |
|---|---|
| Kepala Lab, Koordinator, Pengawas | Seluruh anggota laboratorium |
| Ketua Squad | Anggota squadnya saja |
| Anggota | Dirinya sendiri saja |

Pembatasan ini terjadi di dalam kueri basis data (`src/lib/lingkup.ts`), bukan
dengan menyembunyikan baris di antarmuka. Anggota biasa juga tidak dapat
mengunduh ekspor sama sekali — endpoint-nya membalas 403.

### 7.3 Sumber tiap angka

| Komponen | Diambil dari | Sejak |
|---|---|---|
| Hari hadir, total jam | Catatan absensi | Milestone 2 |
| Sesi berbagi | Absensi berjenis **PELATIHAN** | Milestone 2 |
| Piket | Pengisian checklist piket | Milestone 5 |
| Entri logbook | Logbook squad yang bersangkutan | Milestone 5 |
| Alat belum kembali | Peminjaman lewat tenggat, terlambat, atau hilang | Milestone 4 |

Komponen yang modulnya belum dibangun bernilai nol — bukan dikarang. Kuerinya
sudah benar dan akan langsung berisi begitu modulnya ada.

> **Sesi berbagi perlu Anda pastikan.** SPEC menyebut komponen ini tanpa
> memberinya tabel tersendiri, jadi sistem memakai sinyal yang sudah ada:
> absensi yang ditandai PELATIHAN. Bila di laboratorium sesi berbagi dicatat
> dengan cara lain, sumber angkanya tinggal diganti di `src/lib/kontribusi.ts`.

### 7.4 Ekspor untuk audit Program Studi

Menu **Ekspor Data** menyediakan dua bentuk untuk tiap periode:

- **CSV** — satu baris per anggota, berawalan BOM UTF-8 sehingga langsung rapi
  di Excel maupun LibreOffice. Sel yang diawali `=`, `+`, `-`, atau `@` dilumpuhkan
  supaya Excel tidak memperlakukannya sebagai rumus.
- **PDF siap cetak** — bentang mendatar berkop laboratorium, memuat rumus skor
  di kakinya.

Angkanya dihitung ulang saat berkas diunduh. Angka pada Surat Keterangan
Kontribusi yang sudah terbit tidak ikut berubah — surat menyimpan snapshot-nya
sendiri.

---

## 8. Menambah anggota pada awal periode

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

## 9. Cadangan dan pemulihan

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

## 10. Peta kode

```
prisma/schema.prisma      Model data lengkap (SPEC bagian 5)
prisma/migrations/        Migrasi terlacak, termasuk partial unique index
prisma/seed.ts            Seeder idempoten, membaca data/*.csv
data/*.csv                Data awal yang dirawat manusia, terpisah dari kode

src/auth.ts               Autentikasi: Google kampus + Credentials dosen
src/auth.config.ts        Bagian konfigurasi yang aman untuk runtime Edge
src/middleware.ts         Penjaga rute lapis pertama
src/lib/rbac.ts           MATRIKS HAK AKSES — terjemahan langsung SPEC 4.2
src/lib/jaringan.ts       Lapis 1 — penjagaan subnet laboratorium
src/lib/kode-harian.ts    Lapis 2 — kode harian, tidak pernah lewat API
src/lib/token-qr.ts       Lapis 3 — token QR bertanda tangan, berputar 60 detik
src/lib/absensi.ts        Aturan absensi (SPEC 6.4)
src/lib/skor.ts           Mesin skor kontribusi (SPEC 6.1), murni dan teruji
src/lib/kontribusi.ts     Pengumpul angka kontribusi dari basis data
src/lib/lingkup.ts        Siapa boleh melihat data siapa
src/app/api/attendance/   Satu-satunya pintu pencatatan kehadiran
src/app/display/          Layar laboratorium
src/lib/rute.ts           Peta rute ke modul; dipakai middleware dan menu
src/lib/penjaga.ts        Penjagaan per halaman dan per baris data
src/lib/audit.ts          Penulisan audit log
src/lib/npm.ts            Turunan prodi, angkatan, dan jenjang dari NPM
src/lib/waktu.ts          Semua konversi UTC ke WIB terjadi di sini

scripts/set-sandi.ts      Utilitas memasang kata sandi dari peladen
tests/                    Uji Vitest untuk kebijakan akses, jaringan, dan token
tests/e2e/                Uji Playwright untuk alur absensi di peramban
```

### Cara mengubah hak akses

Ubah **satu tempat**: tabel `MATRIKS_AKSES` di `src/lib/rbac.ts`. Middleware,
menu, dan penjagaan halaman membaca tabel yang sama, jadi ketiganya ikut
berubah bersama. Jalankan `npm test` sesudahnya — `tests/rbac.test.ts` menjaga
aturan yang tidak boleh dilanggar (Pengawas tidak pernah menulis, hanya Kepala
Lab yang menerbitkan surat, tidak ada yang boleh menghapus absensi).

---

## 11. Batas yang disengaja

Berikut **tidak** dibangun, dan sebaiknya tetap begitu:

aplikasi Android/iOS asli · pengenalan wajah atau sidik jari · notifikasi
WhatsApp · modul keuangan · integrasi langsung SIAKAD · obrolan internal ·
modul multi-laboratorium

Satu lagi yang penting: **papan peringkat antaranggota sengaja tidak dibuat.**
Papan peringkat mengubah kontribusi menjadi kompetisi antarteman dan merusak
suasana kerja sama yang justru sedang dibangun.
