import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pilihAlamatPonsel } from "@/lib/alamat-peladen";

const SUBNET = ["172.16.0.0/20"];

beforeEach(() => {
  process.env.LAB_SUBNETS = SUBNET.join(",");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("alamat yang harus diketik di ponsel", () => {
  it("memakai host permintaan bila bukan mesin ini sendiri", () => {
    // Inilah yang benar-benar dipakai pengunjung untuk sampai ke sini, jadi ia
    // selalu benar — termasuk di laboratorium, tempat aplikasi berjalan di
    // dalam kontainer dan tidak dapat melihat alamat mini PC-nya sendiri.
    expect(
      pilihAlamatPonsel({
        host: "192.168.50.10",
        kandidat: [{ nama: "eth0", ip: "172.18.0.5" }],
        subnetLab: SUBNET,
        port: "3000",
      }),
    ).toBe("http://192.168.50.10");
  });

  it("mempertahankan porta yang sudah ada pada host", () => {
    expect(
      pilihAlamatPonsel({ host: "172.16.0.206:3000", kandidat: [], subnetLab: SUBNET, port: "3000" }),
    ).toBe("http://172.16.0.206:3000");
  });

  it("mengikuti skema https bila permintaannya lewat https", () => {
    expect(
      pilihAlamatPonsel({
        host: "lab.unisma.ac.id",
        kandidat: [],
        subnetLab: SUBNET,
        port: "3000",
        protokol: "https",
      }),
    ).toBe("https://lab.unisma.ac.id");
  });

  it("beralih ke antarmuka mesin bila host-nya localhost", () => {
    // Keadaan pengembangan: pengurus membuka layar di laptopnya sendiri, dan
    // yang perlu disebutkan justru alamat WiFi laptop itu.
    for (const host of ["localhost:3000", "127.0.0.1:3000", "[::1]:3000", "LOCALHOST"]) {
      expect(
        pilihAlamatPonsel({
          host,
          kandidat: [{ nama: "Wi-Fi", ip: "172.16.0.206" }],
          subnetLab: SUBNET,
          port: "3000",
        }),
        host,
      ).toBe("http://172.16.0.206:3000");
    }
  });

  it("mendahulukan alamat yang berada di dalam subnet laboratorium", () => {
    // Laptop bersambungan ganda: WiFi lab dan jaringan lain yang ikut aktif.
    expect(
      pilihAlamatPonsel({
        host: null,
        kandidat: [
          { nama: "Ethernet", ip: "10.20.30.40" },
          { nama: "Wi-Fi", ip: "172.16.0.206" },
        ],
        subnetLab: SUBNET,
        port: "3000",
      }),
    ).toBe("http://172.16.0.206:3000");
  });

  it("membuang adaptor virtual dan alamat karangan Windows", () => {
    expect(
      pilihAlamatPonsel({
        host: null,
        kandidat: [
          { nama: "vEthernet (WSL)", ip: "172.29.16.1" },
          { nama: "Wi-Fi", ip: "169.254.7.9" },
          { nama: "Wi-Fi 2", ip: "192.168.1.7" },
        ],
        subnetLab: SUBNET,
        port: "3000",
      }),
    ).toBe("http://192.168.1.7:3000");
  });

  it("mengembalikan null bila tidak ada alamat yang dapat disebutkan", () => {
    // Lebih baik tidak menampilkan apa pun daripada menampilkan alamat yang
    // tidak akan pernah dapat dibuka siapa pun.
    expect(
      pilihAlamatPonsel({
        host: "localhost:3000",
        kandidat: [{ nama: "vEthernet (WSL)", ip: "172.29.16.1" }],
        subnetLab: SUBNET,
        port: "3000",
      }),
    ).toBeNull();
  });

  it("memakai porta yang sedang dipakai peladen", () => {
    expect(
      pilihAlamatPonsel({
        host: null,
        kandidat: [{ nama: "Wi-Fi", ip: "172.16.0.206" }],
        subnetLab: SUBNET,
        port: "3001",
      }),
    ).toBe("http://172.16.0.206:3001");
  });
});
