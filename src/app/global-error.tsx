"use client";

/**
 * Batas galat terakhir: dipakai hanya bila tata letak akarnya sendiri gagal.
 *
 * Harus merender <html> dan <body> sendiri, karena pada keadaan ini tata letak
 * akar tidak ikut terpasang. Sengaja tidak memakai satu pun komponen aplikasi
 * — yang gagal bisa jadi justru berkas gayanya.
 */
export default function GalatMenyeluruh({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body
        style={{
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          margin: 0,
          padding: "2.5rem 1.25rem",
          background: "#f6f7f9",
          color: "#14181f",
          lineHeight: 1.55,
        }}
      >
        <main style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem" }}>Aplikasi gagal dimuat</h1>
          <p style={{ color: "#59616e", fontSize: "0.95rem" }}>
            Gangguan terjadi sebelum halaman sempat terbentuk. Muat ulang halaman ini; bila tetap
            gagal, hubungi Koordinator Operasional.
          </p>
          {error.digest ? (
            <p style={{ color: "#59616e", fontSize: "0.8rem" }}>Kode galat: {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 44,
              padding: "0 1.25rem",
              borderRadius: 8,
              border: "none",
              background: "#14416b",
              color: "#fff",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Coba lagi
          </button>
        </main>
      </body>
    </html>
  );
}
