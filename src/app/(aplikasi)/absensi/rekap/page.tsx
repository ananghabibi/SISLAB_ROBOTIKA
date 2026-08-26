import { Rintisan } from "@/components/rintisan";
import { wajibIzin } from "@/lib/penjaga";

export const metadata = { title: "Rekap Absensi" };

export default async function Halaman() {
  await wajibIzin("rekap_absensi", "baca");
  return <Rintisan judul="Rekap Absensi" milestone={3} isi="Rekap kehadiran dan skor kontribusi per anggota dan per squad." />;
}
