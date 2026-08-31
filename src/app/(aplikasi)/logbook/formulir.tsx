"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Centang, Field, Input, Select, TextArea } from "@/components/ui/field";
import { PesanFormulir, useKosongkanSetelahBerhasil } from "@/components/ui/umpan-balik";
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
  const acuanFormulir = useKosongkanSetelahBerhasil(keadaan.berhasil);

  // Daftar anggota harus MENGIKUTI squad yang sedang dipilih, bukan squad
  // bawaan. Kepala Lab dan Koordinator Riset boleh mengisi untuk squad mana
  // pun, dan mereka tidak punya squad sendiri — tanpa ini, mengganti pilihan
  // squad akan meninggalkan daftar centang milik squad yang lain, dan peladen
  // menolaknya dengan "ada anggota terpilih yang bukan anggota squad itu".
  const [squadId, setSquadId] = useState(
    squad.some((s) => s.id === squadBawaan) ? squadBawaan : (squad[0]?.id ?? ""),
  );
  const terpilih = squad.find((s) => s.id === squadId) ?? squad[0];

  return (
    <form ref={acuanFormulir} action={kirim} className="space-y-4">
      <input type="hidden" name="mingguKe" value={mingguKe} />

      {squad.length > 1 ? (
        <Field label="Squad" htmlFor="squadId">
          <Select
            id="squadId"
            name="squadId"
            value={squadId}
            onChange={(e) => setSquadId(e.target.value)}
            required
          >
            {squad.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="squadId" value={squadId} />
      )}

      <p className="rounded-lg bg-utama-lembut px-3 py-2 text-sm text-utama">
        Pekan {mingguKe} · {keteranganPekan}
      </p>

      <Field label="Anggota yang ikut bekerja" wajib htmlFor="anggota-0">
        <div className="space-y-2 rounded-lg border border-garis p-3">
          {(terpilih?.anggota ?? []).map((a, i) => (
            <Centang
              key={`${squadId}-${a.id}`}
              id={`anggota-${i}`}
              name="anggota"
              value={a.id}
              label={a.nama}
            />
          ))}
          {(terpilih?.anggota ?? []).length === 0 ? (
            <p className="text-sm text-teks-redup">Squad ini belum punya anggota.</p>
          ) : null}
        </div>
      </Field>

      <Field label="Target pekan ini" wajib htmlFor="target">
        <TextArea id="target" name="target" rows={2} required />
      </Field>

      <Field label="Yang dikerjakan" wajib htmlFor="dikerjakan">
        <TextArea id="dikerjakan" name="dikerjakan" rows={4} required />
      </Field>

      <Field
        label="Hasil"
        wajib
        htmlFor="hasil"
        petunjuk="Termasuk hasil yang gagal — itu tetap hasil."
      >
        <TextArea id="hasil" name="hasil" rows={3} required />
      </Field>

      <Field label="Kendala" htmlFor="kendala" petunjuk="Boleh dikosongkan.">
        <TextArea id="kendala" name="kendala" rows={2} />
      </Field>

      <Field label="Rencana pekan berikutnya" wajib htmlFor="rencanaBerikutnya">
        <TextArea id="rencanaBerikutnya" name="rencanaBerikutnya" rows={2} required />
      </Field>

      <Field
        label="Bukti kegiatan"
        htmlFor="bukti"
        petunjuk={`Tidak wajib. JPG, PNG, atau WEBP, maksimal ${UKURAN_MAKSIMAL_MB} MB.`}
      >
        <Input id="bukti" name="bukti" type="file" accept="image/jpeg,image/png,image/webp" />
      </Field>

      <PesanFormulir galat={keadaan.galat} berhasil={keadaan.berhasil} />

      <Tombol />
    </form>
  );
}
