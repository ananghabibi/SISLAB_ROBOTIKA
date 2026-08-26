import { describe, expect, it } from "vitest";

import { barisCsv, berkasCsv, namaBerkas, selCsv } from "@/lib/ekspor";

describe("penulisan sel CSV", () => {
  it("membiarkan teks biasa apa adanya", () => {
    expect(selCsv("Zaenal Abidin")).toBe("Zaenal Abidin");
    expect(selCsv(42)).toBe("42");
    expect(selCsv(null)).toBe("");
  });

  it("mengutip sel yang memuat koma, kutip, atau baris baru", () => {
    expect(selCsv("Anang Habibi, S.ST., M.T.")).toBe('"Anang Habibi, S.ST., M.T."');
    expect(selCsv('kata "dikutip"')).toBe('"kata ""dikutip"""');
    expect(selCsv("baris\nkedua")).toBe('"baris\nkedua"');
  });

  it("melumpuhkan sel yang akan dibaca Excel sebagai rumus", () => {
    // Tanpa ini, sebuah sel dapat menjalankan perintah di komputer pemeriksa.
    expect(selCsv("=1+1")).toBe("\"'=1+1\"");
    expect(selCsv("+62812")).toBe("\"'+62812\"");
    expect(selCsv("-nama")).toBe("\"'-nama\"");
    expect(selCsv("@rumus")).toBe("\"'@rumus\"");
  });
});

describe("penyusunan berkas CSV", () => {
  it("mengawali berkas dengan BOM dan memakai CRLF", () => {
    const berkas = berkasCsv(["a", "b"], [[1, 2]]);
    expect(berkas.startsWith("﻿")).toBe(true);
    expect(berkas).toBe("﻿a,b\r\n1,2\r\n");
  });

  it("menggabungkan kolom dengan koma", () => {
    expect(barisCsv(["x", 1, null])).toBe("x,1,");
  });
});

describe("penamaan berkas", () => {
  it("membuang karakter yang tidak aman untuk nama berkas", () => {
    const nama = namaBerkas("rekap kontribusi/Semester Ganjil", "csv");
    expect(nama).toMatch(/^rekap-kontribusi-Semester-Ganjil-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(nama).not.toContain("/");
    expect(nama).not.toContain('"');
  });
});
