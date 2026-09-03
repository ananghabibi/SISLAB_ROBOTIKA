// -----------------------------------------------------------------------------
// Alamat peladen yang harus diketik di ponsel.
//
// Alamat WiFi laptop berubah sendiri setiap kali ia menyambung ulang, dan
// setiap kali itu terjadi seluruh anggota kehilangan alamat yang kemarin
// bekerja. Selama ini jawabannya `npm run alamat` di terminal — berguna bagi
// pengurus, tidak berguna bagi orang yang sedang berdiri di pintu dengan
// ponsel di tangan.
//
// Karena itu alamatnya ditampilkan di layar laboratorium: layar itu memang
// sudah dilihat setiap orang yang hendak absen, dan ia selalu menampilkan
// alamat yang berlaku saat itu juga.
//
// Sumber alamatnya ADA DUA, dan urutannya penting:
//
// 1. Header Host permintaan yang sedang dilayani. Inilah yang benar-benar
//    dipakai pengunjung untuk sampai ke sini, jadi ia selalu benar — termasuk
//    di laboratorium, tempat aplikasi berjalan di dalam kontainer dan tidak
//    dapat melihat alamat mini PC-nya sendiri.
// 2. Antarmuka jaringan mesin ini, dipakai hanya bila Host-nya localhost.
//    Itu keadaan pengembangan: pengurus membuka layar di laptopnya sendiri,
//    dan yang perlu disebutkan justru alamat WiFi laptop itu.
// -----------------------------------------------------------------------------

import { networkInterfaces } from "node:os";

import { ipDalamCidr, subnetLaboratorium } from "./jaringan";

/** Nama antarmuka yang hampir pasti bukan jaringan sungguhan. */
const VIRTUAL = /(wsl|hyper-?v|vethernet|virtual|vmware|virtualbox|docker|loopback|tailscale|zerotier|utun|bridge)/i;

/** Alamat yang muncul justru ketika WiFi GAGAL memberi alamat. */
const LINK_LOCAL = /^169\.254\./;

export interface AntarmukaLan {
  nama: string;
  ip: string;
}

/** Host yang berarti "mesin ini sendiri", sehingga tidak berguna bagi ponsel. */
function hostDiriSendiri(host: string): boolean {
  const tanpaPorta = host.replace(/:\d+$/, "").replace(/^\[|\]$/g, "").toLowerCase();
  return tanpaPorta === "localhost" || tanpaPorta === "127.0.0.1" || tanpaPorta === "::1";
}

/**
 * Memilih alamat yang harus diketik di ponsel.
 *
 * Murni: seluruh masukannya diberikan pemanggil, sehingga dapat diuji tanpa
 * jaringan maupun permintaan HTTP.
 */
export function pilihAlamatPonsel(masukan: {
  host: string | null;
  kandidat: AntarmukaLan[];
  subnetLab: string[];
  port: string;
  protokol?: string;
}): string | null {
  const protokol = masukan.protokol === "https" ? "https" : "http";

  if (masukan.host && !hostDiriSendiri(masukan.host)) {
    return `${protokol}://${masukan.host}`;
  }

  const nyata = masukan.kandidat.filter(
    (a) => !VIRTUAL.test(a.nama) && !LINK_LOCAL.test(a.ip),
  );
  if (nyata.length === 0) return null;

  // Yang berada di dalam subnet laboratorium didahulukan: itulah alamat yang
  // benar-benar dapat dipakai absen, dan pada laptop bersambungan ganda ia
  // membedakan WiFi lab dari jaringan lain yang kebetulan ikut aktif.
  const diLab = nyata.find((a) => masukan.subnetLab.some((blok) => ipDalamCidr(a.ip, blok)));
  const dipilih = diLab ?? nyata[0]!;

  return `${protokol}://${dipilih.ip}:${masukan.port}`;
}

/** Antarmuka IPv4 mesin ini yang dapat dihubungi perangkat lain. */
export function antarmukaLan(): AntarmukaLan[] {
  const hasil: AntarmukaLan[] = [];
  for (const [nama, daftar] of Object.entries(networkInterfaces())) {
    for (const a of daftar ?? []) {
      if (a.family !== "IPv4" || a.internal) continue;
      hasil.push({ nama, ip: a.address });
    }
  }
  return hasil;
}

/**
 * Alamat untuk ponsel, dihitung dari permintaan yang sedang dilayani.
 *
 * @param header Header permintaan; `Host` dan `X-Forwarded-Proto` dibaca dari sini.
 */
export function alamatUntukPonsel(header: Headers): string | null {
  return pilihAlamatPonsel({
    host: header.get("host"),
    kandidat: antarmukaLan(),
    subnetLab: subnetLaboratorium(),
    port: process.env.PORT ?? "3000",
    protokol: header.get("x-forwarded-proto") ?? "http",
  });
}
