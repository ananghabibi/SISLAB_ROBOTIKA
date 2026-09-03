import { KepalaHalaman } from "@/components/kepala-halaman";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { rosterPiket } from "@/lib/jadwal-piket";
import { wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { FormulirJadwal } from "./formulir";

export const dynamic = "force-dynamic";
export const metadata = { title: "Jadwal Piket" };

export default async function HalamanJadwalPiket() {
  await wajibIzin("jadwal_piket", "tulis");

  const [roster, squad] = await Promise.all([
    rosterPiket(),
    prisma.squad.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
  ]);

  return (
    <>
      <KepalaHalaman
        judul="Jadwal Piket"
        keterangan="Siapa piket pada hari apa, Senin sampai Sabtu. Minggu tidak dijadwalkan."
        kembali={{ href: "/piket", label: "Kembali ke piket" }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Roster mingguan</CardTitle>
          <CardDescription>
            Hanya Kepala Laboratorium dan Koordinator Pengembangan yang dapat mengubahnya. Hari yang
            dikosongkan berarti belum ditetapkan — itu bukan pelanggaran, hanya menunggu diatur.
            Perubahan tercatat di audit log.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormulirJadwal roster={roster} squad={squad} />
        </CardContent>
      </Card>
    </>
  );
}
