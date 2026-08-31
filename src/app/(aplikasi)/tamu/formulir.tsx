"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, TextArea } from "@/components/ui/field";
import { PesanFormulir, useKosongkanSetelahBerhasil } from "@/components/ui/umpan-balik";
import { catatTamuMasuk, catatTamuKeluar, type KeadaanTamu } from "./aksi";

function Tombol({ label, menunggu }: { label: string; menunggu: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? menunggu : label}
    </Button>
  );
}

export function FormulirTamu({
  anggota,
  pendampingBawaan,
}: {
  anggota: { id: string; nama: string }[];
  pendampingBawaan: string;
}) {
  const [keadaan, kirim] = useActionState<KeadaanTamu, FormData>(catatTamuMasuk, {});
  const acuanFormulir = useKosongkanSetelahBerhasil(keadaan.berhasil);

  return (
    <form ref={acuanFormulir} action={kirim} className="space-y-4">
      <Field label="Nama tamu" wajib htmlFor="nama">
        <Input id="nama" name="nama" required autoComplete="off" />
      </Field>

      <Field
        label="Asal instansi"
        wajib
        htmlFor="instansi"
        petunjuk="mis. Teknik Mesin UNISMA, SMKN 1 Malang"
      >
        <Input id="instansi" name="instansi" required autoComplete="off" />
      </Field>

      <Field label="Keperluan" wajib htmlFor="keperluan">
        <TextArea id="keperluan" name="keperluan" rows={2} required />
      </Field>

      <Field
        label="Didampingi"
        wajib
        htmlFor="pendampingId"
        petunjuk="Anggota yang menemani tamu selama berada di laboratorium."
      >
        <Select id="pendampingId" name="pendampingId" defaultValue={pendampingBawaan} required>
          {anggota.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nama}
            </option>
          ))}
        </Select>
      </Field>

      <PesanFormulir galat={keadaan.galat} berhasil={keadaan.berhasil} />

      <Tombol label="Catat tamu masuk" menunggu="Menyimpan…" />
    </form>
  );
}

export function TombolPulang({ tamuId }: { tamuId: string }) {
  const [keadaan, kirim] = useActionState<KeadaanTamu, FormData>(catatTamuKeluar, {});

  return (
    <form action={kirim} className="mt-2">
      <input type="hidden" name="tamuId" value={tamuId} />
      <Tombol label="Catat pulang" menunggu="…" />
      {keadaan.galat ? <p className="mt-1 text-xs text-bahaya">{keadaan.galat}</p> : null}
    </form>
  );
}
