import { Rintisan } from "@/components/rintisan";
import { wajibIzin } from "@/lib/penjaga";

export const metadata = { title: "Logbook Riset" };

export default async function Halaman() {
  await wajibIzin("logbook", "baca");
  return <Rintisan judul="Logbook Riset" milestone={5} isi="Logbook riset mingguan per squad." />;
}
