// -----------------------------------------------------------------------------
// Kerangka halaman selagi datanya disiapkan.
//
// Seluruh halaman aplikasi ini dirender di peladen dan menyentuh basis data,
// jadi perpindahan halaman selalu punya jeda. Tanpa berkas ini jeda itu tampak
// sebagai layar yang membeku: tautan sudah ditekan tetapi tidak ada apa pun
// yang berubah, dan orang menekannya lagi.
// -----------------------------------------------------------------------------

function Balok({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-garis/60 ${className}`} />;
}

export default function Memuat() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat halaman…</span>
      <div className="mb-5 space-y-2">
        <Balok className="h-7 w-56" />
        <Balok className="h-4 w-72" />
      </div>
      <div className="space-y-3">
        <Balok className="h-28 w-full" />
        <Balok className="h-40 w-full" />
        <Balok className="h-40 w-full" />
      </div>
    </div>
  );
}
