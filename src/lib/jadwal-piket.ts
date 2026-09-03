// -----------------------------------------------------------------------------
// Jadwal piket mingguan (tabel `jadwal_piket`).
//
// Siapa piket pada hari apa. Berbeda dari checklist piket harian (`piket`):
// yang ini adalah rosternya, disusun Kepala Laboratorium atau Koordinator
// Pengembangan, dan berlaku Senin sampai Sabtu.
// -----------------------------------------------------------------------------

import { HARI_PIKET } from "./piket";
import { prisma } from "./prisma";

export interface BarisRoster {
  nomor: number;
  nama: string;
  squadId: string | null;
  namaSquad: string | null;
  kodeSquad: string | null;
}

/**
 * Roster lengkap Senin–Sabtu, satu baris per hari, terisi maupun kosong.
 *
 * Hari yang belum ada di basis data tetap muncul dengan squad null, supaya
 * penyunting selalu menampilkan keenam harinya dan tidak ada hari yang hilang
 * hanya karena belum pernah ditetapkan.
 */
export async function rosterPiket(): Promise<BarisRoster[]> {
  const baris = await prisma.jadwalPiket.findMany({
    include: { squad: { select: { id: true, nama: true, kode: true } } },
  });
  const perHari = new Map(baris.map((b) => [b.hari, b]));
  return HARI_PIKET.map(({ nomor, nama }) => {
    const b = perHari.get(nomor);
    return {
      nomor,
      nama,
      squadId: b?.squad?.id ?? null,
      namaSquad: b?.squad?.nama ?? null,
      kodeSquad: b?.squad?.kode ?? null,
    };
  });
}
