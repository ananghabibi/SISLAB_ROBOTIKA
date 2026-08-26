// -----------------------------------------------------------------------------
// Pembaca CSV sederhana.
//
// Ditulis sendiri, bukan menarik pustaka: berkas yang dibaca adalah berkas
// kecil yang dirawat manusia, dan satu pustaka lagi berarti satu hal lagi yang
// harus dimengerti pengurus tahun depan. Mendukung tanda kutip ganda (untuk
// nama bergelar seperti "Anang Habibi, S.ST., M.T.") dan baris komentar '#'.
// -----------------------------------------------------------------------------

export function uraiBarisCsv(baris: string): string[] {
  const kolom: string[] = [];
  let sekarang = "";
  let dalamKutip = false;

  for (let i = 0; i < baris.length; i++) {
    const huruf = baris[i];

    if (dalamKutip) {
      if (huruf === '"') {
        // Dua kutip berturut-turut berarti satu kutip literal.
        if (baris[i + 1] === '"') {
          sekarang += '"';
          i++;
        } else {
          dalamKutip = false;
        }
      } else {
        sekarang += huruf;
      }
      continue;
    }

    if (huruf === '"') dalamKutip = true;
    else if (huruf === ",") {
      kolom.push(sekarang.trim());
      sekarang = "";
    } else sekarang += huruf;
  }

  kolom.push(sekarang.trim());
  return kolom;
}

/** Membaca CSV berkepala menjadi larik objek. Baris kosong dan '#' dilewati. */
export function uraiCsv(isi: string): Record<string, string>[] {
  const baris = isi
    .split(/\r?\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0 && !b.startsWith("#"));

  if (baris.length === 0) return [];

  const kepala = uraiBarisCsv(baris[0]!);
  return baris.slice(1).map((b) => {
    const nilai = uraiBarisCsv(b);
    const objek: Record<string, string> = {};
    kepala.forEach((nama, i) => {
      objek[nama] = nilai[i] ?? "";
    });
    return objek;
  });
}
