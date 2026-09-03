"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { PesanFormulir } from "@/components/ui/umpan-balik";
import { terbitkan, type KeadaanSkk } from "./aksi";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Menerbitkan…" : "Terbitkan surat"}
    </Button>
  );
}

export function FormulirTerbit({
  userId,
  nama,
  adaYangKurang,
}: {
  userId: string;
  nama: string;
  adaYangKurang: boolean;
}) {
  const [keadaan, kirim] = useActionState<KeadaanSkk, FormData>(terbitkan, {});
  const id = (bagian: string) => `${bagian}-${userId}`;

  return (
    <form action={kirim} className="mt-3 space-y-3 border-t border-garis pt-3">
      <input type="hidden" name="userId" value={userId} />

      <Field
        label="Serah terima dokumentasi tim lomba"
        htmlFor={id("dok")}
        petunjuk="Tidak ada kejadian di sistem yang dapat membuktikannya, jadi Anda yang menyatakan."
      >
        <Select id={id("dok")} name="dokumentasi" defaultValue="TIDAK_BERLAKU">
          <option value="TIDAK_BERLAKU">Tidak berlaku — bukan anggota tim lomba</option>
          <option value="TUNTAS">Sudah tuntas</option>
          <option value="BELUM">Belum tuntas</option>
        </Select>
      </Field>

      {adaYangKurang ? (
        <label className="flex items-start gap-3 rounded-lg bg-peringatan-lembut px-3 py-3 text-sm text-peringatan">
          <input type="checkbox" name="tetapTerbitkan" value="ya" className="mt-0.5 size-5" />
          <span>
            Ada syarat yang belum terpenuhi menurut hitungan sistem. Saya tetap menerbitkan surat
            untuk {nama} atas pertimbangan saya sendiri, dan alasan itu ikut tercetak di suratnya.
          </span>
        </label>
      ) : null}

      <PesanFormulir galat={keadaan.galat} berhasil={keadaan.berhasil} />

      <Tombol />
    </form>
  );
}
