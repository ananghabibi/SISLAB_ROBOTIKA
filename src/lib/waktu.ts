// -----------------------------------------------------------------------------
// Waktu.
//
// Aturan rumah: basis data selalu menyimpan UTC, antarmuka selalu menampilkan
// WIB. Semua konversi terjadi di berkas ini supaya tidak ada satu pun halaman
// yang diam-diam memakai zona waktu peladen.
// -----------------------------------------------------------------------------

export const ZONA_WIB = "Asia/Jakarta";

const formatTanggalPanjang = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA_WIB,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const formatTanggalPendek = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA_WIB,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const formatJam = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA_WIB,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function tanggalPanjangWib(tanggal: Date): string {
  return formatTanggalPanjang.format(tanggal);
}

export function tanggalPendekWib(tanggal: Date): string {
  return formatTanggalPendek.format(tanggal);
}

export function jamWib(waktu: Date): string {
  return `${formatJam.format(waktu)} WIB`;
}

export function tanggalDanJamWib(waktu: Date): string {
  return `${tanggalPendekWib(waktu)} ${jamWib(waktu)}`;
}

/**
 * Tanggal kalender WIB dari sebuah instan, sebagai Date tengah malam UTC.
 *
 * Dipakai untuk medan bertanggal murni (@db.Date). Seseorang yang absen pukul
 * 07.00 WIB masih berada di tanggal UTC kemarin; tanpa penyesuaian ini aturan
 * "satu sesi per orang per hari" akan meleset satu hari setiap pagi.
 */
export function tanggalKalenderWib(waktu: Date = new Date()): Date {
  const bagian = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_WIB,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(waktu);
  return new Date(`${bagian}T00:00:00.000Z`);
}
