"use server";

// -----------------------------------------------------------------------------
// Aksi peminjaman dan pengembalian.
//
// Yang mencatat adalah PETUGAS, bukan peminjamnya. Peminjam dipilih dari
// daftar anggota, dan petugas selalu diambil dari sesi — tidak pernah dari
// formulir. Dengan begitu setiap alat yang keluar punya dua nama: yang membawa
// dan yang menyerahkan.
// -----------------------------------------------------------------------------

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { bacaKodeAset, KONDISI_ASET } from "@/lib/aset";
import { catatAudit } from "@/lib/audit";
import { simpanGambar } from "@/lib/berkas";
import { kembalikanAset, pinjamAset } from "@/lib/inventaris";
import { wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { akhirHariWib } from "@/lib/waktu";

export interface KeadaanPinjam {
  galat?: string;
  berhasil?: string;
}

/** Sejauh mana ke depan tenggat pengembalian boleh ditetapkan. */
const MAKSIMAL_HARI_PINJAM = 60;

const skemaPinjam = z.object({
  kodeAset: z.string().trim().min(1, "Kode aset wajib diisi."),
  peminjamId: z.string().trim().min(1, "Pilih siapa yang meminjam."),
  jumlah: z.coerce.number().int().min(1, "Jumlah minimal 1."),
  keperluan: z.string().trim().min(10, "Tuliskan keperluannya, minimal 10 karakter."),
  rencanaKembali: z.string().trim().min(1, "Tanggal rencana kembali wajib diisi."),
});

const skemaKembali = z.object({
  pinjamanId: z.string().trim().min(1),
  kondisiKembali: z.enum(KONDISI_ASET),
  catatan: z.string().trim().max(500).optional(),
});

/**
 * Mencatat alat keluar.
 *
 * Urutannya penting: foto disimpan setelah semua pemeriksaan lain lolos, tetapi
 * sebelum baris pinjaman dibuat. Berkas yatim (foto tanpa pinjaman) hanya
 * memakan ruang; pinjaman tanpa foto menghilangkan buktinya.
 */
export async function catatPinjam(
  _keadaan: KeadaanPinjam,
  data: FormData,
): Promise<KeadaanPinjam> {
  const { pengguna } = await wajibIzin("peminjaman", "tulis");

  const terurai = skemaPinjam.safeParse({
    kodeAset: data.get("kodeAset") ?? "",
    peminjamId: data.get("peminjamId") ?? "",
    jumlah: data.get("jumlah") ?? "1",
    keperluan: data.get("keperluan") ?? "",
    rencanaKembali: data.get("rencanaKembali") ?? "",
  });
  if (!terurai.success) return { galat: terurai.error.issues[0]!.message };
  const m = terurai.data;

  const kodeAset = bacaKodeAset(m.kodeAset);
  if (!kodeAset) return { galat: `"${m.kodeAset}" bukan kode aset yang sah.` };

  // Tenggat jatuh pada akhir hari WIB, bukan tengah malam UTC: alat yang
  // dijanjikan kembali "hari Jumat" tidak boleh terhitung terlambat sejak
  // Jumat pukul tujuh pagi.
  const rencanaKembali = akhirHariWib(m.rencanaKembali);
  if (!rencanaKembali) return { galat: "Tanggal rencana kembali tidak terbaca." };

  const sekarang = new Date();
  if (rencanaKembali.getTime() < sekarang.getTime()) {
    return { galat: "Tanggal rencana kembali sudah lewat." };
  }
  const batas = new Date(sekarang.getTime() + MAKSIMAL_HARI_PINJAM * 86_400_000);
  if (rencanaKembali.getTime() > batas.getTime()) {
    return { galat: `Peminjaman paling lama ${MAKSIMAL_HARI_PINJAM} hari.` };
  }

  const peminjam = await prisma.user.findUnique({
    where: { id: m.peminjamId },
    select: { id: true, nama: true, status: true },
  });
  if (!peminjam) return { galat: "Anggota peminjam tidak ditemukan." };
  if (peminjam.status !== "AKTIF") {
    return { galat: `${peminjam.nama} berstatus ${peminjam.status}, tidak dapat meminjam alat.` };
  }

  const foto = data.get("fotoPinjam");
  if (!(foto instanceof File)) return { galat: "Foto kondisi alat saat dipinjam wajib diunggah." };
  const unggahan = await simpanGambar(foto, "peminjaman");
  if (!unggahan.ok) return { galat: unggahan.pesan };

  const hasil = await pinjamAset({
    kodeAset,
    peminjamId: peminjam.id,
    petugasPinjamId: pengguna.id,
    jumlah: m.jumlah,
    keperluan: m.keperluan,
    rencanaKembali,
    fotoPinjamUrl: unggahan.jalur,
  });
  if (!hasil.ok) return { galat: hasil.pesan };

  await catatAudit({
    userId: pengguna.id,
    aksi: "PINJAM_ASET",
    entitas: "Loan",
    entitasId: hasil.pinjaman.id,
    dataBaru: hasil.pinjaman,
  });

  revalidatePath("/peminjaman");
  revalidatePath("/inventaris");
  return { berhasil: `${kodeAset} tercatat dipinjam ${peminjam.nama}.` };
}

/** Mencatat alat kembali beserta kondisinya. */
export async function catatKembali(
  _keadaan: KeadaanPinjam,
  data: FormData,
): Promise<KeadaanPinjam> {
  const { pengguna } = await wajibIzin("peminjaman", "tulis");

  const terurai = skemaKembali.safeParse({
    pinjamanId: data.get("pinjamanId") ?? "",
    kondisiKembali: data.get("kondisiKembali") ?? "BAIK",
    catatan: data.get("catatan") ?? "",
  });
  if (!terurai.success) return { galat: terurai.error.issues[0]!.message };
  const m = terurai.data;

  // Alat yang pulang tidak utuh menuntut penjelasan; yang utuh tidak.
  if (m.kondisiKembali !== "BAIK" && (m.catatan ?? "").length < 10) {
    return {
      galat: "Alat yang tidak kembali dalam keadaan baik wajib disertai catatan, minimal 10 karakter.",
    };
  }

  const lama = await prisma.loan.findUnique({
    where: { id: m.pinjamanId },
    include: { asset: { select: { kodeAset: true } }, peminjam: { select: { nama: true } } },
  });
  if (!lama) return { galat: "Pinjaman tidak ditemukan." };

  const foto = data.get("fotoKembali");
  if (!(foto instanceof File)) return { galat: "Foto kondisi alat saat kembali wajib diunggah." };
  const unggahan = await simpanGambar(foto, "peminjaman");
  if (!unggahan.ok) return { galat: unggahan.pesan };

  const hasil = await kembalikanAset({
    pinjamanId: m.pinjamanId,
    petugasKembaliId: pengguna.id,
    kondisiKembali: m.kondisiKembali,
    fotoKembaliUrl: unggahan.jalur,
    catatan: m.catatan,
  });
  if (!hasil.ok) return { galat: hasil.pesan };

  await catatAudit({
    userId: pengguna.id,
    aksi: "KEMBALI_ASET",
    entitas: "Loan",
    entitasId: hasil.pinjaman.id,
    dataLama: lama,
    dataBaru: hasil.pinjaman,
  });

  revalidatePath("/peminjaman");
  revalidatePath("/inventaris");
  return { berhasil: `${lama.asset.kodeAset} tercatat kembali dari ${lama.peminjam.nama}.` };
}
