# SILAB — Sistem Informasi Laboratorium Robotika
**Brief Pembangunan untuk Claude Code**
Laboratorium Robotika, Fakultas Teknik, Universitas Islam Malang

---

## Cara Memakai Berkas Ini

Simpan berkas ini sebagai `SPEC.md` di folder kosong, lalu jalankan Claude Code di folder tersebut dan kirim pesan pembuka berikut:

> Baca `SPEC.md` seluruhnya sebelum menulis kode apa pun. Berkas itu adalah spesifikasi lengkap sistem yang akan kita bangun. Setelah membacanya, jangan langsung membuat proyek — ajukan dulu pertanyaan klarifikasi yang benar-benar mengubah rancangan, lalu tunggu jawaban saya. Sesudah itu kerjakan **Milestone 1 saja**, berhenti, dan minta saya mengujinya sebelum lanjut ke Milestone 2.

Tahan keinginan meminta seluruh sistem sekaligus. Sistem ini punya enam milestone; menyelesaikannya satu per satu dengan pengujian di antaranya jauh lebih cepat daripada membangun semuanya lalu membongkarnya kembali.

---

## 1. Latar Belakang dan Tujuan

Laboratorium Robotika FT UNISMA memiliki 38 anggota mahasiswa lintas program studi. Saat ini pencatatan dilakukan dengan Google Form dan Google Sheets. Cara itu berjalan, tetapi punya tiga keterbatasan yang tidak bisa diperbaiki di dalam Google Form:

1. **Titip absen tidak bisa dicegah.** Kode harian yang ditulis di papan tulis bisa dikirim lewat WhatsApp ke teman yang tidak datang.
2. **Tidak ada level akses.** Siapa pun yang punya tautan spreadsheet melihat semuanya, atau tidak melihat apa pun sama sekali.
3. **Rekap kontribusi rapuh.** Perhitungan bergantung pada rumus yang bisa tertimpa, dan kecocokan nama yang bisa meleset karena beda ejaan.

Sistem yang dibangun harus menyelesaikan ketiganya, dan menjadi bukti sah untuk klaim Kredit Poin Kinerja Mahasiswa (U-Point) yang diaudit Program Studi.

**Dasar kebijakan:** Keputusan Dekan FT UNISMA Nomor 1101/G152/U.05/D/L.16/IX/2024, Lampiran 1 butir 24 — keanggotaan laboratorium bernilai **25 U-Point** dari total 250 poin yang disyaratkan untuk mengajukan seminar proposal, dibuktikan dengan SK Keanggotaan **dan** Surat Keterangan Kontribusi dari Kepala Laboratorium.

---

## 2. Keputusan Teknis

### 2.1 Tumpukan Teknologi

| Lapis | Pilihan | Alasan |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Satu basis kode untuk API dan antarmuka; mudah dipelajari mahasiswa Informatika |
| Basis data | **PostgreSQL 16** | Perlu transaksi dan kueri agregat yang andal untuk perhitungan kontribusi |
| ORM | **Prisma** | Skema deklaratif, migrasi terlacak, mudah dibaca pemula |
| Autentikasi | **Auth.js (NextAuth) v5** dengan Google Provider dibatasi domain kampus + Credentials untuk akun dosen | Anggota sudah punya akun kampus |
| Antarmuka | **Tailwind CSS + shadcn/ui** | Konsisten dan cepat |
| PDF | **@react-pdf/renderer** | Untuk Surat Keterangan Kontribusi dan label QR |
| QR | **qrcode** (server) + **html5-qrcode** (pemindai browser) | |
| Pengujian | **Vitest** untuk logika bisnis, **Playwright** untuk alur absensi | Aturan skor wajib punya uji otomatis |

### 2.2 Cara Penempatan (Deployment)

Sistem dijalankan di **satu mini PC atau laptop bekas yang menyala terus di dalam laboratorium**, terhubung ke jaringan WiFi lab, dengan Docker Compose (aplikasi + PostgreSQL + Caddy).

Akses dari luar lab disediakan lewat **Cloudflare Tunnel**, tetapi — ini penting — **endpoint absensi hanya boleh menerima permintaan dari jaringan lokal laboratorium.** Rancangan ini sengaja dipilih karena menjadi lapis pertahanan terkuat terhadap titip absen: kalau seseorang tidak berada di dalam jangkauan WiFi lab, ia secara fisik tidak bisa mencapai halaman absensi.

> **Catatan untuk Claude Code:** jangan menawarkan Vercel atau hosting cloud sebagai pilihan utama. Sifat lokal server inilah yang menjadi mekanisme keamanannya, bukan sekadar penghematan biaya.

---

## 3. Mekanisme Anti-Titip-Absen (Bagian Paling Penting)

Sistem menerapkan **tiga lapis** yang harus dilewati bersamaan. Lapis mana pun yang gagal berarti absensi ditolak.

### Lapis 1 — Jaringan
Permintaan ke `POST /api/attendance` divalidasi terhadap daftar subnet laboratorium yang disimpan di variabel lingkungan `LAB_SUBNETS` (contoh: `192.168.1.0/24`). Alamat IP asal disimpan pada setiap catatan absensi.

### Lapis 2 — Kode Harian Otomatis
- Sebuah cron internal membuat kode baru setiap hari pukul **00:01 WIB**, disimpan di tabel `daily_codes`.
- Kode berupa **6 karakter alfanumerik acak** yang mudah dibaca — hilangkan huruf dan angka yang mirip (`0`, `O`, `1`, `I`, `l`).
- Kode **hanya ditampilkan** di halaman `/display`, yaitu halaman layar penuh yang dibuka pada monitor di dalam laboratorium. Halaman ini juga hanya dapat diakses dari jaringan lab, dan tidak memerlukan login.
- Kode **tidak pernah dikirim** melalui API mana pun, tidak muncul di dashboard, dan tidak dapat dilihat anggota dari ponselnya.

### Lapis 3 — QR Berputar 60 Detik
- Halaman `/display` juga menampilkan QR Code yang berisi token bertanda tangan (HMAC-SHA256) dan **berganti setiap 60 detik**.
- Token memuat: stempel waktu, id sesi harian, dan nonce. Server menolak token yang lebih tua dari 90 detik atau yang sudah dipakai (simpan nonce terpakai selama 5 menit).
- Anggota memindai QR dari layar lab dengan ponselnya, lalu sistem meminta kode harian sebagai konfirmasi kedua.

**Mengapa tiga lapis.** Lapis 2 sendirian bisa dikalahkan dengan mengirim foto papan tulis lewat WhatsApp. Lapis 3 mempersempit jendela relai menjadi 60 detik. Lapis 1 menutupnya sama sekali — token yang direlai pun tidak berguna dari luar jaringan lab. Jangan menghilangkan salah satunya dengan alasan menyederhanakan.

### Jalur Darurat
Bila jaringan atau layar bermasalah, **Koordinator Operasional** dapat mencatatkan absensi manual melalui menu khusus. Setiap pencatatan manual:
- wajib menyertakan alasan tertulis,
- ditandai `manual = true` pada catatan absensi,
- masuk ke `audit_logs`,
- muncul dengan penanda visual di rekap agar Kepala Lab dapat menilainya.

Jangan membuat jalur darurat ini mudah — kalau nyaman dipakai, ia akan menjadi jalur utama dalam dua minggu.

---

## 4. Peran dan Hak Akses

### 4.1 Daftar Peran

| Peran | Siapa | Jumlah |
|---|---|---|
| `KEPALA_LAB` | Anang Habibi, S.ST., M.T. | 1 |
| `KOORD_OPERASIONAL` | SOP, inventaris, absensi, piket, K3 | 1 |
| `KOORD_RISET` | Timeline squad, logbook, jadwal uji | 1 |
| `KOORD_PENGEMBANGAN` | Kaderisasi, karya ilmiah, wirausaha, media | 1 |
| `KETUA_SQUAD` | Memimpin satu squad | 6 |
| `ANGGOTA` | Anggota biasa | 29 |
| `PENGAWAS` | Wakil Dekan / Kaprodi — hanya membaca laporan | opsional |

Peran disimpan pada `users.role`. Seorang Ketua Squad tetap punya `squad_id`, dan haknya atas data squad lain sama dengan anggota biasa.

### 4.2 Matriks Hak Akses

Legenda: **B** = baca semua, **Bs** = baca miliknya/squadnya saja, **T** = tulis, **H** = hapus, **—** = tidak ada akses.

| Modul | KEPALA_LAB | KOORD_OPS | KOORD_RISET | KOORD_PENG | KETUA_SQUAD | ANGGOTA | PENGAWAS |
|---|---|---|---|---|---|---|---|
| Absensi sendiri | T | T | T | T | T | T | — |
| Rekap absensi semua | B | B, T | B | B | Bs (squadnya) | Bs (dirinya) | B |
| Absensi manual darurat | T | T | — | — | — | — | — |
| Master anggota | T, H | T | B | B | Bs | Bs | B |
| Peran & hak akses | T | — | — | — | — | — | — |
| Inventaris | T, H | T | B | B | B | B | B |
| Peminjaman | T ¹ | T | B | B | T | Bs | B |
| Piket | B | T | B | B | T (squadnya) | Bs | B |
| Logbook riset | B | B | T | B | T (squadnya) | T (squadnya) | B |
| Laporan insiden | T | T | B | B | T | T | B |
| Periode & target skor | T | — | — | — | — | — | — |
| Surat Keterangan Kontribusi | **T (terbit)** | B | B | B | — | Bs | B |
| Audit log | B | Bs | — | — | — | — | — |
| Ekspor data | T | T | B | B | — | — | B |

¹ **Diubah setelah SPEC ditulis.** Semula `B` (baca saja) untuk Kepala
Laboratorium. Diubah menjadi `T` atas permintaan Kepala Laboratorium sendiri:
di laboratorium ini dialah yang paling sering berada di ruangan saat alat
diminta, dan menolak mencatatkannya hanya akan melahirkan pencatatan susulan
oleh orang lain atas nama orang lain. Hapus tetap tertutup untuk semua peran.
Perubahannya ada di `src/lib/rbac.ts`; jangan "diperbaiki" kembali ke `B`
tanpa membaca catatan ini lebih dulu.

**Aturan yang tidak boleh dilanggar:**
- Hanya `KEPALA_LAB` yang dapat menerbitkan Surat Keterangan Kontribusi. Ini bukan sekadar pembatasan teknis — surat itu adalah pernyataan pribadi dosen kepada Program Studi.
- Tidak ada peran mana pun yang boleh **mengubah atau menghapus** catatan absensi yang sudah masuk. Koreksi dilakukan dengan membuat catatan pembatalan yang merujuk catatan asli, sehingga jejaknya tetap ada.
- `PENGAWAS` tidak pernah punya akses tulis sama sekali.

---

## 5. Model Data

Tulis dalam `schema.prisma`. Berikut entitas dan medan pentingnya; tambahkan `id`, `createdAt`, `updatedAt` pada semuanya.

```
User
  nama, npm (unik, teks bukan angka), email (unik), prodi, fakultas,
  angkatan, semester, squadId?, role, jenjang, status, avatarUrl?
  jenjang: MUDA | MADYA | UTAMA | KOORDINATOR | KEPALA_LAB
  status:  AKTIF | CUTI | NONAKTIF | LULUS
  fakultas: dipakai menandai Anggota Afiliasi dari luar Fakultas Teknik

Squad
  nama, kode, ketuaId?, deskripsi

Period
  nama, tanggalMulai, tanggalSelesai, targetHadir, targetSesiBerbagi,
  targetPiket, targetLogbook, ambangLulus (default 70), aktif (boolean)

DailyCode
  tanggal (unik), kode, dibuatOtomatis

Attendance
  userId, tanggal, jamMasuk, jamKeluar?, jenisKegiatan,
  rencana?, uraian?, kendala?,
  ipMasuk, ipKeluar?, manual (boolean), alasanManual?,
  dibatalkan (boolean), dibatalkanOlehId?, catatanPembatalan?
  UNIQUE (userId, tanggal) — satu sesi per orang per hari

Asset
  kodeAset (unik), nama, kategori, merk?, jumlah, satuan, kondisi,
  lokasi, tahunPerolehan?, penanggungJawabId?, bolehDipinjam, keterangan?
  kondisi: BAIK | PERLU_DICEK | RUSAK_RINGAN | RUSAK | DALAM_PERBAIKAN |
           DALAM_PENGEMBANGAN | TERPAKAI | HILANG

Loan
  assetId, peminjamId, petugasPinjamId, tglPinjam, jumlah, keperluan,
  rencanaKembali, fotoPinjamUrl,
  tglKembali?, petugasKembaliId?, kondisiKembali?, fotoKembaliUrl?, catatan?
  status: DIPINJAM | KEMBALI | TERLAMBAT | HILANG
  Satu asset hanya boleh punya SATU Loan berstatus DIPINJAM pada satu waktu.
  Terapkan sebagai partial unique index, bukan sekadar validasi di aplikasi.

PiketLog
  tanggal, squadId, pengisiId, checklist (Json), alatBelumKembali?,
  fotoSebelumUrl, fotoSesudahUrl

Logbook
  squadId, mingguKe, tanggal, dibuatOlehId, anggotaTerlibat (Json),
  target, dikerjakan, hasil, kendala?, rencanaBerikutnya, buktiUrl?

Incident
  tanggal, pelaporId, lokasi, jenis, kronologi, tindakan, saran?,
  fotoUrl?, statusTindakLanjut
  jenis: CEDERA | KEBAKARAN | KERUSAKAN_ALAT | NYARIS_CELAKA | LAINNYA

ContributionSnapshot
  periodId, userId, hariHadir, persenHadir, totalJam, sesiBerbagi,
  piket, entriLogbook, alatBelumKembali, skor, status, dihitungPada
  UNIQUE (periodId, userId)

Skk  (Surat Keterangan Kontribusi)
  userId, periodId, nomor (unik), tanggalTerbit, snapshotJson,
  pdfUrl, diterbitkanOlehId
  UNIQUE (userId, periodId)

Guest  (buku tamu)
  tanggal, nama, instansi, keperluan, pendampingId, jamMasuk, jamKeluar?

AuditLog
  userId, aksi, entitas, entitasId, dataLama (Json?), dataBaru (Json?), ip
```

---

## 6. Aturan Bisnis

### 6.1 Perhitungan Skor Kontribusi

Skor dihitung per anggota per periode, rentang 0–100:

```
skor = 40 × min(persenHadir, 1)
     + 20 × min(sesiBerbagi / targetSesiBerbagi, 1)
     + 20 × min(piket / targetPiket, 1)
     + 20 × min(entriLogbook / targetLogbook, 1)
     − 5  × alatBelumKembali

skor akhir dibatasi pada rentang 0..100
persenHadir = hariHadir / targetHadir
```

Ambang kelulusan bawaan **70**. Semua target dan ambang dapat diubah per periode oleh `KEPALA_LAB`.

**Wajib ada uji Vitest** untuk fungsi ini, mencakup: skor sempurna, skor nol, pengurangan alat belum kembali yang membuat hasil negatif (harus jadi 0), dan target bernilai nol (jangan sampai dibagi nol).

### 6.2 Syarat Surat Keterangan Kontribusi

Sistem hanya **mengusulkan**; keputusan tetap pada Kepala Lab. Kandidat memenuhi syarat bila:

- kehadiran ≥ 70 persen,
- entri logbook squad ≥ 70 persen pekan aktif,
- piket dijalankan sesuai jadwal,
- bagi anggota tim lomba, serah terima dokumentasi sudah ditandai tuntas,
- skor akhir ≥ ambang periode.

SKK yang terbit menyimpan `snapshotJson` berisi seluruh angka pada saat penerbitan. Angka di surat **tidak boleh ikut berubah** kalau data absensi dikoreksi setelahnya — surat yang sudah keluar adalah dokumen resmi.

### 6.3 Anggota Afiliasi Lintas Fakultas

Tiga anggota berasal dari luar Fakultas Teknik (Peternakan dan Biologi). Mereka ditandai dengan `fakultas != "Teknik"`. Kontribusinya dihitung sama persis, tetapi pada SKK mereka dicetak catatan bahwa pengakuan U-Point mengikuti ketentuan fakultas asal.

### 6.4 Aturan Absensi

- Satu sesi per orang per hari. Absen masuk kedua pada hari yang sama ditolak dengan pesan yang jelas.
- Absen pulang tanpa absen masuk ditolak.
- Sesi yang tidak diakhiri sebelum pukul 23.59 ditutup otomatis dengan `jamKeluar = null` dan tetap dihitung hadir, tetapi durasinya nol. **Jangan mengarang jam pulang.**
- Tamu, dosen lain, dan mahasiswa non-anggota masuk lewat modul Buku Tamu, bukan absensi.

---

## 7. Modul dan Milestone

Kerjakan berurutan. Berhenti di akhir setiap milestone dan minta pengujian.

### Milestone 1 — Fondasi, Autentikasi, dan Peran
- Inisiasi proyek, Docker Compose (app + Postgres + Caddy), skema Prisma lengkap, migrasi awal.
- Auth.js dengan Google Provider dibatasi domain kampus; login gagal bila email tidak terdaftar sebagai anggota.
- Middleware otorisasi berbasis peran yang menutup rute di sisi server, **bukan sekadar menyembunyikan menu**.
- Seeder berisi 39 pengguna (lampiran di bagian 9), 6 squad, dan 1 periode aktif.
- Halaman profil dan manajemen anggota untuk `KEPALA_LAB`.

**Kriteria diterima:** login dengan tiga peran berbeda menghasilkan menu berbeda; mengakses langsung URL yang tidak berhak menghasilkan 403; seluruh 39 anggota masuk basis data dengan squad dan jenjang yang benar.

### Milestone 2 — Absensi
- Cron pembuat kode harian pukul 00:01.
- Halaman `/display` layar penuh: jam besar, kode harian, QR berputar 60 detik, dan daftar nama yang sedang berada di lab.
- Alur absen masuk dan pulang dari ponsel, dengan pemindai QR di browser.
- Validasi tiga lapis penuh sesuai bagian 3.
- Jalur darurat absensi manual oleh `KOORD_OPERASIONAL`, tercatat di audit log.
- Halaman riwayat absensi pribadi.

**Kriteria diterima:** absensi dari luar jaringan lab **selalu** ditolak; token QR yang lebih tua dari 90 detik ditolak; token yang sama tidak bisa dipakai dua kali; absen masuk kedua pada hari yang sama ditolak; absensi manual muncul dengan penanda dan tercatat di audit log.

### Milestone 3 — Rekap Kontribusi dan Dasbor
- Mesin perhitungan skor beserta uji Vitest-nya.
- Dasbor per peran: anggota melihat skor dan kekurangannya sendiri; ketua squad melihat squadnya; koordinator dan Kepala Lab melihat semua.
- Halaman pengaturan periode dan target.
- Ekspor CSV dan PDF rekap bulanan.

**Kriteria diterima:** angka skor cocok dengan hitungan manual pada data uji; anggota tidak bisa melihat skor anggota lain lewat API mana pun.

### Milestone 4 — Inventaris dan Peminjaman
- CRUD aset, pembuatan label QR siap cetak (PDF, beberapa label per halaman).
- Peminjaman dan pengembalian melalui pemindaian QR aset.
- Kunci basis data yang mencegah satu aset dipinjam dua kali bersamaan.
- Daftar alat yang belum kembali, dan penandaan terlambat otomatis.
- Unggah foto kondisi saat pinjam dan saat kembali.

**Kriteria diterima:** upaya meminjam aset yang sedang dipinjam ditolak di tingkat basis data, bukan hanya di antarmuka; jumlah alat belum kembali muncul benar di rekap kontribusi.

### Milestone 5 — Piket, Logbook, dan Insiden
- Jadwal piket per squad dan pengisian checklist delapan butir dengan foto sebelum-sesudah.
- Logbook riset mingguan per squad, dengan penanda squad yang belum mengisi pekan berjalan.
- Pelaporan insiden dan nyaris celaka, dapat diisi semua peran.
- Buku tamu.

**Kriteria diterima:** squad yang belum mengisi logbook pekan ini tampil menonjol di dasbor koordinator; laporan insiden langsung memberi notifikasi ke Kepala Lab.

### Milestone 6 — Surat Keterangan Kontribusi dan Audit
- Daftar kandidat SKK beserta alasan kelayakan atau ketidaklayakannya.
- Penerbitan SKK oleh `KEPALA_LAB` menghasilkan PDF bernomor dengan kop surat, mengikuti format FRM-LR-07.
- Penyimpanan snapshot angka pada saat terbit.
- Halaman audit log dengan penyaringan.
- Impor data awal dari CSV hasil ekspor Google Sheets.

**Kriteria diterima:** SKK yang sudah terbit tidak berubah isinya walaupun data absensi dikoreksi; nomor surat tidak pernah bentrok; setiap penerbitan tercatat di audit log.

---

## 8. Ketentuan Non-Fungsional

| Aspek | Ketentuan |
|---|---|
| Perangkat | Utamakan tampilan ponsel. Absensi dilakukan sambil berdiri di pintu, bukan di depan komputer |
| Bahasa | Seluruh antarmuka dan pesan galat berbahasa Indonesia |
| Zona waktu | Asia/Jakarta. Simpan UTC di basis data, tampilkan WIB |
| Kecepatan | Alur absen dari buka halaman sampai selesai maksimal 10 detik |
| Ketahanan | Bila basis data tidak tersedia, halaman `/display` tetap menampilkan jam dan pesan yang jelas |
| Cadangan | Dump PostgreSQL otomatis harian ke folder terpisah, simpan 30 hari terakhir |
| Keamanan | Rate limit pada endpoint absensi; seluruh unggahan divalidasi jenis dan ukurannya; jangan pernah menampilkan kode harian di respons API mana pun |
| Aksesibilitas | Kontras cukup, ukuran sentuh minimal 44 piksel |

---

## 9. Data Awal untuk Seeder

Sumber: Lampiran SK Keanggotaan Laboratorium Robotika TA 2026/2027.

> **Peringatan penting.** Ejaan tujuh nama di bawah berbeda dengan SK Himpunan Mahasiswa untuk NPM yang sama. Sebelum seeder dijalankan di lingkungan produksi, seluruh nama **wajib** dicocokkan ke SIAKAD. Buat berkas `seed-data.csv` terpisah agar mudah dikoreksi tanpa mengubah kode.

**Koordinator**

| Nama | NPM | Prodi | Peran |
|---|---|---|---|
| Anang Habibi, S.ST., M.T. | — | Dosen | KEPALA_LAB |
| Zaenal Abidin | 22301053005 | Teknik Elektro | KOORD_OPERASIONAL |
| Ahmad Khoirudin | 22301053006 | Teknik Elektro | KOORD_RISET |
| A Viki Adi S | 22301053023 | Teknik Elektro | KOORD_PENGEMBANGAN |

**Squad KRTI VTOL** — M. Syiham Lazuardi Samson (22301053029, ketua) · M. Tegar Dzaki Rayndra (22401053021) · Muhammad Sultan Mughdhor (22401053006) · Moc Reyfan Wijanarko (22401053033) · M. Arzak Alif Mubarok (22501053005) · M. Farrel Fatahillah (22501053013) · Irfan At'dya Fahregi (22501053026)

**Squad KKI ASV/ROV** — Dimas Cahyono (22201053012, ketua) · Qutbi Alif Nuruz Zurqi (22401053030) · Firlie Rizawaliyudi (22401053029) · Mochamad Reno Fadillah (22501053012) · Mohammad Badrus Syarrof (22501053020) · Muchamad Reno Wahyudi (22501054045) · Vemas Ahmad Refaldi (22501054027)

**Squad Ground Robot** — Deva Alifian Nugraha (22401053016, ketua) · Arimbi Reka Anasa (22401053012) · Yudha Fauza Adzina (22501053006) · Aurelia Anandhyta Putri M (22501053008) · Nuzula Fina Salsabila (22501054001) · Muhammad Hasan Hanif (22501054030)

**Squad Karya Ilmiah** — Bobby Rifki Maulana (22101053012, ketua) · Yuriza Aurora Bunga Azzahra (22501054009) · Alfin Fadlilatus Mufidah (22501054041) · Asfina Andini (22501054028) · Nabiilah Rifda Harmono (22301061012, Biologi)

**Squad Produk & Wirausaha** — Riski Ramadhani (22301053027, ketua) · Novita Zahra Maulida (22401053025) · Muhammad Afandi (22501053029) · Mauilidya Dzakira Khalda (22501054012) · Nessa Ayu Stifvania (22501054049)

**Squad Pengabdian & Edukasi** — Iytaaul Masarroh (22501054014, ketua) · Sufriyanti (22501054059) · Nabrisatul Fuadah (22501054040) · Nazaretha Dimitri (22401043028, Peternakan) · Difa Cantika Mayzahra (22201041053, Peternakan)

Prodi diturunkan dari NPM: `053` Teknik Elektro, `054` Teknik Informatika, `041` dan `043` Peternakan, `061` Biologi. Angkatan dari tiga digit pertama: `221`→2021 … `225`→2025. Jenjang: angkatan 2025 = MUDA, 2023–2024 = MADYA, 2021–2022 = UTAMA.

**Aset awal** (18 baris) diimpor dari `01 Master Inventaris` pada berkas `Sistem_Pencatatan_Lab_Robotika_v2.xlsx`. Kolomnya sudah sesuai dengan model `Asset`.

---

## 10. Yang TIDAK Dibangun Sekarang

Tuliskan ini sebagai batas tegas. Jangan membangunnya walau tampak mudah:

- Aplikasi Android atau iOS asli — cukup web responsif
- Pengenalan wajah atau sidik jari
- Notifikasi WhatsApp atau integrasi bot
- Modul keuangan unit usaha
- Integrasi langsung ke SIAKAD kampus
- Papan peringkat antaranggota — **sengaja tidak dibuat**, karena mengubah kontribusi menjadi kompetisi antarteman dan merusak suasana kerja sama yang justru sedang dibangun
- Obrolan atau forum internal
- Modul multi-laboratorium

---

## 11. Cara Menilai Sistem Ini Berhasil

Setelah enam milestone selesai, sistem dianggap berhasil bila:

1. Seorang anggota yang berada di rumah **tidak bisa** mencatatkan kehadirannya dengan cara apa pun selain meminta Koordinator Operasional mencatat manual — yang meninggalkan jejak.
2. Kepala Lab dapat menerbitkan Surat Keterangan Kontribusi tanpa membuka spreadsheet sama sekali.
3. Seorang anggota dapat melihat sendiri berapa skornya dan apa yang kurang, tanpa perlu bertanya kepada siapa pun.
4. Data satu tahun dapat diekspor utuh dan diserahkan kepada Program Studi bila diaudit.
5. Sistem dapat diserahterimakan ke pengurus tahun berikutnya hanya dengan membaca README, tanpa perlu bertanya kepada pembuatnya.

Kriteria kelima yang paling sering gagal. Karena itu, **setiap milestone wajib memperbarui README** berisi cara menjalankan, cara memulihkan cadangan, dan cara menambah anggota baru pada awal periode.
