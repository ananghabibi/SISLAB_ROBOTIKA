"use server";

// -----------------------------------------------------------------------------
// Pengaturan periode dan target skor — hak Kepala Laboratorium saja.
//
// Mengubah target berarti mengubah skor seluruh anggota sekaligus, jadi setiap
// perubahan dicatat di audit log lengkap dengan nilai lama dan barunya. Angka
// yang sudah tercetak pada Surat Keterangan Kontribusi tidak ikut berubah:
// surat menyimpan snapshot-nya sendiri (SPEC bagian 6.2).
// -----------------------------------------------------------------------------

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { catatAudit } from "@/lib/audit";
import { wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";

export interface KeadaanPeriode {
  galat?: string;
  berhasil?: string;
}

const skema = z
  .object({
    nama: z.string().trim().min(4, "Nama periode wajib diisi."),
    tanggalMulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal mulai belum diisi."),
    tanggalSelesai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal selesai belum diisi."),
    targetHadir: z.coerce.number().int().min(0).max(400),
    targetSesiBerbagi: z.coerce.number().int().min(0).max(100),
    targetPiket: z.coerce.number().int().min(0).max(200),
    targetLogbook: z.coerce.number().int().min(0).max(200),
    ambangLulus: z.coerce.number().int().min(0).max(100),
    aktif: z.boolean(),
  })
  .refine((d) => d.tanggalSelesai > d.tanggalMulai, {
    message: "Tanggal selesai harus setelah tanggal mulai.",
    path: ["tanggalSelesai"],
  });

function baca(data: FormData) {
  return skema.safeParse({
    nama: String(data.get("nama") ?? ""),
    tanggalMulai: String(data.get("tanggalMulai") ?? ""),
    tanggalSelesai: String(data.get("tanggalSelesai") ?? ""),
    targetHadir: String(data.get("targetHadir") ?? "0"),
    targetSesiBerbagi: String(data.get("targetSesiBerbagi") ?? "0"),
    targetPiket: String(data.get("targetPiket") ?? "0"),
    targetLogbook: String(data.get("targetLogbook") ?? "0"),
    ambangLulus: String(data.get("ambangLulus") ?? "70"),
    aktif: data.get("aktif") === "ya",
  });
}

/** Hanya satu periode yang boleh aktif pada satu waktu. */
async function nonaktifkanLainnya(kecualiId: string) {
  await prisma.period.updateMany({
    where: { aktif: true, id: { not: kecualiId } },
    data: { aktif: false },
  });
}

export async function simpanPeriode(
  idPeriode: string | null,
  _keadaan: KeadaanPeriode,
  data: FormData,
): Promise<KeadaanPeriode> {
  const { pengguna } = await wajibIzin("periode_target", "tulis");

  const terurai = baca(data);
  if (!terurai.success) return { galat: terurai.error.issues[0]!.message };
  const m = terurai.data;

  const isi = {
    nama: m.nama,
    tanggalMulai: new Date(`${m.tanggalMulai}T00:00:00.000Z`),
    tanggalSelesai: new Date(`${m.tanggalSelesai}T00:00:00.000Z`),
    targetHadir: m.targetHadir,
    targetSesiBerbagi: m.targetSesiBerbagi,
    targetPiket: m.targetPiket,
    targetLogbook: m.targetLogbook,
    ambangLulus: m.ambangLulus,
    aktif: m.aktif,
  };

  if (idPeriode) {
    const lama = await prisma.period.findUnique({ where: { id: idPeriode } });
    if (!lama) return { galat: "Periode tidak ditemukan." };

    const baru = await prisma.period.update({ where: { id: idPeriode }, data: isi });
    if (baru.aktif) await nonaktifkanLainnya(baru.id);

    await catatAudit({
      userId: pengguna.id,
      aksi: "UBAH_PERIODE",
      entitas: "Period",
      entitasId: baru.id,
      dataLama: lama,
      dataBaru: baru,
    });
    revalidatePath("/periode");
    return { berhasil: "Perubahan periode tersimpan. Skor seluruh anggota ikut menyesuaikan." };
  }

  const baru = await prisma.period.create({ data: isi });
  if (baru.aktif) await nonaktifkanLainnya(baru.id);

  await catatAudit({
    userId: pengguna.id,
    aksi: "TAMBAH_PERIODE",
    entitas: "Period",
    entitasId: baru.id,
    dataBaru: baru,
  });
  revalidatePath("/periode");
  return { berhasil: `Periode "${baru.nama}" dibuat.` };
}

/**
 * Menandai satu periode sebagai yang sedang berjalan.
 *
 * Dipanggil langsung dari `<form action>`, sehingga kembaliannya harus void.
 * Periode yang tidak ditemukan hanya mungkin terjadi bila baris itu dihapus di
 * sela pemuatan halaman; cukup dibiarkan, halaman akan dimuat ulang tanpa baris
 * tersebut.
 */
export async function aktifkanPeriode(idPeriode: string): Promise<void> {
  const { pengguna } = await wajibIzin("periode_target", "tulis");

  const periode = await prisma.period.findUnique({ where: { id: idPeriode } });
  if (!periode) {
    revalidatePath("/periode");
    return;
  }

  await prisma.period.update({ where: { id: idPeriode }, data: { aktif: true } });
  await nonaktifkanLainnya(idPeriode);

  await catatAudit({
    userId: pengguna.id,
    aksi: "AKTIFKAN_PERIODE",
    entitas: "Period",
    entitasId: idPeriode,
    dataBaru: { nama: periode.nama },
  });

  revalidatePath("/periode");
  revalidatePath("/absensi/rekap");
  revalidatePath("/dasbor");
}
