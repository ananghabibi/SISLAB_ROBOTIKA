import { KepalaHalaman } from "@/components/kepala-halaman";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { periodeAktif } from "@/lib/kontribusi";
import { bacaAnggotaTerlibat, rentangPekan } from "@/lib/logbook";
import { squadPadaPekan } from "@/lib/pemantauan";
import { saringanLogbook, wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { tanggalPendekWib } from "@/lib/waktu";
import { FormulirLogbook, type PilihanSquad } from "./formulir";

export const dynamic = "force-dynamic";
export const metadata = { title: "Logbook Riset" };

export default async function Halaman() {
  const { pengguna, izin } = await wajibIzin("logbook", "baca");
  const periode = await periodeAktif();

  if (!periode) {
    return (
      <>
        <KepalaHalaman judul="Logbook Riset" />
        <Card>
          <CardContent className="py-8 text-center text-sm text-teks-redup">
            Belum ada periode aktif. Kepala Laboratorium perlu membuka periode lebih dulu di
            halaman Periode &amp; Target.
          </CardContent>
        </Card>
      </>
    );
  }

  const { mingguKe, squad } = await squadPadaPekan(periode);
  const pekan = rentangPekan(mingguKe, periode.tanggalMulai);
  const belum = squad.filter((s) => !s.sudahMengisi);

  const bolehMengisi = izin.tulis !== "TIDAK";
  const squadBolehDiisi =
    izin.tulis === "SEMUA" ? squad : squad.filter((s) => s.id === pengguna.squadId);

  const [anggotaSquad, daftar] = await Promise.all([
    bolehMengisi && squadBolehDiisi.length > 0
      ? prisma.user.findMany({
          where: { status: "AKTIF", squadId: { in: squadBolehDiisi.map((s) => s.id) } },
          select: { id: true, nama: true, squadId: true },
          orderBy: { nama: "asc" },
        })
      : Promise.resolve([]),
    prisma.logbook.findMany({
      where: { periodId: periode.id, ...saringanLogbook(pengguna) },
      include: {
        squad: { select: { nama: true } },
        dibuatOleh: { select: { nama: true } },
      },
      orderBy: [{ mingguKe: "desc" }, { createdAt: "desc" }],
      take: 60,
    }),
  ]);

  const pilihan: PilihanSquad[] = squadBolehDiisi.map((s) => ({
    id: s.id,
    nama: s.nama,
    anggota: anggotaSquad.filter((a) => a.squadId === s.id).map((a) => ({ id: a.id, nama: a.nama })),
  }));

  return (
    <>
      <KepalaHalaman
        judul="Logbook Riset"
        keterangan={`${periode.nama} · pekan ${mingguKe} (${tanggalPendekWib(pekan.mulai)} – ${tanggalPendekWib(pekan.selesai)})`}
      />

      {izin.baca === "SEMUA" ? (
        <Card className={belum.length > 0 ? "mb-5 border-peringatan/50" : "mb-5"}>
          <CardHeader>
            <CardTitle>
              {belum.length === 0
                ? `Semua squad sudah mengisi pekan ${mingguKe}`
                : `${belum.length} squad belum mengisi pekan ${mingguKe}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {squad.map((s) => (
              <Badge key={s.id} variant={s.sudahMengisi ? "berhasil" : "peringatan"}>
                {s.nama}
                {s.sudahMengisi ? " ✓" : " — belum"}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {bolehMengisi && pilihan.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Isi logbook pekan {mingguKe}</CardTitle>
            </CardHeader>
            <CardContent>
              <FormulirLogbook
                squad={pilihan}
                squadBawaan={pengguna.squadId ?? pilihan[0]!.id}
                mingguKe={mingguKe}
                keteranganPekan={`${tanggalPendekWib(pekan.mulai)} – ${tanggalPendekWib(pekan.selesai)}`}
              />
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-3">
          {daftar.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-teks-redup">
                Belum ada logbook pada periode ini.
              </CardContent>
            </Card>
          ) : null}

          {daftar.map((entri) => {
            const anggota = bacaAnggotaTerlibat(entri.anggotaTerlibat);
            return (
              <Card key={entri.id}>
                <CardHeader className="flex flex-wrap items-center gap-2">
                  <CardTitle className="mr-auto">{entri.squad.nama}</CardTitle>
                  <Badge variant="utama">Pekan {entri.mingguKe}</Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-teks-redup">
                    {tanggalPendekWib(entri.tanggal)} · ditulis {entri.dibuatOleh.nama}
                  </p>
                  <p className="text-teks-redup">
                    Terlibat: {anggota.length > 0 ? anggota.map((a) => a.nama).join(", ") : "—"}
                  </p>
                  <div>
                    <p className="font-medium">Target</p>
                    <p className="whitespace-pre-line text-teks-redup">{entri.target}</p>
                  </div>
                  <div>
                    <p className="font-medium">Dikerjakan</p>
                    <p className="whitespace-pre-line text-teks-redup">{entri.dikerjakan}</p>
                  </div>
                  <div>
                    <p className="font-medium">Hasil</p>
                    <p className="whitespace-pre-line text-teks-redup">{entri.hasil}</p>
                  </div>
                  {entri.kendala ? (
                    <div>
                      <p className="font-medium">Kendala</p>
                      <p className="whitespace-pre-line text-teks-redup">{entri.kendala}</p>
                    </div>
                  ) : null}
                  <div>
                    <p className="font-medium">Rencana pekan berikutnya</p>
                    <p className="whitespace-pre-line text-teks-redup">{entri.rencanaBerikutnya}</p>
                  </div>
                  {entri.buktiUrl ? (
                    <a
                      href={`/api/berkas/${entri.buktiUrl}`}
                      className="inline-block text-utama underline-offset-4 hover:underline"
                    >
                      Lihat bukti kegiatan
                    </a>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
