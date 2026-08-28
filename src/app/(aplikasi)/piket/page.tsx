import { KepalaHalaman } from "@/components/kepala-halaman";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { piketHariIni } from "@/lib/pemantauan";
import { saringanPiket, wajibIzin } from "@/lib/penjaga";
import {
  bacaChecklist,
  butirBelumDicentang,
  butirPiket,
  persenChecklist,
} from "@/lib/piket";
import { prisma } from "@/lib/prisma";
import { tanggalPanjangWib, tanggalPendekWib } from "@/lib/waktu";
import { FormulirPiket } from "./formulir";

export const dynamic = "force-dynamic";
export const metadata = { title: "Piket" };

export default async function Halaman() {
  const { pengguna, izin } = await wajibIzin("piket", "baca");
  const butir = butirPiket();
  const bolehMencatat = izin.tulis !== "TIDAK";

  const [jadwalHariIni, squad, daftar] = await Promise.all([
    piketHariIni(),
    bolehMencatat
      ? prisma.squad.findMany({
          where: izin.tulis === "SEMUA" ? {} : { id: pengguna.squadId ?? "__tidak-ada__" },
          select: { id: true, nama: true },
          orderBy: { nama: "asc" },
        })
      : Promise.resolve([]),
    prisma.piketLog.findMany({
      where: saringanPiket(pengguna),
      include: {
        squad: { select: { nama: true } },
        pengisi: { select: { nama: true } },
      },
      orderBy: [{ tanggal: "desc" }, { createdAt: "desc" }],
      take: 40,
    }),
  ]);

  return (
    <>
      <KepalaHalaman judul="Piket" keterangan={tanggalPanjangWib(new Date())} />

      <Card className="mb-5">
        <CardHeader>
          <CardTitle>Jadwal hari ini</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {jadwalHariIni.kodeSquad === null ? (
            <p className="text-teks-redup">
              Hari ini tidak ada piket terjadwal. Sabtu dan Minggu memang tidak dijadwalkan, dan
              hari tanpa jadwal bukan piket yang terlewat.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p className="mr-auto">
                Giliran <span className="font-semibold">{jadwalHariIni.namaSquad ?? jadwalHariIni.kodeSquad}</span>
              </p>
              <Badge variant={jadwalHariIni.sudahDiisi ? "berhasil" : "peringatan"}>
                {jadwalHariIni.sudahDiisi ? "Sudah dicatat" : "Belum dicatat"}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {bolehMencatat && squad.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Catat piket</CardTitle>
            </CardHeader>
            <CardContent>
              <FormulirPiket
                butir={butir}
                squad={squad}
                squadBawaan={
                  // Squadnya sendiri bila punya; kalau tidak — Kepala Lab dan
                  // para Koordinator memang tidak bersquad — squad yang
                  // terjadwal hari ini, bukan yang pertama menurut abjad.
                  pengguna.squadId ??
                  squad.find((s) => s.id === jadwalHariIni.idSquad)?.id ??
                  squad[0]!.id
                }
              />
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-3">
          {daftar.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-teks-redup">
                Belum ada catatan piket.
              </CardContent>
            </Card>
          ) : null}

          {daftar.map((catatan) => {
            const jawaban = bacaChecklist(catatan.checklist, butir);
            const belum = butirBelumDicentang(butir, jawaban);
            const persen = persenChecklist(butir, jawaban);
            return (
              <Card key={catatan.id}>
                <CardHeader className="flex flex-wrap items-center gap-2">
                  <CardTitle className="mr-auto">{catatan.squad.nama}</CardTitle>
                  <Badge variant={persen === 100 ? "berhasil" : "peringatan"}>
                    {butir.length - belum.length}/{butir.length} butir
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-teks-redup">
                    {tanggalPendekWib(catatan.tanggal)} · diisi {catatan.pengisi.nama}
                  </p>
                  {belum.length > 0 ? (
                    <div>
                      <p className="font-medium">Belum dikerjakan</p>
                      <ul className="list-inside list-disc text-teks-redup">
                        {belum.map((b) => (
                          <li key={b.kode}>{b.butir}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {catatan.alatBelumKembali > 0 ? (
                    <p className="text-peringatan">
                      {catatan.alatBelumKembali} alat masih tercatat dipinjam saat piket ini.
                    </p>
                  ) : null}
                  <div className="flex gap-4">
                    <a
                      href={`/api/berkas/${catatan.fotoSebelumUrl}`}
                      className="text-utama underline-offset-4 hover:underline"
                    >
                      Foto sebelum
                    </a>
                    <a
                      href={`/api/berkas/${catatan.fotoSesudahUrl}`}
                      className="text-utama underline-offset-4 hover:underline"
                    >
                      Foto sesudah
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
