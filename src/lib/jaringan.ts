// -----------------------------------------------------------------------------
// Lapis 1 anti titip absen — penjagaan jaringan.
//
// Ini lapis pertahanan terkuat, dan alasan seluruh sistem ini dijalankan di
// dalam laboratorium alih-alih di awan. Kode harian bisa difoto dan dikirim
// lewat WhatsApp; token QR bisa direlai dalam hitungan detik. Tetapi keduanya
// tidak berguna sama sekali bila permintaannya datang dari luar jaringan lab,
// karena halaman absensinya memang tidak dapat dicapai dari sana.
//
// Karena itu berkas ini menolak secara bawaan: konfigurasi yang kosong, salah
// ketik, atau tidak terbaca berarti TIDAK ADA yang boleh absen. Sistem yang
// gagal terbuka di sini sama saja tidak punya lapis ini.
// -----------------------------------------------------------------------------

export interface HasilPeriksaJaringan {
  diizinkan: boolean;
  ip: string | null;
  alasan?: string;
}

/**
 * Mengambil alamat IP asli pemohon.
 *
 * Aplikasi selalu berada di belakang Caddy, jadi alamat soket yang terlihat
 * Node adalah alamat Caddy. Yang dipakai adalah entri PERTAMA pada
 * X-Forwarded-For — entri itu ditulis Caddy dari alamat sambungan sebenarnya.
 * Entri sesudahnya bisa saja dikarang pemohon, jadi tidak pernah dipercaya.
 */
export function ipDariHeader(header: Headers): string | null {
  const teruskan = header.get("x-forwarded-for");
  if (teruskan) {
    const pertama = teruskan.split(",")[0]?.trim();
    if (pertama) return normalkanIp(pertama);
  }
  const nyata = header.get("x-real-ip");
  return nyata ? normalkanIp(nyata.trim()) : null;
}

/**
 * Menyeragamkan bentuk alamat IP.
 *
 * Node kerap melaporkan IPv4 dalam bentuk terpeta IPv6 (`::ffff:192.168.1.5`).
 * Tanpa penyeragaman ini, alamat yang sebenarnya ada di dalam subnet lab akan
 * gagal dicocokkan dan seluruh laboratorium tertolak.
 */
export function normalkanIp(ip: string): string {
  let bersih = ip.trim();
  // Buang tanda kurung dan porta pada bentuk "[::1]:1234".
  if (bersih.startsWith("[")) bersih = bersih.slice(1, bersih.indexOf("]"));
  if (bersih.toLowerCase().startsWith("::ffff:")) bersih = bersih.slice(7);
  return bersih;
}

function ipv4KeAngka(ip: string): number | null {
  const bagian = ip.split(".");
  if (bagian.length !== 4) return null;

  let hasil = 0;
  for (const b of bagian) {
    if (!/^\d{1,3}$/.test(b)) return null;
    const n = Number(b);
    if (n > 255) return null;
    hasil = hasil * 256 + n;
  }
  return hasil;
}

/** Apakah `ip` berada di dalam blok CIDR `cidr` (mis. `192.168.1.0/24`). */
export function ipDalamCidr(ip: string, cidr: string): boolean {
  const [alamat, panjangTeks] = cidr.trim().split("/");
  if (!alamat) return false;

  const angkaIp = ipv4KeAngka(normalkanIp(ip));
  const angkaJaringan = ipv4KeAngka(alamat);
  if (angkaIp === null || angkaJaringan === null) return false;

  // Tanpa "/" berarti satu alamat tunggal.
  const panjang = panjangTeks === undefined ? 32 : Number(panjangTeks);
  if (!Number.isInteger(panjang) || panjang < 0 || panjang > 32) return false;
  if (panjang === 0) return true;

  const topeng = panjang === 32 ? -1 : ~((1 << (32 - panjang)) - 1);
  return (angkaIp & topeng) === (angkaJaringan & topeng);
}

/** Membaca daftar subnet laboratorium dari variabel lingkungan. */
export function subnetLaboratorium(): string[] {
  return (process.env.LAB_SUBNETS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Bypass hanya untuk pengembangan di laptop. Sengaja mensyaratkan nilai persis
 * "true" DAN bukan lingkungan produksi, supaya satu variabel yang tertinggal
 * di berkas .env laboratorium tidak diam-diam mematikan lapis ini.
 */
export function bypassAktif(): boolean {
  return process.env.LAB_NETWORK_BYPASS === "true" && process.env.NODE_ENV !== "production";
}

export function periksaJaringan(header: Headers): HasilPeriksaJaringan {
  const ip = ipDariHeader(header);

  if (bypassAktif()) {
    return { diizinkan: true, ip, alasan: "Pemeriksaan jaringan dilewati (mode pengembangan)." };
  }

  const subnet = subnetLaboratorium();
  if (subnet.length === 0) {
    return {
      diizinkan: false,
      ip,
      alasan:
        "LAB_SUBNETS belum diisi di peladen, sehingga tidak ada satu pun jaringan yang dipercaya. Hubungi Koordinator Operasional.",
    };
  }

  if (!ip) {
    return {
      diizinkan: false,
      ip: null,
      alasan:
        "Alamat jaringan Anda tidak terbaca peladen. Pastikan mengakses lewat alamat resmi laboratorium, bukan lewat perantara lain.",
    };
  }

  if (subnet.some((blok) => ipDalamCidr(ip, blok))) {
    return { diizinkan: true, ip };
  }

  return {
    diizinkan: false,
    ip,
    alasan: `Absensi hanya dapat dilakukan dari dalam jaringan WiFi laboratorium. Alamat Anda terbaca ${ip}, di luar jaringan lab.`,
  };
}
