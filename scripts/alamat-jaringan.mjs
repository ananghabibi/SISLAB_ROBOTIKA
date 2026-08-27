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

/** Porta peladen pengembangan; boleh diganti lewat PORT. */
const PORT = process.env.PORT ?? "3000";

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
    console.log(`  http://${a.ip}:${PORT}        [${a.nama}]`);
  }
  console.log("");
  console.log("PENTING: alamat ini adalah alamat LAPTOP, dan dapat berubah");
  console.log("sendiri setiap kali laptop menyambung ulang ke WiFi. Alamat yang");
  console.log("Anda lihat di pengaturan WiFi PONSEL adalah alamat ponsel itu");
  console.log("sendiri — mengetiknya di ponsel berarti menyuruh ponsel memanggil");
  console.log("dirinya sendiri, dan hasilnya selalu \"situs tidak dapat dijangkau\".");
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

const kategoriAktif = periksaProfilWindows();
periksaPendengar();
periksaAturanFirewall(kategoriAktif);

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
  const hanyaLokal = baris.every((b) => /127\.0\.0\.1|\[::1\]/.test(b));
  if (hanyaLokal) {
    console.log("  TERIKAT KE LAPTOP SAJA (127.0.0.1) — ponsel tidak akan pernah bisa.");
    console.log(`  Jalankan ulang dengan: npm run dev -- -H ${nyata[0]?.ip ?? "0.0.0.0"}`);
  } else {
    console.log("  OK — mendengarkan dan menerima sambungan dari jaringan.");
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
        "Get-NetFirewallApplicationFilter | Where-Object { $_.Program -like '*node.exe' } |" +
          " ForEach-Object { $r = $_ | Get-NetFirewallRule;" +
          " if ($r.Direction -eq 'Inbound') {" +
          ' "$($r.DisplayName)|$($r.Action)|$($r.Enabled)|$($r.Profile)" } }',
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
    console.log("    New-NetFirewallRule -DisplayName \"SILAB dev 3000\" -Direction Inbound `");
    console.log("      -Action Allow -Protocol TCP -LocalPort 3000 -Profile Private");
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
  console.log("      -Direction Inbound -Action Allow -Protocol TCP \`");
  console.log(`      -LocalPort ${PORT} -Profile ${tanpaIzin.join(",")}`);
  console.log("  ---------------------------------------------------------------");
}
