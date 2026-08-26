// -----------------------------------------------------------------------------
// Aturan catatan wajib saat absen pulang.
//
// Sengaja berdiri sendiri tanpa menyentuh Prisma: berkas ini ikut terbawa ke
// peramban oleh formulir absensi, supaya tombol kirim dan pemeriksaan peladen
// memakai angka yang sama persis. Kalau keduanya boleh berbeda, cepat atau
// lambat mereka akan berbeda.
//
// Mengapa catatan ini wajib: sesi tanpa keterangan tidak bisa
// dipertanggungjawabkan saat rekap kontribusi diaudit Program Studi — yang
// tercatat hanya "hadir sekian jam", tanpa satu pun bukti apa yang dikerjakan.
//
// Kendala juga wajib DIJAWAB, tetapi jawabannya boleh "tidak ada" — dinyatakan
// lewat penanda tersendiri, bukan dengan mengetik tanda hubung. Memaksa teks
// bebas pada hari yang memang lancar hanya menghasilkan "-" dan "aman", yang
// merusak nilai kolom itu justru pada hari-hari yang benar-benar bermasalah.
// -----------------------------------------------------------------------------

export const PANJANG_URAIAN_MINIMAL = 15;
export const PANJANG_KENDALA_MINIMAL = 5;

export interface CatatanPulang {
  uraian?: string | null;
  kendala?: string | null;
  /** Pernyataan tegas bahwa hari itu tidak ada kendala. */
  tanpaKendala?: boolean;
}

function jumlahKata(teks: string): number {
  return teks.split(/\s+/).filter((k) => k.length > 0).length;
}

/** Mengembalikan pesan galat berbahasa Indonesia, atau null bila sudah sah. */
export function validasiCatatanPulang(catatan: CatatanPulang): string | null {
  const uraian = (catatan.uraian ?? "").trim();

  if (uraian.length === 0) {
    return "Tuliskan dulu apa yang Anda kerjakan hari ini sebelum absen pulang.";
  }
  // Dua kata sebagai syarat minimal menyaring isian asal seperti
  // "----------------" atau "aaaaaaaaaaaaaaaa" yang lolos hitungan karakter.
  if (uraian.length < PANJANG_URAIAN_MINIMAL || jumlahKata(uraian) < 2) {
    return `Uraian pekerjaan terlalu singkat. Tulis sedikitnya ${PANJANG_URAIAN_MINIMAL} karakter dalam kalimat yang bisa dibaca orang lain.`;
  }

  if (catatan.tanpaKendala) return null;

  const kendala = (catatan.kendala ?? "").trim();
  if (kendala.length < PANJANG_KENDALA_MINIMAL) {
    return 'Isi kendala hari ini, atau centang "Tidak ada kendala" bila memang tidak ada.';
  }

  return null;
}
