"use server";

// -----------------------------------------------------------------------------
// Pelaporan insiden dan tindak lanjutnya.
//
// Melapor dibuat semudah mungkin dan boleh dilakukan siapa saja. Yang dibatasi
// justru tindak lanjutnya: mengubah status laporan orang lain adalah keputusan
// pengelolaan, bukan hak pelapor.
//
// Tidak ada aksi hapus, dan itu disengaja. Laporan insiden yang bisa dihapus
// akan dihapus persis pada saat ia paling perlu dibaca.
// -----------------------------------------------------------------------------

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { catatAudit } from "@/lib/audit";
import { simpanGambar } from "@/lib/berkas";
import { JENIS_INSIDEN, STATUS_TINDAK_LANJUT } from "@/lib/insiden";
import { wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { KELOMPOK_INSIDEN } from "@/lib/unggahan";
import { tanggalKalenderWib } from "@/lib/waktu";

export interface KeadaanInsiden {
  galat?: string;
  berhasil?: string;
}

const skemaLapor = z.object({
  lokasi: z.string().trim().min(3, "Sebutkan lokasinya, minimal 3 karakter."),
  jenis: z.enum(JENIS_INSIDEN),
  kronologi: z
    .string()
    .trim()
    .min(20, "Tuliskan kronologinya, minimal 20 karakter — apa yang terjadi, berurutan."),
  tindakan: z
    .string()
    .trim()
    .min(10, "Tuliskan tindakan yang sudah diambil, minimal 10 karakter. Boleh 'belum ada'."),
  saran: z.string().trim().max(1000).optional(),
});

const skemaStatus = z.object({
  insidenId: z.string().trim().min(1),
  status: z.enum(STATUS_TINDAK_LANJUT),
});

export async function laporkanInsiden(
  _keadaan: KeadaanInsiden,
  data: FormData,
): Promise<KeadaanInsiden> {
  const { pengguna } = await wajibIzin("insiden", "tulis");

  const terurai = skemaLapor.safeParse({
    lokasi: data.get("lokasi") ?? "",
    jenis: data.get("jenis") ?? "NYARIS_CELAKA",
    kronologi: data.get("kronologi") ?? "",
    tindakan: data.get("tindakan") ?? "",
    saran: data.get("saran") ?? "",
  });
  if (!terurai.success) return { galat: terurai.error.issues[0]!.message };
  const m = terurai.data;

  // Foto tidak diwajibkan. Insiden yang perlu dilaporkan justru sering yang
  // sudah dibereskan lebih dulu — memaksa foto berarti memaksa orang
  // membiarkan keadaan berbahaya demi mengambil gambar.
  let fotoUrl: string | null = null;
  const foto = data.get("foto");
  if (foto instanceof File && foto.size > 0) {
    const unggahan = await simpanGambar(foto, KELOMPOK_INSIDEN);
    if (!unggahan.ok) return { galat: unggahan.pesan };
    fotoUrl = unggahan.jalur;
  }

  const insiden = await prisma.incident.create({
    data: {
      tanggal: tanggalKalenderWib(),
      pelaporId: pengguna.id,
      lokasi: m.lokasi,
      jenis: m.jenis,
      kronologi: m.kronologi,
      tindakan: m.tindakan,
      saran: m.saran || null,
      fotoUrl,
    },
  });

  await catatAudit({
    userId: pengguna.id,
    aksi: "LAPOR_INSIDEN",
    entitas: "Incident",
    entitasId: insiden.id,
    dataBaru: insiden,
  });

  revalidatePath("/insiden");
  revalidatePath("/dasbor");
  return {
    berhasil:
      "Laporan tercatat dan langsung tampil di dasbor Kepala Laboratorium. Terima kasih sudah melaporkan.",
  };
}

/** Mengubah status tindak lanjut. Hanya untuk yang berwenang atas semua laporan. */
export async function ubahStatusInsiden(
  _keadaan: KeadaanInsiden,
  data: FormData,
): Promise<KeadaanInsiden> {
  const { pengguna, izin } = await wajibIzin("insiden", "tulis");
  if (izin.tulis !== "SEMUA") {
    return { galat: "Hanya Kepala Laboratorium dan Koordinator Operasional yang menindaklanjuti laporan." };
  }

  const terurai = skemaStatus.safeParse({
    insidenId: data.get("insidenId") ?? "",
    status: data.get("status") ?? "BARU",
  });
  if (!terurai.success) return { galat: terurai.error.issues[0]!.message };
  const m = terurai.data;

  const lama = await prisma.incident.findUnique({ where: { id: m.insidenId } });
  if (!lama) return { galat: "Laporan tidak ditemukan." };
  if (lama.statusTindakLanjut === m.status) return { berhasil: "Status tidak berubah." };

  const baru = await prisma.incident.update({
    where: { id: m.insidenId },
    data: { statusTindakLanjut: m.status },
  });

  await catatAudit({
    userId: pengguna.id,
    aksi: "TINDAK_LANJUT_INSIDEN",
    entitas: "Incident",
    entitasId: baru.id,
    dataLama: lama,
    dataBaru: baru,
  });

  revalidatePath("/insiden");
  revalidatePath("/dasbor");
  return { berhasil: `Status laporan menjadi ${m.status}.` };
}
