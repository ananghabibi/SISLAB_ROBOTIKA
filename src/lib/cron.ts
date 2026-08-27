// -----------------------------------------------------------------------------
// Penjagaan endpoint penjadwal.
//
// Pemanggilnya kontainer penjadwal, bukan pengguna, jadi tidak ada sesi yang
// bisa diperiksa. Yang tersisa adalah satu rahasia bersama — dan perbandingannya
// harus memakan waktu yang sama untuk tebakan mana pun, supaya lamanya jawaban
// tidak membocorkan seberapa dekat tebakan itu.
// -----------------------------------------------------------------------------

import { timingSafeEqual } from "node:crypto";

export function rahasiaCronCocok(diberikan: string | null): boolean {
  const seharusnya = process.env.CRON_SECRET;
  if (!seharusnya || !diberikan) return false;
  const a = Buffer.from(diberikan);
  const b = Buffer.from(seharusnya);
  return a.length === b.length && timingSafeEqual(new Uint8Array(a), new Uint8Array(b));
}
