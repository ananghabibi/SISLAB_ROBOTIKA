import { KepalaHalaman } from "@/components/kepala-halaman";
import { Card, CardContent } from "@/components/ui/card";
import { wajibIzin } from "@/lib/penjaga";
import { FormulirPeriode } from "../formulir";

export const metadata = { title: "Periode baru" };

export default async function PeriodeBaru() {
  await wajibIzin("periode_target", "tulis");

  // Tanggal bawaan mengikuti kalender akademik UNISMA: ganjil dibuka September,
  // ditutup akhir Januari. Tinggal digeser bila jadwalnya bergeser.
  const tahunIni = new Date().getUTCFullYear();

  return (
    <>
      <KepalaHalaman
        judul="Periode baru"
        keterangan="Biasanya sekali tiap semester, bersamaan dengan pemuatan daftar anggota baru."
        kembali={{ href: "/periode", label: "Kembali ke daftar periode" }}
      />

      <Card>
        <CardContent>
          <FormulirPeriode
            nilai={{
              id: null,
              nama: "",
              tanggalMulai: `${tahunIni}-09-01`,
              tanggalSelesai: `${tahunIni + 1}-01-31`,
              targetHadir: 48,
              targetSesiBerbagi: 2,
              targetPiket: 8,
              targetLogbook: 12,
              ambangLulus: 70,
              aktif: false,
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
