// -----------------------------------------------------------------------------
// Mencari alamat IPv4 laptop yang benar-benar bisa dihubungi ponsel, lalu
// memeriksa sebab yang paling sering membuatnya tetap tidak bisa dibuka.
//
//   npm run alamat
//   npm run alamat -- 172.16.15.122      (alamat IP ponsel, bila ingin diadu)
//
// Baris `Network:` yang dicetak Next.js memilih antarmuka pertama yang
// ditemukannya, dan pada laptop yang punya WSL, Docker, atau Hyper-V pilihan itu
// hampir selalu adaptor virtual — alamat yang tidak akan pernah dapat dijangkau
// perangkat lain. Skrip ini memisahkan mana yang nyata dan mana yang virtual,
// dengan melihat siapa yang memegang gerbang bawaan, bukan menebak dari blok
// alamatnya.
//
// Di Windows ia juga memeriksa kategori jaringan. Windows menandai WiFi sebagai
// "Public" setiap kali ia ragu — setelah pindah jaringan, setelah kartu WiFi
// tidur, kadang setelah pembaruan — dan profil Public MEMBLOKIR sambungan masuk.
// Gejalanya persis seperti aplikasi yang rusak: laptop bisa membuka sendiri,
// ponsel tidak bisa sama sekali. Ini penyebab yang paling sering berulang, dan
// ia tidak meninggalkan pesan galat apa pun di aplikasi.
// -----------------------------------------------------------------------------

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { networkInterfaces, platform } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  cidrDari,
  ipDalamCidr,
  ipKeAngka,
  pilahAntarmuka,
  rentangJaringan,
  seJaringan,
} from "./alamat-lib.mjs";

/** Porta peladen pengembangan; boleh diganti lewat PORT. */
const PORT = process.env.PORT ?? "3000";

const akar = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Alamat ponsel, bila disebutkan: `npm run alamat -- 172.16.15.122`. */
const ipPonsel = process.argv.slice(2).find((a) => ipKeAngka(a) !== null) ?? null;

const antarmuka = [];
for (const [nama, daftar] of Object.entries(networkInterfaces())) {
  for (const a of daftar ?? []) {
    if (a.family !== "IPv4" || a.internal) continue;
    antarmuka.push({ nama, ip: a.address, topeng: a.netmask });
  }
}

if (antarmuka.length === 0) {
  console.log("Tidak ada antarmuka IPv4 yang aktif. Sambungkan laptop ke WiFi lebih dulu.");
  process.exit(0);
}

const dipilah = pilahAntarmuka(antarmuka, gerbangBawaan());
const nyata = dipilah.filter((a) => a.jenis === "nyata");
const virtual = dipilah.filter((a) => a.jenis === "virtual");
const takBerguna = dipilah.filter((a) => a.jenis === "takBerguna");
const ragu = dipilah.some((a) => a.ragu);

console.log("Alamat yang dapat dibuka dari ponsel:\n");
if (nyata.length === 0) {
  console.log("  (tidak ada — semua antarmuka tampak virtual)\n");
} else {
  for (const a of nyata) {
    const cidr = cidrDari(a.ip, a.topeng);
    console.log(`  http://${a.ip}:${PORT}        [${a.nama}]${cidr ? `  jaringan ${cidr}` : ""}`);
  }
  console.log("");
  if (ragu) {
    console.log("Catatan: tabel rute tidak terbaca, jadi pemilahan di atas hanya");
    console.log("menebak dari nama antarmuka. Coba satu per satu bila perlu.\n");
  }
  console.log("PENTING: alamat ini adalah alamat LAPTOP, dan dapat berubah");
  console.log("sendiri setiap kali laptop menyambung ulang ke WiFi. Alamat yang");
  console.log("Anda lihat di pengaturan WiFi PONSEL adalah alamat ponsel itu");
  console.log("sendiri — mengetiknya di ponsel berarti menyuruh ponsel memanggil");
  console.log("dirinya sendiri, dan hasilnya selalu \"situs tidak dapat dijangkau\".");
  console.log("");
  console.log("Jalankan peladen terikat ke alamat itu supaya tidak salah pilih:");
  console.log(`  npm run dev -- -H ${nyata[0].ip}`);
}

if (virtual.length > 0) {
  console.log("\nAbaikan yang berikut, ini adaptor virtual dan tidak dapat dijangkau ponsel:");
  for (const a of virtual) console.log(`  ${a.ip.padEnd(16)} [${a.nama}]`);
}

if (takBerguna.length > 0) {
  console.log("\nAntarmuka berikut GAGAL mendapat alamat dari WiFi (169.254.x.x itu");
  console.log("alamat karangan Windows saat DHCP tidak menjawab):");
  for (const a of takBerguna) console.log(`  ${a.ip.padEnd(16)} [${a.nama}]`);
  console.log("  Sambungkan ulang WiFi-nya; selama alamatnya masih 169.254, laptop ini");
  console.log("  belum berada di jaringan mana pun.");
}

bandingkanDenganPonsel();
periksaSubnetLab();

const kategoriAktif = periksaProfilWindows();
periksaPendengar();
periksaAturanFirewall(kategoriAktif);

/**
 * Mengadu alamat ponsel dengan alamat laptop memakai topeng yang sebenarnya.
 *
 * Menjawab satu pertanyaan yang selama ini dijawab dengan aturan lisan "tiga
 * angka pertamanya harus sama". Aturan itu hanya benar pada topeng /24. WiFi
 * kampus lazim memakai /20 — di sana 172.16.3.9 dan 172.16.15.117 satu
 * jaringan meski angka ketiganya berbeda jauh, dan aturan lisan itu menuduh
 * jaringan yang sebenarnya sudah benar.
 */
function bandingkanDenganPonsel() {
  if (!ipPonsel) {
    if (nyata.length > 0) {
      const rentang = rentangJaringan(nyata[0].ip, nyata[0].topeng);
      console.log("\nPonsel harus berada di jaringan yang sama. Periksa di ponsel:");
      console.log("  Pengaturan > WiFi > (jaringan Anda) > Alamat IP");
      if (rentang) {
        console.log(`  Alamatnya harus antara ${rentang.pertama} dan ${rentang.terakhir}.`);
      }
      console.log("  Lalu adu langsung dengan menyebutkannya di sini:");
      console.log("    npm run alamat -- <alamat-ip-ponsel>");
    }
    return;
  }

  console.log(`\nAlamat ponsel yang Anda sebutkan: ${ipPonsel}`);

  const milikSendiri = antarmuka.find((a) => a.ip === ipPonsel);
  if (milikSendiri) {
    console.log(`  Itu justru alamat LAPTOP ini sendiri [${milikSendiri.nama}].`);
    console.log("  Yang perlu dibaca adalah alamat di pengaturan WiFi ponsel.");
    return;
  }

  const sama = nyata.filter((a) => seJaringan(a.ip, ipPonsel, a.topeng));
  if (sama.length > 0) {
    for (const a of sama) {
      console.log(`  SATU JARINGAN dengan ${a.ip} [${a.nama}] — buka di ponsel:`);
      console.log(`    http://${a.ip}:${PORT}`);
    }
    console.log("");
    console.log("  Jaringannya sudah benar. Bila ponsel tetap gagal membuka, sebabnya");
    console.log("  ada di laptop (profil jaringan, firewall, peladen belum jalan) atau");
    console.log("  di router — lihat hasil pemeriksaan di bawah.");
    return;
  }

  console.log("  BEDA JARINGAN dengan seluruh alamat nyata laptop:");
  for (const a of nyata) {
    console.log(`    laptop ${a.ip} (${cidrDari(a.ip, a.topeng) ?? "?"}) — ponsel di luar blok itu`);
  }
  console.log("  Sambungkan ponsel ke SSID yang sama dengan laptop, dan pastikan");
  console.log("  ponsel tidak sedang memakai data seluler atau VPN.");
}

/**
 * Memperingatkan bila subnet laptop belum tercantum di LAB_SUBNETS.
 *
 * Gejalanya menipu: halaman terbuka mulus di ponsel, QR terpindai, lalu absensi
 * ditolak 403 tanpa ada yang salah di jaringannya. Lapis 1 memang menolak
 * secara bawaan — itu disengaja — tetapi saat mencoba di luar laboratorium
 * orang mudah mengira aplikasinya yang rusak.
 */
function periksaSubnetLab() {
  const berkas = path.join(akar, ".env");
  if (!existsSync(berkas)) return;

  let isi;
  try {
    isi = readFileSync(berkas, "utf8");
  } catch {
    return;
  }

  const ambil = (kunci) => {
    const cocok = isi.split(/\r?\n/).find((b) => b.startsWith(`${kunci}=`));
    return cocok ? cocok.slice(kunci.length + 1).trim().replace(/^["']|["']$/g, "") : null;
  };

  const bypass = ambil("LAB_NETWORK_BYPASS") === "true";
  const subnet = (ambil("LAB_SUBNETS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  console.log("\nLapis 1 (penjagaan jaringan) menurut berkas .env:");

  if (bypass) {
    console.log("  LAB_NETWORK_BYPASS=true — pemeriksaan jaringan sedang DILEWATI.");
    console.log("  Hanya boleh begini di laptop. Di laboratorium wajib false.");
    return;
  }

  if (subnet.length === 0) {
    console.log("  LAB_SUBNETS kosong — tidak ada satu pun jaringan yang dipercaya,");
    console.log("  jadi setiap percobaan absen akan ditolak 403.");
  } else {
    console.log(`  LAB_SUBNETS = ${subnet.join(", ")}`);
  }

  const diperiksa = ipPonsel ? [{ label: "ponsel", ip: ipPonsel }] : [];
  for (const a of nyata) diperiksa.push({ label: `laptop [${a.nama}]`, ip: a.ip, topeng: a.topeng });

  const diluar = diperiksa.filter((d) => !subnet.some((blok) => ipDalamCidr(d.ip, blok)));
  if (diluar.length === 0) {
    console.log("  Alamat Anda tercakup. Absensi tidak akan tertolak lapis jaringan.");
    return;
  }

  console.log("");
  console.log("  Alamat berikut BERADA DI LUAR daftar itu:");
  for (const d of diluar) console.log(`    ${d.ip.padEnd(16)} ${d.label}`);
  console.log("");
  console.log("  Halamannya akan tetap terbuka, tetapi absensi ditolak 403. Untuk");
  console.log("  mencoba dari jaringan tempat Anda sekarang, tambahkan bloknya:");
  for (const a of nyata) {
    const cidr = cidrDari(a.ip, a.topeng);
    if (cidr) console.log(`    LAB_SUBNETS=${[...subnet, cidr].join(",")}`);
  }
  console.log("");
  console.log("  Lalu jalankan ulang `npm run dev` — berkas .env hanya dibaca saat");
  console.log("  peladen mulai.");
  console.log("");
  console.log("  Baris itu untuk MENCOBA saja. Di laboratorium, LAB_SUBNETS hanya");
  console.log("  boleh berisi subnet AP laboratorium sendiri. Mengisinya dengan");
  console.log("  subnet WiFi kampus berarti seluruh kampus dianggap berada di dalam");
  console.log("  lab, dan lapis 1 kehilangan seluruh gunanya.");
}

/**
 * Antarmuka mana yang memegang gerbang bawaan.
 *
 * Inilah pembeda antara kartu WiFi dan adaptor virtual yang tidak bergantung
 * pada blok alamat: WSL, Docker, dan Hyper-V memang mengambil alamat dari
 * 172.16–172.31, tetapi begitu pula sebagian jaringan kampus. Yang tidak
 * dimiliki adaptor virtual adalah gerbang bawaan.
 *
 * Kegagalan membacanya bukan galat: pemanggilnya beralih ke penebakan lewat
 * nama antarmuka.
 */
function gerbangBawaan() {
  try {
    if (platform() === "win32") {
      const keluaran = execFileSync(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          "Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway } |" +
            ' ForEach-Object { "$($_.InterfaceAlias)|$($_.IPv4DefaultGateway.NextHop)" }',
        ],
        { encoding: "utf8", timeout: 15_000, stdio: ["ignore", "pipe", "ignore"] },
      );
      return keluaran
        .split("\n")
        .map((b) => b.trim())
        .filter(Boolean)
        .map((b) => {
          const [nama, ip] = b.split("|");
          return { nama: nama?.trim() ?? "", ip: ip?.trim() ?? "" };
        });
    }

    if (platform() === "darwin") {
      const keluaran = execFileSync("netstat", ["-rn", "-f", "inet"], {
        encoding: "utf8",
        timeout: 10_000,
        stdio: ["ignore", "pipe", "ignore"],
      });
      return keluaran
        .split("\n")
        .filter((b) => /^default\s/.test(b.trim()))
        .map((b) => {
          const kolom = b.trim().split(/\s+/);
          return { nama: kolom[kolom.length - 1] ?? "", ip: kolom[1] ?? "" };
        })
        .filter((g) => g.nama || g.ip);
    }

    const keluaran = execFileSync("ip", ["-4", "route", "show", "default"], {
      encoding: "utf8",
      timeout: 10_000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return keluaran
      .split("\n")
      .filter((b) => b.trim())
      .map((b) => ({
        nama: b.match(/\bdev\s+(\S+)/)?.[1] ?? "",
        ip: b.match(/\bvia\s+(\S+)/)?.[1] ?? "",
      }))
      .filter((g) => g.nama || g.ip);
  } catch {
    return [];
  }
}

/**
 * Memeriksa kategori jaringan Windows.
 *
 * Mengembalikan daftar kategori yang sedang aktif, karena pemeriksaan aturan
 * firewall di bawah harus tahu profil mana yang sebenarnya berlaku.
 *
 * Diam saja di sistem operasi lain. Kegagalan menjalankan PowerShell juga tidak
 * dianggap galat: skrip ini alat bantu, bukan syarat menjalankan aplikasi.
 */
function periksaProfilWindows() {
  if (platform() !== "win32") return [];

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
    return [];
  }

  const profil = keluaran
    .split("\n")
    .map((baris) => baris.trim())
    .filter(Boolean)
    .map((baris) => {
      const [nama, kategori] = baris.split("|");
      return { nama: nama?.trim() ?? "?", kategori: kategori?.trim() ?? "?" };
    });

  if (profil.length === 0) return [];

  console.log("\nKategori jaringan Windows:");
  for (const p of profil) {
    const aman = p.kategori === "Private" || p.kategori === "DomainAuthenticated";
    console.log(`  ${aman ? "OK    " : "BLOKIR"}  ${p.nama} — ${p.kategori}`);
  }

  // "DomainAuthenticated" pada Get-NetConnectionProfile setara dengan profil
  // bernama "Domain" pada aturan firewall.
  const kategori = profil.map((p) => (p.kategori === "DomainAuthenticated" ? "Domain" : p.kategori));

  // Nama jaringan disebut tegas supaya bisa diadu dengan yang terbaca di
  // ponsel — TETAPI yang dipakai membandingkan haruslah SSID, bukan nama
  // profil. Windows menambahkan akhiran " 2", " 3", dan seterusnya pada nama
  // PROFIL bila entri dengan nama itu sudah pernah ada, misalnya setelah kartu
  // WiFi diganti atau jaringannya dilupakan lalu disambungkan lagi. SSID-nya
  // sendiri tidak berubah. Menyamakan keduanya membuat orang mengira laptop
  // dan ponselnya berada di jaringan berbeda padahal sama.
  const ssid = ssidAktif();
  console.log("");
  if (ssid.length > 0) {
    console.log(`  SSID yang sedang dipakai laptop: ${ssid.join(", ")}`);
    const berbeda = profil.some((p) => !ssid.includes(p.nama));
    if (berbeda) {
      console.log(`  (nama profil Windows-nya "${profil.map((p) => p.nama).join(", ")}" —`);
      console.log("   akhiran angka itu buatan Windows, BUKAN nama jaringan lain)");
    }
  } else {
    console.log(`  Nama profil Windows: ${profil.map((p) => p.nama).join(", ")}`);
    console.log("  Catatan: nama profil dapat berakhiran angka tambahan buatan Windows.");
    console.log("  Yang harus dicocokkan adalah SSID di daftar WiFi, bukan nama ini.");
  }
  console.log("  Ponsel harus tersambung ke SSID yang sama.");

  const publik = profil.filter((p) => p.kategori === "Public");
  if (publik.length === 0) return kategori;

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
  console.log("  Sebagian WiFi kampus tidak mengizinkan perubahan ini karena dikelola");
  console.log("  kebijakan jaringan. Bila pilihannya kelabu, buka portanya saja untuk");
  console.log("  profil Public — lihat pemeriksaan firewall di bawah.");
  console.log("");
  console.log("  Windows dapat mengembalikannya ke Public sewaktu-waktu. Bila ponsel");
  console.log("  tiba-tiba tidak bisa membuka lagi, jalankan `npm run alamat` lebih");
  console.log("  dulu sebelum menduga aplikasinya yang rusak.");
  console.log("  ---------------------------------------------------------------");
  return kategori;
}

/**
 * Memeriksa apakah ada yang mendengarkan di porta itu, dan di alamat mana.
 *
 * Menangkap dua keadaan yang gejalanya sama-sama "situs tidak dapat dijangkau"
 * tetapi sebabnya berlawanan: peladen belum dijalankan sama sekali, atau
 * peladen berjalan tetapi terikat hanya ke 127.0.0.1 sehingga tidak menerima
 * siapa pun dari luar laptop. Keduanya tidak meninggalkan pesan galat di
 * aplikasi, dan keduanya mudah tertukar dengan masalah firewall.
 */
function periksaPendengar() {
  const perintah =
    platform() === "win32"
      ? { berkas: "netstat", argumen: ["-ano", "-p", "TCP"] }
      : { berkas: "ss", argumen: ["-ltn"] };

  let keluaran;
  try {
    keluaran = execFileSync(perintah.berkas, perintah.argumen, {
      encoding: "utf8",
      timeout: 10_000,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return; // Alat bantu; ketiadaannya bukan galat.
  }

  const baris = keluaran
    .split("\n")
    .filter((b) => /LISTEN/i.test(b) && new RegExp(`[.:]${PORT}\\b`).test(b));

  console.log(`\nPeladen pada porta ${PORT}:`);
  if (baris.length === 0) {
    console.log("  BELUM JALAN — tidak ada yang mendengarkan di porta ini.");
    console.log("  Jalankan `npm run dev` lebih dulu, di jendela terminal tersendiri.");
    return;
  }

  // Terikat ke localhost saja berarti hanya laptop yang bisa membukanya.
  // Alamat ikatannya disebutkan apa adanya. Vonis "OK" saja menyembunyikan
  // keadaan yang menyesatkan: peladen yang terikat HANYA ke adaptor virtual
  // (mis. 172.29.x milik WSL) juga bukan 127.0.0.1, padahal ponsel tetap tidak
  // akan pernah dapat menjangkaunya.
  const ikatan = baris
    .map((b) => b.trim().split(/\s+/).find((k) => new RegExp(`[.:]${PORT}$`).test(k)))
    .filter(Boolean);
  for (const i of ikatan) console.log(`  mendengarkan di ${i}`);

  const menyeluruh = ikatan.some((i) => /^(0\.0\.0\.0|\[::\]|\*)[.:]/.test(i));
  const alamatNyata = new Set(nyata.map((a) => a.ip));
  const diAlamatNyata = ikatan.some((i) => alamatNyata.has(i.replace(/[.:]\d+$/, "")));

  if (menyeluruh || diAlamatNyata) {
    console.log("  OK — menerima sambungan dari jaringan.");
  } else {
    console.log("  TIDAK DAPAT DIJANGKAU PONSEL — tidak terikat ke antarmuka jaringan nyata.");
    console.log(`  Jalankan ulang dengan: npm run dev -- -H ${nyata[0]?.ip ?? "0.0.0.0"}`);
  }
}

/**
 * Memeriksa aturan firewall masuk untuk node.exe.
 *
 * Dua keadaan memblokir ponsel, dan keduanya harus diperiksa terhadap profil
 * yang SEDANG AKTIF — bukan terhadap daftar aturan begitu saja:
 *
 *   1. Ada aturan Block. Block selalu menang atas Allow, berapa pun banyaknya
 *      Allow. Aturan begini lahir sendiri bila kotak peringatan Windows
 *      Defender Firewall pernah ditekan Cancel saat `npm run dev` pertama kali.
 *   2. Tidak ada aturan Allow yang mencakup profil aktif. Ini yang paling
 *      menjebak: daftar aturannya terlihat penuh Allow dan tidak ada Block sama
 *      sekali, tetapi seluruh Allow itu untuk profil lain. Windows menolak
 *      sambungan masuk pada profil yang tidak punya Allow — tidak perlu ada
 *      Block untuk memblokir. Gejalanya muncul justru SETELAH jaringan
 *      dipindahkan dari Public ke Private, karena aturan Allow yang ada
 *      dibuat waktu jaringannya masih Public.
 *
 * Pemeriksaannya memakan beberapa detik, jadi ia dijalankan paling akhir.
 */
function periksaAturanFirewall(kategoriAktif = []) {
  if (platform() !== "win32") return;

  console.log("\nAturan firewall untuk node.exe (perlu beberapa detik)...");

  let keluaran;
  try {
    keluaran = execFileSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        // Dua jenis aturan sama-sama membuka jalan, dan keduanya harus dilihat:
        // aturan berbasis PROGRAM (node.exe) dan aturan berbasis PORTA. Aturan
        // porta tidak punya filter aplikasi, jadi kueri yang hanya menanyakan
        // filter aplikasi tidak akan pernah menemukannya.
        "$kumpulan = @{};" +
          " Get-NetFirewallApplicationFilter | Where-Object { $_.Program -like '*node.exe' } |" +
          " ForEach-Object { $r = $_ | Get-NetFirewallRule;" +
          " if ($r.Direction -eq 'Inbound') { $kumpulan[$r.Name] = $r } };" +
          ` Get-NetFirewallPortFilter | Where-Object { $_.Protocol -eq 'TCP' -and $_.LocalPort -contains '${PORT}' } |` +
          " ForEach-Object { $r = $_ | Get-NetFirewallRule;" +
          " if ($r.Direction -eq 'Inbound') { $kumpulan[$r.Name] = $r } };" +
          ' $kumpulan.Values | ForEach-Object {' +
          ' "$($_.DisplayName)|$($_.Action)|$($_.Enabled)|$($_.Profile)" }',
      ],
      { encoding: "utf8", timeout: 60_000, stdio: ["ignore", "pipe", "ignore"] },
    );
  } catch {
    console.log("  Tidak dapat diperiksa otomatis. Periksa sendiri di");
    console.log("  Windows Defender Firewall > Advanced settings > Inbound Rules,");
    console.log("  cari Node.js dan pastikan tidak ada yang bertindak Block.");
    return;
  }

  const aturan = keluaran
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => {
      const [nama, tindakan, aktif, profil] = b.split("|");
      return {
        nama: nama ?? "?",
        tindakan: tindakan ?? "?",
        aktif: aktif ?? "?",
        profil: profil ?? "?",
      };
    });

  if (aturan.length === 0) {
    console.log("  TIDAK ADA aturan masuk untuk node.exe.");
    console.log("  Windows akan menolak ponsel tanpa memberi tahu siapa pun. Buat izinnya");
    console.log("  lewat PowerShell sebagai Administrator:");
    console.log(`    New-NetFirewallRule -DisplayName "SILAB dev ${PORT}" \``);
    console.log("      -Direction Inbound -Action Allow -Protocol TCP `");
    console.log(`      -LocalPort ${PORT} -Profile ${cakupanProfil(kategoriAktif)}`);
    return;
  }

  for (const a of aturan) {
    const buruk = a.tindakan === "Block" && a.aktif === "True";
    console.log(`  ${buruk ? "BLOKIR" : "OK    "}  ${a.tindakan.padEnd(5)} ${a.profil.padEnd(16)} ${a.nama}`);
  }

  const memblokir = aturan.filter((a) => a.tindakan === "Block" && a.aktif === "True");
  if (memblokir.length === 0) {
    laporkanCakupanProfil(aturan, kategoriAktif);
    return;
  }

  console.log("");
  console.log("  ---------------------------------------------------------------");
  console.log("  ADA ATURAN BLOCK YANG AKTIF. Aturan Block selalu menang atas Allow,");
  console.log("  jadi menambah izin baru tidak akan menolong selama ini masih ada.");
  console.log("  Aturan seperti ini lahir bila kotak peringatan Windows Defender");
  console.log("  Firewall pernah ditekan Cancel saat `npm run dev` pertama kali.");
  console.log("");
  console.log("  Hapus lewat PowerShell sebagai Administrator:");
  for (const a of memblokir) {
    console.log(`    Remove-NetFirewallRule -DisplayName "${a.nama}"`);
  }
  console.log("  ---------------------------------------------------------------");
}

/** Profil yang perlu disebut pada aturan firewall baru. */
function cakupanProfil(kategoriAktif) {
  return kategoriAktif.length > 0 ? kategoriAktif.join(",") : "Private";
}

/** Apakah nilai Profile sebuah aturan mencakup kategori jaringan tertentu. */
function profilMencakup(profilAturan, kategori) {
  const bagian = profilAturan.split(",").map((b) => b.trim());
  return bagian.includes("Any") || bagian.includes(kategori);
}

/**
 * Memastikan ada aturan Allow yang benar-benar berlaku pada profil aktif.
 *
 * Dipisahkan karena inilah kesimpulan yang paling mudah salah: "tidak ada
 * aturan Block" bukan berarti "firewall bukan penyebabnya".
 */
function laporkanCakupanProfil(aturan, kategoriAktif) {
  if (kategoriAktif.length === 0) {
    console.log("  Tidak ada aturan Block.");
    return;
  }

  const mengizinkan = aturan.filter((a) => a.tindakan === "Allow" && a.aktif === "True");
  const tanpaIzin = kategoriAktif.filter(
    (k) => !mengizinkan.some((a) => profilMencakup(a.profil, k)),
  );

  if (tanpaIzin.length === 0) {
    console.log(`  Tidak ada aturan Block, dan profil aktif (${kategoriAktif.join(", ")}) diizinkan.`);
    console.log("  Firewall bukan penyebabnya.");
    return;
  }

  console.log("");
  console.log("  ---------------------------------------------------------------");
  console.log(`  INILAH SEBABNYA. Jaringan Anda sekarang berprofil ${tanpaIzin.join(", ")},`);
  console.log("  tetapi tidak ada satu pun aturan Allow di atas yang mencakup profil itu.");
  console.log("  Windows menolak sambungan masuk pada profil yang tidak punya aturan");
  console.log("  Allow — tidak perlu ada aturan Block untuk memblokir.");
  console.log("");
  console.log("  Ini lazim terjadi tepat setelah jaringan dipindahkan dari Public ke");
  console.log("  Private: aturan yang ada dibuat waktu jaringannya masih Public, dan");
  console.log("  ia tidak ikut berpindah.");
  console.log("");
  console.log("  Perbaiki lewat PowerShell sebagai Administrator:");
  console.log(`    New-NetFirewallRule -DisplayName "SILAB dev ${PORT}" \``);
  console.log("      -Direction Inbound -Action Allow -Protocol TCP `");
  console.log(`      -LocalPort ${PORT} -Profile ${tanpaIzin.join(",")}`);
  console.log("  ---------------------------------------------------------------");
}

/**
 * SSID yang sedang dipakai adaptor WiFi.
 *
 * Diambil terpisah dari nama profil karena keduanya kerap berbeda, dan yang
 * berarti bagi ponsel hanyalah SSID. Nama label pada keluaran `netsh` mengikuti
 * bahasa Windows, jadi yang dicocokkan adalah kata "SSID" itu sendiri — sebuah
 * akronim yang tidak diterjemahkan — sambil menyingkirkan baris "BSSID".
 */
function ssidAktif() {
  try {
    const keluaran = execFileSync("netsh", ["wlan", "show", "interfaces"], {
      encoding: "utf8",
      timeout: 10_000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return keluaran
      .split("\n")
      .filter((b) => /(^|[^B])SSID\s*:/.test(b))
      .map((b) => b.split(":").slice(1).join(":").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
