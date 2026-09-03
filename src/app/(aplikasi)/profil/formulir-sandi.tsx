"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PesanFormulir, useKosongkanSetelahBerhasil } from "@/components/ui/umpan-balik";
import { PANJANG_SANDI_MINIMAL } from "@/lib/sandi";
import { ubahKataSandi, type KeadaanSandi } from "./aksi";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Menyimpan…" : "Ganti kata sandi"}
    </Button>
  );
}

export function FormulirSandi() {
  const [keadaan, aksi] = useActionState<KeadaanSandi, FormData>(ubahKataSandi, {});
  const ref = useKosongkanSetelahBerhasil(keadaan.berhasil);

  return (
    <form ref={ref} action={aksi} className="max-w-sm space-y-3">
      <Field label="Kata sandi lama" htmlFor="sandiLama" wajib>
        <Input
          id="sandiLama"
          name="sandiLama"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <Field
        label="Kata sandi baru"
        htmlFor="sandiBaru"
        wajib
        petunjuk={`Minimal ${PANJANG_SANDI_MINIMAL} karakter. Gunakan frasa yang mudah Anda ingat, dan jangan pakai kata sandi bawaan.`}
      >
        <Input
          id="sandiBaru"
          name="sandiBaru"
          type="password"
          autoComplete="new-password"
          minLength={PANJANG_SANDI_MINIMAL}
          required
        />
      </Field>
      <Field label="Ulangi kata sandi baru" htmlFor="ulangi" wajib>
        <Input
          id="ulangi"
          name="ulangi"
          type="password"
          autoComplete="new-password"
          minLength={PANJANG_SANDI_MINIMAL}
          required
        />
      </Field>
      <TombolSimpan />

      <PesanFormulir galat={keadaan.galat} berhasil={keadaan.berhasil} />
    </form>
  );
}
