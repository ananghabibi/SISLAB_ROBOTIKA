const fs = require("node:fs");
const { Document, Packer, Paragraph, PageBreak, TableOfContents, TextRun, AlignmentType } = require("docx");
const G = require("./gaya.js");
const { j1, j2, j3, p, poin, langkah, kode, catatan, tabel, jarak, kaki, sampul, tebal, biasa, mono } = G;

const isi = [
  ...sampul(
    "Panduan Instalasi",
    "Pemasangan langkah demi langkah",
    "Untuk pengurus laboratorium dan pengembang berikutnya",
  ),
  new Paragraph({ children: [new PageBreak()] }),

  new Paragraph({ text: "Daftar Isi", heading: "Heading1" }),
  new TableOfContents("Daftar Isi", { hyperlink: true, headingStyleRange: "1-2" }),
  p([biasa("Setelah membuka dokumen ini di Word, tekan "), tebal("Ctrl + A"), biasa(" lalu "), tebal("F9"), biasa(" untuk memunculkan nomor halaman pada daftar isi.")], { spacing: { before: 200 } }),
  new Paragraph({ children: [new PageBreak()] }),

  // ---------------------------------------------------------------------------
  j1("1. Sebelum mulai"),
  p("SILAB adalah Sistem Informasi Laboratorium Robotika Fakultas Teknik Universitas Islam Malang. Dokumen ini menuntun pemasangannya dari nol, berurutan, tanpa mengandaikan pembacanya pernah memasang aplikasi web sebelumnya."),

  j2("1.1 Dua jalur pemasangan"),
  p("Pilih satu sesuai keperluan Anda. Keduanya dijelaskan di dokumen ini."),
  tabel(
    ["Jalur", "Untuk apa", "Bagian"],
    [
      ["Laptop sendiri", "Mencoba, belajar, dan mengembangkan. Basis datanya terpisah dari laboratorium.", "Bagian 2 – 7"],
      ["Mini PC laboratorium", "Pemakaian sungguhan oleh 39 anggota. Berjalan terus-menerus di dalam ruangan.", "Bagian 9"],
    ],
    [1900, 5326, 1800],
  ),

  j2("1.2 Mengapa servernya harus di dalam laboratorium"),
  p("Ini bukan penghematan biaya. Sifat lokal server itulah lapis pertama anti titip absen: halaman absensi memang tidak dapat dicapai dari luar jaringan laboratorium. Kode harian bisa difoto dan dikirim lewat WhatsApp, token QR bisa direlai dalam hitungan detik — tetapi keduanya tidak berguna bila permintaannya datang dari kos."),
  catatan("Jangan dipindah ke awan.", "Memindahkan aplikasi ini ke Vercel atau hosting awan mana pun menghapus lapis pertama itu sepenuhnya, dan seluruh sisa sistemnya kehilangan artinya."),

  j2("1.3 Yang perlu disiapkan"),
  poin("Laptop dengan Windows, macOS, atau Linux."),
  poin("Sambungan internet untuk mengunduh perkakas dan pustaka — sekali saja, saat pemasangan."),
  poin("Kesabaran sekitar 30 menit untuk pemasangan pertama."),

  // ---------------------------------------------------------------------------
  j1("2. Memasang tiga perkakas"),
  p("Pasang ketiganya lebih dulu. Tanpa ini, perintah pada bagian berikutnya tidak dikenali."),
  tabel(
    ["Perkakas", "Unduh dari", "Cara memastikan"],
    [
      ["Node.js 22 LTS", "nodejs.org — pilih tombol LTS", "node -v menampilkan v22.x"],
      ["Git", "git-scm.com/downloads", "git --version"],
      ["PostgreSQL 16", "Ada dua cara — lihat bagian 5", "psql --version"],
    ],
    [2100, 4126, 2800],
    { monoKolom: [2] },
  ),
  catatan("Tutup lalu buka lagi Command Prompt", "sesudah memasang perkakas apa pun. Jendela yang sudah terbuka belum mengenal perintah baru, dan inilah sebab paling sering dari pesan \"'npm' is not recognized\"."),

  // ---------------------------------------------------------------------------
  j1("3. Mengambil proyeknya"),
  p("Jangan bekerja di folder sistem. Pindah dulu ke folder milik Anda sendiri:"),
  ...kode(
    "cd %USERPROFILE%\\Documents",
    "git clone https://github.com/ananghabibi/SISLAB_ROBOTIKA.git silab",
    "cd silab",
  ),
  p("Di macOS atau Linux, ganti baris pertama menjadi cd ~/Documents."),
  catatan("Mulai sekarang semua perintah dijalankan dari dalam folder silab itu.", "Kalau Command Prompt ditutup, buka lagi dan ketik cd %USERPROFILE%\\Documents\\silab sebelum mengetik perintah apa pun."),

  // ---------------------------------------------------------------------------
  j1("4. Memasang pustaka dan menyiapkan berkas .env"),
  ...kode("npm ci", "node scripts/siapkan-env.mjs"),
  p([tebal("npm ci"), biasa(" mengunduh pustaka yang dibutuhkan — sekali jalan, beberapa menit.")]),
  catatan("Pakai npm ci, bukan npm install.", "Keduanya sama-sama memasang pustaka, tetapi npm ci memasang persis versi yang tercatat di package-lock.json. npm install boleh menaikkan versi tanpa diminta, dan proyek ini diuji pada Next.js 15.5.24."),
  p([tebal("siapkan-env.mjs"), biasa(" membuat berkas .env beserta seluruh kunci rahasianya, lalu menampilkan dua kata sandi: kata sandi untuk masuk pertama kali sebagai Kepala Laboratorium, dan kata sandi bawaan setiap anggota baru. Catat keduanya. Kata sandi bawaan itu dibangkitkan acak untuk pemasangan ini saja.")]),
  p("Perintah ini aman dijalankan berulang kali: nilai yang sudah ada tidak pernah ditimpa, hanya baris yang masih kosong yang diisi. Jalankan lagi kapan pun Anda lupa kata sandi masuk — ia akan mencetaknya lagi."),
  p([tebal("Berkas .env tidak terlihat di File Explorer"), biasa(" karena namanya diawali titik. Itu normal. Untuk memastikan dan membukanya:")]),
  ...kode("dir /a", "notepad .env"),

  // ---------------------------------------------------------------------------
  j1("5. Menyalakan basis data"),
  p("Ada dua pilihan. Pilih SATU saja — keduanya memperebutkan porta 5432."),

  j2("Pilihan A — lewat Docker"),
  ...kode("docker compose -f docker-compose.dev.yml up -d"),
  p("Berhasil bila muncul Container silab-db-dev  Started."),
  p("Kalau yang muncul failed to resolve reference \"docker.io/library/postgres\" atau dialing auth.docker.io:443, berarti jaringan Anda memblokir Docker Hub — lazim di jaringan kampus. Jangan dilawan; langsung pakai Pilihan B."),

  j2("Pilihan B — PostgreSQL dipasang langsung"),
  langkah("Unduh pemasang PostgreSQL 16 untuk Windows dari enterprisedb.com/downloads/postgres-postgresql-downloads."),
  langkah([biasa("Jalankan pemasangnya. Tekan Next terus, dengan dua catatan: "), tebal("Password"), biasa(" untuk pengguna postgres — catat baik-baik; dan "), tebal("Port"), biasa(" biarkan 5432. Stack Builder di akhir boleh dilewati.")]),
  langkah("Beri tahu aplikasi kata sandi itu dengan perintah di bawah."),
  ...kode("node scripts/siapkan-env.mjs --sandi-db KATASANDIANDA"),
  p("Ganti KATASANDIANDA dengan kata sandi langkah 2. Perintah ini menulis ulang baris DATABASE_URL di .env untuk Anda, jadi berkasnya tidak perlu dibuka sendiri. Tanda baca di dalam kata sandi ditangani otomatis."),
  p("Basis data bernama silab tidak perlu dibuat sendiri — langkah berikutnya membuatnya otomatis."),

  // ---------------------------------------------------------------------------
  j1("6. Membuat tabel dan mengisi data awal"),
  ...kode("npx prisma migrate deploy", "npx prisma db seed"),
  p("Baris pertama membuat seluruh tabel. Baris kedua memasukkan 6 squad, 39 anggota, dan 1 periode aktif — hasilnya tercetak di layar dan diakhiri Selesai."),
  catatan("Urutan penting.", "Setiap kali Anda menarik pembaruan kode (git pull), jalankan npm run db:migrate SESUDAHNYA, bukan sebelumnya. Migrasi yang dijalankan sebelum kodenya ditarik akan menjawab \"Already in sync\" dengan benar, lalu halaman gagal dengan galat kolom yang tidak dikenal."),

  // ---------------------------------------------------------------------------
  j1("7. Menjalankan dan masuk pertama kali"),
  ...kode("npm run dev"),
  p("Buka http://localhost:3000 di peramban. Masuk lewat formulir bagian bawah, di bawah tulisan \"atau akun dosen\":"),
  poin([tebal("Surel: "), mono("anang.habibi@unisma.ac.id")]),
  poin([tebal("Kata sandi: "), biasa("yang tercetak pada bagian 4")]),
  p("Untuk menghentikan aplikasi, tekan Ctrl + C di Command Prompt."),
  p("Basis data boleh dibiarkan menyala. Bila memakai Docker dan ingin menghentikannya: docker compose -f docker-compose.dev.yml down. Bila memasang PostgreSQL langsung, ia berjalan sebagai layanan Windows dan menyala sendiri setiap laptop dihidupkan."),

  // ---------------------------------------------------------------------------
  j1("8. Mencoba dari ponsel"),
  p("localhost di ponsel berarti ponsel itu sendiri, bukan laptop Anda. Ada empat hal yang harus beres, dan keempatnya wajib."),

  j2("8.1 Cari alamat WiFi laptop"),
  ...kode("npm run alamat", "npm run alamat -- 172.16.15.122"),
  p("Perintah pertama memisahkan alamat WiFi yang nyata dari adaptor virtual, lalu mencetak alamat yang harus dibuka di ponsel. Perintah kedua sekalian menguji apakah ponsel dengan alamat itu benar-benar sejaringan."),
  catatan("Alamat laptop berubah sendiri", "setiap kali menyambung ulang ke WiFi. Jalankan npm run alamat lagi setiap kali ponsel mendadak tidak bisa membuka."),

  j2("8.2 Profil jaringan dan firewall Windows"),
  p("npm run alamat ikut memeriksa keduanya dan menyebutkan sendiri bila ada yang menghalangi. Yang perlu diketahui: profil Public bukan vonis. Yang sebenarnya memblokir adalah tidak adanya aturan Allow untuk profil yang sedang aktif — bila aturan firewall Node.js Anda mencakup Public, ponsel tetap dapat masuk tanpa profilnya diubah."),

  j2("8.3 Kamera memerlukan koneksi aman"),
  p("Peramban hanya mengizinkan kamera pada https atau localhost. Lewat http://172.16.x.x:3000 halamannya terbuka tetapi pemindai QR tidak akan membuka kamera — aplikasi memperingatkannya di atas tombol, sebelum ditekan."),
  p("Syarat ini tidak ada hubungannya dengan ponsel: laptop pun kena bila halamannya dibuka lewat alamat WiFi. Di laptop yang menjalankan peladen, jalan keluarnya paling mudah — buka http://localhost:3000, yang sudah dianggap aman tanpa sertifikat apa pun."),
  p("Untuk ponsel, di Chrome ponsel buka chrome://flags/#unsafely-treat-insecure-origin-as-secure, isi kotak teksnya dengan alamat lengkap berikut portanya, ubah daftar pilihannya menjadi Enabled, tekan Relaunch, lalu paksa berhenti Chrome dan buka lagi."),
  catatan("Di laboratorium langkah ini tidak diperlukan.", "Alamatnya sudah https lewat Caddy, sehingga kamera langsung berfungsi begitu halaman dibuka. Anggota tidak perlu menyentuh chrome://flags sama sekali."),

  j2("8.4 Subnet laboratorium"),
  p("Absensi hanya diterima dari dalam jaringan yang tercantum di LAB_SUBNETS. Nilainya diambil dari kolom \"jaringan\" pada keluaran npm run alamat, misalnya 172.16.0.0/20, lalu ditulis di .env:"),
  ...kode("LAB_SUBNETS=172.16.0.0/20", "LAB_NETWORK_BYPASS=false"),
  p("Jalankan ulang npm run dev sesudahnya — berkas .env hanya dibaca saat peladen mulai."),

  // ---------------------------------------------------------------------------
  j1("9. Memasang di laboratorium (produksi)"),
  p("Prasyarat: Docker dan Docker Compose pada mini PC laboratorium."),
  ...kode(
    "git clone https://github.com/ananghabibi/SISLAB_ROBOTIKA.git silab",
    "cd silab",
    "cp .env.example .env",
    "openssl rand -base64 32   # untuk AUTH_SECRET",
    "openssl rand -hex 32      # untuk QR_TOKEN_SECRET dan CRON_SECRET",
    "docker compose up -d --build",
    "docker compose exec app npx prisma db seed",
  ),
  p("Aplikasi tersedia di http://<alamat-ip-mini-pc> pada porta 80 lewat Caddy. Migrasi basis data dijalankan otomatis setiap kontainer aplikasi mulai; perintah db seed hanya dijalankan sekali, saat pemasangan."),

  j2("9.1 Yang wajib diisi di .env produksi"),
  tabel(
    ["Variabel", "Keterangan"],
    [
      ["POSTGRES_PASSWORD", "Kata sandi basis data. Jangan dipakai ulang dari tempat lain."],
      ["SANDI_BAWAAN_ANGGOTA", "Kata sandi bawaan setiap akun baru. Minimal 10 karakter; yang lebih pendek diabaikan."],
      ["AUTH_SECRET", "Hasil openssl rand -base64 32."],
      ["AUTH_GOOGLE_ID / SECRET", "Dari Google Cloud Console, tipe Web application."],
      ["LAB_SUBNETS", "Subnet WiFi laboratorium dalam notasi CIDR. Salah isi = seluruh absensi ditolak."],
      ["LAB_NETWORK_BYPASS", "Wajib false di laboratorium."],
      ["QR_TOKEN_SECRET", "Hasil openssl rand -hex 32."],
      ["CRON_SECRET", "Hasil openssl rand -hex 32."],
    ],
    [3000, 6026],
    { monoKolom: [0] },
  ),

  j2("9.2 Subnet laboratorium harus benar-benar milik laboratorium"),
  p("Lapis 1 hanya sekuat batas jaringannya. Kalau LAB_SUBNETS diisi subnet WiFi kampus yang menjangkau seluruh fakultas, yang dijamin sistem bukan lagi \"orangnya ada di dalam laboratorium\", melainkan \"orangnya ada di suatu tempat di kampus\" — dan titip absen dari kantin menjadi mungkin lagi."),
  p("Yang dianjurkan: satu router atau access point khusus laboratorium dengan subnetnya sendiri, dipasang di dalam ruangan sehingga jangkauannya berhenti di dinding."),
  p("Cara mengisinya setiap kali jaringan berganti: sambungkan mini PC ke jaringan itu, jalankan npm run alamat di sana, salin blok pada kolom jaringan, tulis di .env, lalu jalankan ulang aplikasinya."),

  j2("9.3 Perintah harian di laboratorium"),
  tabel(
    ["Perintah", "Guna"],
    [
      ["docker compose ps", "Status seluruh layanan"],
      ["docker compose logs -f app", "Log aplikasi, mengalir"],
      ["docker compose restart app", "Muat ulang aplikasi"],
      ["docker compose down", "Hentikan semuanya; data tetap aman di volume"],
    ],
    [3600, 5426],
    { monoKolom: [0] },
  ),

  j2("9.4 Cadangan"),
  p("Layanan backup pada Docker Compose membuat dump terkompresi setiap hari pukul 02:00 WIB ke folder ./backups/, menyimpan 30 hari terakhir. Dump lama hanya dibuang setelah dump baru berhasil."),
  ...kode("ls -lh backups/", "docker compose logs backup | tail -20"),
  catatan("Salin isi backups/ ke media lain secara berkala.", "Flashdisk atau penyimpanan awan laboratorium. Cadangan yang hanya tinggal di mesin yang sama tidak menolong saat mesin itu rusak."),

  // ---------------------------------------------------------------------------
  new Paragraph({ children: [new PageBreak()] }),
  j1("10. Kalau ada yang gagal"),
  tabel(
    ["Yang terlihat", "Sebabnya", "Yang dilakukan"],
    [
      ["'npm' atau 'git' is not recognized", "Perkakasnya belum terpasang, atau Command Prompt belum dibuka ulang", "Pasang, lalu tutup dan buka lagi Command Prompt"],
      ["fatal: not a git repository", "Belum berada di dalam folder proyek", "cd %USERPROFILE%\\Documents\\silab"],
      ["error during connect / docker daemon is not running", "Docker Desktop belum menyala", "Jalankan Docker Desktop, tunggu sampai siap"],
      ["failed to resolve reference \"docker.io/...\"", "Jaringan memblokir Docker Hub", "Pakai Pilihan B pada bagian 5"],
      ["Can't reach database server at localhost:5432", "Basis data belum menyala, atau DATABASE_URL salah", "Nyalakan basis data; periksa baris DATABASE_URL di .env"],
      ["EADDRINUSE :3000 atau \"Port 3000 is in use\"", "Ada npm run dev lain yang masih hidup", "Tutup yang lama; jangan biarkan dua peladen berjalan bersamaan"],
      ["EPERM ... query_engine-windows.dll.node", "npm run dev masih hidup dan mengunci berkasnya", "Hentikan npm run dev dulu, baru jalankan migrasi atau build"],
      ["Unknown argument pada nama kolom", "Kode sudah ditarik tetapi migrasinya belum dijalankan", "Hentikan peladen, jalankan npm run db:migrate, jalankan lagi"],
      ["localhost:3000 kosong padahal alamat IP bisa dibuka", "Windows menerjemahkan localhost ke IPv6", "Pakai http://127.0.0.1:3000"],
      ["Halaman rintisan padahal fiturnya sudah ada", "Cabang git yang dibuka bukan cabang yang berisi pekerjaannya", "git branch --show-current, lalu pindah ke cabang yang benar"],
    ],
    [2800, 3000, 3226],
  ),

  // ---------------------------------------------------------------------------
  j1("11. Perintah yang sering dipakai"),
  tabel(
    ["Perintah", "Guna"],
    [
      ["npm run dev", "Jalankan aplikasi untuk pengembangan"],
      ["npm run alamat", "Cari alamat WiFi laptop untuk dibuka dari ponsel"],
      ["npm run alamat -- <ip-ponsel>", "Sama, sekalian menguji apakah ponsel itu sejaringan"],
      ["npm run db:migrate", "Terapkan migrasi basis data yang tertunda"],
      ["npm run db:seed", "Isi ulang data awal"],
      ["npm run db:studio", "Jelajahi isi basis data lewat peramban"],
      ["npm run typecheck", "Periksa tipe TypeScript"],
      ["npm test", "Jalankan seluruh uji otomatis"],
      ["npm run build", "Build produksi"],
      ["npm run sandi -- <surel> <sandi>", "Pasang kata sandi seorang anggota dari peladen"],
      ["npm run impor:absensi -- <berkas.csv>", "Periksa berkas absensi lama, tanpa menulis"],
    ],
    [4000, 5026],
    { monoKolom: [0] },
  ),

  // ---------------------------------------------------------------------------
  j1("12. Daftar periksa pemasangan"),
  p("Centang berurutan. Bila ada yang belum, jangan lanjut ke baris berikutnya."),
  tabel(
    ["", "Yang dipastikan"],
    [
      ["□", "node -v menampilkan v22.x"],
      ["□", "git --version menampilkan sebuah versi"],
      ["□", "Berada di dalam folder silab"],
      ["□", "npm ci selesai tanpa galat"],
      ["□", "Berkas .env ada, dan kedua kata sandi (masuk pertama dan bawaan anggota) sudah dicatat"],
      ["□", "Basis data menyala (Docker atau layanan Windows)"],
      ["□", "npx prisma migrate deploy selesai"],
      ["□", "npx prisma db seed berakhir dengan Selesai."],
      ["□", "npm run dev berjalan dan http://localhost:3000 terbuka"],
      ["□", "Berhasil masuk sebagai Kepala Laboratorium"],
      ["□", "LAB_SUBNETS sudah diisi subnet yang benar"],
      ["□", "Ponsel berhasil membuka alamat WiFi laptop"],
    ],
    [600, 8426],
  ),
];

const dokumen = new Document({
  creator: "SILAB — Laboratorium Robotika FT UNISMA",
  title: "Panduan Instalasi SILAB",
  description: "Pemasangan SILAB langkah demi langkah, untuk laptop dan mini PC laboratorium.",
  styles: G.gayaDokumen,
  numbering: G.penomoran,
  sections: [
    {
      properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
      footers: { default: kaki("Panduan Instalasi") },
      children: isi,
    },
  ],
});

Packer.toBuffer(dokumen).then((b) => {
  fs.writeFileSync(process.argv[2], b);
  console.log("Tersimpan:", process.argv[2], (b.length / 1024).toFixed(0) + " KB");
});
