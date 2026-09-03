// -----------------------------------------------------------------------------
// Pesan galat kamera.
//
// Dipakai dua pemindai: QR absensi dan QR label aset. Diletakkan terpisah
// karena pesan yang menyesatkan pernah membuat orang membongkar masalah yang
// tidak ada — dan kesalahan itu tidak boleh terulang di pemindai kedua hanya
// karena kodenya disalin.
// -----------------------------------------------------------------------------

/**
 * Peringatan yang dapat ditampilkan SEBELUM tombol pindai ditekan.
 *
 * Konteks tidak aman adalah satu-satunya sebab yang sudah pasti gagal dan sudah
 * dapat diketahui lebih dulu — tidak perlu menunggu kamera dicoba untuk tahu
 * bahwa peramban akan menolaknya. Menahannya sampai sesudah tombol ditekan
 * membuat kegagalannya tampak seperti kerusakan aplikasi atau gangguan
 * jaringan, dan orang mencarinya di tempat yang salah.
 *
 * Mengembalikan null di peladen, karena `isSecureContext` hanya ada di
 * peramban. Pemanggilnya wajib menjalankan ini sesudah komponen terpasang,
 * bukan saat render pertama, supaya hasil peladen dan peramban tidak berbeda.
 */
export function peringatanKameraTidakAman(): string | null {
  if (typeof window === "undefined" || window.isSecureContext) return null;
  return (
    "Halaman ini dibuka lewat koneksi http, jadi peramban tidak akan " +
    "mengizinkan kamera dan pemindai QR tidak dapat terbuka. Buka lewat " +
    "alamat https laboratorium. (Saat mengembangkan di laptop, http://localhost " +
    "juga dianggap aman.)"
  );
}

/**
 * Menerjemahkan kegagalan membuka kamera menjadi sebab yang sebenarnya.
 *
 * Sebab yang paling sering justru halaman dibuka lewat http, dan peramban
 * menolak memberi akses kamera pada koneksi yang tidak aman — tanpa pernah
 * menyebutkannya. Galat aslinya ikut disertakan di akhir, supaya keadaan yang
 * belum terpikirkan pun masih meninggalkan petunjuk alih-alih tebakan.
 */
export function pesanGalatKamera(kesalahan: unknown): string {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return (
      "Halaman ini dibuka lewat koneksi http, dan peramban hanya mengizinkan " +
      "kamera pada koneksi aman (https). Buka lewat alamat https laboratorium, " +
      "atau ketik kodenya secara manual."
    );
  }

  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return "Peramban ini tidak menyediakan akses kamera. Coba Chrome atau Safari versi terbaru.";
  }

  const nama =
    kesalahan instanceof DOMException || kesalahan instanceof Error
      ? ((kesalahan as DOMException).name ?? "")
      : "";
  const rincian = kesalahan instanceof Error ? kesalahan.message : String(kesalahan ?? "");

  switch (nama) {
    case "NotAllowedError":
    case "SecurityError":
      return "Izin kamera ditolak. Aktifkan izin kamera untuk situs ini di pengaturan peramban, lalu coba lagi.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "Kamera belakang tidak ditemukan pada perangkat ini.";
    case "NotReadableError":
    case "AbortError":
      return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi kamera atau panggilan video, lalu coba lagi.";
    default:
      return `Kamera tidak dapat dibuka${rincian ? ` — ${rincian}` : "."}`;
  }
}
