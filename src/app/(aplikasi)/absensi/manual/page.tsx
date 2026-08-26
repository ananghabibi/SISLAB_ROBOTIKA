import { Rintisan } from "@/components/rintisan";
import { wajibIzin } from "@/lib/penjaga";

export const metadata = { title: "Absensi Manual" };

export default async function Halaman() {
  await wajibIzin("absensi_manual", "tulis");
  return <Rintisan judul="Absensi Manual" milestone={2} isi="Jalur darurat pencatatan absensi oleh Koordinator Operasional, wajib beralasan dan tercatat di audit log." />;
}
