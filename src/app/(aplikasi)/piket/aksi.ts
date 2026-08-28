"use server";

// -----------------------------------------------------------------------------
// Pencatatan piket harian.
//
// Dua hal yang sengaja TIDAK diminta dari petugas:
//
// 1. Angka alat yang belum kembali. Ia dihitung dari daftar peminjaman yang
//    masih terbuka pada saat piket dicatat. Angka yang diketik tangan pada
//    akhir hari yang melelahkan selalu menjadi nol, dan nol yang salah lebih
//    buruk daripada tidak ada angka sama sekali — ia dipakai menghitung skor
//    kontribusi.
// 2. Centang delapan dari delapan. Checklist boleh disimpan apa adanya. Yang
//    dicatat sistem adalah keadaan ruangan, bukan nilai rapor petugas piket.
// -----------------------------------------------------------------------------

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { catatAudit } from "@/lib/audit";
import { simpanGambar } from "@/lib/berkas";
import { wajibIzin } from "@/lib/penjaga";
import { butirPiket, type JawabanChecklist } from "@/lib/piket";
import { prisma } from "@/lib/prisma";
import { KELOMPOK_PIKET } from "@/lib/unggahan";
import { tanggalKalenderWib } from "@/lib/waktu";

export interface KeadaanPiket {
  galat?: string;
  berhasil?: string;
}

const skema = z.object({ squadId: z.string().trim().min(1, "Pilih squad yang piket.") });

export async function simpanPiket(_keadaan: KeadaanPiket, data: FormData): Promise<KeadaanPiket> {
  const { pengguna, izin } = await wajibIzin("piket", "tulis");

  const terurai = skema.safeParse({ squadId: data.get("squadId") ?? "" });
  if (!terurai.success) return { galat: terurai.error.issues[0]!.message };
  const squadId = terurai.data.squadId;

  // Lingkup SENDIRI berarti squadnya sendiri, diperiksa di peladen.
  if (izin.tulis !== "SEMUA" && squadId !== pengguna.squadId) {
    return { galat: "Anda hanya dapat mencatat piket squad sendiri." };
  }

  const squad = await prisma.squad.findUnique({
    where: { id: squadId },
    select: { id: true, nama: true },
  });
  if (!squad) return { galat: "Squad tidak ditemukan." };

  const tanggal = tanggalKalenderWib();
  const sudahAda = await prisma.piketLog.findFirst({
    where: { tanggal, squadId },
    select: { id: true },
  });
  if (sudahAda) {
    return { galat: `Piket ${squad.nama} hari ini sudah dicatat. Satu catatan piket per squad per hari.` };
  }

  // Centang dibaca dari kode butir yang benar-benar ada di berkas CSV. Kode
  // asing yang diselipkan ke formulir tidak akan pernah masuk ke basis data.
  const dicentang = new Set(data.getAll("butir").map(String));
  const checklist: JawabanChecklist = {};
  for (const butir of butirPiket()) checklist[butir.kode] = dicentang.has(butir.kode);

  const fotoSebelum = data.get("fotoSebelum");
  const fotoSesudah = data.get("fotoSesudah");
  if (!(fotoSebelum instanceof File) || fotoSebelum.size === 0) {
    return { galat: "Foto ruangan sebelum piket wajib diunggah." };
  }
  if (!(fotoSesudah instanceof File) || fotoSesudah.size === 0) {
    return { galat: "Foto ruangan sesudah piket wajib diunggah." };
  }

  const unggahSebelum = await simpanGambar(fotoSebelum, KELOMPOK_PIKET);
  if (!unggahSebelum.ok) return { galat: `Foto sebelum: ${unggahSebelum.pesan}` };
  const unggahSesudah = await simpanGambar(fotoSesudah, KELOMPOK_PIKET);
  if (!unggahSesudah.ok) return { galat: `Foto sesudah: ${unggahSesudah.pesan}` };

  const alatBelumKembali = await prisma.loan.count({ where: { status: "DIPINJAM" } });

  const catatan = await prisma.piketLog.create({
    data: {
      tanggal,
      squadId,
      pengisiId: pengguna.id,
      checklist: checklist as unknown as Prisma.InputJsonValue,
      alatBelumKembali,
      fotoSebelumUrl: unggahSebelum.jalur,
      fotoSesudahUrl: unggahSesudah.jalur,
    },
  });

  await catatAudit({
    userId: pengguna.id,
    aksi: "CATAT_PIKET",
    entitas: "PiketLog",
    entitasId: catatan.id,
    dataBaru: catatan,
  });

  revalidatePath("/piket");
  revalidatePath("/dasbor");

  const belum = butirPiket().filter((b) => !checklist[b.kode]);
  return {
    berhasil:
      `Piket ${squad.nama} tercatat.` +
      (belum.length > 0
        ? ` ${belum.length} butir belum dikerjakan dan tercatat apa adanya.`
        : " Seluruh butir tercentang.") +
      (alatBelumKembali > 0 ? ` ${alatBelumKembali} alat masih tercatat dipinjam.` : ""),
  };
}
