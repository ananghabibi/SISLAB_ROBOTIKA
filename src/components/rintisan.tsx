import { Card, CardContent } from "@/components/ui/card";
import { KepalaHalaman } from "@/components/kepala-halaman";

/**
 * Halaman rintisan untuk modul yang dijadwalkan pada milestone berikutnya.
 *
 * Ditampilkan apa adanya, bukan disembunyikan. Rutenya sudah nyata sehingga
 * penjagaan hak akses bisa diuji sejak sekarang, dan pembaca tahu persis apa
 * yang sudah jadi dan apa yang belum.
 */
export function Rintisan({
  judul,
  milestone,
  isi,
}: {
  judul: string;
  milestone: number;
  isi: string;
}) {
  return (
    <>
      <KepalaHalaman judul={judul} keterangan={isi} />
      <Card>
        <CardContent className="space-y-2">
          <p className="text-sm font-semibold">Dibangun pada Milestone {milestone}</p>
          <p className="text-sm text-teks-redup">
            Rute dan hak aksesnya sudah aktif sejak Milestone 1, sehingga penolakan akses dapat
            diuji sekarang. Isi modulnya menyusul sesuai urutan di <code>SPEC.md</code> bagian 7.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
