"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { UKURAN_MAKSIMAL_MB } from "@/lib/unggahan";
import { simpanLogbook, type KeadaanLogbook } from "./aksi";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="besar" className="w-full" disabled={pending}>
      {pending ? "Menyimpan…" : "Simpan logbook"}
    </Button>
  );
}

export interface PilihanSquad {
  id: string;
  nama: string;
  anggota: { id: string; nama: string }[];
}

export function FormulirLogbook({
  squad,
  squadBawaan,
  mingguKe,
  keteranganPekan,
}: {
  squad: PilihanSquad[];
  squadBawaan: string;
  mingguKe: number;
  keteranganPekan: string;
}) {
  const [keadaan, kirim] = useActionState<KeadaanLogbook, FormData>(simpanLogbook, {});
  // Daftar anggota mengikuti squad terpilih. Bila hanya satu squad yang boleh
  // diisi, tidak ada yang perlu dipilih sama sekali.
  const terpilih = squad.find((s) => s.id === squadBawaan) ?? squad[0];

  return (
    <form action={kirim} className="space-y-4">
      <input type="hidden" name="mingguKe" value={mingguKe} />

      {squad.length > 1 ? (
        <Field label="Squad" htmlFor="squadId">
          <Select id="squadId" name="squadId" defaultValue={squadBawaan} required>
            {squad.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="squadId" value={terpilih?.id ?? ""} />
      )}

      <p className="rounded-lg bg-utama-lembut px-3 py-2 text-sm text-utama">
        Pekan {mingguKe} · {keteranganPekan}
      </p>

      <Field label="Anggota yang ikut bekerja" htmlFor="anggota-0">
        <div className="space-y-2 rounded-lg border border-garis p-3">
          {(terpilih?.anggota ?? []).map((a, i) => (
            <label key={a.id} className="flex min-h-11 items-center gap-3 text-sm">
              <input
                id={`anggota-${i}`}
                type="checkbox"
                name="anggota"
                value={a.id}
                className="size-5"
              />
              {a.nama}
            </label>
          ))}
          {(terpilih?.anggota ?? []).length === 0 ? (
            <p className="text-sm text-teks-redup">Squad ini belum punya anggota.</p>
          ) : null}
        </div>
      </Field>

      <Field label="Target pekan ini" htmlFor="target">
        <textarea id="target" name="target" rows={2} required />
      </Field>

      <Field label="Yang dikerjakan" htmlFor="dikerjakan">
        <textarea id="dikerjakan" name="dikerjakan" rows={4} required />
      </Field>

      <Field label="Hasil" htmlFor="hasil" petunjuk="Termasuk hasil yang gagal — itu tetap hasil.">
        <textarea id="hasil" name="hasil" rows={3} required />
      </Field>

      <Field label="Kendala" htmlFor="kendala" petunjuk="Boleh dikosongkan.">
        <textarea id="kendala" name="kendala" rows={2} />
      </Field>

      <Field label="Rencana pekan berikutnya" htmlFor="rencanaBerikutnya">
        <textarea id="rencanaBerikutnya" name="rencanaBerikutnya" rows={2} required />
      </Field>

      <Field
        label="Bukti kegiatan"
        htmlFor="bukti"
        petunjuk={`Tidak wajib. JPG, PNG, atau WEBP, maksimal ${UKURAN_MAKSIMAL_MB} MB.`}
      >
        <Input id="bukti" name="bukti" type="file" accept="image/jpeg,image/png,image/webp" />
      </Field>

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

      <Tombol />
    </form>
  );
}
