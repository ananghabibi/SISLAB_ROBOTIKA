import { KepalaHalaman } from "@/components/kepala-halaman";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { tanggalPendekWib } from "@/lib/waktu";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ekspor Data" };

export default async function HalamanEkspor() {
  await wajibIzin("ekspor", "baca");

  const periode = await prisma.period.findMany({
    orderBy: [{ aktif: "desc" }, { tanggalMulai: "desc" }],
    select: { id: true, nama: true, tanggalMulai: true, tanggalSelesai: true, aktif: true },
  });

  return (
    <>
      <KepalaHalaman
        judul="Ekspor Data"
        keterangan="Untuk diserahkan kepada Program Studi bila kontribusi anggota diaudit."
      />

      {periode.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-teks-redup">Belum ada periode yang dapat diekspor.</p>
          </CardContent>
        </Card>
      ) : (
        periode.map((p) => (
          <Card key={p.id} className="mb-4">
            <CardHeader>
              <CardTitle>
                {p.nama} {p.aktif ? <Badge variant="berhasil">Sedang berjalan</Badge> : null}
              </CardTitle>
              <CardDescription>
                {tanggalPendekWib(p.tanggalMulai)} – {tanggalPendekWib(p.tanggalSelesai)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {/* Tautan biasa, bukan tombol berbasis JavaScript: unduhan tetap
                    berjalan walau skrip halaman gagal dimuat. */}
                <a
                  href={`/api/ekspor/rekap?periode=${p.id}`}
                  className="inline-flex min-h-11 items-center rounded-lg bg-utama px-4 text-sm font-semibold text-white hover:bg-utama-terang"
                >
                  Unduh CSV
                </a>
                <a
                  href={`/api/ekspor/rekap-pdf?periode=${p.id}`}
                  className="inline-flex min-h-11 items-center rounded-lg border border-garis bg-permukaan px-4 text-sm font-semibold text-teks hover:bg-utama-lembut"
                >
                  Unduh PDF siap cetak
                </a>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Card>
        <CardHeader>
          <CardTitle>Apa yang ada di dalamnya</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-teks-redup">
            <li>
              Satu baris per anggota: hari hadir, total jam, sesi berbagi, piket, entri logbook,
              alat belum kembali, skor, dan status kelulusan.
            </li>
            <li>
              Angkanya dihitung ulang saat berkas diunduh, jadi selalu mencerminkan data terkini.
              Angka pada Surat Keterangan Kontribusi yang sudah terbit tidak ikut berubah.
            </li>
            <li>
              CSV memakai BOM UTF-8 dan pemisah koma, sehingga langsung terbuka rapi di Excel
              maupun LibreOffice.
            </li>
            <li>Isi berkas mengikuti lingkup hak akses Anda, sama seperti halaman rekap.</li>
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
