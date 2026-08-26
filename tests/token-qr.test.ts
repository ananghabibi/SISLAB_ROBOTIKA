import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { periksaToken, terbitkanToken } from "@/lib/token-qr";

const lingkunganAsli = { ...process.env };

beforeEach(() => {
  process.env.QR_TOKEN_SECRET = "rahasia-uji-yang-panjang-sekali-1234567890";
  process.env.QR_ROTATE_SECONDS = "60";
  process.env.QR_MAX_AGE_SECONDS = "90";
});

afterEach(() => {
  process.env = { ...lingkunganAsli };
});

const SESI = "sesi-harian-abc";

describe("penerbitan dan pemeriksaan token QR", () => {
  it("menerima token yang baru diterbitkan", () => {
    const hasil = periksaToken(terbitkanToken(SESI));
    expect(hasil.sah).toBe(true);
    if (hasil.sah) expect(hasil.isi.sesi).toBe(SESI);
  });

  it("memberi nonce berbeda pada setiap penerbitan", () => {
    const a = periksaToken(terbitkanToken(SESI));
    const b = periksaToken(terbitkanToken(SESI));
    expect(a.sah && b.sah).toBe(true);
    if (a.sah && b.sah) expect(a.isi.nonce).not.toBe(b.isi.nonce);
  });
});

describe("kriteria diterima: token lebih tua dari 90 detik ditolak", () => {
  it("menerima token berumur 89 detik", () => {
    const diterbitkan = new Date("2026-09-01T03:00:00.000Z");
    const token = terbitkanToken(SESI, diterbitkan);
    expect(periksaToken(token, new Date(diterbitkan.getTime() + 89_000)).sah).toBe(true);
  });

  it("menolak token berumur 91 detik", () => {
    const diterbitkan = new Date("2026-09-01T03:00:00.000Z");
    const token = terbitkanToken(SESI, diterbitkan);
    const hasil = periksaToken(token, new Date(diterbitkan.getTime() + 91_000));
    expect(hasil.sah).toBe(false);
    if (!hasil.sah) expect(hasil.alasan).toContain("kedaluwarsa");
  });

  it("menghormati QR_MAX_AGE_SECONDS yang diubah", () => {
    process.env.QR_MAX_AGE_SECONDS = "30";
    const diterbitkan = new Date("2026-09-01T03:00:00.000Z");
    const token = terbitkanToken(SESI, diterbitkan);
    expect(periksaToken(token, new Date(diterbitkan.getTime() + 45_000)).sah).toBe(false);
  });

  it("menolak token bertanggal masa depan yang tidak masuk akal", () => {
    const diterbitkan = new Date("2026-09-01T03:10:00.000Z");
    const token = terbitkanToken(SESI, diterbitkan);
    expect(periksaToken(token, new Date("2026-09-01T03:00:00.000Z")).sah).toBe(false);
  });
});

describe("penolakan token palsu", () => {
  it("menolak token yang muatannya diubah", () => {
    const token = terbitkanToken(SESI);
    const [, tanda] = token.split(".") as [string, string];
    const muatanPalsu = Buffer.from(
      JSON.stringify({ ts: Math.floor(Date.now() / 1000), sesi: "sesi-lain", nonce: "x" }),
    ).toString("base64url");
    expect(periksaToken(`${muatanPalsu}.${tanda}`).sah).toBe(false);
  });

  it("menolak token yang tanda tangannya diubah", () => {
    const [muatan] = terbitkanToken(SESI).split(".") as [string, string];
    expect(periksaToken(`${muatan}.tandaTanganPalsu`).sah).toBe(false);
  });

  it("menolak token yang ditandatangani kunci lain", () => {
    const token = terbitkanToken(SESI);
    process.env.QR_TOKEN_SECRET = "kunci-yang-sama-sekali-berbeda-0987654321";
    expect(periksaToken(token).sah).toBe(false);
  });

  it("menolak bentuk yang bukan token", () => {
    for (const buruk of ["", "tanpatitik", "a.b.c", "..", "{}"]) {
      expect(periksaToken(buruk).sah, buruk).toBe(false);
    }
  });

  it("menolak menandatangani saat QR_TOKEN_SECRET kosong", () => {
    delete process.env.QR_TOKEN_SECRET;
    // Token yang bisa ditebak siapa saja lebih buruk daripada tidak punya lapis ini.
    expect(() => terbitkanToken(SESI)).toThrow(/QR_TOKEN_SECRET/);
  });
});
