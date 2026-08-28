import { describe, expect, it } from "vitest";

import { keadaanPeriode, penjelasanPeriode } from "@/lib/periode";

// Periode yang benar-benar dipakai seeder: Semester Ganjil TA 2026/2027.
const PERIODE = {
  tanggalMulai: new Date("2026-09-01T00:00:00.000Z"),
  tanggalSelesai: new Date("2027-01-31T00:00:00.000Z"),
};

describe("keadaan periode terhadap hari ini", () => {
  it("menyatakan BELUM_MULAI pada hari sebelum periode dibuka", () => {
    // Keadaan yang membuat absensi berhasil tetapi rekapnya tetap nol.
    expect(keadaanPeriode(PERIODE, new Date("2026-08-28T10:00:00+07:00"))).toBe("BELUM_MULAI");
  });

  it("menyatakan BERJALAN pada hari pertama dan hari terakhir", () => {
    // Kedua ujungnya termasuk ke dalam periode.
    expect(keadaanPeriode(PERIODE, new Date("2026-09-01T00:30:00+07:00"))).toBe("BERJALAN");
    expect(keadaanPeriode(PERIODE, new Date("2027-01-31T23:00:00+07:00"))).toBe("BERJALAN");
  });

  it("menyatakan SUDAH_SELESAI sehari sesudah tanggal selesai", () => {
    expect(keadaanPeriode(PERIODE, new Date("2027-02-01T08:00:00+07:00"))).toBe("SUDAH_SELESAI");
  });

  it("memakai tanggal WIB, bukan tanggal UTC", () => {
    // 1 September pukul 06.00 WIB masih 31 Agustus menurut UTC. Tanpa
    // penyesuaian, hari pertama periode dinyatakan belum mulai sampai siang.
    expect(keadaanPeriode(PERIODE, new Date("2026-09-01T06:00:00+07:00"))).toBe("BERJALAN");
  });
});

describe("penjelasan untuk pengguna", () => {
  it("tidak berkata apa-apa saat periodenya memang berjalan", () => {
    // Peringatan yang selalu muncul akan berhenti dibaca.
    expect(penjelasanPeriode("BERJALAN", 0)).toBeNull();
    expect(penjelasanPeriode("BERJALAN", 5)).toBeNull();
  });

  it("menyebut sebabnya, bukan sekadar menyatakan angkanya nol", () => {
    const pesan = penjelasanPeriode("BELUM_MULAI", 3) ?? "";
    expect(pesan).toContain("BELUM DIMULAI");
    expect(pesan).toContain("3 catatan absensi");
  });

  it("menerangkan periode yang sudah berakhir", () => {
    expect(penjelasanPeriode("SUDAH_SELESAI", 0)).toContain("SUDAH BERAKHIR");
  });

  it("tidak menyebut jumlah bila memang tidak ada catatan di luar rentang", () => {
    expect(penjelasanPeriode("BELUM_MULAI", 0)).not.toContain("catatan absensi di luar");
  });
});
