"use server";

// -----------------------------------------------------------------------------
// Logbook riset mingguan per squad.
//
// Satu entri per squad per pekan, dijaga kekangan unik di basis data — bukan
// sekadar pemeriksaan di aplikasi, karena dua orang satu squad yang menekan
// simpan pada detik yang sama adalah kejadian biasa, bukan kejadian langka.
//
// Pekan yang belum tiba tidak dapat diisi. Logbook yang boleh diisi ke depan
// akan diisi sekaligus sebulan di muka pada malam sebelum penilaian, dan
// catatan riset mingguan kehilangan seluruh gunanya.
// -----------------------------------------------------------------------------

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { catatAudit } from "@/lib/audit";
import { simpanGambar } from "@/lib/berkas";
import { periodeAktif } from "@/lib/kontribusi";
import { pekanDapatDiisi, rentangPekan } from "@/lib/logbook";
import { wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { KELOMPOK_LOGBOOK } from "@/lib/unggahan";

export interface KeadaanLogbook {
  galat?: string;
  berhasil?: string;
}

const skema = z.object({
  squadId: z.string().trim().min(1, "Pilih squad."),
  mingguKe: z.coerce.number().int().min(1, "Nomor pekan tidak sah."),
  target: z.string().trim().min(10, "Tuliskan target pekan ini, minimal 10 karakter."),
  dikerjakan: z.string().trim().min(20, "Tuliskan apa yang dikerjakan, minimal 20 karakter."),
  hasil: z.string().trim().min(10, "Tuliskan hasilnya, minimal 10 karakter."),
  kendala: z.string().trim().max(1000).optional(),
  rencanaBerikutnya: z
    .string()
    .trim()
    .min(10, "Tuliskan rencana pekan berikutnya, minimal 10 karakter."),
});

export async function simpanLogbook(
  _keadaan: KeadaanLogbook,
  data: FormData,
): Promise<KeadaanLogbook> {
  const { pengguna, izin } = await wajibIzin("logbook", "tulis");

  const terurai = skema.safeParse({
    squadId: data.get("squadId") ?? "",
    mingguKe: data.get("mingguKe") ?? "0",
    target: data.get("target") ?? "",
    dikerjakan: data.get("dikerjakan") ?? "",
    hasil: data.get("hasil") ?? "",
    kendala: data.get("kendala") ?? "",
    rencanaBerikutnya: data.get("rencanaBerikutnya") ?? "",
  });
  if (!terurai.success) return { galat: terurai.error.issues[0]!.message };
  const m = terurai.data;

  // Lingkup SENDIRI berarti squadnya sendiri. Diperiksa di peladen, karena
  // pilihan squad pada formulir dapat diganti siapa pun yang mau repot.
  if (izin.tulis !== "SEMUA" && m.squadId !== pengguna.squadId) {
    return { galat: "Anda hanya dapat mengisi logbook squad sendiri." };
  }

  const periode = await periodeAktif();
  if (!periode) {
    return { galat: "Belum ada periode aktif. Kepala Laboratorium perlu membukanya lebih dulu." };
  }

  const boleh = pekanDapatDiisi(m.mingguKe, periode.tanggalMulai, periode.tanggalSelesai);
  if (!boleh.boleh) return { galat: boleh.alasan };

  const anggotaTerpilih = data.getAll("anggota").map(String).filter(Boolean);
  if (anggotaTerpilih.length === 0) {
    return { galat: "Pilih sedikitnya satu anggota yang ikut bekerja pekan ini." };
  }

  const anggota = await prisma.user.findMany({
    where: { id: { in: anggotaTerpilih }, squadId: m.squadId },
    select: { id: true, nama: true },
    orderBy: { nama: "asc" },
  });
  if (anggota.length !== anggotaTerpilih.length) {
    return { galat: "Ada anggota terpilih yang bukan anggota squad itu." };
  }

  let buktiUrl: string | null = null;
  const bukti = data.get("bukti");
  if (bukti instanceof File && bukti.size > 0) {
    const unggahan = await simpanGambar(bukti, KELOMPOK_LOGBOOK);
    if (!unggahan.ok) return { galat: unggahan.pesan };
    buktiUrl = unggahan.jalur;
  }

  const pekan = rentangPekan(m.mingguKe, periode.tanggalMulai);

  try {
    const logbook = await prisma.logbook.create({
      data: {
        squadId: m.squadId,
        periodId: periode.id,
        mingguKe: m.mingguKe,
        // Tanggal yang disimpan adalah Senin pekan itu, bukan hari pengisian:
        // logbook menerangkan pekannya, bukan menerangkan kapan diketik.
        tanggal: pekan.mulai,
        dibuatOlehId: pengguna.id,
        anggotaTerlibat: anggota as unknown as Prisma.InputJsonValue,
        target: m.target,
        dikerjakan: m.dikerjakan,
        hasil: m.hasil,
        kendala: m.kendala || null,
        rencanaBerikutnya: m.rencanaBerikutnya,
        buktiUrl,
      },
    });

    await catatAudit({
      userId: pengguna.id,
      aksi: "ISI_LOGBOOK",
      entitas: "Logbook",
      entitasId: logbook.id,
      dataBaru: logbook,
    });
  } catch (galat) {
    if (galat instanceof Prisma.PrismaClientKnownRequestError && galat.code === "P2002") {
      return {
        galat: `Logbook pekan ${m.mingguKe} untuk squad ini sudah pernah diisi. Satu squad satu entri tiap pekan.`,
      };
    }
    throw galat;
  }

  revalidatePath("/logbook");
  revalidatePath("/dasbor");
  return { berhasil: `Logbook pekan ${m.mingguKe} tersimpan.` };
}
