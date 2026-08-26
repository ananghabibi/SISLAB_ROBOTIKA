import { describe, expect, it } from "vitest";

import {
  angkatanDariNpm,
  jenjangDariAngkatan,
  kodeProdiDariNpm,
  npmValid,
  prodiDariNpm,
  semesterBerjalan,
} from "@/lib/npm";

describe("penguraian NPM", () => {
  it("menolak NPM yang bukan 11 digit", () => {
    expect(npmValid("22301053005")).toBe(true);
    expect(npmValid("2230105300")).toBe(false);
    expect(npmValid("223010530051")).toBe(false);
    expect(npmValid("2230105300a")).toBe(false);
    expect(npmValid("")).toBe(false);
  });

  it("mengambil kode prodi dari digit ke-6 sampai ke-8", () => {
    expect(kodeProdiDariNpm("22301053005")).toBe("053");
    expect(kodeProdiDariNpm("22501054045")).toBe("054");
    expect(kodeProdiDariNpm("22301061012")).toBe("061");
    expect(kodeProdiDariNpm("22401043028")).toBe("043");
    expect(kodeProdiDariNpm("22201041053")).toBe("041");
  });

  it("memetakan kode prodi ke program studi dan fakultasnya", () => {
    expect(prodiDariNpm("22301053005")).toEqual({ prodi: "Teknik Elektro", fakultas: "Teknik" });
    expect(prodiDariNpm("22501054045")).toEqual({
      prodi: "Teknik Informatika",
      fakultas: "Teknik",
    });
    // Tiga anggota afiliasi lintas fakultas (SPEC 6.3).
    expect(prodiDariNpm("22301061012")).toEqual({ prodi: "Biologi", fakultas: "MIPA" });
    expect(prodiDariNpm("22401043028")).toEqual({ prodi: "Peternakan", fakultas: "Peternakan" });
    expect(prodiDariNpm("22201041053")).toEqual({ prodi: "Peternakan", fakultas: "Peternakan" });
  });

  it("mengembalikan null untuk kode prodi yang belum dikenal", () => {
    expect(prodiDariNpm("22301099005")).toBeNull();
  });

  it("menurunkan angkatan dari tiga digit pertama", () => {
    expect(angkatanDariNpm("22101053012")).toBe(2021);
    expect(angkatanDariNpm("22201053012")).toBe(2022);
    expect(angkatanDariNpm("22301053005")).toBe(2023);
    expect(angkatanDariNpm("22401053021")).toBe(2024);
    expect(angkatanDariNpm("22501053005")).toBe(2025);
    expect(angkatanDariNpm("bukan-npm")).toBeNull();
  });
});

describe("jenjang keanggotaan", () => {
  it("mengikuti pembagian di SPEC bagian 9", () => {
    expect(jenjangDariAngkatan(2025)).toBe("MUDA");
    expect(jenjangDariAngkatan(2024)).toBe("MADYA");
    expect(jenjangDariAngkatan(2023)).toBe("MADYA");
    expect(jenjangDariAngkatan(2022)).toBe("UTAMA");
    expect(jenjangDariAngkatan(2021)).toBe("UTAMA");
  });

  it("tidak perlu diubah saat angkatan baru masuk", () => {
    expect(jenjangDariAngkatan(2026)).toBe("MUDA");
    expect(jenjangDariAngkatan(2019)).toBe("UTAMA");
    expect(jenjangDariAngkatan(null)).toBe("MUDA");
  });
});

describe("semester berjalan", () => {
  it("menempatkan angkatan 2025 di semester 3 pada TA 2026/2027", () => {
    expect(semesterBerjalan(2025, 2026)).toBe(3);
    expect(semesterBerjalan(2024, 2026)).toBe(5);
    expect(semesterBerjalan(2021, 2026)).toBe(11);
  });

  it("mengembalikan null untuk angkatan yang belum masuk", () => {
    expect(semesterBerjalan(2027, 2026)).toBeNull();
    expect(semesterBerjalan(null, 2026)).toBeNull();
  });
});
