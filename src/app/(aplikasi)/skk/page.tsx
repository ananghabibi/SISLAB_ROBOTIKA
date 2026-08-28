import type { Prisma } from "@prisma/client";

import { KepalaHalaman } from "@/components/kepala-halaman";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { periodeAktif } from "@/lib/kontribusi";
import { saringanRekapKontribusi, wajibIzin } from "@/lib/penjaga";
import { bolehMenerbitkanSkk } from "@/lib/rbac";
import { daftarKandidat } from "@/lib/skk-terbit";
import { tanggalPendekWib } from "@/lib/waktu";
import { FormulirTerbit } from "./formulir";

export const dynamic = "force-dynamic";
export const metadata = { title: "Surat Kontribusi" };

export default async function Halaman() {
  const { pengguna, izin } = await wajibIzin("skk", "baca");
  const periode = await periodeAktif();

  if (!periode) {
    return (
      <>
        <KepalaHalaman judul="Surat Keterangan Kontribusi" />
        <Card>
          <CardContent className="py-8 text-center text-sm text-teks-redup">
            Belum ada periode aktif. Kepala Laboratorium perlu membukanya lebih dulu di halaman
            Periode &amp; Target.
          </CardContent>
        </Card>
      </>
    );
  }

  // Lingkupnya mengikuti rekap kontribusi: seorang anggota hanya melihat
  // dirinya sendiri, bukan daftar kandidat seluruh laboratorium.
  const kandidat = await daftarKandidat(
    periode,
    saringanRekapKontribusi(pengguna) as Prisma.UserWhereInput,
  );
  const bolehTerbit = bolehMenerbitkanSkk(pengguna.role);
  const layak = kandidat.filter((k) => k.layak).length;
  const terbit = kandidat.filter((k) => k.sudahTerbit).length;

  return (
    <>
      <KepalaHalaman
        judul="Surat Keterangan Kontribusi"
        keterangan={`${periode.nama} · ${tanggalPendekWib(periode.tanggalMulai)} – ${tanggalPendekWib(periode.tanggalSelesai)}`}
      />

      {izin.baca === "SEMUA" ? (
        <Card className="mb-5">
          <CardContent className="py-4 text-sm">
            <p>
              <span className="font-semibold">{layak}</span> dari{" "}
              <span className="font-semibold">{kandidat.length}</span> anggota memenuhi seluruh
              syarat SPEC 6.2, dan <span className="font-semibold">{terbit}</span> surat sudah
              terbit.
            </p>
            <p className="mt-1 text-teks-redup">
              Sistem hanya mengusulkan. Keputusan menerbitkan tetap pada Kepala Laboratorium, dan
              angka pada surat dibekukan saat penerbitan — koreksi data sesudahnya tidak
              mengubahnya.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        {kandidat.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-teks-redup">
              Belum ada anggota pada periode ini.
            </CardContent>
          </Card>
        ) : null}

        {kandidat.map((k) => {
          const kurang = k.syarat.filter((s) => s.terpenuhi !== true);
          return (
            <Card key={k.rekap.user.id}>
              <CardHeader className="flex flex-wrap items-center gap-2">
                <CardTitle className="mr-auto">{k.rekap.user.nama}</CardTitle>
                {k.sudahTerbit ? (
                  <Badge variant="utama">Terbit {k.sudahTerbit.nomor}</Badge>
                ) : (
                  <Badge variant={k.layak ? "berhasil" : "peringatan"}>
                    {k.layak ? "Memenuhi syarat" : `${kurang.length} syarat kurang`}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-teks-redup">
                  {k.rekap.user.npm ?? "—"} · {k.rekap.user.squad?.nama ?? "tanpa squad"} ·{" "}
                  {k.rekap.user.fakultas}
                </p>

                <ul className="space-y-1">
                  {k.syarat.map((s) => (
                    <li key={s.label} className="flex flex-wrap items-baseline gap-x-2">
                      <span
                        className={
                          s.terpenuhi === true
                            ? "font-medium text-berhasil"
                            : "font-medium text-peringatan"
                        }
                      >
                        {s.terpenuhi === true ? "✓" : "•"} {s.label}
                      </span>
                      <span className="text-teks-redup">{s.keterangan}</span>
                    </li>
                  ))}
                </ul>

                {k.sudahTerbit ? (
                  <p>
                    <a
                      href={`/api/skk/${k.sudahTerbit.id}/pdf`}
                      className="text-utama underline underline-offset-4"
                    >
                      Unduh PDF surat
                    </a>
                    <span className="text-teks-redup">
                      {" "}
                      · terbit {tanggalPendekWib(k.sudahTerbit.tanggalTerbit)}
                    </span>
                  </p>
                ) : bolehTerbit ? (
                  <FormulirTerbit
                    userId={k.rekap.user.id}
                    nama={k.rekap.user.nama}
                    adaYangKurang={kurang.length > 0}
                  />
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
