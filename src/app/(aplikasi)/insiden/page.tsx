import { Rintisan } from "@/components/rintisan";
import { wajibIzin } from "@/lib/penjaga";

export const metadata = { title: "Laporan Insiden" };

export default async function Halaman() {
  await wajibIzin("insiden", "baca");
  return <Rintisan judul="Laporan Insiden" milestone={5} isi="Pelaporan insiden dan nyaris celaka." />;
}
