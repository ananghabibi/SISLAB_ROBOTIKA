# Catatan proyek SILAB

Sistem Informasi Laboratorium Robotika FT UNISMA. Baca [`SPEC.md`](SPEC.md)
sebagai sumber kebenaran dan [`docs/ROADMAP.md`](docs/ROADMAP.md) untuk status
tiap milestone. Kerjakan milestone **berurutan**, berhenti di akhir tiap
milestone dan minta pengujian.

## Yang tidak boleh dilanggar

- **Server hidup di dalam laboratorium.** Jangan menawarkan Vercel atau hosting
  cloud. Sifat lokal server itulah mekanisme anti titip absen, bukan sekadar
  penghematan biaya.
- **Tiga lapis anti titip absen berlaku bersamaan** (jaringan, kode harian,
  QR berputar 60 detik). Jangan menghilangkan salah satunya demi penyederhanaan.
- **Kode harian tidak pernah masuk respons API mana pun.** Hanya tampil di
  `/display`.
- **Hanya `KEPALA_LAB` yang menerbitkan Surat Keterangan Kontribusi.**
- **Tidak ada peran yang boleh mengubah atau menghapus catatan absensi.**
  Koreksi memakai catatan pembatalan yang merujuk catatan asli.
- **`PENGAWAS` tidak pernah punya akses tulis.**
- **Jalur darurat absensi manual jangan dibuat nyaman.** Kalau nyaman, ia jadi
  jalur utama dalam dua minggu.
- **Papan peringkat antaranggota sengaja tidak dibuat.**

## Kebiasaan kode

- Seluruh antarmuka, pesan galat, dan nama fungsi domain **berbahasa Indonesia**.
- Hak akses hanya diubah di `src/lib/rbac.ts`. Middleware, menu, dan penjagaan
  halaman membaca tabel yang sama.
- Penjagaan hak akses selalu berjalan di **peladen**. Menyembunyikan menu bukan
  pengamanan.
- Waktu: simpan UTC, tampilkan WIB. Semua konversi lewat `src/lib/waktu.ts`.
- Utamakan tampilan ponsel; sasaran sentuh minimal 44 piksel.
- Data yang dirawat manusia tinggal di `data/*.csv`, bukan di dalam kode.

## Perintah

```bash
npm run dev          npm test            npm run typecheck
npm run build        npm run db:seed     npm run db:studio
```

Sebelum menyatakan sebuah milestone selesai: `npm run typecheck`, `npm test`,
dan `npm run build` harus bersih, dan kriteria diterima di SPEC bagian 7 harus
benar-benar diuji — bukan diasumsikan.
