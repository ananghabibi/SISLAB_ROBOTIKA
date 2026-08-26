// -----------------------------------------------------------------------------
// Aturan absensi (SPEC bagian 6.4).
//
// Tiga hal yang dijaga ketat di sini:
//   1. Satu sesi per orang per hari.
//   2. Absen pulang tanpa absen masuk ditolak.
//   3. Sesi yang tidak diakhiri TIDAK dikarang jam pulangnya. Ia tetap dihitung
//      hadir, tetapi durasinya nol. Mengarang jam pulang berarti memasukkan
//      angka palsu ke dalam dokumen yang nanti diaudit Program Studi.
// -----------------------------------------------------------------------------

import type { Attendance, JenisKegiatan } from "@prisma/client";

import { prisma } from "./prisma";
import { tanggalKalenderWib } from "./waktu";

export type HasilAbsen =
  | { ok: true; catatan: Attendance; pesan: string }
  | { ok: false; kode: "SUDAH_MASUK" | "BELUM_MASUK" | "SUDAH_PULANG"; pesan: string };

/** Catatan absensi seseorang untuk hari kalender WIB berjalan. */
export async function absensiHariIni(userId: string): Promise<Attendance | null> {
  return prisma.attendance.findUnique({
    where: { userId_tanggal: { userId, tanggal: tanggalKalenderWib() } },
  });
}

export interface MasukanAbsenMasuk {
  userId: string;
  ip: string;
  jenisKegiatan: JenisKegiatan;
  rencana?: string | null;
  manual?: boolean;
  alasanManual?: string | null;
}

export async function absenMasuk(masukan: MasukanAbsenMasuk): Promise<HasilAbsen> {
  const tanggal = tanggalKalenderWib();

  const sudahAda = await prisma.attendance.findUnique({
    where: { userId_tanggal: { userId: masukan.userId, tanggal } },
  });
  if (sudahAda) {
    return {
      ok: false,
      kode: "SUDAH_MASUK",
      pesan: sudahAda.jamKeluar
        ? "Anda sudah absen masuk dan pulang hari ini. Satu sesi per orang per hari."
        : "Anda sudah absen masuk hari ini. Yang tersisa hanyalah absen pulang.",
    };
  }

  try {
    const catatan = await prisma.attendance.create({
      data: {
        userId: masukan.userId,
        tanggal,
        jamMasuk: new Date(),
        jenisKegiatan: masukan.jenisKegiatan,
        rencana: masukan.rencana?.trim() || null,
        ipMasuk: masukan.ip,
        manual: masukan.manual ?? false,
        alasanManual: masukan.alasanManual?.trim() || null,
      },
    });
    return { ok: true, catatan, pesan: "Absen masuk tercatat. Selamat bekerja." };
  } catch {
    // Kalah balapan dengan permintaan kembar dari ponsel yang sama.
    return {
      ok: false,
      kode: "SUDAH_MASUK",
      pesan: "Anda sudah absen masuk hari ini. Satu sesi per orang per hari.",
    };
  }
}

export interface MasukanAbsenPulang {
  userId: string;
  ip: string;
  uraian?: string | null;
  kendala?: string | null;
}

export async function absenPulang(masukan: MasukanAbsenPulang): Promise<HasilAbsen> {
  const tanggal = tanggalKalenderWib();

  const catatan = await prisma.attendance.findUnique({
    where: { userId_tanggal: { userId: masukan.userId, tanggal } },
  });

  if (!catatan) {
    return {
      ok: false,
      kode: "BELUM_MASUK",
      pesan: "Belum ada absen masuk hari ini, jadi tidak ada sesi yang bisa diakhiri.",
    };
  }
  if (catatan.jamKeluar) {
    return {
      ok: false,
      kode: "SUDAH_PULANG",
      pesan: "Sesi hari ini sudah Anda akhiri.",
    };
  }

  const diperbarui = await prisma.attendance.update({
    where: { id: catatan.id },
    data: {
      jamKeluar: new Date(),
      ipKeluar: masukan.ip,
      uraian: masukan.uraian?.trim() || null,
      kendala: masukan.kendala?.trim() || null,
    },
  });

  return { ok: true, catatan: diperbarui, pesan: "Absen pulang tercatat. Terima kasih." };
}

/**
 * Durasi sesi dalam jam.
 *
 * Sesi yang tidak diakhiri bernilai nol — bukan "sampai tengah malam", bukan
 * pula rata-rata. Kalau jam pulangnya tidak diketahui, maka tidak diketahui.
 */
export function durasiJam(catatan: Pick<Attendance, "jamMasuk" | "jamKeluar">): number {
  if (!catatan.jamKeluar) return 0;
  const milidetik = catatan.jamKeluar.getTime() - catatan.jamMasuk.getTime();
  return Math.max(0, milidetik / 3_600_000);
}

/**
 * Siapa saja yang sedang berada di laboratorium: sudah absen masuk hari ini
 * dan belum absen pulang. Sengaja dibatasi hari ini saja, supaya sesi kemarin
 * yang lupa diakhiri tidak ikut tampil seolah orangnya masih di ruangan.
 */
export async function sedangDiLab() {
  return prisma.attendance.findMany({
    where: {
      tanggal: tanggalKalenderWib(),
      jamKeluar: null,
      dibatalkan: false,
    },
    orderBy: { jamMasuk: "asc" },
    select: {
      id: true,
      jamMasuk: true,
      manual: true,
      user: { select: { nama: true, squad: { select: { kode: true } } } },
    },
  });
}

/** Riwayat absensi seorang anggota, terbaru lebih dulu. */
export async function riwayatAbsensi(userId: string, batas = 60) {
  return prisma.attendance.findMany({
    where: { userId },
    orderBy: { tanggal: "desc" },
    take: batas,
  });
}
