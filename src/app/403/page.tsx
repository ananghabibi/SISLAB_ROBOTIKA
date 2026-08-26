import { forbidden } from "next/navigation";

/**
 * Tujuan penulisan ulang dari middleware saat peran tidak berhak atas sebuah
 * rute. Satu-satunya tugasnya adalah memicu `forbidden()`, supaya jawaban HTTP
 * benar-benar berstatus 403 dan tampilannya memakai `src/app/forbidden.tsx`
 * yang sama dengan penolakan dari penjagaan di halaman.
 */
export default function HalamanTigaNolTiga(): never {
  forbidden();
}
