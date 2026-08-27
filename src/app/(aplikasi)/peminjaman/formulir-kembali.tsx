"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { KONDISI_ASET } from "@/lib/aset";
import { UKURAN_MAKSIMAL_MB } from "@/lib/unggahan";
import { catatKembali, type KeadaanPinjam } from "./aksi";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Menyimpan…" : "Catat pengembalian"}
    </Button>
  );
}

export function FormulirKembali({ pinjamanId }: { pinjamanId: string }) {
  const [keadaan, kirim] = useActionState<KeadaanPinjam, FormData>(catatKembali, {});
  const id = (bagian: string) => `${bagian}-${pinjamanId}`;

  return (
    <form action={kirim} className="space-y-3">
      <input type="hidden" name="pinjamanId" value={pinjamanId} />

      <Field label="Kondisi saat kembali" htmlFor={id("kondisi")}>
        <Select id={id("kondisi")} name="kondisiKembali" defaultValue="BAIK" required>
          {KONDISI_ASET.map((k) => (
            <option key={k} value={k}>
              {k.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Catatan"
        htmlFor={id("catatan")}
        petunjuk="Wajib bila kondisinya bukan BAIK."
      >
        <textarea
          id={id("catatan")}
          name="catatan"
          rows={2}
          placeholder="mis. gigi servo aus, perlu diganti"
        />
      </Field>

      <Field
        label="Foto kondisi saat kembali"
        htmlFor={id("foto")}
        petunjuk={`Wajib. JPG, PNG, atau WEBP, maksimal ${UKURAN_MAKSIMAL_MB} MB.`}
      >
        <Input
          id={id("foto")}
          name="fotoKembali"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          required
        />
      </Field>

      {keadaan.galat ? (
        <p className="rounded-lg bg-bahaya-lembut px-3 py-2 text-sm text-bahaya">{keadaan.galat}</p>
      ) : null}
      {keadaan.berhasil ? (
        <p className="rounded-lg bg-berhasil-lembut px-3 py-2 text-sm text-berhasil">
          {keadaan.berhasil}
        </p>
      ) : null}

      <Tombol />
    </form>
  );
}
