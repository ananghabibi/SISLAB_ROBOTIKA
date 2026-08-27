// -----------------------------------------------------------------------------
// Mencari alamat IPv4 laptop yang benar-benar bisa dihubungi ponsel, lalu
// memeriksa sebab yang paling sering membuatnya tetap tidak bisa dibuka.
//
// Baris `Network:` yang dicetak Next.js memilih antarmuka pertama yang
// ditemukannya, dan pada laptop yang punya WSL, Docker, atau Hyper-V pilihan itu
// hampir selalu adaptor virtual — alamat yang tidak akan pernah dapat dijangkau
// perangkat lain. Skrip ini memisahkan mana yang nyata dan mana yang virtual.
//
// Di Windows ia juga memeriksa kategori jaringan. Windows menandai WiFi sebagai
// "Public" setiap kali ia ragu — setelah pindah jaringan, setelah kartu WiFi
// tidur, kadang setelah pembaruan — dan profil Public MEMBLOKIR sambungan masuk.
// Gejalanya persis seperti aplikasi yang rusak: laptop bisa membuka sendiri,
// ponsel tidak bisa sama sekali. Ini penyebab yang paling sering berulang, dan
// ia tidak meninggalkan pesan galat apa pun di aplikasi.
//
//   npm run alamat
// -----------------------------------------------------------------------------

import { execFileSync } from "node:child_process";
import { networkInterfaces, platform } from "node:os";

/** Nama antarmuka yang hampir pasti bukan jaringan sungguhan. */
const VIRTUAL = /(wsl|hyper-?v|vethernet|virtual|vmware|virtualbox|docker|loopback|tailscale|zerotier|utun|bridge)/i;

/** Blok alamat yang lazim dipakai adaptor virtual Windows. */
const CURIGA = [/^172\.(1[6-9]|2\d|3[01])\./, /^169\.254\./];

const alamat = [];
for (const [nama, daftar] of Object.entries(networkInterfaces())) {
  for (const a of daftar ?? []) {
    if (a.family !== "IPv4" || a.internal) continue;
    const virtual = VIRTUAL.test(nama) || CURIGA.some((p) => p.test(a.address));
    alamat.push({ nama, ip: a.address, virtual });
  }
}

if (alamat.length === 0) {
  console.log("Tidak ada antarmuka IPv4 yang aktif. Sambungkan laptop ke WiFi lebih dulu.");
  process.exit(0);
}

const nyata = alamat.filter((a) => !a.virtual);
const virtual = alamat.filter((a) => a.virtual);

console.log("Alamat yang dapat dibuka dari ponsel:\n");
if (nyata.length === 0) {
  console.log("  (tidak ada — semua antarmuka tampak virtual)\n");
} else {
  for (const a of nyata) {
    console.log(`  http://${a.ip}:3000        [${a.nama}]`);
  }
  console.log("");
  console.log(`Jalankan peladen terikat ke alamat itu supaya tidak salah pilih:`);
  console.log(`  npm run dev -- -H ${nyata[0].ip}`);
  console.log("");
  console.log("Ponsel harus berada di jaringan yang sama. Periksa di ponsel:");
  console.log(`  Pengaturan > WiFi > (jaringan Anda) > alamat IP harus sekelompok`);
  console.log(`  dengan ${nyata[0].ip} — tiga angka pertamanya sama.`);
}

if (virtual.length > 0) {
  console.log("\nAbaikan yang berikut, ini adaptor virtual dan tidak dapat dijangkau ponsel:");
  for (const a of virtual) console.log(`  ${a.ip.padEnd(16)} [${a.nama}]`);
}

periksaProfilWindows();

/**
 * Memeriksa kategori jaringan Windows.
 *
 * Diam saja di sistem operasi lain. Kegagalan menjalankan PowerShell juga tidak
 * dianggap galat: skrip ini alat bantu, bukan syarat menjalankan aplikasi.
 */
function periksaProfilWindows() {
  if (platform() !== "win32") return;

  let keluaran;
  try {
    keluaran = execFileSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        "Get-NetConnectionProfile | ForEach-Object { \"$($_.Name)|$($_.NetworkCategory)\" }",
      ],
      { encoding: "utf8", timeout: 10_000, stdio: ["ignore", "pipe", "ignore"] },
    );
  } catch {
    console.log("\nKategori jaringan tidak dapat diperiksa otomatis. Periksa sendiri di");
    console.log("  Pengaturan > Jaringan & Internet > WiFi > (jaringan Anda)");
    console.log("dan pastikan tertulis Private, bukan Public.");
    return;
  }

  const profil = keluaran
    .split("\n")
    .map((baris) => baris.trim())
    .filter(Boolean)
    .map((baris) => {
      const [nama, kategori] = baris.split("|");
      return { nama: nama?.trim() ?? "?", kategori: kategori?.trim() ?? "?" };
    });

  if (profil.length === 0) return;

  console.log("\nKategori jaringan Windows:");
  for (const p of profil) {
    const aman = p.kategori === "Private" || p.kategori === "DomainAuthenticated";
    console.log(`  ${aman ? "OK    " : "BLOKIR"}  ${p.nama} — ${p.kategori}`);
  }

  const publik = profil.filter((p) => p.kategori === "Public");
  if (publik.length === 0) return;

  console.log("\n  ---------------------------------------------------------------");
  console.log("  INILAH SEBABNYA PONSEL TIDAK BISA MEMBUKA. Profil Public memblokir");
  console.log("  seluruh sambungan masuk, jadi laptop tetap bisa membuka alamatnya");
  console.log("  sendiri sementara ponsel tidak dapat menjangkaunya sama sekali.");
  console.log("");
  console.log("  Perbaiki lewat Pengaturan:");
  console.log("    Pengaturan > Jaringan & Internet > WiFi > (jaringan Anda)");
  console.log("    > Jenis profil jaringan > pilih Pribadi (Private)");
  console.log("");
  console.log("  Atau lewat PowerShell sebagai Administrator:");
  for (const p of publik) {
    console.log(`    Set-NetConnectionProfile -Name "${p.nama}" -NetworkCategory Private`);
  }
  console.log("");
  console.log("  Windows dapat mengembalikannya ke Public sewaktu-waktu. Bila ponsel");
  console.log("  tiba-tiba tidak bisa membuka lagi, jalankan `npm run alamat` lebih");
  console.log("  dulu sebelum menduga aplikasinya yang rusak.");
  console.log("  ---------------------------------------------------------------");
}
