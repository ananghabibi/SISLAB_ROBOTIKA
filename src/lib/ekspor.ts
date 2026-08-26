// -----------------------------------------------------------------------------
// Penulis CSV.
//
// Berkas ini diserahkan kepada Program Studi saat audit, jadi bentuknya harus
// terbuka apa adanya di Excel maupun LibreOffice tanpa perlu penyesuaian.
// -----------------------------------------------------------------------------

/**
 * Melolosi satu sel CSV.
 *
 * Sel yang diawali `=`, `+`, `-`, atau `@` diberi kutip dan tanda kutip tunggal
 * di depannya. Tanpa itu, Excel memperlakukannya sebagai rumus — nama yang
 * diawali tanda hubung bisa berubah menjadi galat, dan pada kasus terburuk
 * sebuah sel dapat menjalankan perintah di komputer pemeriksa.
 */
export function selCsv(nilai: unknown): string {
  const teks = nilai === null || nilai === undefined ? "" : String(nilai);
  const berbahaya = /^[=+\-@\t\r]/.test(teks);
  const perluKutip = berbahaya || /[",\n\r;]/.test(teks);
  const isi = berbahaya ? `'${teks}` : teks;
  return perluKutip ? `"${isi.replace(/"/g, '""')}"` : isi;
}

export function barisCsv(kolom: unknown[]): string {
  return kolom.map(selCsv).join(",");
}

/**
 * Menyusun berkas CSV lengkap.
 *
 * Diawali BOM UTF-8 supaya Excel di Windows membaca huruf beraksen dengan
 * benar, dan memakai CRLF sesuai kelaziman berkas CSV di sana.
 */
export function berkasCsv(kepala: string[], baris: unknown[][]): string {
  return "﻿" + [barisCsv(kepala), ...baris.map(barisCsv)].join("\r\n") + "\r\n";
}

/** Nama berkas yang aman dipakai di header Content-Disposition. */
export function namaBerkas(dasar: string, ekstensi: string): string {
  const stempel = new Date().toISOString().slice(0, 10);
  const bersih = dasar.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/-+/g, "-");
  return `${bersih}-${stempel}.${ekstensi}`;
}
