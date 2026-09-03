import type { Prisma } from "@prisma/client";
import Link from "next/link";

import { KepalaHalaman } from "@/components/kepala-halaman";
import { Badge } from "@/components/ui/badge";
import { gayaTombol } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { PanelSaringan } from "@/components/ui/panel-saringan";
import { rosterPiket } from "@/lib/jadwal-piket";
import { piketHariIni } from "@/lib/pemantauan";
import { saringanPiket, wajibIzin } from "@/lib/penjaga";
import {
  bacaChecklist,
  butirBelumDicentang,
  butirPiket,
  persenChecklist,
} from "@/lib/piket";
import { prisma } from "@/lib/prisma";
import { bolehTulis } from "@/lib/rbac";
import { tanggalPanjangWib, tanggalPendekWib } from "@/lib/waktu";
import { FormulirPiket } from "./formulir";

export const dynamic = "force-dynamic";
export const metadata = { title: "Piket" };

export default async function Halaman({
  searchParams,
}: {
  searchParams: Promise<{ cari?: string }>;
}) {
  const { pengguna, izin } = await wajibIzin("piket", "baca");
  const butir = butirPiket();
  const bolehMencatat = izin.tulis !== "TIDAK";
  const bolehAturJadwal = bolehTulis(pengguna.role, "jadwal_piket");
  const cari = (await searchParams).cari?.trim() ?? "";

  const [jadwalHariIni, roster, squad, daftar] = await Promise.all([
    piketHariIni(),
    rosterPiket(),
    bolehMencatat
      ? prisma.squad.findMany({
          where: izin.tulis === "SEMUA" ? {} : { id: pengguna.squadId ?? "__tidak-ada__" },
          select: { id: true, nama: true },
          orderBy: { nama: "asc" },
        })
      : Promise.resolve([]),
    prisma.piketLog.findMany({
      where: {
        ...saringanPiket(pengguna),
        ...(cari
          ? {
              OR: [
                { squad: { is: { nama: { contains: cari, mode: "insensitive" } } } },
                { pengisi: { is: { nama: { contains: cari, mode: "insensitive" } } } },
              ] satisfies Prisma.PiketLogWhereInput["OR"],
            }
          : {}),
      },
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
      <KepalaHalaman
        judul="Piket"
        keterangan={tanggalPanjangWib(new Date())}
        aksi={
          bolehAturJadwal ? (
            <Link href="/piket/jadwal" className={gayaTombol({ variant: "garis" })}>
              Atur jadwal
            </Link>
          ) : null
        }
      />

      <Card className="mb-5">
        <CardHeader className="flex flex-wrap items-center gap-2">
          <CardTitle className="mr-auto">Jadwal hari ini</CardTitle>
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

      <Card className="mb-5">
        <CardHeader>
          <CardTitle>Roster mingguan</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {roster.map((hari) => (
              <li key={hari.nomor} className="flex items-baseline justify-between gap-2 rounded-lg bg-dasar px-3 py-2">
                <span className="font-medium">{hari.nama}</span>
                <span className={hari.namaSquad ? "" : "text-teks-redup"}>
                  {hari.namaSquad ?? "belum ditetapkan"}
                </span>
              </li>
            ))}
          </ul>
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
          <PanelSaringan jalur="/piket" jumlahAktif={cari ? 1 : 0}>
            <Input
              name="cari"
              placeholder="Cari squad atau petugas piket"
              defaultValue={cari}
              aria-label="Cari catatan piket"
            />
          </PanelSaringan>
          {daftar.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-teks-redup">
                {cari ? "Tidak ada catatan piket yang cocok dengan saringan." : "Belum ada catatan piket."}
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
