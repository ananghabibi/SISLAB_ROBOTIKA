// -----------------------------------------------------------------------------
// Audit log.
//
// Setiap perubahan yang bisa dipertanyakan saat audit Program Studi harus
// meninggalkan jejak. Pencatatan sengaja tidak pernah melempar galat: kegagalan
// menulis jejak tidak boleh membatalkan tindakan yang sudah tersimpan, tetapi
// harus terlihat di log peladen.
// -----------------------------------------------------------------------------

import { headers } from "next/headers";

import { prisma } from "./prisma";

export interface MasukanAudit {
  userId: string | null;
  aksi: string;
  entitas: string;
  entitasId?: string | null;
  dataLama?: unknown;
  dataBaru?: unknown;
  ip?: string | null;
}

/** Mengambil IP asli pemohon di belakang Caddy / Cloudflare Tunnel. */
export async function ipPemohon(): Promise<string | null> {
  const h = await headers();
  const teruskan = h.get("x-forwarded-for");
  if (teruskan) return teruskan.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? null;
}

export async function catatAudit(masukan: MasukanAudit): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: masukan.userId,
        aksi: masukan.aksi,
        entitas: masukan.entitas,
        entitasId: masukan.entitasId ?? null,
        dataLama: (masukan.dataLama ?? undefined) as never,
        dataBaru: (masukan.dataBaru ?? undefined) as never,
        ip: masukan.ip ?? (await ipPemohon()),
      },
    });
  } catch (galat) {
    console.error("[audit] gagal menulis jejak:", galat);
  }
}
