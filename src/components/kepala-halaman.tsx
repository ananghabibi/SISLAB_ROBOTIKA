import Link from "next/link";

/**
 * Kepala setiap halaman: judul, satu kalimat penjelas, dan aksi utamanya.
 *
 * `aksi` selalu berada DI SINI, di atas, bukan di kaki halaman. Aturan itu
 * lahir dari satu keluhan yang nyata: tombol "Tambah aset" dulu duduk di bawah
 * seluruh daftar inventaris, sehingga untuk menambah satu alat orang harus
 * menggulir melewati ratusan kartu — dan yang tidak tahu tombol itu ada, tidak
 * akan pernah menemukannya. Halaman yang isinya daftar tidak punya kaki yang
 * dapat diramalkan panjangnya; kepalanya selalu di tempat yang sama.
 *
 * `kembali` menggantikan tautan "← Kembali" yang dulu ditulis ulang di tiap
 * subhalaman dengan gaya yang sedikit berbeda-beda.
 */
export function KepalaHalaman({
  judul,
  keterangan,
  aksi,
  kembali,
}: {
  judul: string;
  keterangan?: React.ReactNode;
  aksi?: React.ReactNode;
  kembali?: { href: string; label: string };
}) {
  return (
    <div className="mb-5">
      {kembali ? (
        <Link
          href={kembali.href}
          className="mb-1 inline-flex min-h-11 items-center text-sm font-medium text-utama"
        >
          ← {kembali.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">{judul}</h1>
          {keterangan ? <p className="mt-1 text-sm text-teks-redup">{keterangan}</p> : null}
        </div>
        {aksi ? <div className="flex flex-wrap items-center gap-2">{aksi}</div> : null}
      </div>
    </div>
  );
}
