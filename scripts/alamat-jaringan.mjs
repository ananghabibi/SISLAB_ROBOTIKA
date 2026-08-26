// -----------------------------------------------------------------------------
// Mencari alamat IPv4 laptop yang benar-benar bisa dihubungi ponsel.
//
// Baris `Network:` yang dicetak Next.js memilih antarmuka pertama yang
// ditemukannya, dan pada laptop yang punya WSL, Docker, atau Hyper-V pilihan itu
// hampir selalu adaptor virtual — alamat yang tidak akan pernah dapat dijangkau
// perangkat lain. Skrip ini memisahkan mana yang nyata dan mana yang virtual.
//
//   node scripts/alamat-jaringan.mjs
// -----------------------------------------------------------------------------

import { networkInterfaces } from "node:os";

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
