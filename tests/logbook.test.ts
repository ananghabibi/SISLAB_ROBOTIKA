import { describe, expect, it } from "vitest";

import {
  bacaAnggotaTerlibat,
  mingguKeDari,
  pekanAktif,
  pekanBerjalan,
  pekanDapatDiisi,
  rentangPekan,
} from "@/lib/logbook";
import { awalPekanWib } from "@/lib/waktu";

// Periode contoh dibuka hari RABU, bukan Senin. Justru itu yang diuji: nomor
// pekan harus tetap mengikuti Senin, karena begitulah orang membaca pekan.
const MULAI_RABU = new Date("2026-03-04T00:00:00.000Z");
const SELESAI = new Date("2026-06-30T00:00:00.000Z");

describe("awal pekan menurut WIB", () => {
  it("mengembalikan Senin pada pekan yang memuat tanggal itu", () => {
    expect(awalPekanWib(new Date("2026-03-04T10:00:00+07:00")).toISOString()).toBe(
      "2026-03-02T00:00:00.000Z",
    );
  });

  it("memasukkan Minggu ke pekan yang Seninnya enam hari sebelumnya", () => {
    // Minggu 8 Maret 2026 masih pekan yang dimulai Senin 2 Maret.
    expect(awalPekanWib(new Date("2026-03-08T20:00:00+07:00")).toISOString()).toBe(
      "2026-03-02T00:00:00.000Z",
    );
  });

  it("memakai tanggal WIB, bukan tanggal UTC", () => {
    // Senin 2 Maret pukul 06.00 WIB masih Minggu 1 Maret menurut UTC. Tanpa
    // penyesuaian, pekannya mundur satu.
    expect(awalPekanWib(new Date("2026-03-02T06:00:00+07:00")).toISOString()).toBe(
      "2026-03-02T00:00:00.000Z",
    );
  });
});

describe("penomoran pekan logbook", () => {
  it("menomori pekan pembukaan periode sebagai pekan 1", () => {
    expect(mingguKeDari(MULAI_RABU, MULAI_RABU)).toBe(1);
  });

  it("tetap pekan 1 sampai Minggu, lalu berganti pada Senin berikutnya", () => {
    expect(mingguKeDari(new Date("2026-03-08T23:00:00+07:00"), MULAI_RABU)).toBe(1);
    expect(mingguKeDari(new Date("2026-03-09T00:30:00+07:00"), MULAI_RABU)).toBe(2);
  });

  it("menomori hari SEBELUM periode dibuka dengan angka di bawah 1", () => {
    // Pemanggilnya wajib menolak ini; logbook untuk pekan yang belum ada tidak
    // boleh tersimpan hanya karena tanggalnya salah ketik.
    expect(mingguKeDari(new Date("2026-03-01T10:00:00+07:00"), MULAI_RABU)).toBe(0);
    expect(mingguKeDari(new Date("2026-02-20T10:00:00+07:00"), MULAI_RABU)).toBeLessThan(1);
  });

  it("menomori pekan yang jauh di depan secara berurutan", () => {
    expect(mingguKeDari(new Date("2026-04-06T10:00:00+07:00"), MULAI_RABU)).toBe(6);
  });
});

describe("rentang pekan", () => {
  it("membentang Senin sampai Minggu", () => {
    const pekan = rentangPekan(1, MULAI_RABU);
    expect(pekan.mulai.toISOString()).toBe("2026-03-02T00:00:00.000Z");
    expect(pekan.selesai.toISOString()).toBe("2026-03-08T00:00:00.000Z");
  });

  it("bolak-balik dengan penomorannya sendiri", () => {
    for (const minggu of [1, 2, 7, 15]) {
      expect(mingguKeDari(rentangPekan(minggu, MULAI_RABU).mulai, MULAI_RABU)).toBe(minggu);
      expect(mingguKeDari(rentangPekan(minggu, MULAI_RABU).selesai, MULAI_RABU)).toBe(minggu);
    }
  });

  it("menyebut pekan yang sedang berjalan", () => {
    const pekan = pekanBerjalan(MULAI_RABU, new Date("2026-03-11T10:00:00+07:00"));
    expect(pekan.mingguKe).toBe(2);
    expect(pekan.mulai.toISOString()).toBe("2026-03-09T00:00:00.000Z");
  });
});

describe("banyaknya pekan aktif", () => {
  it("menghitung pekan yang sudah berjalan, bukan seluruh panjang periode", () => {
    // Penyebut "entri logbook ≥ 70 persen pekan aktif" (SPEC 6.2). Pekan yang
    // belum tiba tidak boleh ikut menghukum squad.
    expect(pekanAktif(MULAI_RABU, SELESAI, new Date("2026-03-11T10:00:00+07:00"))).toBe(2);
  });

  it("berhenti pada panjang periode walau tanggalnya sudah lewat", () => {
    expect(pekanAktif(MULAI_RABU, SELESAI, new Date("2026-09-01T10:00:00+07:00"))).toBe(
      mingguKeDari(SELESAI, MULAI_RABU),
    );
  });

  it("tidak pernah negatif sebelum periodenya dibuka", () => {
    expect(pekanAktif(MULAI_RABU, SELESAI, new Date("2026-01-01T10:00:00+07:00"))).toBe(0);
  });
});

describe("pembacaan anggota yang terlibat", () => {
  it("membaca daftar nama beserta idnya", () => {
    expect(bacaAnggotaTerlibat([{ id: "a1", nama: "Rafi" }])).toEqual([{ id: "a1", nama: "Rafi" }]);
  });

  it("mengabaikan bentuk yang tidak dikenali alih-alih memecahkan halaman", () => {
    // Logbook lama tidak boleh membuat halamannya gagal dibuka.
    expect(bacaAnggotaTerlibat(null)).toEqual([]);
    expect(bacaAnggotaTerlibat("bukan larik")).toEqual([]);
    expect(bacaAnggotaTerlibat([1, "a", null, {}, { id: "a1" }, { nama: "Rafi" }])).toEqual([]);
  });

  it("menyaring butir kosong tetapi mempertahankan yang sah di sekitarnya", () => {
    expect(
      bacaAnggotaTerlibat([{ id: "", nama: "Kosong" }, { id: "a2", nama: "Sinta" }]),
    ).toEqual([{ id: "a2", nama: "Sinta" }]);
  });
});

describe("pekan yang boleh diisi", () => {
  const MULAI = new Date("2026-09-01T00:00:00.000Z");
  const SELESAI = new Date("2027-01-31T00:00:00.000Z");

  it("menolak pekan sebelum periode dibuka", () => {
    // Keadaan nyata saat sistem dicoba pada 28 Agustus: pekan berjalan
    // bernomor 0, dan halamannya sempat menawarkan "Isi logbook pekan 0".
    const nol = mingguKeDari(new Date("2026-08-28T10:00:00+07:00"), MULAI);
    expect(nol).toBe(0);
    const hasil = pekanDapatDiisi(nol, MULAI, SELESAI, new Date("2026-08-28T10:00:00+07:00"));
    expect(hasil.boleh).toBe(false);
    expect(hasil.boleh === false && hasil.alasan).toContain("sebelum periode dimulai");
  });

  it("menerima pekan yang sedang berjalan", () => {
    expect(pekanDapatDiisi(1, MULAI, SELESAI, new Date("2026-09-02T10:00:00+07:00")).boleh).toBe(
      true,
    );
  });

  it("menolak pekan yang belum tiba", () => {
    const hasil = pekanDapatDiisi(5, MULAI, SELESAI, new Date("2026-09-02T10:00:00+07:00"));
    expect(hasil.boleh === false && hasil.alasan).toContain("belum tiba");
  });

  it("menolak pekan setelah periode berakhir", () => {
    // Nomor pekan terus bertambah selamanya sesudah tanggal selesai lewat.
    const jauh = mingguKeDari(new Date("2027-06-01T10:00:00+07:00"), MULAI);
    const hasil = pekanDapatDiisi(jauh, MULAI, SELESAI, new Date("2027-06-01T10:00:00+07:00"));
    expect(hasil.boleh).toBe(false);
    expect(hasil.boleh === false && hasil.alasan).toContain("hanya berjalan sampai pekan");
  });

  it("menerima pekan terakhir periode tepat pada batasnya", () => {
    const terakhir = mingguKeDari(SELESAI, MULAI);
    expect(pekanDapatDiisi(terakhir, MULAI, SELESAI, SELESAI).boleh).toBe(true);
  });
});
