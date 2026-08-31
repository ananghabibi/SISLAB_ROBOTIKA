"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, TextArea } from "@/components/ui/field";
import { PesanFormulir, useKosongkanSetelahBerhasil } from "@/components/ui/umpan-balik";
import { JENIS_INSIDEN, LABEL_JENIS_INSIDEN } from "@/lib/insiden";
import { UKURAN_MAKSIMAL_MB } from "@/lib/unggahan";
import { laporkanInsiden, type KeadaanInsiden } from "./aksi";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="besar" className="w-full" disabled={pending}>
      {pending ? "Mengirim…" : "Kirim laporan"}
    </Button>
  );
}

export function FormulirInsiden() {
  const [keadaan, kirim] = useActionState<KeadaanInsiden, FormData>(laporkanInsiden, {});
  const acuanFormulir = useKosongkanSetelahBerhasil(keadaan.berhasil);

  return (
    <form ref={acuanFormulir} action={kirim} className="space-y-4">
      <Field label="Jenis kejadian" wajib htmlFor="jenis">
        <Select id="jenis" name="jenis" defaultValue="NYARIS_CELAKA" required>
          {JENIS_INSIDEN.map((j) => (
            <option key={j} value={j}>
              {LABEL_JENIS_INSIDEN[j]}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Lokasi"
        wajib
        htmlFor="lokasi"
        petunjuk="Sedetail yang Anda ingat, mis. meja solder dekat jendela."
      >
        <Input id="lokasi" name="lokasi" required placeholder="mis. area solder" />
      </Field>

      <Field
        label="Kronologi"
        wajib
        htmlFor="kronologi"
        petunjuk="Apa yang terjadi, berurutan. Minimal 20 karakter."
      >
        <TextArea id="kronologi" name="kronologi" rows={4} required />
      </Field>

      <Field
        label="Tindakan yang sudah diambil"
        wajib
        htmlFor="tindakan"
        petunjuk="Boleh diisi 'belum ada tindakan'. Yang penting jujur."
      >
        <TextArea id="tindakan" name="tindakan" rows={3} required />
      </Field>

      <Field label="Saran pencegahan" htmlFor="saran" petunjuk="Boleh dikosongkan.">
        <TextArea id="saran" name="saran" rows={2} />
      </Field>

      <Field
        label="Foto"
        htmlFor="foto"
        petunjuk={`Tidak wajib. JPG, PNG, atau WEBP, maksimal ${UKURAN_MAKSIMAL_MB} MB. Jangan memotret wajah orang yang terluka.`}
      >
        <Input id="foto" name="foto" type="file" accept="image/jpeg,image/png,image/webp" />
      </Field>

      <PesanFormulir galat={keadaan.galat} berhasil={keadaan.berhasil} />

      <Tombol />
    </form>
  );
}

function TombolStatus({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="garis" className="text-xs" disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}

export { TombolStatus };
