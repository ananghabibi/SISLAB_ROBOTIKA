const fs = require("node:fs");
const { Document, Packer, Paragraph, PageBreak, TableOfContents, TextRun } = require("docx");
const G = require("./gaya.js");
const { j1, j2, p, poin, langkah, kode, catatan, tabel, jarak, kaki, sampul, tebal, biasa, mono } = G;

/** Satu bagian menu: siapa yang boleh, untuk apa, langkahnya, catatannya. */
function menu(judul, { siapa, untukApa, langkahLangkah = [], perluTahu = [], catatanKhusus }) {
  const bagian = [
    j1(judul),
    p([tebal("Siapa yang boleh: "), biasa(siapa)], { spacing: { after: 60 } }),
    p([tebal("Untuk apa: "), biasa(untukApa)]),
  ];
  if (langkahLangkah.length) {
    bagian.push(j2("Langkahnya"));
    bagian.push(...langkahLangkah.map((t) => langkah(t)));
  }
  if (perluTahu.length) {
    bagian.push(j2("Yang perlu diketahui"));
    bagian.push(...perluTahu.map((t) => poin(t)));
  }
  if (catatanKhusus) bagian.push(catatan(catatanKhusus[0], catatanKhusus[1]));
  return bagian;
}

const isi = [
  ...sampul(
    "Tutorial Setiap Menu",
    "Panduan pemakaian untuk anggota dan pengurus",
    "Laboratorium Robotika — 39 anggota, 6 squad",
  ),
  new Paragraph({ children: [new PageBreak()] }),

  new Paragraph({ text: "Daftar Isi", heading: "Heading1" }),
  new TableOfContents("Daftar Isi", { hyperlink: true, headingStyleRange: "1-1" }),
  p([biasa("Setelah membuka dokumen ini di Word, tekan "), tebal("Ctrl + A"), biasa(" lalu "), tebal("F9"), biasa(" untuk memunculkan nomor halaman pada daftar isi.")], { spacing: { before: 200 } }),
  new Paragraph({ children: [new PageBreak()] }),

  // ---------------------------------------------------------------------------
  j1("Sebelum mulai: masuk dan mengenal layar"),
  p("Buka alamat SILAB laboratorium di peramban ponsel atau komputer. Ada dua jalan masuk:"),
  poin([tebal("Anggota mahasiswa"), biasa(" — tombol Masuk dengan Google, memakai surel kampus.")]),
  poin([tebal("Dosen"), biasa(" — formulir surel dan kata sandi di bagian bawah halaman.")]),
  p("Sesudah masuk, menu di sisi kiri (atau tombol Menu di ponsel) hanya menampilkan halaman yang menjadi hak akses Anda. Menu yang tidak terlihat memang tidak dapat dibuka — mengetik alamatnya langsung pun tetap ditolak peladen."),
  catatan("Percobaan masuk dibatasi.", "Lima kali salah kata sandi pada satu akun akan menahannya selama sepuluh menit. Bila lupa kata sandi, minta Koordinator Operasional memasang ulang — jangan menebak berkali-kali."),

  j2("Peran dan apa yang terlihat"),
  tabel(
    ["Peran", "Ringkasnya"],
    [
      ["Kepala Laboratorium", "Melihat semuanya. Satu-satunya yang menerbitkan Surat Keterangan Kontribusi dan mengubah peran."],
      ["Koordinator Operasional", "Absensi, inventaris, peminjaman, piket, K3, dan absensi manual darurat."],
      ["Koordinator Riset", "Logbook riset seluruh squad, dan jadwal uji."],
      ["Koordinator Pengembangan", "Membaca hampir semuanya; menulis pada modul pengembangan."],
      ["Ketua Squad", "Squadnya sendiri: logbook, piket, peminjaman alat, dan rekap anggotanya."],
      ["Anggota", "Absensi sendiri, skor sendiri, logbook squadnya, dan pelaporan insiden."],
      ["Pengawas", "Membaca untuk keperluan audit. Tidak pernah dapat menulis apa pun."],
    ],
    [2600, 6426],
  ),

  // ---------------------------------------------------------------------------
  new Paragraph({ children: [new PageBreak()] }),
  ...menu("1. Dasbor", {
    siapa: "Semua peran.",
    untukApa: "Halaman pertama sesudah masuk. Menampilkan periode berjalan, skor kontribusi Anda, dan hal-hal yang menuntut perhatian hari ini.",
    perluTahu: [
      "Kartu paling atas adalah yang paling mendesak. Laporan insiden yang menunggu tindak lanjut selalu berada di sana bagi Kepala Lab dan Koordinator.",
      "Koordinator juga melihat penanda squad yang belum mengisi logbook pekan berjalan, dan penanda piket hari ini yang belum dicatat.",
      "Bila absensi Anda berhasil tetapi rekapnya nol, dasbor menyebutkan sebabnya — biasanya tanggalnya berada di luar rentang periode aktif.",
      "Anggota biasa tidak melihat daftar squad yang tertinggal. Itu pengingat untuk koordinator, bukan papan aib.",
    ],
  }),

  ...menu("2. Absensi Saya", {
    siapa: "Semua peran kecuali Pengawas.",
    untukApa: "Absen masuk saat tiba di laboratorium, absen pulang saat meninggalkannya, dan melihat riwayat kehadiran Anda sendiri.",
    langkahLangkah: [
      "Pastikan ponsel tersambung ke WiFi laboratorium. Absensi memang tidak dapat dilakukan dari luar.",
      "Buka menu Absensi Saya, lalu tekan tombol Pindai QR untuk absen masuk.",
      "Arahkan kamera ke QR yang tampil di layar laboratorium. QR berganti setiap 60 detik; yang kedaluwarsa cukup dipindai ulang.",
      "Sesudah QR terbaca, ketik kode harian enam karakter yang tertulis di layar yang sama.",
      "Pilih jenis kegiatan, tulis rencana kerja hari itu, lalu kirim.",
      "Saat pulang, ulangi dengan tombol Pindai QR untuk absen pulang, lalu isi uraian pekerjaan dan kendala bila ada.",
    ],
    perluTahu: [
      "Satu sesi per orang per hari. Absen masuk kedua pada hari yang sama ditolak dengan pesan yang jelas.",
      "Absen pulang tanpa absen masuk juga ditolak.",
      "Sesi yang tidak diakhiri dengan pindai pulang TETAP dihitung hadir. Yang menjadi nol hanya durasinya, dan skor kontribusi tidak memakai durasi sama sekali.",
      "Jam pulang tidak pernah dikarang sistem. Yang tidak tercatat tertulis apa adanya sebagai tidak diakhiri.",
    ],
    catatanKhusus: [
      "Kamera tidak mau terbuka?",
      "Peramban hanya mengizinkan kamera pada koneksi aman. Di laboratorium alamatnya sudah aman, jadi kamera langsung berfungsi. Bila muncul peringatan di atas tombol, laporkan ke pengurus — bukan Anda yang keliru.",
    ],
  }),

  ...menu("3. Rekap Absensi", {
    siapa: "Semua peran, dengan lingkup berbeda. Anggota melihat dirinya sendiri; Ketua Squad melihat squadnya; Kepala Lab, Koordinator, dan Pengawas melihat seluruhnya.",
    untukApa: "Melihat skor kontribusi beserta rinciannya, dan mengetahui angka mana yang masih kurang.",
    perluTahu: [
      "Skor disusun dari lima komponen: hari hadir, sesi berbagi, piket, entri logbook squad, dan potongan untuk alat yang belum kembali.",
      "Anggota tidak dapat melihat skor anggota lain lewat jalan mana pun, termasuk lewat alamat API.",
      "Bagian Yang masih kurang menyebutkan berapa lagi yang dibutuhkan untuk tiap komponen — dipakai untuk memperbaiki diri selagi periodenya masih berjalan.",
      "Rekap hanya menghitung absensi yang tanggalnya berada di dalam periode aktif. Halaman ini menyebutkannya bila ternyata di luar.",
    ],
  }),

  ...menu("4. Absensi Manual", {
    siapa: "Kepala Laboratorium dan Koordinator Operasional saja.",
    untukApa: "Jalan darurat ketika jaringan atau layar laboratorium bermasalah dan anggota tidak dapat absen sendiri.",
    langkahLangkah: [
      "Pilih anggota yang akan dicatatkan.",
      "Isi jam masuk, dan jam pulang bila memang sudah diketahui.",
      "Tulis alasan sedikitnya 25 karakter — apa yang terjadi sehingga absensinya tidak bisa dilakukan sendiri.",
      "Kirim. Catatan itu diberi penanda Manual yang selalu terlihat di rekap.",
    ],
    catatanKhusus: [
      "Jalur ini sengaja dibuat merepotkan.",
      "Kalau ia mulai sering dipakai, yang perlu diperbaiki adalah jaringan atau layarnya — bukan menambah kenyamanan di sini. Setiap catatan manual tercatat di audit log atas nama pencatatnya.",
    ],
  }),

  ...menu("5. Logbook Riset", {
    siapa: "Ketua Squad dan Anggota untuk squadnya sendiri; Koordinator Riset dan Kepala Laboratorium untuk squad mana pun; sisanya membaca.",
    untukApa: "Catatan mingguan pekerjaan riset squad: target, yang dikerjakan, hasil, kendala, dan rencana pekan berikutnya.",
    langkahLangkah: [
      "Buka menu Logbook Riset. Nomor pekan yang sedang berjalan sudah terisi sendiri.",
      "Centang anggota squad yang ikut bekerja pekan itu.",
      "Isi target, yang dikerjakan, hasil, dan rencana pekan berikutnya. Kendala boleh dikosongkan.",
      "Lampirkan bukti kegiatan bila ada — tidak wajib.",
      "Simpan.",
    ],
    perluTahu: [
      "Satu entri per squad per pekan. Percobaan kedua ditolak.",
      "Pekan dihitung mulai Senin, bukan mulai hari periode dibuka.",
      "Logbook tidak dapat diisi untuk pekan yang belum tiba. Kalau boleh, ia akan diisi sebulan sekaligus pada malam sebelum penilaian.",
      "Hasil yang gagal tetap hasil, dan tetap ditulis. Logbook yang hanya memuat keberhasilan tidak menerangkan apa pun.",
    ],
  }),

  ...menu("6. Piket", {
    siapa: "Koordinator Operasional dan Kepala Laboratorium untuk squad mana pun; Ketua Squad untuk squadnya sendiri; sisanya membaca.",
    untukApa: "Mencatat piket harian beserta checklist delapan butir dan foto ruangan sebelum-sesudah.",
    langkahLangkah: [
      "Buka menu Piket. Kartu paling atas menyebutkan squad mana yang terjadwal hari ini.",
      "Centang butir yang memang sudah dikerjakan. Yang belum, biarkan kosong.",
      "Ambil foto ruangan sebelum piket dan sesudah piket — keduanya wajib, dari sudut yang sama.",
      "Simpan.",
    ],
    perluTahu: [
      "Jadwalnya satu squad satu hari kerja. Sabtu dan Minggu tidak dijadwalkan, dan hari tanpa jadwal bukan piket yang terlewat.",
      "Satu catatan piket per squad per hari.",
      "Jumlah alat yang belum kembali tidak perlu diketik — dihitung sendiri dari daftar peminjaman yang masih terbuka.",
    ],
    catatanKhusus: [
      "Tidak wajib delapan dari delapan.",
      "Butir yang belum sempat dikerjakan dibiarkan kosong dan tercatat apa adanya. Catatan piket yang selalu berbunyi 8 dari 8 tidak dapat dipakai memperbaiki apa pun.",
    ],
  }),

  ...menu("7. Laporan Insiden", {
    siapa: "Semua peran boleh melapor. Kepala Laboratorium dan para Koordinator membaca seluruhnya; anggota membaca laporannya sendiri.",
    untukApa: "Melaporkan cedera, kebakaran, kerusakan alat, dan nyaris celaka.",
    langkahLangkah: [
      "Pilih jenis kejadian.",
      "Sebutkan lokasinya sedetail yang Anda ingat.",
      "Tulis kronologinya berurutan, lalu tindakan yang sudah diambil. Boleh diisi belum ada tindakan — yang penting jujur.",
      "Saran pencegahan dan foto boleh dikosongkan.",
      "Kirim.",
    ],
    perluTahu: [
      "Nyaris celaka pun dilaporkan. Kejadian yang belum melukai siapa pun adalah satu-satunya kesempatan memperbaiki keadaan sebelum ada yang terluka.",
      "Tidak ada sanksi atas pelaporan.",
      "Laporan langsung tampil di kartu paling atas dasbor Kepala Laboratorium.",
      "Foto tidak diwajibkan — jangan menunda membereskan keadaan berbahaya hanya demi mengambil gambar. Bila memotret, jangan memotret wajah orang yang terluka.",
    ],
    catatanKhusus: [
      "Laporan tidak dapat dihapus siapa pun,",
      "termasuk oleh yang menulisnya. Yang berubah hanya status tindak lanjutnya: Baru, Ditinjau, Ditangani, Selesai — dan itu hanya oleh Kepala Lab atau Koordinator Operasional.",
    ],
  }),

  ...menu("8. Buku Tamu", {
    siapa: "Semua anggota dapat mencatat; Kepala Laboratorium dan Koordinator membaca seluruhnya.",
    untukApa: "Mencatat tamu, dosen lain, dan mahasiswa non-anggota yang masuk laboratorium.",
    langkahLangkah: [
      "Isi nama tamu, asal instansi, dan keperluannya.",
      "Pilih anggota yang mendampingi selama tamu berada di laboratorium.",
      "Tekan Catat tamu masuk.",
      "Saat tamu pulang, tekan Catat pulang pada barisnya.",
    ],
    perluTahu: [
      "Tamu tidak masuk lewat absensi. Catatan absensi adalah dasar Surat Keterangan Kontribusi, dan satu baris tamu yang menyelinap ke sana merusak angkanya.",
      "Setiap tamu wajib punya pendamping dari anggota aktif. Tamu tanpa yang bertanggung jawab menemaninya adalah persoalan keselamatan.",
      "Jam pulang tidak pernah dikarang. Tamu yang terlanjur pulang tanpa dicatat tetap berakhir dengan jam pulang kosong.",
    ],
  }),

  ...menu("9. Anggota", {
    siapa: "Kepala Laboratorium menambah, mengubah, dan menghapus; Koordinator Operasional menambah dan mengubah; sisanya membaca sesuai lingkupnya.",
    untukApa: "Daftar anggota laboratorium beserta NPM, prodi, angkatan, jenjang, squad, dan statusnya.",
    perluTahu: [
      "Prodi, angkatan, dan jenjang diturunkan otomatis dari NPM — tidak perlu diketik.",
      "Anggota yang lulus atau berhenti diubah statusnya, bukan dihapus. Menghapusnya akan menghilangkan riwayat kontribusinya.",
      "Anggota berstatus tidak aktif tidak dapat masuk lagi, dan perubahan itu berlaku paling lama lima menit sesudahnya.",
      "Penambahan banyak anggota sekaligus pada awal periode lebih mudah lewat berkas CSV — lihat Panduan Instalasi.",
    ],
  }),

  ...menu("10. Peran & Hak Akses", {
    siapa: "Kepala Laboratorium saja.",
    untukApa: "Melihat matriks hak akses seluruh peran, dan mengubah peran seseorang.",
    perluTahu: [
      "Matriks yang ditampilkan halaman ini adalah matriks yang sama yang dipakai peladen menolak permintaan. Tidak ada dua daftar yang bisa berbeda isi.",
      "Kepala Lab tidak dapat mengubah perannya sendiri. Itu penjagaan supaya tidak ada yang tanpa sengaja mengunci dirinya sendiri di luar.",
      "Pengawas tidak pernah memperoleh hak tulis pada modul mana pun, dan itu dikunci uji otomatis.",
    ],
  }),

  ...menu("11. Inventaris", {
    siapa: "Kepala Laboratorium menambah, mengubah, dan menghapus; Koordinator Operasional menambah dan mengubah; sisanya membaca.",
    untukApa: "Daftar seluruh alat laboratorium beserta kondisi, lokasi, dan penanggung jawabnya.",
    perluTahu: [
      "Setiap aset punya kode unik yang dipakai pada label QR.",
      "Label QR siap cetak tersedia dari halaman ini — 21 label per halaman A4, mengikuti saringan yang sedang aktif.",
      "Aset yang ditandai tidak boleh dipinjam akan ditolak saat dicoba dipinjamkan.",
    ],
  }),

  ...menu("12. Peminjaman", {
    siapa: "Kepala Laboratorium, Koordinator Operasional, dan Ketua Squad mencatat; anggota melihat pinjamannya sendiri.",
    untukApa: "Mencatat alat yang keluar dan yang kembali, beserta bukti kondisinya.",
    langkahLangkah: [
      "Tekan Catat peminjaman, lalu pindai label QR alatnya atau ketik kodenya.",
      "Pilih siapa yang meminjam, isi jumlah, keperluan, dan tanggal rencana kembali.",
      "Foto kondisi alat saat dipinjam — wajib.",
      "Bila alat dibawa keluar laboratorium, centang kotaknya dan lampirkan foto KTM atau KTP peminjam.",
      "Saat alat kembali, buka barisnya, pilih kondisinya, foto kondisinya, lalu simpan.",
    ],
    perluTahu: [
      "Yang mencatat adalah petugas, bukan peminjamnya. Setiap alat yang keluar punya dua nama: yang membawa dan yang menyerahkan.",
      "Satu alat hanya boleh punya satu pinjaman terbuka pada satu waktu — dijaga di tingkat basis data, bukan sekadar diperiksa aplikasi.",
      "Alat yang lewat tenggat ditandai terlambat otomatis, dan ikut mengurangi skor kontribusi peminjamnya.",
      "Foto kartu identitas dihapus begitu alatnya kembali.",
    ],
  }),

  ...menu("13. Periode & Target", {
    siapa: "Kepala Laboratorium saja.",
    untukApa: "Membuka periode baru dan menetapkan target hadir, sesi berbagi, piket, logbook, serta ambang kelulusan.",
    perluTahu: [
      "Hanya satu periode boleh aktif pada satu waktu.",
      "Rekap dan Surat Keterangan Kontribusi hanya menghitung yang berada di dalam rentang tanggal periode aktif.",
      "Mengubah target mengubah skor seluruh anggota seketika — tetapi tidak mengubah surat yang sudah terbit.",
    ],
  }),

  ...menu("14. Surat Kontribusi", {
    siapa: "Kepala Laboratorium menerbitkan. Koordinator dan Pengawas membaca daftarnya; anggota melihat suratnya sendiri.",
    untukApa: "Melihat daftar kandidat beserta alasan kelayakan atau ketidaklayakannya, dan menerbitkan Surat Keterangan Kontribusi.",
    langkahLangkah: [
      "Buka menu Surat Kontribusi. Setiap anggota tampil beserta angka tiap syaratnya.",
      "Pada anggota yang akan diberi surat, nyatakan keadaan serah terima dokumentasi tim lomba.",
      "Bila ada syarat yang belum terpenuhi, centang pernyataan bahwa Anda tetap menerbitkannya atas pertimbangan sendiri.",
      "Tekan Terbitkan surat, lalu unduh PDF-nya dari baris yang sama.",
    ],
    perluTahu: [
      "Syaratnya: kehadiran minimal 70 persen, entri logbook squad minimal 70 persen pekan aktif, piket mencapai target periode, dan skor akhir mencapai ambang.",
      "Sistem hanya mengusulkan. Keputusan menerbitkan tetap pada Kepala Laboratorium.",
      "Bila diterbitkan meski ada syarat yang kurang, syarat itu ikut tercetak di suratnya.",
      "Nomor surat berurut per tahun kalender dan tidak pernah bentrok.",
    ],
    catatanKhusus: [
      "Angka pada surat dibekukan saat terbit.",
      "Membatalkan catatan absensi setelah surat keluar tidak mengubah angka pada surat itu — dan memang tidak boleh, karena suratnya mungkin sudah dicetak, ditandatangani, dan dikirim ke Program Studi. Tidak ada tombol membatalkan surat.",
    ],
  }),

  ...menu("15. Audit Log", {
    siapa: "Kepala Laboratorium membaca seluruhnya; Koordinator Operasional membaca jejak tindakannya sendiri.",
    untukApa: "Jejak seluruh perubahan yang dapat dipertanyakan saat audit Program Studi.",
    perluTahu: [
      "Dapat disaring per aksi, per entitas, dan dicari berdasarkan nama pelaku atau id entitas.",
      "Saringannya tersimpan di alamat halaman, sehingga satu tautan sudah cukup untuk menunjukkan hal yang sama kepada orang lain.",
      "Jejak audit tidak dapat dihapus atau disunting oleh siapa pun, termasuk lewat aplikasi ini.",
    ],
  }),

  ...menu("16. Ekspor Data", {
    siapa: "Kepala Laboratorium dan Koordinator Operasional; Koordinator lain dan Pengawas membaca.",
    untukApa: "Mengunduh rekap kontribusi sebagai CSV untuk diolah di Excel, atau sebagai PDF siap cetak.",
    perluTahu: [
      "Berkas CSV memakai penanda BOM sehingga huruf beraksen terbaca benar di Excel.",
      "Isi ekspor mengikuti lingkup hak akses Anda — bukan seluruh laboratorium bila Anda tidak berhak melihatnya.",
    ],
  }),

  ...menu("17. Layar Laboratorium", {
    siapa: "Tidak perlu masuk. Hanya dapat dibuka dari dalam jaringan laboratorium.",
    untukApa: "Layar yang dipasang pada monitor di dalam ruangan. Menampilkan jam, QR absensi yang berputar, kode harian, dan siapa saja yang sedang berada di laboratorium.",
    perluTahu: [
      "Alamatnya diakhiri /display. Buka di monitor ruangan, lalu tekan F11 untuk layar penuh.",
      "Kode harian hanya tampil di sini. Ia tidak pernah muncul di respons API mana pun — itulah sebabnya ia tidak dapat dibaca dari luar ruangan.",
      "QR berganti setiap 60 detik dan sekali pakai.",
      "Bila basis data sedang bermasalah, layar tetap menyala dan menampilkan pesan yang jelas. Layar yang mati total membuat orang mengira laboratoriumnya tutup.",
    ],
  }),

  ...menu("18. Profil", {
    siapa: "Semua peran, untuk dirinya sendiri.",
    untukApa: "Melihat data diri dan mengganti kata sandi bagi yang masuk lewat surel dan kata sandi.",
    perluTahu: [
      "Yang masuk lewat Google kampus tidak memiliki kata sandi di sistem ini, dan tidak perlu menggantinya.",
      "Penggantian kata sandi menuntut kata sandi lama, dan dibatasi lima percobaan tiap sepuluh menit.",
    ],
  }),

  // ---------------------------------------------------------------------------
  new Paragraph({ children: [new PageBreak()] }),
  j1("Pesan yang sering muncul, dan artinya"),
  tabel(
    ["Pesan", "Artinya", "Yang dilakukan"],
    [
      ["Absensi hanya dapat dilakukan dari dalam jaringan WiFi laboratorium", "Anda memakai data seluler atau WiFi lain", "Sambungkan ke WiFi laboratorium, lalu ulangi"],
      ["Token QR sudah kedaluwarsa", "QR berganti tiap 60 detik dan Anda terlambat sedikit", "Pindai ulang QR yang sedang tampil"],
      ["Kode harian salah", "Salah ketik, atau membaca kode kemarin", "Baca ulang kode di layar laboratorium; enam karakter"],
      ["Anda sudah absen masuk hari ini", "Satu sesi per orang per hari", "Tidak perlu diulang; absen pulang saja saat pulang"],
      ["Terlalu banyak percobaan", "Pembatas menahan penebakan beruntun", "Tunggu sebentar sesuai yang disebutkan, lalu ulangi"],
      ["Halaman ini bukan hak akses Anda", "Peran Anda memang tidak mencakup halaman itu", "Bukan kerusakan. Hubungi pengurus bila memang seharusnya berhak"],
      ["Pekan itu belum tiba", "Logbook diisi untuk pekan yang belum berjalan", "Isi untuk pekan berjalan saja"],
      ["Alat ini sedang dipinjam dan belum dikembalikan", "Satu alat satu pinjaman terbuka", "Catat pengembaliannya dulu"],
    ],
    [3000, 3000, 3026],
  ),

  // ---------------------------------------------------------------------------
  j1("Yang sengaja tidak bisa dilakukan siapa pun"),
  p("Daftar ini ditulis terbuka supaya tidak ada yang mengira sedang menemukan kerusakan."),
  poin("Mengubah atau menghapus catatan absensi. Koreksi memakai catatan pembatalan yang merujuk catatan aslinya, dan pembatalan itu meninggalkan jejak atas nama pembatalnya."),
  poin("Menghapus laporan insiden, jejak audit, atau surat yang sudah terbit."),
  poin("Melihat skor anggota lain, bagi yang tidak berhak — termasuk lewat alamat API."),
  poin("Absen dari luar laboratorium, walau kode harian dan QR-nya diketahui."),
  poin("Menitipkan absen. Ketiga lapis — jaringan, kode harian, dan QR berputar — berlaku bersamaan."),
  poin("Mengubah nilai lewat peralatan pengembang peramban. Setiap kiriman diperiksa ulang di peladen; yang berubah hanya tampilannya, bukan datanya."),
  p("Yang TIDAK dijanjikan sistem ini: ia tidak menghentikan orang yang memang berada di dalam laboratorium lalu mengabsenkan dirinya sambil tidak mengerjakan apa pun. Itu urusan pengawasan manusia, dan memang seharusnya begitu.", { spacing: { before: 200 } }),
];

const dokumen = new Document({
  creator: "SILAB — Laboratorium Robotika FT UNISMA",
  title: "Tutorial Setiap Menu SILAB",
  description: "Panduan pemakaian tiap menu SILAB untuk anggota dan pengurus laboratorium.",
  styles: G.gayaDokumen,
  numbering: G.penomoran,
  sections: [
    {
      properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
      footers: { default: kaki("Tutorial Setiap Menu") },
      children: isi,
    },
  ],
});

Packer.toBuffer(dokumen).then((b) => {
  fs.writeFileSync(process.argv[2], b);
  console.log("Tersimpan:", process.argv[2], (b.length / 1024).toFixed(0) + " KB");
});
