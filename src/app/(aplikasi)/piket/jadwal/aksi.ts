"use server";

import { revalidatePath } from "next/cache";

import { catatAudit } from "@/lib/audit";
import { wajibIzin } from "@/lib/penjaga";
import { HARI_PIKET } from "@/lib/piket";
import { prisma } from "@/lib/prisma";

export interface KeadaanJadwal {
  galat?: string;
  berhasil?: string;
}

/**
 * Menyimpan roster piket Senin–Sabtu.
 *
 * Nilai tiap hari dibaca dari medan `hari-<nomor>`; kosong berarti hari itu
 * belum ditetapkan siapa piketnya, dan disimpan sebagai squad null — bukan
 * galat. Squad yang tidak dikenal ditolak, supaya id yang dikarang dari luar
 * tidak menyusup.
 */
export async function simpanJadwalPiket(
  _keadaan: KeadaanJadwal,
  data: FormData,
): Promise<KeadaanJadwal> {
  const { pengguna } = await wajibIzin("jadwal_piket", "tulis");

  const squadSah = new Set((await prisma.squad.findMany({ select: { id: true } })).map((s) => s.id));

  const perubahan: { hari: number; squadId: string | null }[] = [];
  for (const { nomor } of HARI_PIKET) {
    const nilai = String(data.get(`hari-${nomor}`) ?? "").trim();
    if (nilai && !squadSah.has(nilai)) {
      return { galat: "Ada squad yang tidak dikenal pada jadwal. Muat ulang halaman lalu coba lagi." };
    }
    perubahan.push({ hari: nomor, squadId: nilai || null });
  }

  const sebelum = await prisma.jadwalPiket.findMany();
  await prisma.$transaction(
    perubahan.map((p) =>
      prisma.jadwalPiket.upsert({
        where: { hari: p.hari },
        update: { squadId: p.squadId },
        create: { hari: p.hari, squadId: p.squadId },
      }),
    ),
  );

  await catatAudit({
    userId: pengguna.id,
    aksi: "UBAH_JADWAL_PIKET",
    entitas: "JadwalPiket",
    dataLama: { jadwal: sebelum.map((b) => ({ hari: b.hari, squadId: b.squadId })) },
    dataBaru: { jadwal: perubahan },
  });

  revalidatePath("/piket");
  revalidatePath("/piket/jadwal");
  revalidatePath("/dasbor");
  return { berhasil: "Jadwal piket tersimpan." };
}
