"use client";

// -----------------------------------------------------------------------------
// Umpan balik formulir: pesan galat, pesan berhasil, dan pengosongan isian.
//
// Sebelumnya tiap formulir menuliskan kotak pesannya sendiri-sendiri, dan
// masing-masing punya cacat yang sama: pesannya muncul di ujung bawah formulir
// yang panjang, di luar layar, sehingga tombol yang ditekan tampak tidak
// melakukan apa-apa. Orang lalu menekannya lagi.
//
// Di sini pesannya digulir ke dalam pandangan dan diumumkan ke pembaca layar,
// dan isian dikosongkan setelah berhasil supaya catatan yang sama tidak
// terkirim dua kali.
// -----------------------------------------------------------------------------

import { useEffect, useRef } from "react";

export function PesanFormulir({ galat, berhasil }: { galat?: string; berhasil?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const pesan = galat ?? berhasil;

  useEffect(() => {
    if (!pesan) return;
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    // Difokuskan hanya untuk galat: keberhasilan tidak perlu merebut fokus
    // dari kolom berikutnya yang mungkin sedang diisi.
    if (galat) ref.current?.focus();
  }, [pesan, galat]);

  if (!pesan) return null;

  return (
    <p
      ref={ref}
      tabIndex={-1}
      role={galat ? "alert" : "status"}
      className={
        galat
          ? "rounded-lg bg-bahaya-lembut px-3 py-2 text-sm text-bahaya"
          : "rounded-lg bg-berhasil-lembut px-3 py-2 text-sm text-berhasil"
      }
    >
      {pesan}
    </p>
  );
}

/**
 * Mengosongkan formulir setiap kali sebuah aksi berhasil.
 *
 * Dipasang pada `ref` elemen `<form>`. Hanya untuk formulir yang isiannya
 * tidak dikendalikan React — pada formulir terkendali, pengosongan DOM tidak
 * ikut mengubah state dan keduanya jadi berbeda isi.
 */
export function useKosongkanSetelahBerhasil(berhasil: string | undefined) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (berhasil) ref.current?.reset();
  }, [berhasil]);
  return ref;
}
