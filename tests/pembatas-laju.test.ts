import { beforeEach, describe, expect, it } from "vitest";

import { kosongkanPembatas, periksaLaju } from "@/lib/pembatas-laju";

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
