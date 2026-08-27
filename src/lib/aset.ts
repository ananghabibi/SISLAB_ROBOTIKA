// -----------------------------------------------------------------------------
// Hal-hal tentang aset yang tidak butuh basis data: daftar kondisi dan muatan
// QR pada label.
//
// Pemindai di halaman peminjaman memakai kamera yang sama dengan pemindai
// absensi. Keduanya harus bisa dibedakan tanpa menebak: label aset diberi
// awalan tetap, sedangkan token absensi tidak pernah memilikinya. Dengan
// begitu QR absensi yang tanpa sengaja diarahkan ke kolom peminjaman ditolak
// sebagai bukan-label, bukan diperlakukan sebagai kode aset.
//
// Berkas ini sengaja bebas Prisma dan Auth.js supaya komponen klien — pemindai
// maupun formulir aset — dapat memakai nilai yang sama persis dengan peladen.
// -----------------------------------------------------------------------------

import type { KondisiAset } from "@prisma/client";

/**
 * Semua kondisi aset, urut dari paling baik ke paling buruk.
 *
 * `satisfies` di sini bukan hiasan: bila enum di skema Prisma bertambah atau
 * berganti nama, baris inilah yang gagal dikompilasi, bukan sebuah pilihan
 * yang diam-diam hilang dari formulir.
 */
export const KONDISI_ASET = [
  "BAIK",
  "PERLU_DICEK",
  "RUSAK_RINGAN",
  "RUSAK",
  "DALAM_PERBAIKAN",
  "DALAM_PENGEMBANGAN",
  "TERPAKAI",
  "HILANG",
] as const satisfies readonly KondisiAset[];

/** Apakah teks ini salah satu kondisi aset yang sah. */
export function kondisiAsetSah(nilai: string): nilai is KondisiAset {
  return (KONDISI_ASET as readonly string[]).includes(nilai);
}

/** Awalan wajib pada QR label aset. */
export const AWALAN_LABEL = "SILAB-ASET:";

/** Kode aset yang sah: huruf besar, angka, tanda hubung, dan garis bawah. */
const POLA_KODE = /^[A-Z0-9][A-Z0-9_-]{1,31}$/;

/** Membentuk muatan QR untuk sebuah kode aset. */
export function bungkusKodeAset(kodeAset: string): string {
  return `${AWALAN_LABEL}${kodeAset.trim().toUpperCase()}`;
}

/**
 * Membaca hasil pemindaian menjadi kode aset.
 *
 * Menerima muatan berlabel (`SILAB-ASET:INV-001`) maupun kode yang diketik
 * langsung (`INV-001`), karena petugas harus tetap bisa bekerja saat labelnya
 * sobek. Yang tidak diterima adalah teks yang tidak berbentuk kode aset —
 * termasuk token absensi, yang panjang dan mengandung titik.
 */
export function bacaKodeAset(mentah: string): string | null {
  let teks = mentah.trim();
  if (teks.toUpperCase().startsWith(AWALAN_LABEL)) {
    teks = teks.slice(AWALAN_LABEL.length);
  }
  teks = teks.trim().toUpperCase();
  return POLA_KODE.test(teks) ? teks : null;
}
