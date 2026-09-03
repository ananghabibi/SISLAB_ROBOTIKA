// -----------------------------------------------------------------------------
// Penguraian baris CSV absensi lama (hasil ekspor Google Sheets).
//
// Dipisahkan dari skrip impornya supaya dapat diuji tanpa basis data. Berkas
// yang diurai di sini datang dari spreadsheet yang dirawat manusia selama
// bertahun-tahun: tanggalnya bercampur bentuk, jamnya kadang kosong, dan
// barisnya kadang berisi catatan yang bukan data. Yang salah bentuk DITOLAK
// dengan menyebut nomor barisnya, tidak ditebak — angka absensi adalah dasar
// Surat Keterangan Kontribusi, dan tebakan di sini menjadi surat resmi yang
// keliru enam bulan kemudian.
// -----------------------------------------------------------------------------

const JENIS_KEGIATAN = [
  "RISET",
  "PIKET",
  "RAPAT",
  "PELATIHAN",
  "PENGABDIAN",
  "ADMINISTRASI",
  "LAINNYA",
] as const;

export type JenisKegiatanImpor = (typeof JENIS_KEGIATAN)[number];

export interface BarisAbsensiImpor {
  npm: string;
  /** Tanggal kalender, sebagai tengah malam UTC. */
  tanggal: Date;
  jamMasuk: Date;
  jamKeluar: Date | null;
  jenisKegiatan: JenisKegiatanImpor;
  uraian: string | null;
}

export type HasilBaris =
  | { ok: true; baris: BarisAbsensiImpor }
  | { ok: false; alasan: string };

/** Selisih WIB terhadap UTC. Berkas lama selalu ditulis dalam waktu setempat. */
const OFFSET_WIB_JAM = 7;

/**
 * Menerima `2026-03-04` maupun `4/3/2026`.
 *
 * Bentuk bergaris miring dibaca sebagai HARI/BULAN/TAHUN — urutan yang dipakai
 * di Indonesia. Bentuk Amerika (bulan dulu) tidak didukung dengan sengaja:
 * menebak di antara keduanya berarti 4 Maret dan 3 April tertukar tanpa ada
 * yang menyadarinya.
 */
export function uraiTanggal(teks: string): Date | null {
  const bersih = teks.trim();

  const iso = bersih.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return bentukTanggal(Number(iso[3]), Number(iso[2]), Number(iso[1]));

  const lokal = bersih.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (lokal) return bentukTanggal(Number(lokal[1]), Number(lokal[2]), Number(lokal[3]));

  return null;
}

function bentukTanggal(hari: number, bulan: number, tahun: number): Date | null {
  if (bulan < 1 || bulan > 12 || hari < 1 || hari > 31) return null;
  const tanggal = new Date(Date.UTC(tahun, bulan - 1, hari));
  // Menolak 31 Februari dan sejenisnya, yang diam-diam digeser oleh Date.
  if (tanggal.getUTCMonth() !== bulan - 1 || tanggal.getUTCDate() !== hari) return null;
  return tanggal;
}

/** Menggabungkan tanggal dan jam WIB (`07:30` atau `07.30`) menjadi instan UTC. */
export function uraiJam(tanggal: Date, teks: string): Date | null {
  const cocok = teks.trim().match(/^(\d{1,2})[:.](\d{2})(?::(\d{2}))?$/);
  if (!cocok) return null;

  const jam = Number(cocok[1]);
  const menit = Number(cocok[2]);
  const detik = Number(cocok[3] ?? "0");
  if (jam > 23 || menit > 59 || detik > 59) return null;

  return new Date(tanggal.getTime() + (jam - OFFSET_WIB_JAM) * 3_600_000 + menit * 60_000 + detik * 1000);
}

/**
 * Menguraikan satu baris CSV.
 *
 * Kolom yang dikenali: `npm`, `tanggal`, `jam_masuk`, `jam_keluar`,
 * `jenis_kegiatan`, `uraian`. Kolom lain diabaikan, supaya berkas ekspor yang
 * membawa kolom tambahan tetap dapat dipakai apa adanya.
 */
export function uraiBarisAbsensi(kolom: Record<string, string>): HasilBaris {
  const npm = (kolom.npm ?? "").trim();
  if (!/^\d{11}$/.test(npm)) return { ok: false, alasan: `NPM "${npm}" bukan 11 digit.` };

  const tanggal = uraiTanggal(kolom.tanggal ?? "");
  if (!tanggal) {
    return { ok: false, alasan: `Tanggal "${kolom.tanggal ?? ""}" tidak terbaca (pakai YYYY-MM-DD atau DD/MM/YYYY).` };
  }

  const jamMasuk = uraiJam(tanggal, kolom.jam_masuk ?? "");
  if (!jamMasuk) {
    return { ok: false, alasan: `Jam masuk "${kolom.jam_masuk ?? ""}" tidak terbaca.` };
  }

  const teksKeluar = (kolom.jam_keluar ?? "").trim();
  let jamKeluar: Date | null = null;
  if (teksKeluar.length > 0 && teksKeluar !== "-") {
    jamKeluar = uraiJam(tanggal, teksKeluar);
    if (!jamKeluar) return { ok: false, alasan: `Jam keluar "${teksKeluar}" tidak terbaca.` };
    // Sesi yang berakhir sebelum dimulai ditolak, bukan dibalik diam-diam.
    if (jamKeluar.getTime() < jamMasuk.getTime()) {
      return { ok: false, alasan: "Jam keluar mendahului jam masuk." };
    }
  }

  const jenisTeks = (kolom.jenis_kegiatan ?? "RISET").trim().toUpperCase();
  const jenis = JENIS_KEGIATAN.find((j) => j === jenisTeks);
  if (!jenis) {
    return {
      ok: false,
      alasan: `Jenis kegiatan "${jenisTeks}" tidak dikenal. Pilihannya: ${JENIS_KEGIATAN.join(", ")}.`,
    };
  }

  const uraian = (kolom.uraian ?? "").trim();
  return {
    ok: true,
    baris: { npm, tanggal, jamMasuk, jamKeluar, jenisKegiatan: jenis, uraian: uraian || null },
  };
}
