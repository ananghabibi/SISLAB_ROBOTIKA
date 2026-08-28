import { describe, expect, it } from "vitest";

import { uraiBarisAbsensi, uraiJam, uraiTanggal } from "@/lib/impor";

describe("penguraian tanggal berkas lama", () => {
  it("menerima bentuk ISO", () => {
    expect(uraiTanggal("2026-03-04")?.toISOString()).toBe("2026-03-04T00:00:00.000Z");
  });

  it("membaca bentuk bergaris miring sebagai HARI/BULAN/TAHUN", () => {
    // Menebak antara urutan Indonesia dan Amerika berarti 4 Maret dan 3 April
    // tertukar tanpa ada yang menyadarinya.
    expect(uraiTanggal("4/3/2026")?.toISOString()).toBe("2026-03-04T00:00:00.000Z");
    expect(uraiTanggal("04-03-2026")?.toISOString()).toBe("2026-03-04T00:00:00.000Z");
  });

  it("menolak tanggal yang tidak ada alih-alih menggesernya", () => {
    // Date bawaan JavaScript diam-diam mengubah 31 Februari menjadi 3 Maret.
    expect(uraiTanggal("31/02/2026")).toBeNull();
    expect(uraiTanggal("2026-02-31")).toBeNull();
    expect(uraiTanggal("bukan tanggal")).toBeNull();
    expect(uraiTanggal("")).toBeNull();
  });
});

describe("penguraian jam", () => {
  const tanggal = new Date("2026-03-04T00:00:00.000Z");

  it("menggabungkan jam WIB menjadi instan UTC", () => {
    // 07.30 WIB pada 4 Maret = 00.30 UTC pada hari yang sama.
    expect(uraiJam(tanggal, "07:30")?.toISOString()).toBe("2026-03-04T00:30:00.000Z");
    expect(uraiJam(tanggal, "07.30")?.toISOString()).toBe("2026-03-04T00:30:00.000Z");
  });

  it("menangani jam dini hari yang jatuh di tanggal UTC sebelumnya", () => {
    expect(uraiJam(tanggal, "06:00")?.toISOString()).toBe("2026-03-03T23:00:00.000Z");
  });

  it("menolak jam yang tidak masuk akal", () => {
    expect(uraiJam(tanggal, "25:00")).toBeNull();
    expect(uraiJam(tanggal, "07:75")).toBeNull();
    expect(uraiJam(tanggal, "pagi")).toBeNull();
  });
});

describe("penguraian satu baris absensi", () => {
  const sah = {
    npm: "22301053005",
    tanggal: "2026-03-04",
    jam_masuk: "08:00",
    jam_keluar: "12:30",
    jenis_kegiatan: "riset",
    uraian: "Kalibrasi sensor",
  };

  it("menerima baris yang lengkap", () => {
    const hasil = uraiBarisAbsensi(sah);
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;
    expect(hasil.baris.npm).toBe("22301053005");
    expect(hasil.baris.jenisKegiatan).toBe("RISET");
    expect(hasil.baris.uraian).toBe("Kalibrasi sensor");
  });

  it("menerima sesi tanpa jam keluar", () => {
    // Sesi yang tidak diakhiri tetap sah dan tetap dihitung hadir (SPEC 6.4).
    for (const kosong of ["", "   ", "-"]) {
      const hasil = uraiBarisAbsensi({ ...sah, jam_keluar: kosong });
      expect(hasil.ok).toBe(true);
      if (hasil.ok) expect(hasil.baris.jamKeluar).toBeNull();
    }
  });

  it("menolak NPM yang bukan 11 digit", () => {
    const hasil = uraiBarisAbsensi({ ...sah, npm: "2230105300" });
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.alasan).toContain("11 digit");
  });

  it("menolak jam keluar yang mendahului jam masuk", () => {
    // Dibalik diam-diam berarti durasi yang salah masuk ke rekap.
    const hasil = uraiBarisAbsensi({ ...sah, jam_keluar: "07:00" });
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.alasan).toContain("mendahului");
  });

  it("menolak jenis kegiatan yang tidak dikenal, dan menyebut pilihannya", () => {
    const hasil = uraiBarisAbsensi({ ...sah, jenis_kegiatan: "NGOPI" });
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.alasan).toContain("RISET");
  });

  it("mengisi jenis kegiatan bawaan bila kolomnya tidak ada", () => {
    const { jenis_kegiatan: _abaikan, ...tanpaJenis } = sah;
    const hasil = uraiBarisAbsensi(tanpaJenis);
    expect(hasil.ok && hasil.baris.jenisKegiatan).toBe("RISET");
  });

  it("mengosongkan uraian yang hanya berisi spasi", () => {
    const hasil = uraiBarisAbsensi({ ...sah, uraian: "   " });
    expect(hasil.ok && hasil.baris.uraian).toBeNull();
  });
});
