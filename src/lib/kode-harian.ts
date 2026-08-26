// -----------------------------------------------------------------------------
// Lapis 2 anti titip absen — kode harian.
//
// Kode dibuat sekali sehari dan HANYA ditampilkan pada layar di dalam
// laboratorium, lewat halaman /display. Ia tidak pernah dikirim di dalam
// respons API mana pun, tidak muncul di dasbor, dan tidak dapat dilihat anggota
// dari ponselnya. Satu-satunya cara mengetahuinya adalah berada di ruangan itu
// dan membacanya dari layar.
//
// Karena itu, setiap fungsi di berkas ini yang mengembalikan kode hanya boleh
// dipanggil dari halaman /display — yang sendirinya sudah dijaga lapis jaringan.
// -----------------------------------------------------------------------------

import { randomInt } from "node:crypto";

import { prisma } from "./prisma";
import { tanggalKalenderWib } from "./waktu";

/**
 * Abjad kode. Huruf dan angka yang mudah tertukar dibuang: 0 dan O, 1 dan I
 * dan l. Kode ini dibaca dari layar oleh orang yang sedang berdiri di pintu,
 * bukan disalin-tempel — satu salah baca berarti satu absensi gagal.
 */
export const ABJAD_KODE = "ACDEFGHJKMNPQRTUVWXYZ2346789";

export const PANJANG_KODE = 6;

export function buatKodeAcak(): string {
  let kode = "";
  for (let i = 0; i < PANJANG_KODE; i++) {
    kode += ABJAD_KODE[randomInt(ABJAD_KODE.length)];
  }
  return kode;
}

/**
 * Memastikan kode untuk hari ini ada, lalu mengembalikannya.
 *
 * Idempoten dan tahan balapan: dua permintaan bersamaan tidak menghasilkan dua
 * kode berbeda, karena kolom `tanggal` unik dan pembuatan yang kalah balapan
 * akan membaca ulang kode yang sudah tersimpan.
 *
 * Dipanggil oleh cron pukul 00:01 WIB dan juga oleh /display. Pemanggilan dari
 * /display disengaja: bila mini PC mati semalaman dan cron terlewat, kode hari
 * itu tetap terbit begitu layar dinyalakan, alih-alih laboratorium tidak bisa
 * absen sama sekali.
 */
export async function pastikanKodeHariIni(
  otomatis = true,
): Promise<{ tanggal: Date; kode: string; baruDibuat: boolean }> {
  const tanggal = tanggalKalenderWib();

  const ada = await prisma.dailyCode.findUnique({ where: { tanggal } });
  if (ada) return { tanggal, kode: ada.kode, baruDibuat: false };

  try {
    const dibuat = await prisma.dailyCode.create({
      data: { tanggal, kode: buatKodeAcak(), dibuatOtomatis: otomatis },
    });
    return { tanggal, kode: dibuat.kode, baruDibuat: true };
  } catch {
    // Kalah balapan dengan permintaan lain: yang tersimpan itulah yang berlaku.
    const setelahBalapan = await prisma.dailyCode.findUniqueOrThrow({ where: { tanggal } });
    return { tanggal, kode: setelahBalapan.kode, baruDibuat: false };
  }
}

/**
 * Mencocokkan kode yang diketik anggota dengan kode hari ini.
 *
 * Perbandingan tidak peka huruf besar-kecil dan mengabaikan spasi, karena kode
 * diketik dari layar dengan satu tangan sambil berdiri. Yang TIDAK dilakukan:
 * mengembalikan kode yang benar saat salah — pesan galat tidak boleh membocorkan
 * apa yang sedang tertulis di layar laboratorium.
 */
export async function kodeHarianCocok(diketik: string): Promise<boolean> {
  const bersih = diketik.replace(/\s+/g, "").toUpperCase();
  if (bersih.length !== PANJANG_KODE) return false;

  const hariIni = await prisma.dailyCode.findUnique({
    where: { tanggal: tanggalKalenderWib() },
    select: { kode: true },
  });
  if (!hariIni) return false;

  return hariIni.kode.toUpperCase() === bersih;
}
