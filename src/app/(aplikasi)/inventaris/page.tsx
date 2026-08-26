import { Rintisan } from "@/components/rintisan";
import { wajibIzin } from "@/lib/penjaga";

export const metadata = { title: "Inventaris" };

export default async function Halaman() {
  await wajibIzin("inventaris", "baca");
  return <Rintisan judul="Inventaris" milestone={4} isi="Master aset laboratorium dan label QR siap cetak." />;
}
