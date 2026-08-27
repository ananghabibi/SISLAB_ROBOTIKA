"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { KONDISI_ASET } from "@/lib/aset";
import { catatAudit } from "@/lib/audit";
import { wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";

export interface KeadaanAset {
  galat?: string;
  berhasil?: string;
}

const skema = z.object({
  kodeAset: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "Kode aset minimal 3 karakter.")
    .regex(/^[A-Z0-9-]+$/, "Kode aset hanya boleh huruf, angka, dan tanda hubung."),
  nama: z.string().trim().min(3, "Nama aset wajib diisi."),
  kategori: z.string().trim().min(2, "Kategori wajib diisi."),
  merk: z.string().trim().max(120).optional(),
  jumlah: z.coerce.number().int().min(1, "Jumlah minimal 1."),
  satuan: z.string().trim().min(1).max(20),
  kondisi: z.enum(KONDISI_ASET),
  lokasi: z.string().trim().min(2, "Lokasi wajib diisi."),
  tahunPerolehan: z.coerce.number().int().min(1980).max(2100).nullable().catch(null),
  penanggungJawabId: z.string().trim(),
  bolehDipinjam: z.boolean(),
  keterangan: z.string().trim().max(500).optional(),
});

function baca(data: FormData) {
  const tahun = String(data.get("tahunPerolehan") ?? "").trim();
  return skema.safeParse({
    kodeAset: String(data.get("kodeAset") ?? ""),
    nama: String(data.get("nama") ?? ""),
    kategori: String(data.get("kategori") ?? ""),
    merk: String(data.get("merk") ?? ""),
    jumlah: String(data.get("jumlah") ?? "1"),
    satuan: String(data.get("satuan") ?? "unit"),
    kondisi: String(data.get("kondisi") ?? "BAIK"),
    lokasi: String(data.get("lokasi") ?? ""),
    tahunPerolehan: tahun === "" ? null : tahun,
    penanggungJawabId: String(data.get("penanggungJawabId") ?? ""),
    bolehDipinjam: data.get("bolehDipinjam") === "ya",
    keterangan: String(data.get("keterangan") ?? ""),
  });
}

export async function simpanAset(
  idAset: string | null,
  _keadaan: KeadaanAset,
  data: FormData,
): Promise<KeadaanAset> {
  const { pengguna } = await wajibIzin("inventaris", "tulis");

  const terurai = baca(data);
  if (!terurai.success) return { galat: terurai.error.issues[0]!.message };
  const m = terurai.data;

  const isi = {
    nama: m.nama,
    kategori: m.kategori,
    merk: m.merk || null,
    jumlah: m.jumlah,
    satuan: m.satuan,
    kondisi: m.kondisi,
    lokasi: m.lokasi,
    tahunPerolehan: m.tahunPerolehan,
    penanggungJawabId: m.penanggungJawabId || null,
    bolehDipinjam: m.bolehDipinjam,
    keterangan: m.keterangan || null,
  };

  const bentrok = await prisma.asset.findUnique({ where: { kodeAset: m.kodeAset } });
  if (bentrok && bentrok.id !== idAset) {
    return { galat: `Kode aset ${m.kodeAset} sudah dipakai oleh ${bentrok.nama}.` };
  }

  if (idAset) {
    const lama = await prisma.asset.findUnique({ where: { id: idAset } });
    if (!lama) return { galat: "Aset tidak ditemukan." };

    const baru = await prisma.asset.update({
      where: { id: idAset },
      data: { kodeAset: m.kodeAset, ...isi },
    });
    await catatAudit({
      userId: pengguna.id,
      aksi: "UBAH_ASET",
      entitas: "Asset",
      entitasId: baru.id,
      dataLama: lama,
      dataBaru: baru,
    });
    revalidatePath("/inventaris");
    return { berhasil: `${baru.nama} tersimpan.` };
  }

  const baru = await prisma.asset.create({ data: { kodeAset: m.kodeAset, ...isi } });
  await catatAudit({
    userId: pengguna.id,
    aksi: "TAMBAH_ASET",
    entitas: "Asset",
    entitasId: baru.id,
    dataBaru: baru,
  });
  revalidatePath("/inventaris");
  return { berhasil: `${baru.nama} ditambahkan dengan kode ${baru.kodeAset}.` };
}

/**
 * Menghapus aset.
 *
 * Hanya untuk baris yang salah masuk. Aset yang pernah dipinjam tidak dihapus —
 * riwayat peminjamannya adalah bukti siapa memegang apa, dan menghapus asetnya
 * akan memutus rujukan itu. Untuk alat yang sudah tidak ada, pakai kondisi
 * HILANG atau RUSAK.
 */
export async function hapusAset(idAset: string): Promise<void> {
  const { pengguna } = await wajibIzin("inventaris", "hapus");

  const aset = await prisma.asset.findUnique({
    where: { id: idAset },
    include: { _count: { select: { loans: true } } },
  });
  if (!aset) {
    revalidatePath("/inventaris");
    return;
  }
  if (aset._count.loans > 0) {
    // Ditolak diam-diam di sini; halaman menampilkan alasannya lewat penanda
    // pada asetnya sendiri, bukan lewat pesan yang hilang saat halaman dimuat.
    revalidatePath("/inventaris");
    return;
  }

  await prisma.asset.delete({ where: { id: idAset } });
  await catatAudit({
    userId: pengguna.id,
    aksi: "HAPUS_ASET",
    entitas: "Asset",
    entitasId: idAset,
    dataLama: { ...aset, _count: undefined },
  });
  revalidatePath("/inventaris");
}
