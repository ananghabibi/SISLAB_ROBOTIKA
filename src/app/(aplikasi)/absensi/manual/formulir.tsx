"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, TextArea } from "@/components/ui/field";
import { catatAbsensiManual, type KeadaanManual } from "./aksi";

const KEGIATAN = ["RISET", "PIKET", "RAPAT", "PELATIHAN", "PENGABDIAN", "ADMINISTRASI", "LAINNYA"];

function TombolCatat() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="bahaya" disabled={pending}>
      {pending ? "Mencatat…" : "Catat absensi manual"}
    </Button>
  );
}

export function FormulirManual({ anggota }: { anggota: { id: string; label: string }[] }) {
  const [keadaan, aksi] = useActionState<KeadaanManual, FormData>(catatAbsensiManual, {});

  return (
    <form action={aksi} className="space-y-4">
      <Field label="Anggota" htmlFor="userId">
        <Select id="userId" name="userId" defaultValue="" required>
          <option value="" disabled>
            Pilih anggota
          </option>
          {anggota.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Jenis kegiatan" htmlFor="jenisKegiatan">
          <Select id="jenisKegiatan" name="jenisKegiatan" defaultValue="RISET">
            {KEGIATAN.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Jam masuk (WIB)" htmlFor="jamMasuk">
          <Input id="jamMasuk" name="jamMasuk" type="time" required />
        </Field>
        <Field label="Jam pulang (opsional)" htmlFor="jamKeluar" petunjuk="Kosongkan bila belum pulang.">
          <Input id="jamKeluar" name="jamKeluar" type="time" />
        </Field>
      </div>

      <Field
        label="Alasan pencatatan manual"
        htmlFor="alasan"
        petunjuk="Minimal 25 karakter. Sebutkan apa yang rusak dan mengapa absensi biasa tidak bisa dipakai. Alasan ini dibaca Kepala Laboratorium saat menilai rekap."
      >
        <TextArea
          id="alasan"
          name="alasan"
          rows={3}
          required
          minLength={25}
          className="w-full rounded-lg border border-garis bg-permukaan px-3 py-2 text-base"
          placeholder="Monitor layar lab mati sejak pukul 08.00, teknisi belum datang. Anggota hadir dan disaksikan langsung."
        />
      </Field>

      <label className="flex items-start gap-3 rounded-lg bg-peringatan-lembut px-3 py-3 text-sm text-peringatan">
        <input
          type="checkbox"
          name="pernyataan"
          value="ya"
          required
          className="mt-0.5 h-5 min-h-0 w-5 shrink-0"
        />
        <span>
          Saya menyatakan ini benar-benar keadaan darurat, anggota tersebut memang hadir dan saya
          saksikan sendiri, dan pencatatan ini tercatat atas nama saya di audit log.
        </span>
      </label>

      <TombolCatat />

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
