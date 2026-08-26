import { Rintisan } from "@/components/rintisan";
import { wajibIzin } from "@/lib/penjaga";

export const metadata = { title: "Absensi Saya" };

export default async function Halaman() {
  await wajibIzin("absensi_sendiri", "baca");
  return <Rintisan judul="Absensi Saya" milestone={2} isi="Absen masuk dan pulang lewat pemindaian QR di layar laboratorium, beserta riwayat pribadi." />;
}
