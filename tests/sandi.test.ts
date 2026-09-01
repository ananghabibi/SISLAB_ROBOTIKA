import { describe, expect, it } from "vitest";

import {
  alasanSandiDitolak,
  PANJANG_SANDI_MINIMAL,
  SANDI_BAWAAN_CADANGAN,
  sandiBawaan,
  sandiBawaanDiabaikan,
} from "@/lib/sandi";

/** Lingkungan tiruan, supaya pengujian tidak menyentuh process.env sungguhan. */
function env(nilai?: string): NodeJS.ProcessEnv {
  return (nilai === undefined ? {} : { SANDI_BAWAAN_ANGGOTA: nilai }) as NodeJS.ProcessEnv;
}

describe("kata sandi bawaan", () => {
  it("memakai cadangan bila SANDI_BAWAAN_ANGGOTA tidak disetel", () => {
    expect(sandiBawaan(env())).toBe(SANDI_BAWAAN_CADANGAN);
    expect(sandiBawaan(env(""))).toBe(SANDI_BAWAAN_CADANGAN);
    expect(sandiBawaan(env("   "))).toBe(SANDI_BAWAAN_CADANGAN);
  });

  it("memakai nilai dari lingkungan bila cukup panjang", () => {
    expect(sandiBawaan(env("RobotikaUnisma2026"))).toBe("RobotikaUnisma2026");
  });

  it("mengabaikan nilai yang lebih pendek daripada batas minimal", () => {
    // Diam-diam menerima yang pendek lebih berbahaya daripada menolaknya:
    // pengelola akan mengira kata sandi bawaannya sudah diganti.
    expect(sandiBawaan(env("pendek"))).toBe(SANDI_BAWAAN_CADANGAN);
    expect(sandiBawaanDiabaikan(env("pendek"))).toBe(true);
  });

  it("tidak melaporkan pengabaian saat lingkungan memang kosong", () => {
    expect(sandiBawaanDiabaikan(env())).toBe(false);
    expect(sandiBawaanDiabaikan(env("RobotikaUnisma2026"))).toBe(false);
  });

  it("cadangan bawaannya sendiri memenuhi batas minimal", () => {
    expect(SANDI_BAWAAN_CADANGAN.length).toBeGreaterThanOrEqual(PANJANG_SANDI_MINIMAL);
  });
});

describe("penolakan kata sandi baru", () => {
  it("menolak yang lebih pendek daripada batas minimal", () => {
    expect(alasanSandiDitolak("pendek", env())).toContain(String(PANJANG_SANDI_MINIMAL));
    expect(alasanSandiDitolak("a".repeat(PANJANG_SANDI_MINIMAL - 1), env())).not.toBeNull();
  });

  it("menerima yang tepat sepanjang batas minimal", () => {
    expect(alasanSandiDitolak("a".repeat(PANJANG_SANDI_MINIMAL), env())).toBeNull();
  });

  it("menolak pemilihan kembali kata sandi bawaan", () => {
    // Mengganti sandi bawaan dengan sandi bawaan tidak mengubah apa pun, dan
    // tanpa larangan ini benderanya tetap turun seolah sudah aman.
    expect(alasanSandiDitolak(SANDI_BAWAAN_CADANGAN, env())).not.toBeNull();
    expect(alasanSandiDitolak("RobotikaUnisma2026", env("RobotikaUnisma2026"))).not.toBeNull();
  });

  it("membolehkan kata sandi bawaan lingkungan lain", () => {
    // Yang dilarang hanyalah bawaan yang sedang berlaku di peladen ini.
    expect(alasanSandiDitolak(SANDI_BAWAAN_CADANGAN, env("RobotikaUnisma2026"))).toBeNull();
  });
});
