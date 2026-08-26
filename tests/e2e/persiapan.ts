// -----------------------------------------------------------------------------
// Persiapan sebelum uji peramban dijalankan.
//
// Uji absensi menulis ke basis data, dan aturan "satu sesi per orang per hari"
// membuat jalannya yang kedua berperilaku berbeda dari yang pertama. Tanpa
// pembersihan ini, uji hanya benar sekali lalu menyesatkan selamanya.
// -----------------------------------------------------------------------------

import { PrismaClient } from "@prisma/client";

const NAMA_ANGGOTA_UJI = process.env.ANGGOTA_UJI_MANUAL ?? "M. Farrel Fatahillah";

export default async function persiapan() {
  const prisma = new PrismaClient();
  try {
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

    if (count > 0) {
      console.log(`[persiapan] ${count} catatan absensi uji dibersihkan.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}
