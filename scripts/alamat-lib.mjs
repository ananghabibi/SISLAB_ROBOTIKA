// -----------------------------------------------------------------------------
// Perhitungan alamat untuk `npm run alamat`.
//
// Dipisahkan dari skripnya supaya dapat diuji. Kekeliruan di berkas ini tidak
// menampakkan diri sebagai galat, melainkan sebagai nasihat yang terdengar
// meyakinkan sambil menunjuk alamat yang salah — dan itu jauh lebih mahal
// daripada pesan galat, karena orang lalu mencari-cari kerusakan di tempat lain.
//
// Perhitungan CIDR di sini sengaja ditulis ulang, tidak mengambil dari
// `src/lib/jaringan.ts`: skrip ini berjalan dengan `node` polos tepat setelah
// `git clone`, sebelum ada yang dipasang dan sebelum TypeScript dapat dibaca.
// -----------------------------------------------------------------------------

/**
 * @typedef {{ nama: string, ip: string, topeng: string }} Antarmuka
 * @typedef {{ nama?: string, ip?: string }} Gerbang
 * @typedef {Antarmuka & { jenis: "nyata" | "virtual" | "takBerguna", ragu?: boolean }} Terpilah
 */

/** Nama antarmuka yang hampir pasti bukan jaringan sungguhan. */
export const VIRTUAL =
  /(wsl|hyper-?v|vethernet|virtual|vmware|virtualbox|docker|loopback|tailscale|zerotier|utun|bridge)/i;

/**
 * Alamat yang justru muncul ketika WiFi GAGAL memberi alamat.
 *
 * 169.254.x.x dikarang sendiri oleh Windows saat DHCP tidak menjawab, jadi ia
 * bukan sekadar "bukan alamat WiFi" — ia tanda bahwa laptopnya sebenarnya
 * belum tersambung ke jaringan mana pun meski ikonnya terlihat menyala.
 */
export const LINK_LOCAL = /^169\.254\./;

export function ipKeAngka(ip) {
  const bagian = String(ip ?? "").trim().split(".");
  if (bagian.length !== 4) return null;

  let hasil = 0;
  for (const b of bagian) {
    if (!/^\d{1,3}$/.test(b)) return null;
    const n = Number(b);
    if (n > 255) return null;
    hasil = hasil * 256 + n;
  }
  return hasil >>> 0;
}

export function angkaKeIp(angka) {
  return [24, 16, 8, 0].map((geser) => (angka >>> geser) & 255).join(".");
}

/**
 * Panjang prefiks dari topeng bertitik: "255.255.240.0" menjadi 20.
 *
 * Mengembalikan null bila topengnya berlubang (mis. 255.0.255.0), karena topeng
 * semacam itu tidak dapat ditulis sebagai CIDR dan lebih baik ditolak terang
 * daripada dibulatkan diam-diam.
 */
export function panjangPrefiks(topeng) {
  const angka = ipKeAngka(topeng);
  if (angka === null) return null;

  const komplemen = (~angka) >>> 0;
  if ((((komplemen + 1) >>> 0) & komplemen) !== 0) return null;

  let panjang = 0;
  for (let i = 31; i >= 0; i--) {
    if (((angka >>> i) & 1) === 0) break;
    panjang++;
  }
  return panjang;
}

/** Alamat jaringan: "172.16.15.117" dengan topeng /20 menjadi "172.16.0.0". */
export function jaringanDari(ip, topeng) {
  const a = ipKeAngka(ip);
  const t = ipKeAngka(topeng);
  if (a === null || t === null) return null;
  return angkaKeIp((a & t) >>> 0);
}

/** Bentuk CIDR sebuah antarmuka, siap disalin ke LAB_SUBNETS. */
export function cidrDari(ip, topeng) {
  const jaringan = jaringanDari(ip, topeng);
  const panjang = panjangPrefiks(topeng);
  return jaringan === null || panjang === null ? null : `${jaringan}/${panjang}`;
}

/**
 * Apakah dua alamat berada di jaringan yang sama menurut topengnya.
 *
 * Inilah satu-satunya cara yang benar untuk menjawab "ponsel saya sejaringan
 * atau tidak". Aturan lisan "tiga angka pertamanya harus sama" hanya kebetulan
 * benar pada topeng /24. Pada WiFi kampus yang ber-topeng 255.255.240.0,
 * 172.16.3.9 dan 172.16.15.117 SATU jaringan meski angka ketiganya berbeda —
 * dan aturan lisan itu akan menyuruh orang mencari kerusakan yang tidak ada.
 */
export function seJaringan(satu, dua, topeng) {
  const a = ipKeAngka(satu);
  const b = ipKeAngka(dua);
  const t = ipKeAngka(topeng);
  if (a === null || b === null || t === null) return false;
  return ((a & t) >>> 0) === ((b & t) >>> 0);
}

/** Alamat pertama dan terakhir yang dapat dipakai perangkat pada jaringan itu. */
export function rentangJaringan(ip, topeng) {
  const a = ipKeAngka(ip);
  const t = ipKeAngka(topeng);
  const panjang = panjangPrefiks(topeng);
  if (a === null || t === null || panjang === null || panjang > 30) return null;

  const jaringan = (a & t) >>> 0;
  const siaran = (jaringan | (~t >>> 0)) >>> 0;
  return { pertama: angkaKeIp(jaringan + 1), terakhir: angkaKeIp(siaran - 1) };
}

/** Apakah `ip` berada di dalam blok CIDR `cidr` (mis. `172.16.0.0/20`). */
export function ipDalamCidr(ip, cidr) {
  const [alamat, panjangTeks] = String(cidr ?? "").trim().split("/");
  const angkaIp = ipKeAngka(ip);
  const angkaJaringan = ipKeAngka(alamat);
  if (angkaIp === null || angkaJaringan === null) return false;

  const panjang = panjangTeks === undefined ? 32 : Number(panjangTeks);
  if (!Number.isInteger(panjang) || panjang < 0 || panjang > 32) return false;
  if (panjang === 0) return true;

  const topeng = panjang === 32 ? -1 : ~((1 << (32 - panjang)) - 1);
  return ((angkaIp & topeng) >>> 0) === ((angkaJaringan & topeng) >>> 0);
}

/**
 * Apakah sebuah antarmuka memegang gerbang bawaan.
 *
 * Dicocokkan dua arah karena keduanya bisa gagal sendiri-sendiri: lewat nama
 * antarmuka (yang ejaannya berbeda antar sistem operasi), dan lewat letak
 * alamat gerbangnya (yang tetap benar meski namanya tidak cocok).
 */
export function memegangGerbang(/** @type {Antarmuka} */ antarmuka, /** @type {Gerbang[]} */ gerbang) {
  return gerbang.some(
    (g) =>
      (g.nama && g.nama === antarmuka.nama) ||
      (g.ip && seJaringan(antarmuka.ip, g.ip, antarmuka.topeng)),
  );
}

/**
 * Memilah antarmuka menjadi alamat yang benar-benar dapat dihubungi ponsel dan
 * alamat yang tidak.
 *
 * Penentunya adalah gerbang bawaan, bukan blok alamatnya. Versi sebelumnya
 * menganggap seluruh 172.16–172.31 sebagai adaptor virtual karena WSL, Docker,
 * dan Hyper-V memang mengambil alamat dari sana. Tetapi blok itu juga dipakai
 * jaringan sungguhan: WiFi kampus UNISMA membagikan 172.16.x.x dengan topeng
 * 255.255.240.0. Akibatnya skrip ini justru menyuruh mengabaikan satu-satunya
 * alamat yang benar. Adaptor virtual tidak memegang gerbang bawaan; kartu WiFi
 * memegangnya. Itu pembeda yang tidak bergantung pada blok alamat.
 *
 * @returns {Terpilah[]}
 */
export function pilahAntarmuka(
  /** @type {Antarmuka[]} */ daftar,
  /** @type {Gerbang[]} */ gerbang = [],
) {
  const pakaiGerbang = gerbang.length > 0;

  /** @returns {"nyata" | "virtual" | "takBerguna"} */
  const namaSaja = (/** @type {Antarmuka} */ a) =>
    LINK_LOCAL.test(a.ip) ? "takBerguna" : VIRTUAL.test(a.nama) ? "virtual" : "nyata";

  /** @returns {"nyata" | "virtual" | "takBerguna"} */
  const menurutGerbang = (/** @type {Antarmuka} */ a) => {
    if (LINK_LOCAL.test(a.ip)) return "takBerguna";
    if (VIRTUAL.test(a.nama)) return "virtual";
    return memegangGerbang(a, gerbang) ? "nyata" : "virtual";
  };

  const hasil = daftar.map((a) => ({ ...a, jenis: pakaiGerbang ? menurutGerbang(a) : namaSaja(a) }));

  // Bila penentuan lewat gerbang justru menyisakan nol alamat nyata, tabel rute
  // itulah yang tidak terbaca dengan benar — bukan laptopnya yang tidak punya
  // jaringan. Lebih baik menawarkan alamat yang mungkin salah daripada berkata
  // "tidak ada alamat" pada laptop yang jelas-jelas sedang tersambung.
  if (pakaiGerbang && !hasil.some((a) => a.jenis === "nyata")) {
    return daftar.map((a) => ({ ...a, jenis: namaSaja(a), ragu: true }));
  }
  return hasil;
}

/**
 * @typedef {{ nama: string, tindakan: string, aktif: string, profil: string }} AturanFirewall
 * @typedef {{ nama: string, aktif: string, bawaanMasuk: string }} KeadaanProfil
 */

/** Apakah nilai Profile sebuah aturan mencakup kategori jaringan tertentu. */
export function profilMencakup(/** @type {string} */ profilAturan, /** @type {string} */ kategori) {
  const bagian = profilAturan.split(",").map((b) => b.trim());
  return bagian.includes("Any") || bagian.includes(kategori);
}

/** Profil aktif yang tidak punya satu pun aturan Allow yang mencakupnya. */
export function profilTanpaIzin(
  /** @type {AturanFirewall[]} */ aturan,
  /** @type {string[]} */ kategoriAktif,
) {
  const mengizinkan = aturan.filter((a) => a.tindakan === "Allow" && a.aktif === "True");
  return kategoriAktif.filter((k) => !mengizinkan.some((a) => profilMencakup(a.profil, k)));
}

/**
 * Apakah profil firewall itu benar-benar menolak sambungan masuk yang tidak
 * punya aturan Allow.
 *
 * Ketiadaan aturan Allow saja belum berarti memblokir. Bila firewall untuk
 * profil itu dimatikan, atau tindakan bawaan masuknya justru Allow, sambungan
 * tetap diterima. Tanpa pemeriksaan ini skripnya pernah memvonis "INILAH
 * SEBABNYA" pada laptop yang ponselnya jelas-jelas berhasil membuka — vonis
 * yang salah lebih mahal daripada tidak memberi vonis sama sekali, karena ia
 * mengirim orang memperbaiki yang tidak rusak.
 *
 * Profil yang tidak terbaca dianggap memblokir: lebih baik menyarankan aturan
 * yang ternyata tidak perlu daripada diam saat firewall memang menutup.
 */
export function profilMemblokir(/** @type {string} */ nama, /** @type {KeadaanProfil[]} */ keadaan) {
  const profil = keadaan.find((k) => k.nama === nama);
  if (!profil) return true;
  if (profil.aktif === "False") return false;
  return profil.bawaanMasuk !== "Allow";
}
