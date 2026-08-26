import { describe, expect, it } from "vitest";

import {
  PANJANG_URAIAN_MINIMAL,
  validasiCatatanPulang,
} from "@/lib/catatan-pulang";

const URAIAN_SAH = "Kalibrasi ulang sensor IMU dan menyimpan datanya ke logbook squad.";

describe("catatan wajib saat absen pulang", () => {
  it("menerima uraian yang jelas beserta kendalanya", () => {
    expect(
      validasiCatatanPulang({ uraian: URAIAN_SAH, kendala: "Baterai drone rusak." }),
    ).toBeNull();
  });

  it("menerima pernyataan tegas bahwa tidak ada kendala", () => {
    expect(validasiCatatanPulang({ uraian: URAIAN_SAH, tanpaKendala: true })).toBeNull();
  });

  it("menolak absen pulang tanpa uraian sama sekali", () => {
    expect(validasiCatatanPulang({ tanpaKendala: true })).toContain("apa yang Anda kerjakan");
    expect(validasiCatatanPulang({ uraian: "   ", tanpaKendala: true })).not.toBeNull();
  });

  it("menolak uraian yang terlalu singkat", () => {
    expect(validasiCatatanPulang({ uraian: "riset", tanpaKendala: true })).toContain(
      "terlalu singkat",
    );
    expect(
      validasiCatatanPulang({ uraian: "a".repeat(PANJANG_URAIAN_MINIMAL - 1), tanpaKendala: true }),
    ).not.toBeNull();
  });

  it("menolak isian asal yang hanya panjang tanpa isi", () => {
    // Panjangnya lolos, tetapi bukan kalimat yang bisa dibaca orang lain.
    expect(validasiCatatanPulang({ uraian: "----------------", tanpaKendala: true })).not.toBeNull();
    expect(validasiCatatanPulang({ uraian: "aaaaaaaaaaaaaaaaaa", tanpaKendala: true })).not.toBeNull();
  });

  it("menuntut kendala dijawab bila tidak dinyatakan nihil", () => {
    expect(validasiCatatanPulang({ uraian: URAIAN_SAH })).toContain("Tidak ada kendala");
    expect(validasiCatatanPulang({ uraian: URAIAN_SAH, kendala: "  " })).not.toBeNull();
    expect(validasiCatatanPulang({ uraian: URAIAN_SAH, kendala: "aman" })).not.toBeNull();
  });

  it("mengabaikan isi kendala bila sudah dinyatakan nihil", () => {
    expect(
      validasiCatatanPulang({ uraian: URAIAN_SAH, kendala: "", tanpaKendala: true }),
    ).toBeNull();
  });
});
