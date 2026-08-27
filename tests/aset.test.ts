// -----------------------------------------------------------------------------
// Muatan QR label aset dan daftar kondisi.
//
// Yang dijaga di sini satu hal: QR absensi tidak boleh pernah terbaca sebagai
// kode aset. Keduanya dipindai kamera yang sama, dan bila batasnya kabur,
// petugas akan mencatat peminjaman aset bernama token.
// -----------------------------------------------------------------------------

import { describe, expect, it } from "vitest";

import { AWALAN_LABEL, bacaKodeAset, bungkusKodeAset, KONDISI_ASET, kondisiAsetSah } from "@/lib/aset";
import { terbitkanToken } from "@/lib/token-qr";

describe("muatan QR label aset", () => {
  it("membungkus kode dengan awalan dan huruf besar", () => {
    expect(bungkusKodeAset("inv-014")).toBe(`${AWALAN_LABEL}INV-014`);
  });

  it("membaca kembali muatan yang dibungkusnya sendiri", () => {
    expect(bacaKodeAset(bungkusKodeAset("INV-014"))).toBe("INV-014");
  });

  it("menerima kode yang diketik tangan tanpa awalan", () => {
    expect(bacaKodeAset("  inv-014 ")).toBe("INV-014");
  });

  it("menolak token absensi", () => {
    process.env.QR_TOKEN_SECRET ??= "rahasia-uji-yang-panjang-sekali-1234567890";
    const token = terbitkanToken("sesi-uji");
    expect(bacaKodeAset(token)).toBeNull();
  });

  it("menolak teks kosong, terlalu pendek, dan yang mengandung spasi", () => {
    expect(bacaKodeAset("")).toBeNull();
    expect(bacaKodeAset("A")).toBeNull();
    expect(bacaKodeAset("INV 014")).toBeNull();
    expect(bacaKodeAset("https://contoh/inv-014")).toBeNull();
  });

  it("menolak kode yang melampaui batas panjang", () => {
    expect(bacaKodeAset("A".repeat(32))).toBe("A".repeat(32));
    expect(bacaKodeAset("A".repeat(33))).toBeNull();
  });
});

describe("kondisi aset", () => {
  it("mengenali kondisi yang sah dan menolak yang bukan", () => {
    for (const k of KONDISI_ASET) expect(kondisiAsetSah(k)).toBe(true);
    expect(kondisiAsetSah("RUSAK_BERAT")).toBe(false);
    expect(kondisiAsetSah("")).toBe(false);
  });
});
