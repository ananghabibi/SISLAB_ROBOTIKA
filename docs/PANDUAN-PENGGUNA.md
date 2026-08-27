# Panduan Pengguna SILAB

Sistem Informasi Laboratorium Robotika — Fakultas Teknik, Universitas Islam
Malang.

Panduan ini untuk **anggota dan pengurus laboratorium**. Kalau Anda yang
memasang atau merawat sistemnya, baca [`../README.md`](../README.md).

> **Status.** Absensi, skor kontribusi, pengelolaan anggota, serta inventaris
> dan peminjaman alat sudah berjalan. Piket, logbook, dan Surat Keterangan
> Kontribusi menyusul — menunya sudah tampak tetapi isinya belum ada.

---

## 1. Masuk ke sistem

Buka alamat SILAB yang diberikan pengurus lewat peramban ponsel atau komputer.

**Anggota mahasiswa** — tekan **Masuk dengan akun Google kampus**, pilih akun
kampus Anda. Tidak ada kata sandi yang perlu diingat.

**Dosen dan pengawas** — pakai formulir bagian bawah: surel dan kata sandi.

### Kalau gagal masuk

| Pesan | Artinya | Yang harus dilakukan |
|---|---|---|
| Surel ini belum terdaftar sebagai anggota | Nama Anda belum ada di daftar SK Keanggotaan | Hubungi Koordinator Operasional |
| Gunakan surel kampus | Anda memilih akun Gmail pribadi | Ulangi, pilih akun kampus |
| Status keanggotaan Anda bukan AKTIF atau CUTI | Status Anda NONAKTIF atau LULUS | Hubungi Kepala Laboratorium |
| Surel atau kata sandi salah | Untuk akun dosen | Periksa kata sandinya |

Akun **tidak dibuat otomatis** dari hasil login. Daftar anggota berasal dari SK
Keanggotaan, bukan dari siapa pun yang kebetulan punya surel kampus.

---

## 2. Absen masuk

Absensi hanya bisa dilakukan **dari dalam laboratorium**, tersambung WiFi lab.
Ini disengaja — lihat bagian 8.

1. Sambungkan ponsel ke **WiFi laboratorium**
2. Buka SILAB, masuk ke menu **Absensi Saya**
3. Tekan **Pindai QR untuk absen masuk**
4. Arahkan kamera ke **QR di layar laboratorium**
5. Ketik **kode harian** enam huruf yang tampil di layar itu
6. Pilih jenis kegiatan, tekan **Catat absen masuk**

Nama Anda akan muncul di daftar **Sedang di laboratorium** pada layar lab.

### Yang perlu diketahui

- **Satu sesi per orang per hari.** Absen masuk kedua pada hari yang sama
  ditolak.
- **QR berganti setiap 60 detik.** Kalau terlalu lama, pindai ulang yang sedang
  tampil.
- **Kode harian hanya ada di layar lab.** Ia tidak pernah dikirim lewat aplikasi,
  tidak muncul di dasbor, dan tidak bisa dilihat dari ponsel. Jangan
  memfotokannya untuk teman — lihat bagian 8.

---

## 3. Absen pulang

Langkahnya sama, tetapi tombolnya berganti sendiri menjadi **Pindai QR untuk
absen pulang**. Sebelum sesi ditutup, dua pertanyaan **wajib** dijawab:

**Apa yang Anda kerjakan hari ini?**
Minimal 15 karakter, dalam kalimat yang bisa dibaca orang lain. Isian asal
seperti `----------------` ditolak.

> Contoh yang baik: *"Kalibrasi ulang sensor IMU dan menyimpan datanya ke
> logbook squad."*

**Kendala hari ini.**
Wajib dijawab. Kalau memang tidak ada, centang **Tidak ada kendala** — jangan
mengetik tanda hubung.

Alasannya sederhana: saat Program Studi mengaudit kontribusi Anda, yang terbaca
bukan hanya "hadir sekian jam", melainkan apa yang benar-benar dikerjakan.

### Lupa absen pulang

Sesi yang tidak diakhiri **tetap dihitung hadir**, tetapi durasinya nol. Sistem
tidak akan mengarang jam pulang Anda. Jangan dibiasakan — jam kerja yang tidak
tercatat tidak bisa dipulihkan.

---

## 4. Melihat skor kontribusi

Menu **Dasbor** dan **Rekap Kontribusi** menampilkan skor Anda beserta
rinciannya, dan yang terpenting: **apa yang masih kurang**.

Skor dihitung 0–100:

| Komponen | Bobot |
|---|---|
| Kehadiran | 40 |
| Sesi berbagi | 20 |
| Piket | 20 |
| Logbook squad | 20 |
| Alat belum dikembalikan | −5 per alat |

Ambang kelulusan bawaan **70**, dan Kepala Laboratorium dapat mengubahnya tiap
periode.

Anda tidak perlu bertanya kepada siapa pun untuk tahu posisi Anda. Kalau
kehadiran masih kurang 12 hari, halaman itu menuliskannya apa adanya.

> **Papan peringkat antaranggota sengaja tidak dibuat.** Daftar diurutkan
> menurut nama, bukan skor. Kontribusi bukan perlombaan antarteman.

### Siapa melihat skor siapa

| Peran | Yang terlihat |
|---|---|
| Anggota | Dirinya sendiri saja |
| Ketua Squad | Anggota squadnya |
| Koordinator, Kepala Lab, Pengawas | Seluruh anggota |

---

## 5. Alat yang Anda pinjam

Menu **Peminjaman** menampilkan alat yang sedang Anda pegang beserta tenggatnya.
Anda hanya melihat pinjaman Anda sendiri; pencatatan pinjam dan kembali
dilakukan pengurus, bukan Anda.

Kembalikan tepat waktu. Alat yang lewat tenggat memotong skor kontribusi Anda 5
poin per alat, dan potongannya baru hilang setelah alatnya benar-benar tercatat
kembali.

Untuk alat yang dibawa **keluar** laboratorium, Anda diminta menyerahkan **KTM
atau KTP** untuk difoto petugas. Fotonya dihapus sendiri saat alat Anda
kembalikan, dan selama disimpan hanya bisa dilihat petugas yang mencatat
peminjaman.

---

## 6. Untuk pengurus

### Koordinator Operasional — absensi manual

Dipakai **hanya** bila jaringan atau layar laboratorium bermasalah.

**Absensi Manual** → pilih anggota → isi jam → **tulis alasan sedikitnya 25
karakter** → centang pernyataan → catat.

Setiap catatan diberi penanda **Manual** yang selalu terlihat di rekap, dan
tercatat di audit log atas nama Anda. Jalur ini sengaja dibuat merepotkan: kalau
mulai sering dipakai, yang perlu diperbaiki jaringan atau layarnya, bukan
menambah kenyamanan di sana.

### Koordinator Operasional / Ketua Squad — peminjaman alat

**Inventaris** memuat seluruh aset laboratorium beserta kondisinya dan siapa
yang sedang memegangnya.

**Mencetak label QR.** Tombol **Cetak label QR** di halaman Inventaris
menghasilkan PDF berisi 21 label per lembar A4 — QR, kode aset, nama, kategori,
dan lokasi. Bila Anda sedang menyaring daftarnya (misal satu kategori saja),
yang tercetak hanya yang tampak, jadi label yang sudah tertempel tidak perlu
dicetak ulang. Gunting menurut garis putus-putus, tempel pada alatnya.

**Mencatat alat keluar.** Pada baris asetnya, tekan **Pinjamkan alat ini** —
atau **Peminjaman → Catat peminjaman** lalu pindai label QR pada alatnya.
Kolom kodenya tetap bisa diketik tangan kalau labelnya sobek atau kameranya
tidak mau terbuka. Isi peminjam, jumlah, tanggal rencana kembali, keperluan,
dan **foto kondisi alat saat itu**. Fotonya wajib: kalau nanti ada yang lecet,
foto inilah yang menentukan sejak kapan.

Yang tercatat sebagai penyerah alat adalah **Anda**, bukan peminjamnya. Setiap
alat yang keluar punya dua nama.

**Alat yang dibawa keluar laboratorium.** Centang **Dibawa keluar
laboratorium**, lalu foto **KTM atau KTP** peminjam. Tanpa foto itu sistem
menolak menyimpan — penolakannya terjadi sampai di tingkat basis data, jadi
tidak ada jalan pintas. Alat yang hanya dipakai di dalam lab tidak menuntutnya;
meminta KTM untuk alat yang dipakai di meja sebelah hanya akan membuat centang
itu ditekan asal, dan jaminannya kehilangan arti.

Foto kartu identitas **dihapus otomatis begitu alat dikembalikan**. Keperluannya
habis di situ, sedangkan pindaian KTM yang mengendap di komputer lab — dan ikut
tersalin ke setiap cadangan harian — hanya menambah risiko. Yang tersisa di
catatan adalah keterangan bahwa jaminan itu pernah ada beserta waktu
penghapusannya. Selama alat masih di luar, fotonya hanya dapat dibuka petugas
yang berwenang mencatat peminjaman; anggota lain menerima 403 sekalipun
tautannya bocor.

**Satu alat tidak bisa dipinjam dua orang.** Bila alat itu belum dikembalikan,
sistem menolak dengan menyebut nama alatnya. Penolakan ini terjadi di basis
data, jadi dua petugas yang menekan tombol pada detik yang sama pun tidak bisa
sama-sama lolos.

**Mencatat alat kembali.** Halaman **Peminjaman** menampilkan alat yang masih di
luar, diurutkan dari tenggat yang paling dekat; yang lewat tenggat diberi
penanda merah **Terlambat**, dan yang dibawa keluar lab diberi penanda **Di
luar lab**. Buka **Catat pengembalian** pada barisnya, pilih
kondisi saat kembali, unggah fotonya. Kondisi yang bukan `BAIK` wajib disertai
catatan, dan kondisi asetnya di inventaris ikut turun mengikutinya.

**Alat yang belum kembali memotong skor kontribusi peminjamnya** sebesar 5 poin
per alat — tetapi hanya setelah tenggatnya lewat. Pinjaman yang masih dalam
tenggat bukan pelanggaran.

### Kepala Laboratorium

- **Anggota** — menambah, mengubah peran, mengubah status. Melepas anggota
  dilakukan dengan mengubah status menjadi `LULUS` atau `NONAKTIF`, **bukan
  menghapus**, supaya riwayat absensinya tetap utuh.
- **Periode & Target** — mengatur target hadir, sesi berbagi, piket, logbook,
  dan ambang lulus. Target bernilai nol berarti komponen itu tidak disyaratkan.
- **Peran & Hak Akses** — melihat matriks kewenangan seluruh peran.
- **Ekspor Data** — CSV dan PDF rekap per periode untuk diserahkan ke Program
  Studi.

### Semua pengurus

Catatan absensi **tidak dapat diubah atau dihapus oleh siapa pun**, termasuk
Kepala Laboratorium. Koreksi dilakukan dengan catatan pembatalan yang tetap
merujuk catatan aslinya, sehingga jejaknya tidak hilang.

---

## 7. Layar laboratorium

Satu monitor di dalam ruangan menampilkan halaman `/display` dalam mode layar
penuh (tekan **F11**). Isinya jam besar, kode harian, QR berputar, dan daftar
nama yang sedang berada di lab.

Halaman ini tidak memerlukan login, tetapi **hanya dapat dibuka dari dalam
laboratorium**. Biarkan menyala sepanjang jam operasional.

Bila basis data bermasalah, layar tetap menampilkan jam beserta pesan yang
jelas — supaya tidak ada yang mengira laboratoriumnya tutup.

---

## 8. Mengapa harus di dalam laboratorium

Sistem ini punya tiga lapis yang berlaku bersamaan:

1. **Jaringan** — permintaan harus datang dari WiFi laboratorium
2. **Kode harian** — enam huruf, hanya tampil di layar lab
3. **QR berputar** — berganti tiap 60 detik, ditolak setelah 90 detik

Lapis 2 sendirian bisa dikalahkan dengan memotret layar dan mengirimkannya lewat
WhatsApp. Lapis 3 mempersempit jendelanya menjadi satu menit. **Lapis 1
menutupnya sama sekali** — token yang direlai pun tidak berguna dari luar
jaringan lab.

Karena itu peladennya hidup di dalam laboratorium, bukan di awan. Kalau seseorang
tidak berada di ruangan itu, ia tidak bisa mencatatkan kehadirannya dengan cara
apa pun selain meminta Koordinator Operasional mencatat manual — dan itu
meninggalkan jejak.

---

## 9. Masalah yang sering terjadi

### "Absensi hanya dapat dilakukan dari dalam jaringan WiFi laboratorium"

Ponsel Anda memakai data seluler atau WiFi lain. Sambungkan ke WiFi lab. Kalau
sudah tersambung dan pesannya tetap muncul, laporkan ke Koordinator Operasional
— kemungkinan subnet lab berubah.

### "Token QR sudah kedaluwarsa"

QR yang Anda pindai sudah berganti. Pindai lagi yang sedang tampil.

### "Kode harian salah"

Baca ulang dari layar. Huruf yang mudah tertukar (`0` `O` `1` `I` `l`) sengaja
tidak dipakai, jadi yang tampak seperti `O` pasti huruf, dan yang tampak seperti
`1` tidak ada.

### "Anda sudah absen masuk hari ini"

Satu sesi per orang per hari. Yang tersisa hanya absen pulang.

### "Terlalu banyak percobaan"

Batasnya 10 percobaan per 5 menit. Tunggu sebentar.

### Tombol Pindai QR tidak membuka kamera

Aplikasi akan menyebutkan sebabnya. Yang paling sering:

- **"…dibuka lewat koneksi http…"** — alamat yang Anda buka belum memakai
  `https`. Laporkan ke pengurus; di laboratorium alamatnya seharusnya sudah
  `https`.
- **"Izin kamera ditolak"** — aktifkan izin kamera untuk situs ini di pengaturan
  peramban.
- **"Kamera sedang dipakai aplikasi lain"** — tutup aplikasi kamera atau
  panggilan video.

---

## 10. Khusus pengurus: menguji dari ponsel di alamat `http`

**Bagian ini bukan untuk anggota.** Di laboratorium, alamatnya sudah `https` dan
kamera langsung berfungsi.

Saat menguji di laptop pengembangan yang alamatnya masih `http://192.168.x.x:3000`,
peramban menolak menyalakan kamera. Chrome di ponsel dapat diberi tahu bahwa satu
alamat itu boleh dianggap aman:

1. Di Chrome ponsel buka:
   ```
   chrome://flags/#unsafely-treat-insecure-origin-as-secure
   ```
2. Entri **"Insecure origins treated as secure"** punya **dua** kendali, dan
   keduanya harus diisi:
   - **Kotak teks** → alamat lengkap berikut portnya, tanpa garis miring di
     akhir, misalnya `http://192.168.1.138:3000`
   - **Daftar pilihan** di bawahnya → ubah menjadi **`Enabled`**
3. Tekan **Relaunch**
4. **Tutup Chrome sepenuhnya** dari daftar aplikasi terbaru, lalu buka lagi

Setelah itu kamera berfungsi pada alamat tersebut.

> **Kembalikan ke `Disabled` setelah selesai menguji.** Setelan ini melemahkan
> pengamanan peramban Anda untuk alamat tersebut, dan tidak boleh dibiarkan
> menyala. Jangan pernah meminta 38 anggota melakukan langkah ini — kalau
> terasa perlu, yang kurang adalah `https` di peladennya.

---

## 11. Pertanyaan yang belum terjawab di sini

Hubungi **Koordinator Operasional** untuk absensi, keanggotaan, dan inventaris;
**Kepala Laboratorium** untuk peran, periode, dan Surat Keterangan Kontribusi.
