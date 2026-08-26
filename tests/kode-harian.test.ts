import { describe, expect, it } from "vitest";

import { ABJAD_KODE, buatKodeAcak, PANJANG_KODE } from "@/lib/kode-harian";

describe("kode harian", () => {
  it("panjangnya 6 karakter", () => {
    expect(PANJANG_KODE).toBe(6);
    expect(buatKodeAcak()).toHaveLength(6);
  });

  it("tidak memuat huruf dan angka yang mudah tertukar", () => {
    // Kode ini dibaca dari layar oleh orang yang berdiri di pintu, bukan disalin.
    for (const membingungkan of ["0", "O", "1", "I", "l", "L", "5", "S"]) {
      expect(ABJAD_KODE, membingungkan).not.toContain(membingungkan);
    }
  });

  it("hanya memakai huruf besar dan angka dari abjad yang ditetapkan", () => {
    for (let i = 0; i < 200; i++) {
      for (const huruf of buatKodeAcak()) {
        expect(ABJAD_KODE).toContain(huruf);
      }
    }
  });

  it("tidak menghasilkan kode yang sama berulang-ulang", () => {
    const kumpulan = new Set(Array.from({ length: 200 }, () => buatKodeAcak()));
    // Ruang kode 28^6 ≈ 481 juta; 200 pengambilan yang seluruhnya unik itu wajar.
    expect(kumpulan.size).toBeGreaterThan(195);
  });
});
