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

/** Selisih WIB terhadap UTC: +7 jam, tanpa waktu musim panas. */
const OFFSET_WIB_JAM = 7;

/**
 * Akhir hari WIB dari tanggal yang diketik pengguna (`YYYY-MM-DD`), sebagai UTC.
 *
 * Tenggat pengembalian alat adalah tanggal, bukan jam. Bila tanggal itu
 * disimpan apa adanya sebagai tengah malam UTC, alat yang dijanjikan kembali
 * "hari Jumat" sudah dihitung terlambat sejak Jumat pukul tujuh pagi WIB.
 * Yang benar adalah batas akhir harinya: 23.59.59 WIB, yaitu 16.59.59 UTC.
 *
 * Mengembalikan null bila tanggalnya tidak terbaca.
 */
export function akhirHariWib(tanggal: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return null;
  const waktu = new Date(`${tanggal}T23:59:59.999Z`);
  if (Number.isNaN(waktu.getTime())) return null;
  waktu.setUTCHours(waktu.getUTCHours() - OFFSET_WIB_JAM);
  return waktu;
}

/**
 * Nomor hari dalam pekan menurut WIB: 0 Minggu, 1 Senin, sampai 6 Sabtu.
 *
 * Dihitung dari tanggal KALENDER WIB, bukan dari hari UTC. Piket Senin yang
 * dicatat pukul 06.00 WIB masih berada di hari Minggu menurut UTC; tanpa
 * penyesuaian ini jadwal piket meleset satu hari setiap pagi.
 */
export function nomorHariWib(waktu: Date = new Date()): number {
  return tanggalKalenderWib(waktu).getUTCDay();
}

/**
 * Senin pada pekan yang memuat tanggal itu, menurut WIB.
 *
 * Pekan dimulai Senin karena begitulah pekan kerja laboratorium dibaca orang.
 * Dipakai menomori pekan logbook, sehingga "pekan ini" berarti hal yang sama
 * bagi semua squad, tidak bergantung pada hari apa periodenya kebetulan mulai.
 */
export function awalPekanWib(waktu: Date = new Date()): Date {
  const tanggal = tanggalKalenderWib(waktu);
  // Minggu (0) termasuk pekan yang Seninnya enam hari sebelumnya.
  const mundur = (tanggal.getUTCDay() + 6) % 7;
  return new Date(tanggal.getTime() - mundur * 86_400_000);
}
