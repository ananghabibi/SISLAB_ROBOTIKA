import { beforeEach, describe, expect, it } from "vitest";

import {
  BATAS_MASUK_AKUN,
  BATAS_MASUK_IP,
  kosongkanPembatas,
  periksaLaju,
  periksaLajuMasuk,
} from "@/lib/pembatas-laju";

beforeEach(() => kosongkanPembatas());

describe("pembatas laju absensi", () => {
  it("mengizinkan sampai batas lalu menolak", () => {
    for (let i = 0; i < 5; i++) {
      expect(periksaLaju("uji", 5, 60).diizinkan, `percobaan ke-${i + 1}`).toBe(true);
    }
    const ditolak = periksaLaju("uji", 5, 60);
    expect(ditolak.diizinkan).toBe(false);
    expect(ditolak.cobaLagiDetik).toBeGreaterThan(0);
  });

  it("menghitung tiap kunci secara terpisah", () => {
    for (let i = 0; i < 5; i++) periksaLaju("orang-a", 5, 60);
    expect(periksaLaju("orang-a", 5, 60).diizinkan).toBe(false);
    expect(periksaLaju("orang-b", 5, 60).diizinkan).toBe(true);
  });

  it("melaporkan sisa jatah yang benar", () => {
    expect(periksaLaju("uji", 3, 60).sisa).toBe(2);
    expect(periksaLaju("uji", 3, 60).sisa).toBe(1);
    expect(periksaLaju("uji", 3, 60).sisa).toBe(0);
  });
});

describe("pembatasan percobaan masuk", () => {
  beforeEach(() => kosongkanPembatas());

  it("mengizinkan percobaan wajar lalu menahan yang berlebihan", () => {
    // Menebak kata sandi akun dosen berarti memperoleh hak menerbitkan surat
    // dan mengubah peran siapa pun. Pintu itu tidak boleh dapat digedor.
    for (let i = 0; i < BATAS_MASUK_AKUN; i++) {
      expect(periksaLajuMasuk("10.0.0.1", "dosen@unisma.ac.id")).toBeNull();
    }
    const ditolak = periksaLajuMasuk("10.0.0.1", "dosen@unisma.ac.id");
    expect(ditolak).toContain("Terlalu banyak percobaan masuk untuk akun ini");
  });

  it("membatasi per akun tanpa memandang alamat asalnya", () => {
    // Penebakan dari banyak tempat pada satu surel tetap tertahan.
    for (let i = 0; i < BATAS_MASUK_AKUN; i++) {
      expect(periksaLajuMasuk(`10.0.0.${i}`, "dosen@unisma.ac.id")).toBeNull();
    }
    expect(periksaLajuMasuk("10.0.0.99", "dosen@unisma.ac.id")).not.toBeNull();
  });

  it("membatasi per alamat walau surelnya berganti-ganti", () => {
    // Satu tempat yang mencoba banyak surel juga tertahan.
    for (let i = 0; i < BATAS_MASUK_IP; i++) {
      expect(periksaLajuMasuk("10.0.0.7", `orang${i}@unisma.ac.id`)).toBeNull();
    }
    expect(periksaLajuMasuk("10.0.0.7", "orang-lain@unisma.ac.id")).toContain(
      "dari perangkat ini",
    );
  });

  it("tidak membiarkan alamat yang tidak terbaca lolos begitu saja", () => {
    // Kalau null berarti tanpa batas, menghapus header alamat menjadi jalan
    // pintas bagi siapa pun yang tahu caranya.
    for (let i = 0; i < BATAS_MASUK_IP; i++) {
      expect(periksaLajuMasuk(null, `orang${i}@unisma.ac.id`)).toBeNull();
    }
    expect(periksaLajuMasuk(null, "orang-lain@unisma.ac.id")).not.toBeNull();
  });

  it("memperlakukan surel yang sama dengan huruf berbeda sebagai satu akun", () => {
    for (let i = 0; i < BATAS_MASUK_AKUN; i++) {
      expect(periksaLajuMasuk("10.0.0.1", "Dosen@Unisma.ac.id")).toBeNull();
    }
    expect(periksaLajuMasuk("10.0.0.1", "  dosen@unisma.ac.id  ")).not.toBeNull();
  });

  it("tidak membocorkan apakah surelnya terdaftar", () => {
    for (let i = 0; i < BATAS_MASUK_AKUN + 1; i++) {
      periksaLajuMasuk("10.0.0.1", "entah-siapa@unisma.ac.id");
    }
    const pesan = periksaLajuMasuk("10.0.0.1", "entah-siapa@unisma.ac.id") ?? "";
    expect(pesan).not.toContain("tidak terdaftar");
    expect(pesan).not.toContain("tidak ditemukan");
  });
});
