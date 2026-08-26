"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { masukGoogle, masukKredensial, type KeadaanMasuk } from "./aksi";

const keadaanAwal: KeadaanMasuk = {};

function TombolKirim({ anak, variant }: { anak: string; variant?: "utama" | "garis" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant ?? "utama"} size="besar" className="w-full" disabled={pending}>
      {pending ? "Memproses…" : anak}
    </Button>
  );
}

export function FormulirMasuk({ lanjut }: { lanjut: string }) {
  const [keadaanGoogle, aksiGoogle] = useActionState(masukGoogle, keadaanAwal);
  const [keadaanKredensial, aksiKredensial] = useActionState(masukKredensial, keadaanAwal);
  const galat = keadaanGoogle.galat ?? keadaanKredensial.galat;

  return (
    <div className="space-y-5">
      <form action={aksiGoogle}>
        <input type="hidden" name="lanjut" value={lanjut} />
        <TombolKirim anak="Masuk dengan akun Google kampus" />
      </form>

      <div className="flex items-center gap-3 text-xs text-teks-redup">
        <span className="h-px flex-1 bg-garis" />
        atau akun dosen
        <span className="h-px flex-1 bg-garis" />
      </div>

      <form action={aksiKredensial} className="space-y-3">
        <input type="hidden" name="lanjut" value={lanjut} />
        <Field label="Surel" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="username" required />
        </Field>
        <Field label="Kata sandi" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <TombolKirim anak="Masuk" variant="garis" />
      </form>

      {galat ? (
        <p
          role="alert"
          className="rounded-lg border border-bahaya/30 bg-bahaya-lembut px-3 py-2 text-sm text-bahaya"
        >
          {galat}
        </p>
      ) : null}
    </div>
  );
}
