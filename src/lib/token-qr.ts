// -----------------------------------------------------------------------------
// Lapis 3 anti titip absen — token QR berputar.
//
// Layar di laboratorium menampilkan QR yang berganti tiap 60 detik. Isinya
// bukan sekadar teks acak, melainkan token bertanda tangan HMAC-SHA256 yang
// memuat stempel waktu, id sesi harian, dan nonce.
//
// Yang dicegah lapis ini: seseorang memotret QR lalu mengirimkannya ke teman.
// Jendela relainya dipersempit menjadi sekitar satu menit. Lapis 1 yang
// menutupnya sama sekali; lapis ini yang membuat percobaan relai jadi tidak
// sepadan bahkan bila seseorang berhasil menembus jaringan.
//
// Tanda tangan dibandingkan dengan timingSafeEqual — perbandingan string biasa
// berhenti pada karakter pertama yang berbeda, dan selisih waktunya cukup untuk
// menebak tanda tangan satu karakter demi satu karakter.
// -----------------------------------------------------------------------------

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export interface IsiToken {
  /** Stempel waktu penerbitan, dalam detik epoch. */
  ts: number;
  /** Id baris DailyCode hari itu; token kemarin tidak berlaku hari ini. */
  sesi: string;
  /** Nilai acak sekali pakai. */
  nonce: string;
}

export type HasilPeriksaToken =
  | { sah: true; isi: IsiToken }
  | { sah: false; alasan: string };

function kunci(): string {
  const rahasia = process.env.QR_TOKEN_SECRET;
  if (!rahasia) {
    // Menolak menandatangani dengan kunci kosong. Token yang bisa ditebak
    // siapa saja lebih buruk daripada tidak punya lapis ini sama sekali,
    // karena ia memberi rasa aman yang palsu.
    throw new Error("QR_TOKEN_SECRET belum diisi di peladen.");
  }
  return rahasia;
}

export function detikPutaran(): number {
  return Number(process.env.QR_ROTATE_SECONDS ?? 60);
}

export function detikKedaluwarsa(): number {
  return Number(process.env.QR_MAX_AGE_SECONDS ?? 90);
}

function base64url(data: Buffer | string): string {
  return Buffer.from(data).toString("base64url");
}

function tandaTangan(muatan: string): string {
  return createHmac("sha256", kunci()).update(muatan).digest("base64url");
}

/** Menerbitkan token baru untuk ditampilkan sebagai QR di layar laboratorium. */
export function terbitkanToken(idSesiHarian: string, sekarang = new Date()): string {
  const isi: IsiToken = {
    ts: Math.floor(sekarang.getTime() / 1000),
    sesi: idSesiHarian,
    nonce: randomBytes(12).toString("base64url"),
  };
  const muatan = base64url(JSON.stringify(isi));
  return `${muatan}.${tandaTangan(muatan)}`;
}

/**
 * Memeriksa token yang dipindai dari layar.
 *
 * Hanya memeriksa tanda tangan dan umur. Pemeriksaan nonce sudah-dipakai
 * membutuhkan basis data dan berada di `klaimNonce`, supaya fungsi ini tetap
 * murni dan mudah diuji.
 */
export function periksaToken(token: string, sekarang = new Date()): HasilPeriksaToken {
  if (typeof token !== "string" || token.length === 0) {
    return { sah: false, alasan: "Token QR kosong. Pindai ulang QR di layar laboratorium." };
  }

  const bagian = token.split(".");
  if (bagian.length !== 2) {
    return { sah: false, alasan: "Bentuk token QR tidak dikenali. Pindai ulang QR di layar." };
  }

  const [muatan, tanda] = bagian as [string, string];

  const diharapkan = Buffer.from(tandaTangan(muatan));
  const diterima = Buffer.from(tanda);
  if (
    diharapkan.length !== diterima.length ||
    !timingSafeEqual(new Uint8Array(diharapkan), new Uint8Array(diterima))
  ) {
    return {
      sah: false,
      alasan: "Tanda tangan token QR tidak sah. Pindai QR langsung dari layar laboratorium.",
    };
  }

  let isi: IsiToken;
  try {
    isi = JSON.parse(Buffer.from(muatan, "base64url").toString("utf8")) as IsiToken;
  } catch {
    return { sah: false, alasan: "Isi token QR rusak. Pindai ulang QR di layar." };
  }

  if (typeof isi.ts !== "number" || typeof isi.sesi !== "string" || typeof isi.nonce !== "string") {
    return { sah: false, alasan: "Isi token QR tidak lengkap. Pindai ulang QR di layar." };
  }

  const umur = Math.floor(sekarang.getTime() / 1000) - isi.ts;
  if (umur > detikKedaluwarsa()) {
    return {
      sah: false,
      alasan: `Token QR sudah kedaluwarsa (${umur} detik). QR di layar berganti tiap ${detikPutaran()} detik — pindai yang sedang tampil sekarang.`,
    };
  }
  // Token bertanggal masa depan menandakan jam ponsel atau peladen bergeser,
  // atau token dikarang. Toleransi kecil untuk selisih jam yang wajar.
  if (umur < -30) {
    return { sah: false, alasan: "Stempel waktu token QR tidak masuk akal. Pindai ulang." };
  }

  return { sah: true, isi };
}
