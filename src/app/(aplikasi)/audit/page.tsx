import { Rintisan } from "@/components/rintisan";
import { wajibIzin } from "@/lib/penjaga";

export const metadata = { title: "Audit Log" };

export default async function Halaman() {
  await wajibIzin("audit_log", "baca");
  return <Rintisan judul="Audit Log" milestone={6} isi="Jejak seluruh perubahan yang dapat dipertanyakan saat audit Program Studi." />;
}
