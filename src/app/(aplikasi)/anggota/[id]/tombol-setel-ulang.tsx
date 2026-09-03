"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { PesanFormulir } from "@/components/ui/umpan-balik";
import { setelUlangSandi, type KeadaanAnggota } from "../aksi";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="garis" disabled={pending}>
      {pending ? "Menyetel ulang…" : "Setel ulang ke kata sandi bawaan"}
    </Button>
  );
}

export function TombolSetelUlangSandi({ idAnggota }: { idAnggota: string }) {
  const [keadaan, aksi] = useActionState<KeadaanAnggota, FormData>(
    setelUlangSandi.bind(null, idAnggota),
    {},
  );

  return (
    <form action={aksi} className="space-y-3">
      <Tombol />
      <PesanFormulir galat={keadaan.galat} berhasil={keadaan.berhasil} />
    </form>
  );
}
