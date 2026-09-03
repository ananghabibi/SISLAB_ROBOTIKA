"use server";

// -----------------------------------------------------------------------------
// Penerbitan Surat Keterangan Kontribusi.
//
// Hanya KEPALA_LAB, dan itu diperiksa dua kali: lewat matriks hak akses, dan
// lewat `bolehMenerbitkanSkk` yang berdiri sendiri. Pemeriksaan kedua ada
// karena aturan ini tidak boleh ikut longgar bila suatu saat baris `skk` pada
// matriks disusun ulang — surat ini pernyataan pribadi seorang dosen kepada
// Program Studi, bukan keluaran sebuah aplikasi.
//
// Tidak ada aksi membatalkan atau menghapus surat. Surat yang sudah keluar
// mungkin sudah dicetak, ditandatangani, dan dikirim.
// -----------------------------------------------------------------------------

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { catatAudit } from "@/lib/audit";
import { periodeAktif } from "@/lib/kontribusi";
import { wajibIzin } from "@/lib/penjaga";
import { bolehMenerbitkanSkk } from "@/lib/rbac";
import { terbitkanSkk } from "@/lib/skk-terbit";

export interface KeadaanSkk {
  galat?: string;
  berhasil?: string;
}

const skema = z.object({
  userId: z.string().trim().min(1, "Pilih anggota yang akan diberi surat."),
  dokumentasi: z.enum(["TUNTAS", "BELUM", "TIDAK_BERLAKU"]),
  tetapTerbitkan: z.boolean(),
});

export async function terbitkan(_keadaan: KeadaanSkk, data: FormData): Promise<KeadaanSkk> {
  const { pengguna } = await wajibIzin("skk", "tulis");
  if (!bolehMenerbitkanSkk(pengguna.role)) {
    return { galat: "Hanya Kepala Laboratorium yang menerbitkan Surat Keterangan Kontribusi." };
  }

  const terurai = skema.safeParse({
    userId: data.get("userId") ?? "",
    dokumentasi: data.get("dokumentasi") ?? "TIDAK_BERLAKU",
    tetapTerbitkan: data.get("tetapTerbitkan") === "ya",
  });
  if (!terurai.success) return { galat: terurai.error.issues[0]!.message };
  const m = terurai.data;

  const periode = await periodeAktif();
  if (!periode) return { galat: "Belum ada periode aktif." };

  const hasil = await terbitkanSkk({
    periode,
    userId: m.userId,
    diterbitkanOlehId: pengguna.id,
    timLomba: m.dokumentasi !== "TIDAK_BERLAKU",
    dokumentasiTuntas: m.dokumentasi === "TIDAK_BERLAKU" ? null : m.dokumentasi === "TUNTAS",
    tetapTerbitkan: m.tetapTerbitkan,
  });
  if (!hasil.ok) return { galat: hasil.pesan };

  await catatAudit({
    userId: pengguna.id,
    aksi: "TERBIT_SKK",
    entitas: "Skk",
    entitasId: hasil.skk.id,
    dataBaru: { nomor: hasil.skk.nomor, userId: m.userId, periodId: periode.id },
  });

  revalidatePath("/skk");
  return { berhasil: `Surat nomor ${hasil.skk.nomor} terbit. PDF-nya dapat diunduh dari daftar.` };
}
