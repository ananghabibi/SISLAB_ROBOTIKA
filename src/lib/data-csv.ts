// -----------------------------------------------------------------------------
// Pembaca berkas data yang dirawat manusia.
//
// Checklist piket dan jadwal piket tinggal di `data/*.csv`, bukan di dalam
// kode: keduanya berubah karena keputusan pengurus, bukan karena perubahan
// perangkat lunak, dan pengurus tahun depan harus bisa mengubahnya tanpa
// menyentuh TypeScript. Berkasnya kecil dan jarang berubah, jadi isinya
// disimpan di ingatan setelah pembacaan pertama.
//
// Hanya untuk peladen — memakai `node:fs`.
// -----------------------------------------------------------------------------

import { readFileSync } from "node:fs";
import path from "node:path";

import { uraiCsv } from "./csv";

const ingatan = new Map<string, Record<string, string>[]>();

export function bacaDataCsv(namaBerkas: string): Record<string, string>[] {
  const tersimpan = ingatan.get(namaBerkas);
  if (tersimpan) return tersimpan;

  const isi = readFileSync(path.join(process.cwd(), "data", namaBerkas), "utf8");
  const baris = uraiCsv(isi);
  ingatan.set(namaBerkas, baris);
  return baris;
}
