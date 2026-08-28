// -----------------------------------------------------------------------------
// Surat Keterangan Kontribusi (SPEC 6.2).
//
// Dua hal yang membentuk seluruh berkas ini:
//
// 1. Sistem hanya MENGUSULKAN. Keputusan tetap pada Kepala Laboratorium, dan
//    surat itu pernyataan pribadi seorang dosen kepada Program Studi — bukan
//    keluaran otomatis sebuah aplikasi. Karena itu yang dihitung di sini adalah
//    daftar syarat beserta angkanya, bukan tombol "layak/tidak layak" yang
//    menutup pertimbangan.
// 2. Alasan KETIDAKLAYAKAN sama pentingnya dengan kelayakan. Anggota yang
//    tidak diusulkan berhak tahu persis angka mana yang kurang dan berapa
//    kurangnya, supaya masih sempat memperbaikinya sebelum periode ditutup.
// -----------------------------------------------------------------------------

/** Ambang kehadiran dan logbook menurut SPEC 6.2, dalam persen. */
export const AMBANG_HADIR_PERSEN = 70;
export const AMBANG_LOGBOOK_PERSEN = 70;

export interface SyaratSkk {
  label: string;
  /** null berarti belum dapat dinilai — menunggu konfirmasi manusia. */
  terpenuhi: boolean | null;
  keterangan: string;
}

export interface MasukanSyarat {
  /** Persentase kehadiran terhadap target periode, dari `hitungSkor`. */
  persenHadir: number;
  entriLogbook: number;
  /** Banyaknya pekan yang sudah berjalan; penyebut syarat logbook. */
  pekanAktif: number;
  piket: number;
  targetPiket: number;
  skor: number;
  ambangLulus: number;
  /**
   * Serah terima dokumentasi tim lomba. Tidak ada di basis data karena tidak
   * ada satu pun kejadian di sistem yang dapat membuktikannya — yang tahu
   * hanya orang. Diisi null selama belum dikonfirmasi.
   */
  dokumentasiTuntas?: boolean | null;
  /** Anggota tim lomba; bagi yang bukan, syarat dokumentasi tidak berlaku. */
  timLomba?: boolean;
}

function persen(bagian: number, seluruh: number): number {
  if (seluruh <= 0) return 0;
  return Math.round((bagian / seluruh) * 1000) / 10;
}

/**
 * Menyusun daftar syarat SPEC 6.2 beserta angkanya masing-masing.
 *
 * Selalu mengembalikan seluruh syarat, termasuk yang sudah terpenuhi. Daftar
 * yang hanya memuat kekurangan menyembunyikan seberapa dekat seseorang dengan
 * ambang, dan itu justru yang perlu dilihat menjelang akhir periode.
 */
export function syaratSkk(m: MasukanSyarat): SyaratSkk[] {
  const persenLogbook = persen(m.entriLogbook, m.pekanAktif);

  const daftar: SyaratSkk[] = [
    {
      label: "Kehadiran",
      terpenuhi: m.persenHadir >= AMBANG_HADIR_PERSEN,
      keterangan: `${m.persenHadir}% dari target periode (minimal ${AMBANG_HADIR_PERSEN}%)`,
    },
    {
      label: "Logbook squad",
      terpenuhi: persenLogbook >= AMBANG_LOGBOOK_PERSEN,
      keterangan:
        m.pekanAktif > 0
          ? `${m.entriLogbook} entri pada ${m.pekanAktif} pekan aktif — ${persenLogbook}% (minimal ${AMBANG_LOGBOOK_PERSEN}%)`
          : "Periode belum berjalan, belum ada pekan yang dapat dinilai",
    },
    {
      label: "Piket sesuai jadwal",
      terpenuhi: m.targetPiket <= 0 ? true : m.piket >= m.targetPiket,
      keterangan:
        m.targetPiket <= 0
          ? "Periode ini tidak menetapkan target piket"
          : `${m.piket} dari ${m.targetPiket} kali`,
    },
    {
      label: "Skor akhir",
      terpenuhi: m.skor >= m.ambangLulus,
      keterangan: `${m.skor} (ambang ${m.ambangLulus})`,
    },
  ];

  // Syarat dokumentasi hanya berlaku bagi anggota tim lomba, dan tidak dapat
  // dinilai sistem: yang mengetahuinya hanya orang yang menerima serah terima.
  if (m.timLomba) {
    daftar.push({
      label: "Serah terima dokumentasi",
      terpenuhi: m.dokumentasiTuntas ?? null,
      keterangan:
        m.dokumentasiTuntas === true
          ? "Dinyatakan tuntas oleh Kepala Laboratorium"
          : m.dokumentasiTuntas === false
            ? "Dinyatakan belum tuntas"
            : "Belum dikonfirmasi — tidak dapat dinilai sistem",
    });
  }

  return daftar;
}

/** Layak diusulkan bila seluruh syarat terpenuhi. `null` dihitung belum. */
export function layakSkk(syarat: SyaratSkk[]): boolean {
  return syarat.every((s) => s.terpenuhi === true);
}

/** Syarat yang belum terpenuhi, untuk disebut apa adanya kepada yang bersangkutan. */
export function syaratBelumTerpenuhi(syarat: SyaratSkk[]): SyaratSkk[] {
  return syarat.filter((s) => s.terpenuhi !== true);
}

const ROMAWI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/**
 * Nomor surat, mengikuti kebiasaan penomoran surat di lingkungan fakultas:
 *
 *   007/SKK/LAB-ROB/FT-UNISMA/IX/2026
 *
 * Bulan ditulis angka Romawi, dan nomor urut dipadatkan menjadi tiga digit.
 * Urutan dihitung per TAHUN, bukan per periode: satu tahun kalender dapat
 * memuat dua semester, dan penomoran yang mengulang dari 1 di tengah tahun
 * akan bertabrakan pada kekangan unik `nomor` — sekaligus membingungkan siapa
 * pun yang mengarsipkan suratnya.
 *
 * Bulan dan tahun diambil dari WIB, karena tanggal surat adalah tanggal yang
 * tertulis di kertas.
 */
export function nomorSkk(urut: number, bulanWib: number, tahunWib: number): string {
  const nomor = String(Math.max(1, Math.trunc(urut))).padStart(3, "0");
  const romawi = ROMAWI[Math.min(11, Math.max(0, bulanWib - 1))];
  return `${nomor}/SKK/LAB-ROB/FT-UNISMA/${romawi}/${tahunWib}`;
}

/**
 * Catatan tambahan bagi anggota dari luar Fakultas Teknik (SPEC 6.3).
 *
 * Dicetak di surat supaya Program Studi asal tidak perlu menebak: kontribusinya
 * dihitung sama persis, tetapi pengakuan U-Point mengikuti ketentuan fakultas
 * masing-masing.
 */
export function catatanFakultasLain(fakultas: string): string | null {
  if (fakultas.trim().toLowerCase() === "teknik") return null;
  return (
    `Yang bersangkutan berasal dari Fakultas ${fakultas}. Kontribusinya dihitung dengan ` +
    "ketentuan yang sama seperti anggota lain; pengakuan U-Point mengikuti ketentuan " +
    "fakultas asal."
  );
}
