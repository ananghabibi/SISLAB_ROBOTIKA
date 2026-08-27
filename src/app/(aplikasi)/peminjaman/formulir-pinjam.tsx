"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { PemindaiAset } from "@/components/pemindai-aset";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { UKURAN_MAKSIMAL_MB } from "@/lib/unggahan";
import { catatPinjam, type KeadaanPinjam } from "./aksi";

function Tombol() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="besar" className="w-full" disabled={pending}>
      {pending ? "Menyimpan…" : "Catat peminjaman"}
    </Button>
  );
}

export function FormulirPinjam({
  anggota,
  kodeAwal = "",
  tanggalMinimal,
}: {
  anggota: { id: string; nama: string; npm: string | null }[];
  kodeAwal?: string;
  tanggalMinimal: string;
}) {
  const [keadaan, kirim] = useActionState<KeadaanPinjam, FormData>(catatPinjam, {});

  return (
    <form action={kirim} className="space-y-4">
      <PemindaiAset awal={kodeAwal} />

      <Field label="Peminjam" htmlFor="peminjamId">
        <Select id="peminjamId" name="peminjamId" required defaultValue="">
          <option value="" disabled>
            — pilih anggota —
          </option>
          {anggota.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nama}
              {a.npm ? ` — ${a.npm}` : ""}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Jumlah" htmlFor="jumlah">
          <Input id="jumlah" name="jumlah" type="number" min={1} defaultValue={1} required />
        </Field>
        <Field
          label="Rencana kembali"
          htmlFor="rencanaKembali"
          petunjuk="Tenggat jatuh pada akhir hari itu."
        >
          <Input
            id="rencanaKembali"
            name="rencanaKembali"
            type="date"
            min={tanggalMinimal}
            required
          />
        </Field>
      </div>

      <Field label="Keperluan" htmlFor="keperluan" petunjuk="Untuk apa alat ini dipakai.">
        <textarea
          id="keperluan"
          name="keperluan"
          rows={3}
          minLength={10}
          required
          placeholder="mis. Pengujian lengan robot untuk lomba KRI divisi Wheeled"
        />
      </Field>

      <Field
        label="Foto kondisi saat dipinjam"
        htmlFor="fotoPinjam"
        petunjuk={`Wajib. JPG, PNG, atau WEBP, maksimal ${UKURAN_MAKSIMAL_MB} MB.`}
      >
        <Input
          id="fotoPinjam"
          name="fotoPinjam"
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
