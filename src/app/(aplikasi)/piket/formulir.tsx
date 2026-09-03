"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Centang, Field, Input, Select } from "@/components/ui/field";
import { PesanFormulir, useKosongkanSetelahBerhasil } from "@/components/ui/umpan-balik";
import type { ButirPiket } from "@/lib/piket";
import { UKURAN_MAKSIMAL_MB } from "@/lib/unggahan";
import { simpanPiket, type KeadaanPiket } from "./aksi";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="besar" className="w-full" disabled={pending}>
      {pending ? "Menyimpan…" : "Simpan catatan piket"}
    </Button>
  );
}

export function FormulirPiket({
  butir,
  squad,
  squadBawaan,
}: {
  butir: ButirPiket[];
  squad: { id: string; nama: string }[];
  squadBawaan: string;
}) {
  const [keadaan, kirim] = useActionState<KeadaanPiket, FormData>(simpanPiket, {});
  const acuanFormulir = useKosongkanSetelahBerhasil(keadaan.berhasil);

  return (
    <form ref={acuanFormulir} action={kirim} className="space-y-4">
      {squad.length > 1 ? (
        <Field label="Squad yang piket" htmlFor="squadId">
          <Select id="squadId" name="squadId" defaultValue={squadBawaan} required>
            {squad.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="squadId" value={squad[0]?.id ?? ""} />
      )}

      <Field label={`Checklist ${butir.length} butir`} htmlFor="butir-0">
        <div className="space-y-1 rounded-lg border border-garis p-2">
          {butir.map((b, i) => (
            <Centang
              key={b.kode}
              id={`butir-${i}`}
              name="butir"
              value={b.kode}
              label={b.butir}
              keterangan={b.keterangan || undefined}
            />
          ))}
        </div>
      </Field>

      <p className="rounded-lg bg-peringatan-lembut px-3 py-2 text-xs text-peringatan">
        Butir yang belum sempat dikerjakan biarkan tidak tercentang. Catatan piket yang selalu
        berbunyi {butir.length} dari {butir.length} tidak dapat dipakai memperbaiki apa pun.
      </p>

      <Field
        label="Foto ruangan sebelum piket"
        wajib
        htmlFor="fotoSebelum"
        petunjuk={`Wajib. JPG, PNG, atau WEBP, maksimal ${UKURAN_MAKSIMAL_MB} MB.`}
      >
        <Input
          id="fotoSebelum"
          name="fotoSebelum"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          required
        />
      </Field>

      <Field
        label="Foto ruangan sesudah piket"
        wajib
        htmlFor="fotoSesudah"
        petunjuk="Wajib. Ambil dari sudut yang sama dengan foto sebelum."
      >
        <Input
          id="fotoSesudah"
          name="fotoSesudah"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          required
        />
      </Field>

      <PesanFormulir galat={keadaan.galat} berhasil={keadaan.berhasil} />

      <Tombol />
    </form>
  );
}
