"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { catatAudit } from "@/lib/audit";
import { periksaLajuGantiSandi } from "@/lib/pembatas-laju";
import { wajibMasuk } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { alasanSandiDitolak } from "@/lib/sandi";

export interface KeadaanSandi {
  galat?: string;
  berhasil?: string;
}

const skema = z
  .object({
    sandiLama: z.string().min(1, "Kata sandi lama wajib diisi."),
    sandiBaru: z.string().min(1, "Kata sandi baru wajib diisi."),
    ulangi: z.string(),
  })
  .refine((d) => d.sandiBaru === d.ulangi, {
    message: "Ulangan kata sandi tidak sama.",
    path: ["ulangi"],
  });

export async function ubahKataSandi(
  _keadaan: KeadaanSandi,
  data: FormData,
): Promise<KeadaanSandi> {
  const pengguna = await wajibMasuk();

  const terurai = skema.safeParse({
    sandiLama: String(data.get("sandiLama") ?? ""),
    sandiBaru: String(data.get("sandiBaru") ?? ""),
    ulangi: String(data.get("ulangi") ?? ""),
  });
  if (!terurai.success) {
    return { galat: terurai.error.issues[0]!.message };
  }

  // Aturan isi kata sandi tinggal di satu modul, dipakai bersama skrip
  // `npm run sandi`. Termasuk larangan memilih kembali kata sandi bawaan:
  // mengganti sandi bawaan dengan sandi bawaan tidak mengubah apa pun.
  const ditolakIsi = alasanSandiDitolak(terurai.data.sandiBaru);
  if (ditolakIsi) return { galat: ditolakIsi };

  // Formulir ini menuntut kata sandi LAMA. Tanpa pembatas, ia menjadi tempat
  // menebak kata sandi seseorang yang lupa keluar dari sesinya di komputer
  // bersama laboratorium — tanpa menyentuh halaman masuk sama sekali.
  const ditolak = periksaLajuGantiSandi(pengguna.id);
  if (ditolak) return { galat: ditolak };

  const akun = await prisma.user.findUnique({
    where: { id: pengguna.id },
    select: { passwordHash: true },
  });
  if (!akun?.passwordHash) {
    return { galat: "Akun ini masuk lewat Google kampus dan tidak memiliki kata sandi." };
  }

  const cocok = await bcrypt.compare(terurai.data.sandiLama, akun.passwordHash);
  if (!cocok) return { galat: "Kata sandi lama salah." };

  await prisma.user.update({
    where: { id: pengguna.id },
    // Benderanya turun di sini, dan hanya di sini: sejak saat ini akun tidak
    // lagi memakai kata sandi bawaan, sehingga seluruh modul terbuka kembali.
    data: {
      passwordHash: await bcrypt.hash(terurai.data.sandiBaru, 12),
      wajibGantiSandi: false,
    },
  });

  // Isi kata sandi tidak pernah masuk audit log — hanya faktanya yang dicatat.
  await catatAudit({
    userId: pengguna.id,
    aksi: "UBAH_KATA_SANDI",
    entitas: "User",
    entitasId: pengguna.id,
  });

  revalidatePath("/profil");
  return { berhasil: "Kata sandi berhasil diganti." };
}
