import { describe, expect, it } from "vitest";

import {
  cidrDari,
  ipDalamCidr,
  jaringanDari,
  panjangPrefiks,
  pilahAntarmuka,
  rentangJaringan,
  seJaringan,
} from "../scripts/alamat-lib.mjs";

// WiFi kampus UNISMA, terbaca langsung dari laptop dan ponsel di tempat:
// keduanya di 172.16.x.x dengan topeng 255.255.240.0 dan gerbang 172.16.0.1.
const LAPTOP = { nama: "Wi-Fi", ip: "172.16.15.117", topeng: "255.255.240.0" };
const PONSEL = "172.16.15.122";
const GERBANG = [{ nama: "Wi-Fi", ip: "172.16.0.1" }];

describe("penguraian topeng jaringan", () => {
  it("menghitung panjang prefiks dari topeng bertitik", () => {
    expect(panjangPrefiks("255.255.255.0")).toBe(24);
    expect(panjangPrefiks("255.255.240.0")).toBe(20);
    expect(panjangPrefiks("255.255.0.0")).toBe(16);
    expect(panjangPrefiks("255.255.255.255")).toBe(32);
  });

  it("menolak topeng berlubang alih-alih membulatkannya diam-diam", () => {
    expect(panjangPrefiks("255.0.255.0")).toBeNull();
    expect(panjangPrefiks("bukan-topeng")).toBeNull();
  });

  it("menyusun CIDR yang siap disalin ke LAB_SUBNETS", () => {
    expect(cidrDari(LAPTOP.ip, LAPTOP.topeng)).toBe("172.16.0.0/20");
    expect(cidrDari("192.168.1.138", "255.255.255.0")).toBe("192.168.1.0/24");
    expect(jaringanDari(LAPTOP.ip, LAPTOP.topeng)).toBe("172.16.0.0");
  });

  it("menyebutkan rentang alamat yang dapat dipakai perangkat", () => {
    expect(rentangJaringan(LAPTOP.ip, LAPTOP.topeng)).toEqual({
      pertama: "172.16.0.1",
      terakhir: "172.16.15.254",
    });
  });
});

describe("apakah ponsel sejaringan dengan laptop", () => {
  it("membenarkan ponsel yang memang sejaringan", () => {
    expect(seJaringan(LAPTOP.ip, PONSEL, LAPTOP.topeng)).toBe(true);
  });

  it("tetap benar walau angka ketiganya berbeda pada topeng /20", () => {
    // Aturan lisan "tiga angka pertamanya harus sama" akan menuduh pasangan
    // ini beda jaringan, padahal satu — dan menyuruh orang mencari kerusakan
    // yang tidak ada.
    expect(seJaringan(LAPTOP.ip, "172.16.3.9", LAPTOP.topeng)).toBe(true);
    expect(seJaringan(LAPTOP.ip, "172.16.0.200", LAPTOP.topeng)).toBe(true);
  });

  it("menolak alamat di luar blok, termasuk yang mirip", () => {
    expect(seJaringan(LAPTOP.ip, "172.16.16.5", LAPTOP.topeng)).toBe(false);
    expect(seJaringan(LAPTOP.ip, "192.168.1.7", LAPTOP.topeng)).toBe(false);
  });

  it("menuntut ketiga angka pertama sama hanya pada topeng /24", () => {
    expect(seJaringan("192.168.1.138", "192.168.1.9", "255.255.255.0")).toBe(true);
    expect(seJaringan("192.168.1.138", "192.168.2.9", "255.255.255.0")).toBe(false);
  });
});

describe("pemilahan antarmuka nyata dan virtual", () => {
  it("menerima alamat 172.16.x milik WiFi kampus sebagai alamat nyata", () => {
    // Ini kemunduran yang pernah terjadi: seluruh blok 172.16–172.31
    // dianggap adaptor virtual karena WSL dan Docker mengambil alamat dari
    // sana, sehingga skripnya justru menyuruh mengabaikan satu-satunya
    // alamat yang benar.
    const hasil = pilahAntarmuka([LAPTOP], GERBANG);
    expect(hasil[0].jenis).toBe("nyata");
  });

  it("tetap membuang adaptor WSL yang alamatnya seblok dengan WiFi kampus", () => {
    const hasil = pilahAntarmuka(
      [LAPTOP, { nama: "vEthernet (WSL)", ip: "172.29.16.1", topeng: "255.255.240.0" }],
      GERBANG,
    );
    expect(hasil.map((a) => a.jenis)).toEqual(["nyata", "virtual"]);
  });

  it("membuang antarmuka yang tidak memegang gerbang bawaan", () => {
    // Namanya tidak menyebut WSL maupun Hyper-V, jadi hanya gerbang yang
    // dapat membedakannya.
    const hasil = pilahAntarmuka(
      [LAPTOP, { nama: "Ethernet 2", ip: "10.10.0.4", topeng: "255.255.255.0" }],
      GERBANG,
    );
    expect(hasil.map((a) => a.jenis)).toEqual(["nyata", "virtual"]);
  });

  it("mengenali alamat karangan Windows saat DHCP tidak menjawab", () => {
    const hasil = pilahAntarmuka(
      [{ nama: "Wi-Fi", ip: "169.254.7.9", topeng: "255.255.0.0" }],
      [],
    );
    expect(hasil[0].jenis).toBe("takBerguna");
  });

  it("mencocokkan gerbang lewat letak alamatnya bila nama antarmuka berbeda", () => {
    const hasil = pilahAntarmuka([LAPTOP], [{ nama: "Wireless LAN", ip: "172.16.0.1" }]);
    expect(hasil[0].jenis).toBe("nyata");
  });

  it("kembali menebak dari nama bila tabel rute tidak menyisakan satu pun alamat", () => {
    // Lebih baik menawarkan alamat yang mungkin salah daripada berkata "tidak
    // ada alamat" pada laptop yang jelas-jelas sedang tersambung.
    const hasil = pilahAntarmuka([LAPTOP], [{ nama: "tidak-cocok", ip: "10.0.0.1" }]);
    expect(hasil[0].jenis).toBe("nyata");
    expect(hasil[0].ragu).toBe(true);
  });

  it("memilah tanpa tabel rute memakai nama antarmuka saja", () => {
    const hasil = pilahAntarmuka([
      LAPTOP,
      { nama: "vEthernet (Default Switch)", ip: "172.17.240.1", topeng: "255.255.240.0" },
    ]);
    expect(hasil.map((a) => a.jenis)).toEqual(["nyata", "virtual"]);
  });
});

describe("pencocokan alamat dengan LAB_SUBNETS", () => {
  it("menyatakan alamat kampus berada di luar subnet lab bawaan", () => {
    expect(ipDalamCidr(LAPTOP.ip, "192.168.1.0/24")).toBe(false);
    expect(ipDalamCidr(PONSEL, "192.168.1.0/24")).toBe(false);
  });

  it("mencakup laptop dan ponsel begitu blok kampus ditambahkan", () => {
    expect(ipDalamCidr(LAPTOP.ip, "172.16.0.0/20")).toBe(true);
    expect(ipDalamCidr(PONSEL, "172.16.0.0/20")).toBe(true);
  });

  it("tidak melebar melewati batas prefiksnya", () => {
    expect(ipDalamCidr("172.16.16.1", "172.16.0.0/20")).toBe(false);
    expect(ipDalamCidr("172.17.0.1", "172.16.0.0/20")).toBe(false);
  });
});
