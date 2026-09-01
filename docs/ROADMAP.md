# Rencana Pengerjaan SILAB

Enam milestone, dikerjakan berurutan. **Berhenti di akhir setiap milestone dan
minta pengujian sebelum lanjut.** Menyelesaikan satu per satu jauh lebih cepat
daripada membangun semuanya lalu membongkarnya kembali.

Sumber kebenaran tetap [`../SPEC.md`](../SPEC.md). Berkas ini adalah catatan
langkah dan statusnya.

---

## ✅ Milestone 1 — Fondasi, Autentikasi, dan Peran

**Selesai.**

| Langkah | Hasil |
|---|---|
| M1.1 | Proyek Next.js 15 (App Router) + TypeScript + Tailwind v4 + komponen dasar gaya shadcn |
| M1.2 | `prisma/schema.prisma` lengkap 14 model + 2 migrasi (termasuk partial unique index peminjaman) |
| M1.3 | Docker Compose: app + PostgreSQL 16 + Caddy + layanan cadangan harian retensi 30 hari |
| M1.4 | Auth.js v5 — Google dibatasi domain kampus, Credentials untuk akun dosen |
| M1.5 | `MATRIKS_AKSES` sebagai data, middleware penjaga rute, `forbidden()` per halaman |
| M1.6 | Seeder idempoten: 6 squad, 39 anggota, 1 periode aktif, dari `data/*.csv` |
| M1.7 | Cangkang aplikasi dengan menu per-peran, dasbor, profil, manajemen anggota |
| M1.8 | 43 uji Vitest + verifikasi HTTP empat peran |
| M1.9 | README, ROADMAP, memory proyek |

### Kriteria diterima — hasil verifikasi

| Kriteria SPEC | Hasil |
|---|---|
| Login tiga peran berbeda menghasilkan menu berbeda | ✅ Kepala Lab 17 tautan, Koord. Operasional 15, Ketua Squad 11, Anggota 12; butir istimewa (`/peran`, `/periode`, `/absensi/manual`, `/audit`) hanya muncul pada peran yang berhak |
| Mengakses langsung URL yang tidak berhak menghasilkan 403 | ✅ Diuji lewat HTTP dengan sesi sungguhan pada empat peran |
| Seluruh 39 anggota masuk basis data dengan squad dan jenjang benar | ✅ 1 Kepala Lab + 3 Koordinator + 6 Ketua Squad + 29 Anggota; jenjang MUDA 20, MADYA 12, UTAMA 3, KOORDINATOR 3, KEPALA_LAB 1; 3 anggota afiliasi lintas fakultas tertandai |

### Catatan keputusan

- **Prisma Adapter tidak dipakai.** Anggota sudah ada di basis data lebih dulu,
  sehingga adapter menolak menautkan akun Google ke surel yang sama
  (`OAuthAccountNotLinked`). Sesi memakai JWT; peran disegarkan dari basis data
  tiap 5 menit agar perubahan peran tidak tertahan di token lama.
- **Callback `session` tinggal di `auth.config.ts`.** Middleware berjalan di
  Edge dan memakai konfigurasi itu; tanpa callback tersebut `req.auth.user.id`
  kosong dan seluruh penjagaan rute meleset menjadi "belum masuk".
- **`NextResponse.rewrite()` mengabaikan opsi status.** Penolakan ditulis ulang
  ke `/403`, dan halaman itulah yang memanggil `forbidden()` supaya status HTTP
  benar-benar 403. Rewrite dipilih agar URL yang dicoba tetap terlihat.
- **`passwordHash` ditambahkan ke model `User`.** Tidak tercantum di SPEC
  bagian 5, tetapi diperlukan oleh Credentials untuk akun dosen di bagian 2.1.
- **Halaman rintisan untuk milestone berikutnya.** Rutenya sudah nyata sejak
  sekarang supaya penjagaan hak akses bisa diuji, isinya menyusul.

---

## ✅ Milestone 2 — Absensi

**Selesai.**

| Langkah | Hasil |
|---|---|
| M2.1 | `src/lib/jaringan.ts` — pencocokan CIDR, pembacaan IP asli di belakang Caddy, gagal-tertutup |
| M2.2 | `src/lib/kode-harian.ts` — kode 6 karakter tanpa `0 O 1 I l`, satu per tanggal WIB |
| M2.3 | `src/lib/token-qr.ts` — HMAC-SHA256, umur maksimal 90 detik, tabel `qr_nonces` |
| M2.4 | `POST /api/attendance` — tiga lapis berurutan, pembatas laju per pengguna dan per IP |
| M2.5 | `/display` — jam besar, kode harian, QR berputar, daftar orang di lab, tahan basis data mati |
| M2.6 | Pemindai QR di ponsel, konfirmasi kode harian, riwayat absensi pribadi |
| M2.7 | Jalur darurat manual: alasan minimal 25 karakter, pernyataan, penanda, audit log |
| M2.8 | 34 uji Vitest baru (total 77) + 3 uji Playwright + verifikasi HTTP |

### Kriteria diterima — hasil verifikasi

| Kriteria SPEC | Hasil |
|---|---|
| Absensi dari luar jaringan lab **selalu** ditolak | ✅ 403, dan percobaannya masuk audit log dengan IP asalnya |
| Token QR lebih tua dari 90 detik ditolak | ✅ 89 detik lolos, 91 detik ditolak; diuji juga lewat HTTP dengan token berumur 120 detik |
| Token yang sama tidak bisa dipakai dua kali | ✅ 409 pada pemakaian kedua |
| Absen masuk kedua pada hari yang sama ditolak | ✅ 409, ditegakkan pula oleh `UNIQUE (userId, tanggal)` di basis data |
| Absensi manual bertanda dan tercatat di audit log | ✅ Diuji lewat peramban: penanda "Manual" tampil, `ABSENSI_MANUAL` tercatat lengkap dengan pelaku, alasan, dan IP |

Tambahan yang ikut diverifikasi: kode harian tidak muncul pada `/api/display/status`
maupun `/api/display/qr`; `/display` menolak akses dari luar jaringan lab; absen
pulang tanpa absen masuk ditolak; kode harian salah ditolak tanpa membocorkan
kode yang benar.

### Catatan keputusan

- **Nonce dipakai-sekali per pengguna, bukan per laboratorium.** SPEC menulis
  "menolak token yang sudah dipakai". Bila itu ditegakkan secara global, orang
  pertama yang memindai akan mengunci semua orang lain sampai QR berganti — 38
  anggota berarti antre 38 menit pada jam datang. Yang perlu dicegah adalah satu
  orang memakai ulang token yang sama, dan itulah yang ditegakkan indeks unik
  `(nonce, userId)`. **Bila maksud SPEC memang global, ini titik yang perlu
  dibicarakan.**
- **Absen pulang tetap meminta ketiga lapis.** Kode harian sebenarnya bisa
  dilewati saat pulang tanpa banyak kehilangan, tetapi aturan rumah menyebut
  ketiga lapis berlaku bersamaan. Konsistensi dipilih daripada menghemat lima
  detik.
- **QR dibuat di peladen sebagai PNG.** Token tidak pernah singgah di JavaScript
  halaman `/display`, sehingga tidak bisa dibaca lewat konsol peramban, dan
  tidak ada pustaka QR yang perlu dikirim ke layar.
- **Absen pulang mewajibkan catatan pekerjaan.** Uraian pekerjaan wajib diisi
  (minimal 15 karakter dan sedikitnya dua kata, supaya `----------------` tidak
  lolos). Kendala wajib DIJAWAB, tetapi boleh dijawab nihil lewat penanda
  tersendiri — memaksa teks bebas pada hari yang lancar hanya menghasilkan "-"
  dan "aman", yang justru merusak nilai kolom itu pada hari yang benar-benar
  bermasalah. Aturannya tinggal di `src/lib/catatan-pulang.ts`, terpisah dari
  Prisma, supaya formulir di peramban dan pemeriksaan di peladen memakai angka
  yang sama persis.

- **Sesi yang tidak diakhiri tidak dikarang jam pulangnya.** Ia tetap dihitung
  hadir dengan durasi nol. Angka karangan tidak boleh masuk dokumen yang diaudit.
- **Jalur manual tidak diperiksa lapis jaringan.** Salah satu keadaan daruratnya
  justru konfigurasi subnet yang keliru; kalau jalur ini ikut tersandera lapis
  itu, tidak ada yang bisa mencatat apa pun saat dibutuhkan. Penggantinya:
  pembatasan peran, alasan tertulis, jejak audit, dan penanda yang selalu tampak.
- **Pembatas laju disimpan di memori proses.** Sistem berjalan sebagai satu
  kontainer di satu mini PC, jadi memori proses sudah mewakili seluruh sistem.
  Hitungannya hilang saat aplikasi dimuat ulang — memadai untuk mencegah
  penebakan kode harian secara beruntun.
- **Pengalihan tidak lagi memakai `nextUrl` maupun asal tebakan Auth.js.**
  Keduanya terbukti keliru: pada middleware Edge, `request.nextUrl` berisi asal
  bawaan internal Next (teramati `http://localhost:3000` walau peladen melayani
  `https://localhost:4444`), dan `baseUrl` yang dihitung Auth.js juga meleset
  host serta skemanya. Akibatnya, di belakang Caddy berskema https setiap
  pengalihan akan melempar pengguna ke alamat yang tidak melayani apa-apa.
  Kini asal dibangun dari header permintaan (`src/lib/permintaan.ts`), dipakai
  oleh middleware dan oleh callback `redirect` Auth.js. `AUTH_URL` menjadi
  tidak wajib.

- **Koreksi ulang atas Milestone 1.** Uji peramban menemukan bahwa verifikasi
  403 pada Milestone 1 hanya memeriksa teks di HTML mentah. Kini penolakan rute
  diuji sungguhan di peramban: statusnya 403, halamannya benar-benar terlihat,
  dan URL yang dicoba tetap tampil di bilah alamat.

---

## ✅ Milestone 3 — Rekap Kontribusi dan Dasbor

**Selesai.**

| Langkah | Hasil |
|---|---|
| M3.1 | `src/lib/skor.ts` — rumus SPEC 6.1, murni tanpa basis data, 18 uji |
| M3.2 | `src/lib/kontribusi.ts` — pengumpul angka, satu kueri untuk seluruh anggota |
| M3.3 | Dasbor per peran dengan kartu skor dan daftar kekurangan |
| M3.4 | `/absensi/rekap` — tabel rekap yang dilingkupi hak akses |
| M3.5 | `/periode` — pengaturan periode, target, dan ambang lulus, teraudit |
| M3.6 | Ekspor CSV dan PDF siap cetak per periode |
| M3.7 | 119 uji Vitest (42 baru) + verifikasi HTTP |

### Kriteria diterima — hasil verifikasi

| Kriteria SPEC | Hasil |
|---|---|
| Angka skor cocok dengan hitungan manual pada data uji | ✅ 25 hari hadir (1 di antaranya PELATIHAN) pada target 48 hadir dan 2 sesi berbagi → 40×25/48 + 20×1/2 = **30,83**; CSV peladen mengeluarkan angka yang sama persis, beserta 50 jam |
| Anggota tidak bisa melihat skor anggota lain lewat API mana pun | ✅ `/api/ekspor/rekap` dan `/api/ekspor/rekap-pdf` membalas 403 untuk ANGGOTA; halaman rekap hanya memuat kartu skornya sendiri tanpa satu pun nama anggota lain; Ketua Squad melihat tepat 7 anggota squadnya dan nol dari squad lain; Kepala Lab melihat 39 |

### Catatan keputusan

- **Sesi berbagi diambil dari absensi berjenis PELATIHAN.** SPEC menyebut
  komponen ini tanpa memberinya tabel tersendiri, jadi dipakailah sinyal yang
  memang sudah ada. **Perlu dipastikan ke Kepala Lab**: bila di laboratorium
  sesi berbagi dicatat dengan cara lain, sumber angkanya tinggal diganti di
  `src/lib/kontribusi.ts`.
- **Target nol berarti "tidak disyaratkan", bukan "nol".** Komponen dengan
  target nol dianggap terpenuhi penuh. Menghukum anggota karena pengurus lupa
  mengisi target jelas keliru, dan membiarkan pembagian nol merambat sebagai
  NaN ke Surat Keterangan Kontribusi jauh lebih buruk.
- **Logbook dihitung per squad, bukan per orang.** Logbook memang kegiatan
  squad, sehingga angkanya sama untuk seluruh anggota squad itu.
- **Alat "belum kembali" hanya yang sudah lewat tenggat**, ditandai terlambat,
  atau dinyatakan hilang. Pinjaman yang masih dalam tenggat bukan pelanggaran
  dan tidak dipotong.
- **Rekap diurutkan menurut nama, bukan menurut skor.** Papan peringkat
  antaranggota sengaja tidak dibuat (SPEC bagian 10); mengurutkan tabel menurut
  skor akan menghasilkan papan peringkat lewat pintu belakang.
- **Kebijakan pelingkupan dipindah ke `src/lib/lingkup.ts`.** Sebelumnya ia
  menumpang di `penjaga.ts` yang menarik Auth.js, sehingga tidak bisa diuji
  tanpa menyalakan peladen. Kini murni dan punya ujinya sendiri.
- **Berkas huruf pdfkit disertakan secara tegas** lewat `outputFileTracingIncludes`.
  pdfkit memuatnya dengan require dinamis, sehingga penelusuran berkas Next.js
  tidak melihatnya dan keluaran standalone terbit tanpa berkas itu — perenderan
  PDF gagal hanya di produksi, tidak saat `npm run dev`.

---

## ✅ Milestone 4 — Inventaris dan Peminjaman

1. ✅ CRUD aset (`/inventaris`); label QR siap cetak — 21 label per halaman A4,
   mengikuti saringan yang sedang aktif (`/api/inventaris/label-qr`).
2. ✅ Peminjaman dan pengembalian lewat pemindaian QR aset (`/peminjaman`).
3. ✅ Daftar alat belum kembali; penandaan terlambat otomatis
   (`/api/cron/tandai-terlambat`, dipanggil penjadwal pukul 00:01 WIB).
4. ✅ Unggah foto kondisi saat pinjam dan saat kembali, divalidasi lewat bita
   penanda berkas — bukan lewat nama atau tipe yang dikirim peramban.
5. ✅ Impor aset dari `data/aset-data.csv`. **Isinya masih 6 baris CONTOH**;
   ganti dengan 18 baris `01 Master Inventaris` lalu jalankan ulang seeder.

**Kriteria diterima:** meminjam aset yang sedang dipinjam ditolak di tingkat
basis data; jumlah alat belum kembali muncul benar di rekap.

### Kriteria diterima — hasil verifikasi

Dijalankan ke basis data sungguhan, bukan tiruan.

| Kriteria SPEC | Hasil |
|---|---|
| Meminjam aset yang sedang dipinjam ditolak di tingkat basis data | ✅ Pinjaman kedua ditolak `P2002` oleh `loans_asset_dipinjam_unik`. Dua permintaan yang dikirim **bersamaan** atas aset yang sama: tepat satu lolos. Lewat peramban, penolakan itu sampai ke layar petugas sebagai kalimat ("… sedang dipinjam dan belum dikembalikan"), bukan sebagai halaman galat |
| Jumlah alat belum kembali muncul benar di rekap | ✅ Peminjam dengan satu pinjaman lewat tenggat tercatat `alatBelumKembali = 1`; peminjam yang masih dalam tenggat tercatat 0 |

Ikut diverifikasi pada jalan yang sama: aset yang sudah dikembalikan bisa
dipinjam lagi; kondisi aset ikut turun mengikuti keadaannya saat kembali;
`tandaiTerlambat()` mengubah DIPINJAM menjadi TERLAMBAT; aset bertanda "tidak
boleh dipinjam" dan kode aset yang tidak ada ditolak dengan pesan yang menyebut
sebabnya. Lewat peramban: ANGGOTA menerima 403 pada `/peminjaman/baru` dan pada
lembar label QR, dan tidak melihat tombol catat peminjaman.

### Catatan keputusan

- **Penolakan pinjam ganda dikenali dari dua penanda, bukan satu.** Semula kode
  hanya mencari nama indeks `loans_asset_dipinjam_unik` di `meta` galat Prisma.
  Verifikasi ke basis data sungguhan menunjukkan Prisma 6.19 melaporkan
  `meta.target: ["assetId"]` — nama medannya, bukan nama indeksnya. Akibatnya
  penolakan basis data terlempar mentah dan petugas melihat halaman galat
  peladen alih-alih kalimat penjelas. Kini keduanya diterima.
- **Tenggat jatuh pada akhir hari WIB, bukan tengah malam UTC.** Alat yang
  dijanjikan kembali "hari Jumat" tidak boleh terhitung terlambat sejak Jumat
  pukul tujuh pagi. Konversinya ada di `akhirHariWib()` beserta ujinya.
- **Label QR memakai awalan `SILAB-ASET:`.** Pemindai peminjaman dan pemindai
  absensi memakai kamera yang sama, jadi keduanya harus bisa dibedakan tanpa
  menebak. QR absensi yang tanpa sengaja diarahkan ke kolom peminjaman ditolak
  sebagai bukan-label. Kolom teksnya tetap bisa diisi tangan: label yang sobek
  tidak boleh menghentikan pencatatan.
- **`tandaiTerlambat()` bukan sumber kebenaran.** Potongan skor memeriksa
  tenggat secara langsung, jadi penjadwal yang mati semalam tidak membuat
  seorang pun lolos dari catatannya. Cron hanya mengganti label supaya daftar
  di layar ikut memerah.
- **Foto disimpan sebelum baris pinjaman dibuat.** Berkas yatim hanya memakan
  ruang; pinjaman tanpa foto menghilangkan buktinya.
- **Alat yang dibawa keluar lab menuntut foto KTM/KTP**, ditegakkan basis data
  lewat `loans_identitas_wajib` — bukan hanya oleh formulir, supaya jalur
  penulisan yang ditambahkan kelak tidak bisa melewatinya. Alat yang dipakai di
  dalam lab tidak menuntutnya: jaminan yang diminta untuk segalanya akan
  ditekan asal, lalu berhenti menjadi jaminan.
- **Foto kartu identitas dihapus saat alat kembali**, dan waktu penghapusannya
  dicatat supaya "tidak ada foto" tetap punya sebab yang terbaca. Pindaian
  KTM/KTP yang menetap di cakram laboratorium ikut tersalin ke setiap cadangan
  harian, dan setelah alatnya kembali ia tidak memberi manfaat apa pun. Berkas
  dibuang SETELAH transaksi berhasil: rujukan menggantung lebih buruk daripada
  berkas yatim.
- **Foto identitas disimpan di folder terpisah** (`identitas/`) supaya
  penjagaannya bisa berbeda dari foto kondisi: ia menuntut izin tulis
  peminjaman, sedangkan foto kondisi cukup sudah masuk. Nama berkas yang acak
  bukan penjagaan — satu tautan bocor sudah cukup.
- **Aset yang pernah dipinjam tidak bisa dihapus.** Riwayat peminjamannya
  adalah bukti siapa memegang apa. Untuk alat yang sudah tidak ada, pakai
  kondisi HILANG atau RUSAK.
- **Kepala Lab diberi hak mencatat peminjaman**, menyimpang dari SPEC 4.2 yang
  menulis `B`. Diminta Kepala Laboratorium sendiri: dialah yang paling sering
  ada di ruangan saat alat diminta, dan menolak mencatatkannya hanya akan
  melahirkan pencatatan susulan oleh orang lain atas nama orang lain. Tabel di
  SPEC sudah diberi catatan kaki supaya tidak "diperbaiki" kembali kelak. Hapus
  tetap tertutup untuk semua peran.
- **ANGGOTA hanya melihat pinjamannya sendiri**, bukan pinjaman squadnya —
  tanggung jawab atas alat melekat pada satu orang, bukan pada squad.

---

## 🔵 Milestone 5 — Piket, Logbook, dan Insiden

**Sudah dibangun, menunggu pengujian di peramban.** Uji otomatis bersih
(`npm run typecheck`, `npm test` — 194 uji, `npm run build`), tetapi kriteria
diterima di bawah belum diverifikasi ke basis data sungguhan. Milestone ini
belum boleh ditandai ✅ sebelum itu dikerjakan.

1. ✅ Jadwal piket per squad (`data/jadwal-piket.csv`); checklist delapan butir
   (`data/checklist-piket.csv`) dengan foto sebelum-sesudah (`/piket`).
2. ✅ Logbook riset mingguan per squad; penanda squad yang belum mengisi pekan
   berjalan, di halaman `/logbook` dan di dasbor koordinator.
3. ✅ Pelaporan insiden dan nyaris celaka, dapat diisi semua peran (`/insiden`).
4. ✅ Buku tamu dengan pendamping wajib (`/tamu`).

**Kriteria diterima:** squad yang belum mengisi logbook pekan ini tampil
menonjol di dasbor koordinator; laporan insiden langsung memberi notifikasi ke
Kepala Lab.

### Yang perlu diuji sebelum milestone ini ditutup

| Kriteria | Cara mengujinya |
|---|---|
| Squad yang belum mengisi logbook pekan ini menonjol di dasbor koordinator | Masuk sebagai KOORD_RISET dengan periode aktif terbuka. Dasbor harus memuat kartu "N squad belum mengisi logbook pekan X" di atas. Isi satu logbook, muat ulang: squad itu hilang dari daftar |
| Laporan insiden langsung memberi notifikasi ke Kepala Lab | Masuk sebagai ANGGOTA, kirim satu laporan. Masuk sebagai KEPALA_LAB: kartu laporan menunggu harus berada di **paling atas** dasbor, dan cedera/kebakaran bertanda "mendesak" |
| Satu logbook per squad per pekan | Kirim dua kali untuk squad dan pekan yang sama — yang kedua ditolak dengan kalimat, bukan halaman galat |
| Logbook pekan yang belum tiba ditolak | Ubah `mingguKe` pada formulir lewat peralatan peramban menjadi pekan depan; peladen harus menolak |
| Lingkup tulis SENDIRI benar-benar terbatas | Sebagai KETUA_SQUAD, ubah `squadId` pada formulir logbook atau piket menjadi squad lain; peladen harus menolak |
| Satu catatan piket per squad per hari | Simpan dua kali pada hari yang sama; yang kedua ditolak |
| `alatBelumKembali` terisi sendiri | Pinjam satu alat, lalu catat piket. Kartu piket harus menyebutkan "1 alat masih tercatat dipinjam" |
| PENGAWAS tidak pernah bisa menulis | Sebagai PENGAWAS, keempat halaman terbuka tanpa satu pun formulir |
| Tamu tidak masuk ke rekap absensi | Catat satu tamu, lalu buka Rekap Kontribusi — angkanya tidak berubah |

Migrasi `20260828040000_logbook_periode` harus dijalankan sebelum menguji:
`npm run db:migrate` (pengembangan) atau `npx prisma migrate deploy`
(laboratorium). **Urutannya penting** — `git pull` dulu, baru migrasi. Migrasi
yang dijalankan sebelum kodenya ditarik akan menjawab "Already in sync" dengan
benar (berkas migrasinya memang belum ada), lalu halaman Logbook dan Dasbor
gagal dengan `Unknown argument periodId` karena klien Prisma masih dibuat dari
skema yang lama.

### Catatan keputusan

- **Logbook memperoleh `periodId`, dan kekangan uniknya menjadi
  (squad, periode, pekan).** Kekangan lama, (squad, pekan), memperlakukan nomor
  pekan sebagai angka yang tidak pernah berulang — padahal pekan dihitung
  terhadap awal periode dan kembali ke 1 setiap semester. Tanpa perubahan ini,
  logbook pekan 1 semester depan ditolak karena bertabrakan dengan pekan 1
  semester ini, dengan pesan yang tidak berarti apa-apa bagi yang mengisinya.
  SPEC bagian 5 tidak menyebut medan ini; skema memang sudah pernah melampaui
  daftar itu ketika `fotoIdentitasUrl` ditambahkan pada Milestone 4.
- **Pekan dihitung mulai Senin, bukan mulai hari periode dibuka.** Kalau periode
  dibuka hari Rabu dan pekan ikut Rabu–Selasa, penanda "belum mengisi pekan ini"
  menuduh squad yang sebenarnya sudah mengisi. Perhitungannya di
  `awalPekanWib()` dan `mingguKeDari()`, keduanya diuji termasuk untuk periode
  yang dibuka di tengah pekan.
- **Checklist piket boleh disimpan belum lengkap.** Memaksa 8 dari 8 tidak
  membuat laboratorium lebih bersih; ia hanya memastikan seluruh catatan piket
  berbunyi 8 dari 8, termasuk pada hari yang soldernya memang lupa dicabut.
  Catatan yang selalu sempurna tidak dapat dipakai memperbaiki apa pun.
- **`alatBelumKembali` dihitung, tidak diketik.** Angka yang diminta dari
  petugas pada akhir hari yang melelahkan selalu menjadi nol, dan nol yang salah
  lebih buruk daripada tidak ada angka — ia ikut menghitung skor kontribusi.
- **Laporan insiden tidak dapat dihapus siapa pun.** Yang bisa dihapus akan
  dihapus persis pada saat ia paling perlu dibaca. Yang berubah hanya status
  tindak lanjutnya.
- **Foto insiden tidak diwajibkan, foto piket diwajibkan.** Insiden yang perlu
  dilaporkan sering justru yang sudah dibereskan lebih dulu; memaksa foto
  berarti memaksa orang membiarkan keadaan berbahaya demi mengambil gambar.
  Piket sebaliknya: sebelum-sesudah adalah seluruh isi buktinya.
- **"Notifikasi ke Kepala Lab" diwujudkan di dalam sistem, bukan lewat pesan
  keluar.** WhatsApp dan bot ada di daftar yang tidak dibangun (SPEC bagian 10),
  jadi laporan yang menunggu ditaruh di kartu paling atas dasbor.
- **Buku tamu memakai baris hak akses `insiden`.** SPEC 4.2 tidak memberinya
  baris tersendiri, dan pola aksesnya sama persis: boleh diisi siapa pun yang
  sedang berada di ruangan, dibaca seluruhnya oleh Kepala Lab dan Koordinator.
- **Kepala Lab diberi hak tulis pada piket dan logbook, menyimpang dari
  SPEC 4.2 yang memberinya "B".** Diminta langsung oleh Kepala Laboratorium,
  dengan alasan yang sama seperti penyimpangan peminjaman di Milestone 4:
  dialah yang paling sering berada di ruangan pada jam-jam terakhir, dan piket
  yang tidak dapat dicatat oleh orang yang sedang berdiri di sana akan dicatat
  besok pagi berdasarkan ingatan. Hak hapus tetap tertutup, dan PENGAWAS tidak
  ikut tersentuh — keduanya dikunci uji di `tests/rbac.test.ts`. Untuk logbook,
  penyimpangan ini terasa lebih jauh: logbook adalah catatan squad tentang
  pekerjaannya sendiri. Setiap entri menyimpan `dibuatOlehId` dan masuk audit
  log, jadi pemakaiannya tidak pernah tersamar.
- **Daftar centang anggota pada formulir logbook mengikuti squad yang sedang
  dipilih.** Semula ia mengikuti squad bawaan, sehingga siapa pun yang boleh
  mengisi untuk lebih dari satu squad — Koordinator Riset, dan kini Kepala Lab
  yang tidak punya squad sendiri — akan mengirim daftar anggota milik squad
  lain, dan peladen menolaknya dengan pesan yang membingungkan.
- **Butir checklist dan jadwal piket tinggal di `data/*.csv`.** Keduanya berubah
  karena keputusan pengurus, bukan karena perubahan perangkat lunak. Kode butir
  dipakai sebagai kunci di basis data, sehingga butir yang dihapus tidak
  merusak catatan lama dan butir baru terbaca sebagai belum dicentang.

---

## 🔵 Milestone 6 — Surat Keterangan Kontribusi dan Audit

**Sudah dibangun, menunggu pengujian di peramban.** Uji otomatis bersih
(`npm run typecheck`, `npm test` — 240 uji, `npm run build`).

1. ✅ Daftar kandidat SKK beserta alasan kelayakan **dan** ketidaklayakannya,
   berikut angkanya masing-masing (`/skk`, SPEC 6.2).
2. ✅ Penerbitan oleh Kepala Lab → PDF bernomor berkop, format FRM-LR-07
   (`/api/skk/<id>/pdf`).
3. ✅ `snapshotJson` membekukan angka saat terbit; lembar suratnya dirender
   dari snapshot itu saja, tidak pernah dari perhitungan ulang.
4. ✅ Halaman audit log dengan penyaringan aksi, entitas, dan pencarian nama
   pelaku atau id entitas (`/audit`).
5. ✅ Impor data awal dari CSV hasil ekspor Google Sheets
   (`npm run impor:absensi -- <berkas.csv> [--tulis]`).

**Kriteria diterima:** SKK terbit tidak berubah walau data absensi dikoreksi;
nomor surat tidak pernah bentrok; setiap penerbitan tercatat di audit log.

### Yang perlu diuji sebelum milestone ini ditutup

| Kriteria | Cara mengujinya |
|---|---|
| SKK terbit tidak berubah walau data absensi dikoreksi | Terbitkan surat untuk seorang anggota, unduh PDF-nya, catat angkanya. Batalkan salah satu catatan absensinya lewat Absensi Manual, lalu unduh PDF yang sama sekali lagi — seluruh angkanya wajib sama persis |
| Nomor surat tidak pernah bentrok | Terbitkan beberapa surat berturut-turut; nomornya berurutan tanpa terulang. Kekangan `nomor` unik di basis data yang menjaganya, dan penerbitan yang kalah mengambil nomor berikutnya |
| Setiap penerbitan tercatat di audit log | Sesudah menerbitkan, buka `/audit` dan saring aksi `TERBIT_SKK` |
| Hanya Kepala Lab yang menerbitkan | Sebagai KOORD_OPERASIONAL, halaman `/skk` terbuka tanpa satu pun formulir penerbitan |
| Anggota tidak dapat mengunduh surat orang lain | Sebagai ANGGOTA, buka `/api/skk/<id surat orang lain>/pdf` — wajib 403 |
| Penerbitan meski syarat kurang tetap jujur | Terbitkan untuk anggota yang syaratnya belum lengkap; PDF-nya wajib memuat catatan bahwa surat diterbitkan atas pertimbangan Kepala Lab beserta syarat yang kurang |
| Impor CSV menolak sebelum menulis | Jalankan `npm run impor:absensi -- berkas.csv` tanpa `--tulis`; ia hanya melaporkan. Baris yang tanggalnya salah ditolak dengan menyebut nomor barisnya |
| Impor tidak menimpa catatan yang sudah ada | Jalankan impor dua kali dengan `--tulis`; yang kedua melaporkan seluruhnya "dilewati" |

### Catatan keputusan

- **Surat dirender dari `snapshotJson`, bukan dari perhitungan ulang.** Inilah
  seluruh isi kriteria diterima yang pertama. Snapshot menyimpan pula nama,
  NPM, dan nama squad pemiliknya — bukan sekadar id yang nanti dibaca ulang —
  supaya surat lama tetap terbaca sebagaimana ia ditulis dulu walau anggotanya
  sudah lulus dan pindah squad.
- **Nomor surat diuji lewat kekangan unik, bukan diandalkan dari hitungan.**
  Nomor dihitung dari banyaknya surat pada tahun berjalan, lalu penulisannya
  dicoba; bentrok `P2002` berarti ada penerbitan lain yang menyelip, dan yang
  kalah mengambil nomor berikutnya sampai sepuluh percobaan. Menghitung tanpa
  penjagaan ini berarti nomor surat resmi bergantung pada nasib.
- **Urutan nomor dihitung per TAHUN kalender, bukan per periode.** Satu tahun
  memuat dua semester; penomoran yang mengulang dari 1 di tengah tahun akan
  bertabrakan pada kekangan unik sekaligus membingungkan pengarsipan.
- **Syarat "serah terima dokumentasi" dinyatakan manusia, bukan disimpulkan
  sistem.** Tidak ada satu pun kejadian di sistem yang dapat membuktikannya.
  Ia ditanyakan pada formulir penerbitan dan ikut dibekukan di snapshot.
- **Kepala Lab boleh menerbitkan walau ada syarat yang kurang** — SPEC 6.2
  menegaskan sistem hanya mengusulkan. Tetapi ia harus mencentang pernyataan
  tegas, dan syarat yang kurang itu **ikut tercetak di suratnya**. Kelonggaran
  yang tidak meninggalkan jejak akan menjadi kebiasaan dalam satu semester.
- **Tidak ada aksi membatalkan atau menghapus surat.** Surat yang sudah keluar
  mungkin sudah dicetak, ditandatangani, dan dikirim ke Program Studi.
- **Impor CSV memeriksa dulu, menulis belakangan.** Tanpa `--tulis` ia hanya
  melaporkan. Barisnya masuk sebagai catatan MANUAL dengan alasan yang menyebut
  berkas asalnya, sehingga rekap dan audit menampilkannya apa adanya sebagai
  data yang bukan berasal dari pemindaian QR di pintu.
- **Tanggal bergaris miring dibaca HARI/BULAN/TAHUN.** Menebak antara urutan
  Indonesia dan Amerika berarti 4 Maret dan 3 April tertukar tanpa ada yang
  menyadarinya. Bentuk yang tidak dikenali ditolak dengan menyebut nomor
  barisnya, tidak ditebak.
- **`/api/skk/[id]/pdf` didaftarkan pada `outputFileTracingIncludes`.** Perender
  PDF memuat berkas hurufnya lewat require dinamis; tanpa pendaftaran ini surat
  terbit sebagai halaman kosong — dan hanya di produksi, tidak pernah saat
  `npm run dev`.

---

## Pengerasan keamanan sesudah Milestone 6

Dikerjakan setelah keenam milestone dibangun, atas permintaan Kepala
Laboratorium: memastikan tidak ada seorang pun dapat berbuat curang lewat
peramban, dan semua orang memikul hak serta kewajiban yang sama.

Hasil auditnya: pelingkupan per peran sudah benar di seluruh Server Action —
setiap kolom tersembunyi (`squadId`, `mingguKe`, `userId`, `role`) memang sudah
dibandingkan ulang dengan sesi di peladen. Yang ditemukan kurang ada tiga.

1. **Halaman masuk menerima percobaan kata sandi tanpa batas.** Ini lubang
   terbesar di seluruh sistem, dan pada pintu yang paling berharga: menebak
   kata sandi akun dosen berarti memperoleh hak menerbitkan surat, mengubah
   peran siapa pun, dan mengatur target periode. Kini dibatasi dua arah — per
   akun dan per alamat — dan diperiksa SEBELUM pencocokan bcrypt, supaya
   pembatasnya benar-benar menghentikan beban, bukan sekadar menolak dengan
   sopan sesudah pekerjaannya terlanjur dilakukan.
2. **Penggantian kata sandi juga tanpa batas.** Formulirnya menuntut kata sandi
   lama, jadi ia menjadi tempat menebak kata sandi seseorang yang lupa keluar
   dari sesinya di komputer bersama — tanpa menyentuh halaman masuk sama sekali.
3. **Kepala tanggapan keamanan hanya ada di `Caddyfile`.** Ia hilang begitu
   seseorang menjalankan `npm start` langsung, dan pemasangan darurat di
   laboratorium justru sering begitu. Kini juga dipasang di `next.config.ts`,
   ditambah Content-Security-Policy yang sebelumnya tidak ada sama sekali:
   `frame-ancestors 'none'` menutup pembingkaian halaman absensi di situs lain,
   dan `form-action 'self'` memastikan formulir apa pun — termasuk yang
   disuntikkan lewat peralatan pengembang — hanya dapat mengirim ke peladen ini.
   Kamera tetap diizinkan karena pemindai QR memerlukannya.

Ditambah satu uji struktural, `tests/penjagaan-aksi.test.ts`, yang membaca
seluruh berkas sumber dan menggagalkan pengujian bila:

- ada Server Action atau Route Handler tanpa penjagaan hak akses;
- ada pengecualian penjagaan yang tidak menyebutkan alasannya;
- kode harian dipilih dari basis data di dalam rute API mana pun;
- ada jalur kode yang menghapus catatan absensi, jejak audit, atau surat terbit.

Uji itu sudah dibuktikan dapat gagal: berkas percobaan yang memanggil
`attendance.deleteMany()` dan `auditLog.delete()` membuatnya merah, dan hijau
kembali setelah berkas itu dihapus. Uji yang tidak pernah bisa gagal tidak
menjaga apa pun.

**Yang tidak dijanjikan** — dan ini ditulis supaya tidak ada yang salah
mengira: sistem ini tidak menghentikan orang yang memang berada di dalam
laboratorium lalu mengabsenkan dirinya sambil tidak mengerjakan apa pun. Itu
urusan pengawasan manusia.

---

## Akun dengan kata sandi bawaan, dan perapian antarmuka

Diminta Kepala Laboratorium sesudah pengerasan keamanan di atas.

### Hak akses

`KOORD_PENGEMBANGAN` kini boleh mendaftarkan anggota baru (`master_anggota`,
tulis). Menyimpang dari SPEC 4.2 yang memberinya "B"; alasannya ditulis di
`src/lib/rbac.ts` dan dikunci dua uji. Batasnya tetap: memberi peran selain
ANGGOTA masih milik Kepala Laboratorium seorang, dan hapus tidak ikut terbuka.

### Akun langsung terbentuk dengan kata sandi

Sebelumnya `buatAnggota` tidak memasang kata sandi sama sekali, sehingga
menambah dosen lewat web selalu berakhir buntu: akunnya ada, tetapi masuknya
mustahil tanpa `npm run sandi` di mesin peladen. Sekarang setiap akun — lewat
formulir maupun lewat seeder — lahir dengan kata sandi dari
`SANDI_BAWAAN_ANGGOTA`.

Kata sandi bawaan itu sama untuk semua orang, dan justru karena itu ia dibuat
**hanya cukup untuk menggantinya**. Akunnya ditandai `wajibGantiSandi`, dan
selama tandanya menyala `wajibIzin()` memantulkan orangnya ke `/profil`. Dasbor
dan Profil tetap terbuka supaya penolakannya dapat dibaca, bukan tampak seperti
aplikasi rusak.

Alasannya bukan kerapian: satu kata sandi bawaan yang berlaku penuh berarti
siapa pun yang membaca panduan instalasi dapat masuk sebagai anggota mana pun
dan menekan tombol hadir atas namanya — persis lubang yang tiga lapis anti titip
absen dibangun untuk menutupnya.

Pemulihan kata sandi yang lupa tidak lagi menuntut akses shell: **Anggota →
Akses masuk → Setel ulang ke kata sandi bawaan**, tercatat di audit log.

Migrasi `20260901120000_wajib_ganti_sandi` menambah kolomnya dengan bawaan
`false`, sehingga akun yang sudah ada tidak ikut terkunci saat diterapkan.

### Perapian antarmuka

Keluhannya satu kalimat — "letak tambah aset di bawah membuat bingung" — tetapi
penyakitnya ada di beberapa halaman sekaligus:

- **Aksi utama selalu di kepala halaman.** Formulir "Tambah aset" dan "Buat
  periode baru" yang dulu duduk di kaki halaman, di bawah seluruh daftar,
  dipindahkan ke halaman tersendiri (`/inventaris/baru`, `/periode/baru`) yang
  dibuka tombol di kepala. Halaman berisi daftar tidak punya kaki yang dapat
  diramalkan panjangnya.
- **Satu panel saringan bersama** (`PanelSaringan`) untuk Inventaris, Anggota,
  dan Audit: tertutup selama tidak ada saringan menyala, terbuka sendiri bila
  ada, jumlahnya tertulis di kepalanya, dan selalu ada tombol "Bersihkan".
  Sebelumnya panel yang selalu terbuka memakan setengah layar pertama ponsel,
  dan saringan hanya dapat dibatalkan kolom demi kolom.
- **Daftar kosong selalu punya jalan keluar** (`DaftarKosong`).
- **Umpan balik formulir seragam.** Tiga formulir terakhir yang masih menulis
  kotak pesannya sendiri — absensi manual, anggota, periode — dipindahkan ke
  `PesanFormulir` yang menggulir ke pandangan dan memindahkan fokus.
- **Tautan kembali seragam** lewat `KepalaHalaman kembali=`.
- **Di ponsel, daftar anggota kini menyebut peran dan squad** pada baris
  keterangan; sebelumnya ketiga kolom itu disembunyikan dan yang tersisa hanya
  nama dan status.

Jalur darurat absensi manual sengaja **tidak** ikut dipernyaman: pernyataan
berkotak centang dan alasan minimal 25 karakternya dibiarkan apa adanya.

---

## Aturan yang berlaku di seluruh milestone

- Setiap milestone **wajib memperbarui README**: cara menjalankan, cara
  memulihkan cadangan, cara menambah anggota baru.
- Seluruh antarmuka dan pesan galat **berbahasa Indonesia**.
- **Utamakan tampilan ponsel.** Absensi dilakukan sambil berdiri di pintu.
- Simpan **UTC** di basis data, tampilkan **WIB**.
- Kode harian **tidak pernah** muncul di respons API mana pun.
- Tidak ada peran yang boleh mengubah atau menghapus catatan absensi. Koreksi
  memakai catatan pembatalan yang merujuk catatan asli.
