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
- **Koreksi ulang atas Milestone 1.** Uji peramban menemukan bahwa verifikasi
  403 pada Milestone 1 hanya memeriksa teks di HTML mentah. Kini penolakan rute
  diuji sungguhan di peramban: statusnya 403, halamannya benar-benar terlihat,
  dan URL yang dicoba tetap tampil di bilah alamat.

---

## ⬜ Milestone 3 — Rekap Kontribusi dan Dasbor

1. Mesin skor beserta uji Vitest-nya (SPEC 6.1), termasuk kasus: skor sempurna,
   skor nol, pengurangan alat belum kembali yang membuat hasil negatif, dan
   target bernilai nol.
2. Dasbor per peran: anggota melihat skor dan kekurangannya sendiri; ketua
   squad melihat squadnya; koordinator dan Kepala Lab melihat semua.
3. Halaman pengaturan periode dan target.
4. Ekspor CSV dan PDF rekap bulanan.

**Kriteria diterima:** angka cocok dengan hitungan manual; anggota tidak bisa
melihat skor anggota lain lewat API mana pun (pakai `bolehLihatDataOrang`).

---

## ⬜ Milestone 4 — Inventaris dan Peminjaman

1. CRUD aset; label QR siap cetak (PDF, beberapa label per halaman).
2. Peminjaman dan pengembalian lewat pemindaian QR aset.
3. Daftar alat belum kembali; penandaan terlambat otomatis.
4. Unggah foto kondisi saat pinjam dan saat kembali (validasi jenis dan ukuran).
5. Impor 18 baris aset awal dari `01 Master Inventaris`.

**Kriteria diterima:** meminjam aset yang sedang dipinjam ditolak di tingkat
basis data; jumlah alat belum kembali muncul benar di rekap.

> Sudah siap dari Milestone 1: `loans_asset_dipinjam_unik` sudah tegak dan
> sudah diverifikasi menolak pinjaman kedua atas aset yang sama.

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
