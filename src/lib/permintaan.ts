// -----------------------------------------------------------------------------
// Asal permintaan yang sebenarnya.
//
// `request.nextUrl` TIDAK bisa dipercaya untuk membangun alamat pengalihan di
// middleware. Pada runtime Edge, Next.js mengisinya dengan asal bawaan
// internal — teramati sebagai `http://localhost:3000` walaupun peladen
// sesungguhnya melayani `https://localhost:4444`. Memakainya berarti setiap
// pengalihan melempar pengguna ke alamat yang tidak ada.
//
// Yang benar selalu ada di header permintaan. Di belakang Caddy, `Caddyfile`
// sudah meneruskan X-Forwarded-Proto dan alamat aslinya; pada peladen
// pengembangan berskema https, Next.js sendiri yang mengisinya.
// -----------------------------------------------------------------------------

/**
 * @param cadanganHost Dipakai bila header `host` sekalipun tidak ada — keadaan
 *   yang seharusnya mustahil, tetapi lebih baik daripada menghasilkan alamat
 *   `undefined`.
 */
export function asalPermintaan(header: Headers, cadanganHost: string): string {
  const pertama = (nilai: string | null): string | null =>
    nilai ? (nilai.split(",")[0]?.trim() ?? null) : null;

  const skema = pertama(header.get("x-forwarded-proto")) ?? "http";
  const host = pertama(header.get("x-forwarded-host")) ?? pertama(header.get("host")) ?? cadanganHost;

  return `${skema}://${host}`;
}
