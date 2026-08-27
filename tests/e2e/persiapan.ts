// -----------------------------------------------------------------------------
// Persiapan sebelum uji peramban dijalankan.
//
// Dua hal disiapkan di sini supaya rangkaian uji berdiri sendiri:
//
//   1. Kata sandi akun uji. Sebelumnya uji bergantung pada seseorang yang
//      kebetulan sudah menjalankan `npm run sandi:uji` dengan kata sandi yang
//      sama persis — begitu kata sandi itu diganti, seluruh uji gagal dengan
//      pesan yang tidak menyebut sebabnya sama sekali.
//   2. Catatan absensi hari ini untuk anggota uji. Aturan "satu sesi per orang
//      per hari" membuat jalan kedua berperilaku berbeda dari jalan pertama;
//      tanpa pembersihan, uji hanya benar sekali lalu menyesatkan selamanya.
// -----------------------------------------------------------------------------

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

export const SANDI_UJI = process.env.SANDI_UJI ?? "UjiCobaLab2026";

export const AKUN_UJI = {
  kepalaLab: "anang.habibi@unisma.ac.id",
  koordOperasional: "22301053005@student.unisma.ac.id",
  anggota: "22501053005@student.unisma.ac.id",
} as const;

const NAMA_ANGGOTA_UJI = process.env.ANGGOTA_UJI_MANUAL ?? "M. Farrel Fatahillah";

export default async function persiapan() {
  const prisma = new PrismaClient();
  try {
    const hash = await bcrypt.hash(SANDI_UJI, 10);
    const { count: akunDisiapkan } = await prisma.user.updateMany({
      where: { email: { in: Object.values(AKUN_UJI) } },
      data: { passwordHash: hash },
    });
    if (akunDisiapkan !== Object.values(AKUN_UJI).length) {
      throw new Error(
        `Hanya ${akunDisiapkan} dari ${Object.values(AKUN_UJI).length} akun uji ditemukan. ` +
          "Jalankan `npx prisma db seed` lebih dulu.",
      );
    }

    const anggota = await prisma.user.findFirst({
      where: { nama: NAMA_ANGGOTA_UJI },
      select: { id: true },
    });
    if (!anggota) {
      throw new Error(
        `Anggota uji "${NAMA_ANGGOTA_UJI}" tidak ada di basis data. Jalankan seeder lebih dulu.`,
      );
    }

    const hariIni = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
    const { count } = await prisma.attendance.deleteMany({
      where: { userId: anggota.id, tanggal: { gte: new Date(hariIni.getTime() - 86_400_000) } },
    });
    await prisma.qrNonce.deleteMany({ where: { userId: anggota.id } });

    console.log(
      `[persiapan] ${akunDisiapkan} akun uji siap` +
        (count > 0 ? `, ${count} catatan absensi uji dibersihkan` : ""),
    );
  } finally {
    await prisma.$disconnect();
  }
}
