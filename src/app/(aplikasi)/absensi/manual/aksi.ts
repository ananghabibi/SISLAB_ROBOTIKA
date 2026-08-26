"use server";

// -----------------------------------------------------------------------------
// Jalur darurat: pencatatan absensi manual.
//
// SPEC bagian 3 memberi satu peringatan tegas tentang jalur ini: "Jangan
// membuat jalur darurat ini mudah — kalau nyaman dipakai, ia akan menjadi jalur
// utama dalam dua minggu." Karena itu di sini ada alasan tertulis yang panjang
// minimalnya dipaksa, pernyataan yang harus dicentang, dan pembatasan hanya
// untuk hari berjalan. Semuanya gesekan yang disengaja.
//
// Yang TIDAK diperiksa di sini adalah lapis jaringan. Salah satu keadaan
// daruratnya justru konfigurasi subnet yang keliru; kalau jalur ini ikut
// tersandera lapis itu, tidak akan ada yang bisa mencatat apa pun saat
// dibutuhkan. Penggantinya adalah pembatasan peran yang ketat, alasan tertulis,
// jejak audit, dan penanda yang selalu terlihat di rekap.
// -----------------------------------------------------------------------------

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { absenMasuk } from "@/lib/absensi";
import { catatAudit, ipPemohon } from "@/lib/audit";
import { wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { tanggalKalenderWib } from "@/lib/waktu";

export interface KeadaanManual {
  galat?: string;
  berhasil?: string;
}

const PANJANG_ALASAN_MINIMAL = 25;

const skema = z.object({
  userId: z.string().min(1, "Pilih anggota yang akan dicatat."),
  jenisKegiatan: z.enum([
    "RISET",
    "PIKET",
    "RAPAT",
    "PELATIHAN",
    "PENGABDIAN",
    "ADMINISTRASI",
    "LAINNYA",
  ]),
  jamMasuk: z.string().regex(/^\d{2}:\d{2}$/, "Jam masuk wajib diisi, bentuknya JJ:MM."),
  jamKeluar: z
    .string()
    .regex(/^(\d{2}:\d{2})?$/, "Jam pulang bentuknya JJ:MM.")
    .optional(),
  alasan: z
    .string()
    .trim()
    .min(
      PANJANG_ALASAN_MINIMAL,
      `Alasan wajib ditulis lengkap, minimal ${PANJANG_ALASAN_MINIMAL} karakter. Sebutkan apa yang rusak dan mengapa absensi biasa tidak bisa dipakai.`,
    )
    .max(1000),
  pernyataan: z.literal("ya", {
    message: "Centang pernyataan bahwa ini benar-benar keadaan darurat.",
  }),
});

/** Mengubah "JJ:MM" WIB pada hari berjalan menjadi instan UTC. */
function jamWibKeUtc(jam: string): Date {
  const [j, m] = jam.split(":").map(Number) as [number, number];
  // tanggalKalenderWib() adalah tengah malam WIB yang disimpan sebagai tengah
  // malam UTC. WIB = UTC+7, jadi jam WIB dikurangi 7 untuk kembali ke UTC.
  const tengahMalamWibDalamUtc = tanggalKalenderWib().getTime() - 7 * 3_600_000;
  return new Date(tengahMalamWibDalamUtc + (j * 60 + m) * 60_000);
}

export async function catatAbsensiManual(
  _keadaan: KeadaanManual,
  data: FormData,
): Promise<KeadaanManual> {
  const { pengguna } = await wajibIzin("absensi_manual", "tulis");

  const terurai = skema.safeParse({
    userId: String(data.get("userId") ?? ""),
    jenisKegiatan: String(data.get("jenisKegiatan") ?? "RISET"),
    jamMasuk: String(data.get("jamMasuk") ?? ""),
    jamKeluar: String(data.get("jamKeluar") ?? ""),
    alasan: String(data.get("alasan") ?? ""),
    pernyataan: String(data.get("pernyataan") ?? ""),
  });
  if (!terurai.success) return { galat: terurai.error.issues[0]!.message };
  const masukan = terurai.data;

  const anggota = await prisma.user.findUnique({
    where: { id: masukan.userId },
    select: { id: true, nama: true, status: true },
  });
  if (!anggota) return { galat: "Anggota tidak ditemukan." };
  if (anggota.status !== "AKTIF" && anggota.status !== "CUTI") {
    return { galat: `Status ${anggota.nama} adalah ${anggota.status}, tidak dapat dicatat hadir.` };
  }

  const jamMasuk = jamWibKeUtc(masukan.jamMasuk);
  const jamKeluar = masukan.jamKeluar ? jamWibKeUtc(masukan.jamKeluar) : null;
  if (jamKeluar && jamKeluar < jamMasuk) {
    return { galat: "Jam pulang tidak boleh mendahului jam masuk." };
  }

  const ip = (await ipPemohon()) ?? "tidak-diketahui";

  const hasil = await absenMasuk({
    userId: anggota.id,
    ip,
    jenisKegiatan: masukan.jenisKegiatan,
    manual: true,
    alasanManual: `${masukan.alasan} — dicatat oleh ${pengguna.nama}`,
  });
  if (!hasil.ok) return { galat: hasil.pesan };

  // Jam yang disebutkan Koordinator dipakai apa adanya, bukan jam saat formulir
  // dikirim. Yang dicatat adalah keterangan orang yang menyaksikan, dan
  // keterangan itu melekat pada namanya di audit log.
  const catatan = await prisma.attendance.update({
    where: { id: hasil.catatan.id },
    data: { jamMasuk, jamKeluar, ipKeluar: jamKeluar ? ip : null },
  });

  await catatAudit({
    userId: pengguna.id,
    aksi: "ABSENSI_MANUAL",
    entitas: "Attendance",
    entitasId: catatan.id,
    ip,
    dataBaru: {
      anggota: anggota.nama,
      tanggal: catatan.tanggal,
      jamMasuk: catatan.jamMasuk,
      jamKeluar: catatan.jamKeluar,
      alasan: masukan.alasan,
    },
  });

  revalidatePath("/absensi/manual");
  return {
    berhasil: `Absensi manual ${anggota.nama} tercatat dan masuk audit log atas nama Anda.`,
  };
}
