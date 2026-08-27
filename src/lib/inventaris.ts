// -----------------------------------------------------------------------------
// Inventaris dan peminjaman.
//
// Satu aturan menentukan seluruh berkas ini: **satu aset hanya boleh punya satu
// pinjaman berjalan pada satu waktu**, dan aturan itu ditegakkan basis data,
// bukan aplikasi. Indeks `loans_asset_dipinjam_unik` (lihat migrasi
// 20260826024500) adalah partial unique index atas `assetId` untuk baris
// berstatus DIPINJAM.
//
// Mengapa bukan "periksa dulu lalu tulis": dua petugas yang menekan tombol pada
// detik yang sama akan sama-sama melihat aset itu tersedia, lalu sama-sama
// menyimpan. Satu-satunya yang tidak bisa kalah balapan adalah basis datanya
// sendiri. Karena itu di sini kita menyisipkan lebih dulu dan menangani
// penolakannya — bukan sebaliknya.
// -----------------------------------------------------------------------------

import { Prisma, type KondisiAset, type Loan } from "@prisma/client";

import { prisma } from "./prisma";

/**
 * Penanda penolakan pinjam ganda pada galat Prisma.
 *
 * Prisma tidak konsisten menyebut apa yang dilanggar: bergantung versi dan
 * penggerak basis data, `meta.target` bisa berisi nama indeksnya
 * (`loans_asset_dipinjam_unik`) atau nama medannya (`assetId`). Keduanya
 * diterima di sini. Tabel `loans` hanya punya satu batasan unik — indeks
 * parsial itu — jadi tidak ada penolakan lain yang bisa tertukar dengannya.
 */
const PENANDA_PINJAM_GANDA = ["loans_asset_dipinjam_unik", "assetId"];

export type HasilPinjam =
  | { ok: true; pinjaman: Loan }
  | { ok: false; kode: "SEDANG_DIPINJAM" | "TIDAK_BOLEH_DIPINJAM" | "ASET_TIDAK_ADA"; pesan: string };

export type HasilKembali =
  | { ok: true; pinjaman: Loan }
  | { ok: false; kode: "TIDAK_ADA_PINJAMAN"; pesan: string };

/** Status pinjaman yang berarti alatnya masih di luar. */
export const STATUS_BERJALAN = ["DIPINJAM", "TERLAMBAT"] as const;

function pelanggaranPinjamGanda(galat: unknown): boolean {
  if (!(galat instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (galat.code !== "P2002") return false;
  const meta = JSON.stringify(galat.meta ?? {});
  return PENANDA_PINJAM_GANDA.some((penanda) => meta.includes(penanda));
}

export interface MasukanPinjam {
  kodeAset: string;
  peminjamId: string;
  petugasPinjamId: string;
  jumlah: number;
  keperluan: string;
  rencanaKembali: Date;
  fotoPinjamUrl: string;
}

export async function pinjamAset(masukan: MasukanPinjam): Promise<HasilPinjam> {
  const aset = await prisma.asset.findUnique({
    where: { kodeAset: masukan.kodeAset },
    select: { id: true, nama: true, bolehDipinjam: true, kondisi: true },
  });

  if (!aset) {
    return {
      ok: false,
      kode: "ASET_TIDAK_ADA",
      pesan: `Tidak ada aset dengan kode ${masukan.kodeAset}. Periksa label pada alatnya.`,
    };
  }
  if (!aset.bolehDipinjam) {
    return {
      ok: false,
      kode: "TIDAK_BOLEH_DIPINJAM",
      pesan: `${aset.nama} ditandai tidak boleh dipinjam. Hubungi Koordinator Operasional.`,
    };
  }

  try {
    const pinjaman = await prisma.loan.create({
      data: {
        assetId: aset.id,
        peminjamId: masukan.peminjamId,
        petugasPinjamId: masukan.petugasPinjamId,
        jumlah: masukan.jumlah,
        keperluan: masukan.keperluan,
        rencanaKembali: masukan.rencanaKembali,
        fotoPinjamUrl: masukan.fotoPinjamUrl,
        status: "DIPINJAM",
      },
    });
    return { ok: true, pinjaman };
  } catch (galat) {
    if (pelanggaranPinjamGanda(galat)) {
      // Ditolak basis data, bukan oleh pemeriksaan di aplikasi. Inilah yang
      // membuat dua permintaan bersamaan tidak bisa sama-sama lolos.
      return {
        ok: false,
        kode: "SEDANG_DIPINJAM",
        pesan: `${aset.nama} sedang dipinjam dan belum dikembalikan.`,
      };
    }
    throw galat;
  }
}

export interface MasukanKembali {
  pinjamanId: string;
  petugasKembaliId: string;
  kondisiKembali: KondisiAset;
  fotoKembaliUrl: string;
  catatan?: string | null;
}

export async function kembalikanAset(masukan: MasukanKembali): Promise<HasilKembali> {
  const pinjaman = await prisma.loan.findUnique({ where: { id: masukan.pinjamanId } });
  if (!pinjaman || !STATUS_BERJALAN.includes(pinjaman.status as (typeof STATUS_BERJALAN)[number])) {
    return {
      ok: false,
      kode: "TIDAK_ADA_PINJAMAN",
      pesan: "Pinjaman ini sudah ditutup atau tidak ditemukan.",
    };
  }

  const diperbarui = await prisma.$transaction(async (tx) => {
    const hasil = await tx.loan.update({
      where: { id: pinjaman.id },
      data: {
        tglKembali: new Date(),
        petugasKembaliId: masukan.petugasKembaliId,
        kondisiKembali: masukan.kondisiKembali,
        fotoKembaliUrl: masukan.fotoKembaliUrl,
        catatan: masukan.catatan?.trim() || null,
        status: masukan.kondisiKembali === "HILANG" ? "HILANG" : "KEMBALI",
      },
    });

    // Kondisi aset mengikuti keadaannya saat kembali. Alat yang pulang dalam
    // keadaan rusak tidak boleh tetap tercatat BAIK di master inventaris.
    await tx.asset.update({
      where: { id: pinjaman.assetId },
      data: { kondisi: masukan.kondisiKembali },
    });

    return hasil;
  });

  return { ok: true, pinjaman: diperbarui };
}

/**
 * Menandai pinjaman yang lewat tenggat sebagai TERLAMBAT.
 *
 * Dipanggil cron harian. Penandaan ini hanya mengubah label; perhitungan
 * "alat belum kembali" pada rekap kontribusi tidak menunggunya, karena ia
 * memeriksa tenggat secara langsung. Jadi cron yang terlewat tidak membuat
 * siapa pun lolos dari potongan skor.
 */
export async function tandaiTerlambat(): Promise<number> {
  const { count } = await prisma.loan.updateMany({
    where: { status: "DIPINJAM", rencanaKembali: { lt: new Date() } },
    data: { status: "TERLAMBAT" },
  });
  return count;
}

/** Pinjaman yang masih berjalan, terbaru lebih dulu. */
export async function pinjamanBerjalan(saringan: Prisma.LoanWhereInput = {}) {
  return prisma.loan.findMany({
    where: { status: { in: [...STATUS_BERJALAN] }, ...saringan },
    orderBy: { rencanaKembali: "asc" },
    include: {
      asset: { select: { kodeAset: true, nama: true, kategori: true } },
      peminjam: { select: { id: true, nama: true, npm: true, squad: { select: { kode: true } } } },
      petugasPinjam: { select: { nama: true } },
    },
  });
}

/** Riwayat pinjaman yang sudah ditutup. */
export async function riwayatPinjaman(saringan: Prisma.LoanWhereInput = {}, batas = 50) {
  return prisma.loan.findMany({
    where: { status: { notIn: [...STATUS_BERJALAN] }, ...saringan },
    orderBy: { tglKembali: "desc" },
    take: batas,
    include: {
      asset: { select: { kodeAset: true, nama: true } },
      peminjam: { select: { nama: true, npm: true } },
      petugasKembali: { select: { nama: true } },
    },
  });
}

/** Daftar aset beserta pinjaman yang sedang berjalan, bila ada. */
export async function daftarAset(saringan: Prisma.AssetWhereInput = {}) {
  return prisma.asset.findMany({
    where: saringan,
    orderBy: { kodeAset: "asc" },
    include: {
      penanggungJawab: { select: { nama: true } },
      loans: {
        where: { status: { in: [...STATUS_BERJALAN] } },
        select: {
          id: true,
          rencanaKembali: true,
          status: true,
          peminjam: { select: { nama: true } },
        },
        take: 1,
      },
    },
  });
}

/** Apakah tenggatnya sudah lewat. */
export function sudahLewatTenggat(rencanaKembali: Date, sekarang = new Date()): boolean {
  return rencanaKembali.getTime() < sekarang.getTime();
}
