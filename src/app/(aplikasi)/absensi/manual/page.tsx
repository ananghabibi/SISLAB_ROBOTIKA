import { KepalaHalaman } from "@/components/kepala-halaman";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { jamWib, tanggalKalenderWib, tanggalPendekWib } from "@/lib/waktu";
import { FormulirManual } from "./formulir";

export const dynamic = "force-dynamic";
export const metadata = { title: "Absensi Manual" };

export default async function HalamanAbsensiManual() {
  await wajibIzin("absensi_manual", "tulis");

  const [anggota, manualHariIni] = await Promise.all([
    prisma.user.findMany({
      where: { status: { in: ["AKTIF", "CUTI"] } },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, npm: true, squad: { select: { kode: true } } },
    }),
    prisma.attendance.findMany({
      where: { manual: true, tanggal: tanggalKalenderWib() },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        jamMasuk: true,
        jamKeluar: true,
        alasanManual: true,
        tanggal: true,
        user: { select: { nama: true } },
      },
    }),
  ]);

  return (
    <>
      <KepalaHalaman
        judul="Absensi Manual"
        keterangan="Jalur darurat, dipakai hanya bila jaringan atau layar laboratorium bermasalah."
      />

      <Card className="mb-4 border-peringatan/40 bg-peringatan-lembut/40">
        <CardContent>
          <p className="text-sm text-peringatan">
            <strong>Jalur ini sengaja dibuat merepotkan.</strong> Ia melewati ketiga lapis
            pengamanan sekaligus, sehingga kebenarannya bertumpu sepenuhnya pada kesaksian Anda.
            Setiap catatan diberi penanda &ldquo;Manual&rdquo; yang selalu terlihat di rekap, dan
            tercatat di audit log atas nama Anda. Bila jalur ini mulai sering dipakai, yang perlu
            diperbaiki adalah jaringan atau layarnya — bukan menambah kenyamanan di sini.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Catat kehadiran seorang anggota</CardTitle>
          <CardDescription>
            Hanya untuk hari berjalan. Jam yang Anda isi dipakai apa adanya, bukan jam saat formulir
            ini dikirim.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormulirManual
            anggota={anggota.map((a) => ({
              id: a.id,
              label: `${a.nama}${a.npm ? ` · ${a.npm}` : ""}${a.squad ? ` · ${a.squad.kode}` : ""}`,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pencatatan manual hari ini</CardTitle>
          <CardDescription>{manualHariIni.length} catatan.</CardDescription>
        </CardHeader>
        <CardContent>
          {manualHariIni.length === 0 ? (
            <p className="text-sm text-teks-redup">
              Belum ada pencatatan manual hari ini. Itu pertanda baik.
            </p>
          ) : (
            <ul className="space-y-3">
              {manualHariIni.map((m) => (
                <li key={m.id} className="border-b border-garis pb-3 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{m.user.nama}</span>
                    <Badge variant="peringatan">Manual</Badge>
                    <span className="text-sm text-teks-redup">
                      {tanggalPendekWib(m.tanggal)} · {jamWib(m.jamMasuk)}
                      {m.jamKeluar ? ` – ${jamWib(m.jamKeluar)}` : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-teks-redup">{m.alasanManual}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
