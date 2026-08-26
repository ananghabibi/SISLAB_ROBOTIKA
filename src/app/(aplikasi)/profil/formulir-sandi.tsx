"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
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

  return (
    <form action={aksi} className="max-w-sm space-y-3">
      <Field label="Kata sandi lama" htmlFor="sandiLama">
        <Input id="sandiLama" name="sandiLama" type="password" autoComplete="current-password" required />
      </Field>
      <Field
        label="Kata sandi baru"
        htmlFor="sandiBaru"
        petunjuk="Minimal 10 karakter. Gunakan frasa yang mudah Anda ingat."
      >
        <Input id="sandiBaru" name="sandiBaru" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Ulangi kata sandi baru" htmlFor="ulangi">
        <Input id="ulangi" name="ulangi" type="password" autoComplete="new-password" required />
      </Field>
      <TombolSimpan />

      {keadaan.galat ? (
        <p role="alert" className="rounded-lg bg-bahaya-lembut px-3 py-2 text-sm text-bahaya">
          {keadaan.galat}
        </p>
      ) : null}
      {keadaan.berhasil ? (
        <p role="status" className="rounded-lg bg-berhasil-lembut px-3 py-2 text-sm text-berhasil">
          {keadaan.berhasil}
        </p>
      ) : null}
    </form>
  );
}
