import { KepalaHalaman } from "@/components/kepala-halaman";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LABEL_JENIS_INSIDEN,
  LABEL_STATUS_TINDAK_LANJUT,
  mendesak,
  ragamStatus,
} from "@/lib/insiden";
import { saringanInsiden, wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { bolehTulis } from "@/lib/rbac";
import { tanggalPendekWib, tanggalDanJamWib } from "@/lib/waktu";
import { FormulirInsiden } from "./formulir";
import { UbahStatus } from "./status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Laporan Insiden" };

export default async function Halaman() {
  const { pengguna, izin } = await wajibIzin("insiden", "baca");
  const bolehMelapor = bolehTulis(pengguna.role, "insiden");
  const bolehMenindaklanjuti = izin.tulis === "SEMUA";

  const daftar = await prisma.incident.findMany({
    where: saringanInsiden(pengguna),
    include: { pelapor: { select: { nama: true } } },
    orderBy: [{ tanggal: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  const belumSelesai = daftar.filter((i) => i.statusTindakLanjut !== "SELESAI").length;

  return (
    <>
      <KepalaHalaman
        judul="Laporan Insiden"
        keterangan={
          izin.baca === "SEMUA"
            ? `${daftar.length} laporan tercatat, ${belumSelesai} belum selesai ditindaklanjuti.`
            : "Laporan yang Anda kirim sendiri."
        }
      />

      {bolehMelapor ? (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>Laporkan kejadian</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-teks-redup">
              Nyaris celaka pun dilaporkan. Kejadian yang belum melukai siapa pun adalah satu-satunya
              kesempatan memperbaiki keadaan sebelum ada yang terluka. Tidak ada sanksi atas
              pelaporan, dan laporan tidak dapat dihapus siapa pun — termasuk oleh yang menulisnya.
            </p>
            <FormulirInsiden />
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        {daftar.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-teks-redup">
              Belum ada laporan.
            </CardContent>
          </Card>
        ) : null}

        {daftar.map((insiden) => (
          <Card key={insiden.id}>
            <CardHeader className="flex flex-wrap items-center gap-2">
              <CardTitle className="mr-auto">{LABEL_JENIS_INSIDEN[insiden.jenis]}</CardTitle>
              {mendesak(insiden.jenis) ? <Badge variant="bahaya">Mendesak</Badge> : null}
              <Badge variant={ragamStatus(insiden.statusTindakLanjut)}>
                {LABEL_STATUS_TINDAK_LANJUT[insiden.statusTindakLanjut]}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-teks-redup">
                {tanggalPendekWib(insiden.tanggal)} · {insiden.lokasi} · dilaporkan{" "}
                {insiden.pelapor.nama}
              </p>
              <div>
                <p className="font-medium">Kronologi</p>
                <p className="whitespace-pre-line text-teks-redup">{insiden.kronologi}</p>
              </div>
              <div>
                <p className="font-medium">Tindakan yang sudah diambil</p>
                <p className="whitespace-pre-line text-teks-redup">{insiden.tindakan}</p>
              </div>
              {insiden.saran ? (
                <div>
                  <p className="font-medium">Saran pencegahan</p>
                  <p className="whitespace-pre-line text-teks-redup">{insiden.saran}</p>
                </div>
              ) : null}
              {insiden.fotoUrl ? (
                <a
                  href={`/api/berkas/${insiden.fotoUrl}`}
                  className="inline-block text-utama underline-offset-4 hover:underline"
                >
                  Lihat foto
                </a>
              ) : null}
              <p className="text-xs text-teks-redup">
                Masuk {tanggalDanJamWib(insiden.createdAt)}
              </p>

              {bolehMenindaklanjuti ? (
                <UbahStatus insidenId={insiden.id} status={insiden.statusTindakLanjut} />
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
