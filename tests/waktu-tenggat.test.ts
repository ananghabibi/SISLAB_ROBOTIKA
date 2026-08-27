// -----------------------------------------------------------------------------
// Tenggat pengembalian alat.
//
// Alat yang dijanjikan kembali "hari Jumat" tidak boleh terhitung terlambat
// sejak Jumat pagi. Uji ini mengunci batas itu pada akhir hari WIB.
// -----------------------------------------------------------------------------

import { describe, expect, it } from "vitest";

import { sudahLewatTenggat } from "@/lib/inventaris";
import { akhirHariWib } from "@/lib/waktu";

describe("akhirHariWib", () => {
  it("menghasilkan 16.59.59 UTC pada hari yang sama", () => {
    expect(akhirHariWib("2026-08-28")?.toISOString()).toBe("2026-08-28T16:59:59.999Z");
  });

  it("menolak masukan yang bukan tanggal", () => {
    expect(akhirHariWib("")).toBeNull();
    expect(akhirHariWib("28-08-2026")).toBeNull();
    expect(akhirHariWib("2026-08-28T10:00")).toBeNull();
  });

  it("belum lewat tenggat pada pagi hari terakhir WIB", () => {
    const tenggat = akhirHariWib("2026-08-28")!;
    // 28 Agustus 2026 pukul 07.00 WIB = 00.00 UTC.
    expect(sudahLewatTenggat(tenggat, new Date("2026-08-28T00:00:00Z"))).toBe(false);
    // 28 Agustus 2026 pukul 23.30 WIB = 16.30 UTC.
    expect(sudahLewatTenggat(tenggat, new Date("2026-08-28T16:30:00Z"))).toBe(false);
  });

  it("sudah lewat tenggat begitu berganti hari WIB", () => {
    const tenggat = akhirHariWib("2026-08-28")!;
    // 29 Agustus 2026 pukul 00.05 WIB = 28 Agustus 17.05 UTC.
    expect(sudahLewatTenggat(tenggat, new Date("2026-08-28T17:05:00Z"))).toBe(true);
  });
});
