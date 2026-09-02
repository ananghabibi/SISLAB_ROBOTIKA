"use client";

import { Fragment, useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { PesanFormulir } from "@/components/ui/umpan-balik";
import type { BarisRoster } from "@/lib/jadwal-piket";
import { simpanJadwalPiket, type KeadaanJadwal } from "./aksi";

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Menyimpan…" : "Simpan jadwal"}
    </Button>
  );
}

export function FormulirJadwal({
  roster,
  squad,
}: {
  roster: BarisRoster[];
  squad: { id: string; nama: string }[];
}) {
  const [keadaan, aksi] = useActionState<KeadaanJadwal, FormData>(simpanJadwalPiket, {});
  // Setelah simpan, props menyegar (revalidatePath). Kunci ini memasang ulang
  // pilihan agar menampilkan keadaan tersimpan, bukan nilai lama React 19.
  const kunci = JSON.stringify(roster.map((r) => r.squadId));

  return (
    <form action={aksi} className="space-y-4">
      <div className="divide-y divide-garis" key={kunci}>
        {roster.map((hari) => (
          <div key={hari.nomor} className="flex flex-wrap items-center gap-3 py-3">
            <label htmlFor={`hari-${hari.nomor}`} className="w-24 font-medium">
              {hari.nama}
            </label>
            <Select
              id={`hari-${hari.nomor}`}
              name={`hari-${hari.nomor}`}
              defaultValue={hari.squadId ?? ""}
              className="max-w-xs flex-1"
            >
              <option value="">— Belum ditetapkan —</option>
              {squad.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama}
                </option>
              ))}
            </Select>
          </div>
        ))}
      </div>

      <TombolSimpan />
      <PesanFormulir galat={keadaan.galat} berhasil={keadaan.berhasil} />
    </form>
  );
}
