// -----------------------------------------------------------------------------
// Mesin perhitungan skor kontribusi (SPEC bagian 6.1).
//
//   skor = 40 × min(persenHadir, 1)
//        + 20 × min(sesiBerbagi / targetSesiBerbagi, 1)
//        + 20 × min(piket / targetPiket, 1)
//        + 20 × min(entriLogbook / targetLogbook, 1)
//        − 5  × alatBelumKembali
//
//   persenHadir = hariHadir / targetHadir, skor akhir dibatasi 0..100
//
// Berkas ini sengaja murni: tidak menyentuh basis data, tidak membaca variabel
// lingkungan, tidak tahu apa pun tentang Prisma. Angka yang keluar dari sini
// akan dicetak pada Surat Keterangan Kontribusi yang diaudit Program Studi,
// jadi ia harus bisa diuji sampai ke setiap sudutnya — termasuk sudut yang
// tidak enak, seperti target yang lupa diisi.
// -----------------------------------------------------------------------------

export interface KomponenKontribusi {
  hariHadir: number;
  sesiBerbagi: number;
  piket: number;
  entriLogbook: number;
  alatBelumKembali: number;
}

export interface TargetPeriode {
  targetHadir: number;
  targetSesiBerbagi: number;
  targetPiket: number;
  targetLogbook: number;
  ambangLulus: number;
}

export interface RincianSkor {
  /** Bagian kehadiran, 0..40. */
  nilaiHadir: number;
  /** Bagian sesi berbagi, 0..20. */
  nilaiSesiBerbagi: number;
  /** Bagian piket, 0..20. */
  nilaiPiket: number;
  /** Bagian logbook, 0..20. */
  nilaiLogbook: number;
  /** Pengurangan alat belum kembali, bernilai negatif atau nol. */
  penguranganAlat: number;
  /** Rasio kehadiran terhadap target, 0..1 setelah dibatasi. */
  persenHadir: number;
  /** Jumlah seluruh bagian sebelum dibatasi ke 0..100. */
  sebelumDibatasi: number;
  skor: number;
  lulus: boolean;
}

export const BOBOT = {
  hadir: 40,
  sesiBerbagi: 20,
  piket: 20,
  logbook: 20,
  potonganPerAlat: 5,
} as const;

/**
 * Rasio pencapaian terhadap target, dibatasi pada 1.
 *
 * Target bernilai nol berarti komponen itu tidak disyaratkan pada periode ini.
 * Yang dikembalikan adalah 1 — bukan 0, dan bukan pula pembagian dengan nol
 * yang menghasilkan Infinity atau NaN. Menghukum anggota karena pengurus lupa
 * mengisi target jelas keliru; membiarkan NaN merambat ke Surat Keterangan
 * Kontribusi jauh lebih buruk lagi.
 */
export function rasioPencapaian(tercapai: number, target: number): number {
  if (!Number.isFinite(target) || target <= 0) return 1;
  if (!Number.isFinite(tercapai) || tercapai <= 0) return 0;
  return Math.min(tercapai / target, 1);
}

function bulatkanDuaDesimal(n: number): number {
  return Math.round(n * 100) / 100;
}

export function hitungSkor(
  komponen: KomponenKontribusi,
  target: TargetPeriode,
): RincianSkor {
  const persenHadir = rasioPencapaian(komponen.hariHadir, target.targetHadir);

  const nilaiHadir = BOBOT.hadir * persenHadir;
  const nilaiSesiBerbagi =
    BOBOT.sesiBerbagi * rasioPencapaian(komponen.sesiBerbagi, target.targetSesiBerbagi);
  const nilaiPiket = BOBOT.piket * rasioPencapaian(komponen.piket, target.targetPiket);
  const nilaiLogbook = BOBOT.logbook * rasioPencapaian(komponen.entriLogbook, target.targetLogbook);

  const alat = Math.max(0, komponen.alatBelumKembali);
  const penguranganAlat = -(BOBOT.potonganPerAlat * alat);

  const sebelumDibatasi =
    nilaiHadir + nilaiSesiBerbagi + nilaiPiket + nilaiLogbook + penguranganAlat;
  const skor = bulatkanDuaDesimal(Math.min(100, Math.max(0, sebelumDibatasi)));

  return {
    nilaiHadir: bulatkanDuaDesimal(nilaiHadir),
    nilaiSesiBerbagi: bulatkanDuaDesimal(nilaiSesiBerbagi),
    nilaiPiket: bulatkanDuaDesimal(nilaiPiket),
    nilaiLogbook: bulatkanDuaDesimal(nilaiLogbook),
    penguranganAlat: bulatkanDuaDesimal(penguranganAlat),
    persenHadir: bulatkanDuaDesimal(persenHadir),
    sebelumDibatasi: bulatkanDuaDesimal(sebelumDibatasi),
    skor,
    lulus: skor >= target.ambangLulus,
  };
}

export interface Kekurangan {
  label: string;
  tercapai: number;
  target: number;
  satuan: string;
  /** Berapa lagi yang perlu dikumpulkan untuk memenuhi target. */
  kurang: number;
}

/**
 * Apa saja yang masih kurang dari target.
 *
 * Dipakai dasbor anggota supaya seseorang dapat melihat sendiri apa yang perlu
 * dikejar, tanpa perlu bertanya kepada siapa pun — itu salah satu ukuran
 * keberhasilan sistem ini (SPEC bagian 11 butir 3).
 */
export function daftarKekurangan(
  komponen: KomponenKontribusi,
  target: TargetPeriode,
): Kekurangan[] {
  const butir: Kekurangan[] = [
    { label: "Kehadiran", tercapai: komponen.hariHadir, target: target.targetHadir, satuan: "hari" },
    {
      label: "Sesi berbagi",
      tercapai: komponen.sesiBerbagi,
      target: target.targetSesiBerbagi,
      satuan: "sesi",
    },
    { label: "Piket", tercapai: komponen.piket, target: target.targetPiket, satuan: "kali" },
    {
      label: "Logbook squad",
      tercapai: komponen.entriLogbook,
      target: target.targetLogbook,
      satuan: "entri",
    },
  ].map((b) => ({ ...b, kurang: Math.max(0, b.target - b.tercapai) }));

  return butir.filter((b) => b.target > 0 && b.kurang > 0);
}
