import { describe, expect, it } from "vitest";

import { uraiBarisCsv, uraiCsv } from "@/lib/csv";

describe("pembaca CSV", () => {
  it("menjaga koma di dalam tanda kutip", () => {
    // Ini alasan utama pembaca ini ada: nama bergelar mengandung koma.
    expect(uraiBarisCsv('"Anang Habibi, S.ST., M.T.",,dosen@unisma.ac.id')).toEqual([
      "Anang Habibi, S.ST., M.T.",
      "",
      "dosen@unisma.ac.id",
    ]);
  });

  it("membaca kutip ganda sebagai satu kutip literal", () => {
    expect(uraiBarisCsv('"kata ""dikutip""",b')).toEqual(['kata "dikutip"', "b"]);
  });

  it("melewati baris kosong dan baris komentar", () => {
    const isi = ['# catatan', '', 'a,b', '1,2', '# lagi', '3,4'].join("\n");
    expect(uraiCsv(isi)).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("mengisi kolom yang hilang dengan teks kosong", () => {
    expect(uraiCsv("a,b,c\n1,2")).toEqual([{ a: "1", b: "2", c: "" }]);
  });

  it("mengembalikan larik kosong untuk berkas tanpa isi", () => {
    expect(uraiCsv("")).toEqual([]);
    expect(uraiCsv("# hanya komentar")).toEqual([]);
  });
});
