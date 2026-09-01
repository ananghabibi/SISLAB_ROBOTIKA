import Link from "next/link";
import type { Prisma } from "@prisma/client";

import { KartuSkor } from "@/components/kartu-skor";
import { KepalaHalaman } from "@/components/kepala-halaman";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { PanelSaringan } from "@/components/ui/panel-saringan";
import { periodeAktif, rekapKontribusi } from "@/lib/kontribusi";
import { absensiDiLuarPeriode } from "@/lib/pemantauan";
import { keadaanPeriode, penjelasanPeriode } from "@/lib/periode";
import { saringanRekapKontribusi, wajibIzin } from "@/lib/penjaga";
import { bolehBacaSemua } from "@/lib/rbac";
import { tanggalPendekWib } from "@/lib/waktu";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rekap Kontribusi" };

export default async function HalamanRekap({
  searchParams,
}: {
  searchParams: Promise<{ cari?: string }>;
}) {
  const { pengguna } = await wajibIzin("rekap_absensi", "baca");
  const periode = await periodeAktif();
  const cari = (await searchParams).cari?.trim() ?? "";

  if (!periode) {
    return (
      <>
        <KepalaHalaman judul="Rekap Kontribusi" />
        <Card>
          <CardContent>
            <p className="text-sm text-teks-redup">
              Belum ada periode aktif, sehingga tidak ada yang bisa direkap. Kepala Laboratorium
              dapat membuatnya di menu Periode &amp; Target.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  // Lingkup ditegakkan di dalam kueri, bukan dengan menyaring hasil di memori:
  // anggota biasa tidak akan pernah menerima baris milik orang lain.
  const lingkup = saringanRekapKontribusi(pengguna) as Prisma.UserWhereInput;
  const rekap = await rekapKontribusi(periode, lingkup);
  const lihatSemua = bolehBacaSemua(pengguna.role, "rekap_absensi");

  const kunci = cari.toLowerCase();
  const rekapTampil = kunci
    ? rekap.filter(
        (r) =>
          r.user.nama.toLowerCase().includes(kunci) ||
          (r.user.squad?.kode ?? "").toLowerCase().includes(kunci),
      )
    : rekap;

  const milikSendiri = rekap.find((r) => r.user.id === pengguna.id);
  const lulus = rekap.filter((r) => r.rincian.lulus).length;

  // Rekap yang menunjukkan nol padahal absensinya berhasil hampir selalu
  // berarti tanggalnya di luar rentang periode aktif. Sebabnya disebutkan di
  // sini, bukan dibiarkan ditebak.
  const keadaan = keadaanPeriode(periode);
  const penjelasan = penjelasanPeriode(
    keadaan,
    keadaan === "BERJALAN" ? 0 : await absensiDiLuarPeriode(periode),
  );

  return (
    <>
      <KepalaHalaman
        judul="Rekap Kontribusi"
        keterangan={`${periode.nama} · ${tanggalPendekWib(periode.tanggalMulai)} – ${tanggalPendekWib(periode.tanggalSelesai)}`}
        aksi={
          <Link href="/ekspor" className="text-sm text-utama underline underline-offset-4">
            Ekspor data →
          </Link>
        }
      />

      {penjelasan ? (
        <Card className="mb-4 border-peringatan/50">
          <CardHeader>
            <CardTitle>Angka di halaman ini belum lengkap</CardTitle>
            <CardDescription>
              {periode.nama}: {tanggalPendekWib(periode.tanggalMulai)} –{" "}
              {tanggalPendekWib(periode.tanggalSelesai)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{penjelasan}</p>
            <p className="text-teks-redup">
              Perbaikannya ada di{" "}
              <Link href="/periode" className="text-utama underline underline-offset-4">
                Periode &amp; Target
              </Link>
              : sesuaikan tanggal periode aktif sehingga mencakup hari ini, atau aktifkan periode
              yang benar. Catatan absensinya sendiri tersimpan utuh dan akan langsung ikut terhitung
              begitu rentangnya benar.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {milikSendiri ? (
        <div className="mb-4">
          <KartuSkor rekap={milikSendiri} ambangLulus={periode.ambangLulus} />
        </div>
      ) : null}

      {rekap.length > 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {lihatSemua ? "Seluruh anggota laboratorium" : "Anggota squad Anda"}
            </CardTitle>
            <CardDescription>
              {lulus} dari {rekap.length} anggota sudah memenuhi ambang {periode.ambangLulus}.
              Diurutkan menurut nama, bukan menurut skor — papan peringkat antaranggota sengaja
              tidak dibuat.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-0">
            <PanelSaringan jalur="/absensi/rekap" jumlahAktif={cari ? 1 : 0}>
              <Input
                name="cari"
                placeholder="Cari nama atau kode squad"
                defaultValue={cari}
                aria-label="Cari anggota di rekap"
              />
            </PanelSaringan>
          </CardContent>
          {rekapTampil.length === 0 ? (
            <CardContent className="py-6 text-center text-sm text-teks-redup">
              Tidak ada anggota yang cocok dengan saringan.
            </CardContent>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-garis bg-dasar text-left">
                <tr>
                  <th className="px-4 py-2 font-semibold">Nama</th>
                  <th className="px-3 py-2 text-right font-semibold">Hadir</th>
                  <th className="hidden px-3 py-2 text-right font-semibold sm:table-cell">Jam</th>
                  <th className="hidden px-3 py-2 text-right font-semibold md:table-cell">Berbagi</th>
                  <th className="hidden px-3 py-2 text-right font-semibold md:table-cell">Piket</th>
                  <th className="hidden px-3 py-2 text-right font-semibold lg:table-cell">Logbook</th>
                  <th className="hidden px-3 py-2 text-right font-semibold lg:table-cell">Alat</th>
                  <th className="px-3 py-2 text-right font-semibold">Skor</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rekapTampil.map((r) => (
                  <tr key={r.user.id} className="border-b border-garis last:border-0">
                    <td className="px-4 py-2">
                      <p className="font-medium">{r.user.nama}</p>
                      <p className="text-xs text-teks-redup">
                        {r.user.squad?.kode ?? "Tanpa squad"}
                        {r.user.fakultas !== "Teknik" ? ` · ${r.user.fakultas}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.komponen.hariHadir}</td>
                    <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">
                      {r.totalJam}
                    </td>
                    <td className="hidden px-3 py-2 text-right tabular-nums md:table-cell">
                      {r.komponen.sesiBerbagi}
                    </td>
                    <td className="hidden px-3 py-2 text-right tabular-nums md:table-cell">
                      {r.komponen.piket}
                    </td>
                    <td className="hidden px-3 py-2 text-right tabular-nums lg:table-cell">
                      {r.komponen.entriLogbook}
                    </td>
                    <td className="hidden px-3 py-2 text-right tabular-nums lg:table-cell">
                      {r.komponen.alatBelumKembali > 0 ? (
                        <span className="text-bahaya">{r.komponen.alatBelumKembali}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {r.rincian.skor}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={r.rincian.lulus ? "berhasil" : "peringatan"}>
                        {r.rincian.lulus ? "Lulus" : "Belum"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
          <CardContent>
            <p className="text-xs text-teks-redup">
              Sesi berbagi dihitung dari absensi berjenis PELATIHAN. Piket dan logbook baru terisi
              setelah modulnya dibangun pada Milestone 5, dan alat belum kembali setelah Milestone 4
              — sampai saat itu angkanya nol, bukan dikarang.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
