import { KepalaHalaman } from "@/components/kepala-halaman";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { absensiHariIni, durasiJam, riwayatAbsensi } from "@/lib/absensi";
import { wajibIzin } from "@/lib/penjaga";
import { jamWib, tanggalPanjangWib, tanggalPendekWib } from "@/lib/waktu";
import { Pemindai } from "./pemindai";

export const dynamic = "force-dynamic";
export const metadata = { title: "Absensi Saya" };

function tampilkanDurasi(jam: number): string {
  if (jam <= 0) return "—";
  const menitTotal = Math.round(jam * 60);
  const j = Math.floor(menitTotal / 60);
  const m = menitTotal % 60;
  return j > 0 ? `${j} jam ${m} menit` : `${m} menit`;
}

export default async function HalamanAbsensi() {
  const { pengguna } = await wajibIzin("absensi_sendiri", "baca");

  const [hariIni, riwayat] = await Promise.all([
    absensiHariIni(pengguna.id),
    riwayatAbsensi(pengguna.id),
  ]);

  const belumMasuk = !hariIni;
  const sedangDiLab = Boolean(hariIni && !hariIni.jamKeluar && !hariIni.dibatalkan);
  const sudahSelesai = Boolean(hariIni?.jamKeluar);

  return (
    <>
      <KepalaHalaman judul="Absensi Saya" keterangan={tanggalPanjangWib(new Date())} />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>
            {belumMasuk
              ? "Belum absen masuk hari ini"
              : sedangDiLab
                ? "Sedang berada di laboratorium"
                : "Sesi hari ini sudah selesai"}
          </CardTitle>
          <CardDescription>
            {hariIni
              ? `Masuk ${jamWib(hariIni.jamMasuk)}${hariIni.jamKeluar ? ` · Pulang ${jamWib(hariIni.jamKeluar)}` : ""}`
              : "Absensi hanya dapat dilakukan dari dalam jaringan WiFi laboratorium, dengan memindai QR di layar lab."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sudahSelesai ? (
            <p className="text-sm text-teks-redup">
              Durasi hari ini {tampilkanDurasi(durasiJam(hariIni!))}. Satu sesi per orang per hari —
              sampai jumpa besok.
            </p>
          ) : (
            <Pemindai aksi={belumMasuk ? "masuk" : "pulang"} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat kehadiran</CardTitle>
          <CardDescription>
            Catatan absensi tidak pernah diubah atau dihapus. Koreksi dilakukan lewat catatan
            pembatalan yang tetap merujuk catatan aslinya.
          </CardDescription>
        </CardHeader>
        {riwayat.length === 0 ? (
          <CardContent>
            <p className="text-sm text-teks-redup">Belum ada riwayat kehadiran.</p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-garis bg-dasar text-left">
                <tr>
                  <th className="px-4 py-2 font-semibold">Tanggal</th>
                  <th className="px-4 py-2 font-semibold">Masuk</th>
                  <th className="px-4 py-2 font-semibold">Pulang</th>
                  <th className="hidden px-4 py-2 font-semibold sm:table-cell">Durasi</th>
                  <th className="hidden px-4 py-2 font-semibold md:table-cell">Kegiatan</th>
                  <th className="px-4 py-2 font-semibold">Catatan pekerjaan</th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map((a) => (
                  <tr key={a.id} className="border-b border-garis last:border-0">
                    <td className="px-4 py-2 whitespace-nowrap">{tanggalPendekWib(a.tanggal)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{jamWib(a.jamMasuk)}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {a.jamKeluar ? (
                        jamWib(a.jamKeluar)
                      ) : (
                        <span className="text-teks-redup">tidak diakhiri</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-2 whitespace-nowrap sm:table-cell">
                      {tampilkanDurasi(durasiJam(a))}
                    </td>
                    <td className="hidden px-4 py-2 md:table-cell">{a.jenisKegiatan}</td>
                    <td className="px-4 py-2">
                      <div className="min-w-56 space-y-1">
                        {(a.manual || a.dibatalkan) ? (
                          <div className="flex flex-wrap gap-1">
                            {a.manual ? <Badge variant="peringatan">Manual</Badge> : null}
                            {a.dibatalkan ? <Badge variant="bahaya">Dibatalkan</Badge> : null}
                          </div>
                        ) : null}
                        {a.uraian ? (
                          <p>{a.uraian}</p>
                        ) : a.jamKeluar ? (
                          <p className="text-teks-redup">Tanpa uraian</p>
                        ) : (
                          <p className="text-teks-redup">Sesi belum diakhiri</p>
                        )}
                        {a.kendala ? (
                          <p className="text-peringatan">
                            <span className="font-semibold">Kendala:</span> {a.kendala}
                          </p>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="border-t border-garis px-4 py-3 text-xs text-teks-redup">
          Sesi yang <strong>tidak diakhiri</strong> dengan pindai pulang tetap dihitung{" "}
          <strong>hadir</strong> — harinya tetap masuk rekap dan skor kontribusi. Yang menjadi nol
          hanya durasinya, dan skor tidak memakai durasi sama sekali. Jam pulang tidak pernah
          dikarang sistem; yang tidak tercatat tetap kosong.
        </p>
      </Card>
    </>
  );
}
