"use server";

// -----------------------------------------------------------------------------
// Buku tamu.
//
// Tamu, dosen lain, dan mahasiswa non-anggota masuk lewat sini, bukan lewat
// absensi (SPEC 6.4). Pemisahan itu bukan soal kerapian data: catatan absensi
// adalah dasar Surat Keterangan Kontribusi, dan satu baris tamu yang menyelinap
// ke sana merusak angka yang nanti dipakai menerbitkan surat resmi.
//
// Setiap tamu wajib punya PENDAMPING dari anggota laboratorium. Tamu yang
// masuk tanpa ada yang bertanggung jawab menemaninya adalah persoalan
// keselamatan, bukan persoalan pencatatan.
// -----------------------------------------------------------------------------

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { catatAudit } from "@/lib/audit";
import { wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { tanggalKalenderWib } from "@/lib/waktu";

export interface KeadaanTamu {
  galat?: string;
  berhasil?: string;
}

const skemaMasuk = z.object({
  nama: z.string().trim().min(3, "Nama tamu wajib diisi, minimal 3 karakter."),
  instansi: z.string().trim().min(2, "Asal instansi wajib diisi."),
  keperluan: z.string().trim().min(5, "Tuliskan keperluannya, minimal 5 karakter."),
  pendampingId: z.string().trim().min(1, "Pilih anggota yang mendampingi."),
});

const skemaKeluar = z.object({ tamuId: z.string().trim().min(1) });

export async function catatTamuMasuk(
  _keadaan: KeadaanTamu,
  data: FormData,
): Promise<KeadaanTamu> {
  const { pengguna } = await wajibIzin("insiden", "tulis");

  const terurai = skemaMasuk.safeParse({
    nama: data.get("nama") ?? "",
    instansi: data.get("instansi") ?? "",
    keperluan: data.get("keperluan") ?? "",
    pendampingId: data.get("pendampingId") ?? "",
  });
  if (!terurai.success) return { galat: terurai.error.issues[0]!.message };
  const m = terurai.data;

  const pendamping = await prisma.user.findUnique({
    where: { id: m.pendampingId },
    select: { id: true, nama: true, status: true },
  });
  if (!pendamping) return { galat: "Anggota pendamping tidak ditemukan." };
  if (pendamping.status !== "AKTIF") {
    return { galat: `${pendamping.nama} tidak berstatus aktif, tidak dapat menjadi pendamping.` };
  }

  const tamu = await prisma.guest.create({
    data: {
      tanggal: tanggalKalenderWib(),
      nama: m.nama,
      instansi: m.instansi,
      keperluan: m.keperluan,
      pendampingId: pendamping.id,
      jamMasuk: new Date(),
    },
  });

  await catatAudit({
    userId: pengguna.id,
    aksi: "TAMU_MASUK",
    entitas: "Guest",
    entitasId: tamu.id,
    dataBaru: tamu,
  });

  revalidatePath("/tamu");
  return { berhasil: `${m.nama} tercatat masuk, didampingi ${pendamping.nama}.` };
}

/**
 * Mencatat jam pulang tamu.
 *
 * Jam pulang tidak pernah dikarang. Tamu yang terlanjur pulang tanpa dicatat
 * tetap berakhir dengan `jamKeluar` kosong — sama seperti aturan absensi
 * anggota (SPEC 6.4), dan karena alasan yang sama: catatan yang diisi
 * belakangan berdasarkan ingatan bukan catatan.
 */
export async function catatTamuKeluar(
  _keadaan: KeadaanTamu,
  data: FormData,
): Promise<KeadaanTamu> {
  const { pengguna } = await wajibIzin("insiden", "tulis");

  const terurai = skemaKeluar.safeParse({ tamuId: data.get("tamuId") ?? "" });
  if (!terurai.success) return { galat: "Tamu tidak dikenali." };

  const lama = await prisma.guest.findUnique({ where: { id: terurai.data.tamuId } });
  if (!lama) return { galat: "Catatan tamu tidak ditemukan." };
  if (lama.jamKeluar) return { galat: `${lama.nama} sudah tercatat pulang.` };

  const baru = await prisma.guest.update({
    where: { id: lama.id },
    data: { jamKeluar: new Date() },
  });

  await catatAudit({
    userId: pengguna.id,
    aksi: "TAMU_KELUAR",
    entitas: "Guest",
    entitasId: baru.id,
    dataLama: lama,
    dataBaru: baru,
  });

  revalidatePath("/tamu");
  return { berhasil: `${lama.nama} tercatat pulang.` };
}
