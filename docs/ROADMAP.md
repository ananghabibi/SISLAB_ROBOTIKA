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

## ⬜ Milestone 5 — Piket, Logbook, dan Insiden

1. Jadwal piket per squad; checklist delapan butir dengan foto sebelum-sesudah.
2. Logbook riset mingguan per squad; penanda squad yang belum mengisi pekan ini.
3. Pelaporan insiden dan nyaris celaka, dapat diisi semua peran.
4. Buku tamu.

**Kriteria diterima:** squad yang belum mengisi logbook pekan ini tampil
menonjol di dasbor koordinator; laporan insiden langsung memberi notifikasi ke
Kepala Lab.

---

## ⬜ Milestone 6 — Surat Keterangan Kontribusi dan Audit

1. Daftar kandidat SKK beserta alasan kelayakan atau ketidaklayakannya (SPEC 6.2).
2. Penerbitan oleh Kepala Lab → PDF bernomor berkop, format FRM-LR-07.
3. `snapshotJson` membekukan angka saat terbit.
4. Halaman audit log dengan penyaringan.
5. Impor data awal dari CSV hasil ekspor Google Sheets.

**Kriteria diterima:** SKK terbit tidak berubah walau data absensi dikoreksi;
nomor surat tidak pernah bentrok; setiap penerbitan tercatat di audit log.

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
