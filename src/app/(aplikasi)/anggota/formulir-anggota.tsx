"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import type { KeadaanAnggota } from "./aksi";

export interface NilaiAnggota {
  nama: string;
  npm: string;
  email: string;
  prodi: string;
  fakultas: string;
  angkatan: string;
  semester: string;
  squadId: string;
  jenjang: string;
  status: string;
  role: string;
}

const JENJANG = ["MUDA", "MADYA", "UTAMA", "KOORDINATOR", "KEPALA_LAB"];
const STATUS = ["AKTIF", "CUTI", "NONAKTIF", "LULUS"];

function TombolSimpan({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Menyimpan…" : label}
    </Button>
  );
}

export function FormulirAnggota({
  aksi,
  nilai,
  squad,
  peran,
  bolehUbahPeran,
  labelTombol,
}: {
  aksi: (keadaan: KeadaanAnggota, data: FormData) => Promise<KeadaanAnggota>;
  nilai: NilaiAnggota;
  squad: { id: string; nama: string }[];
  peran: { nilai: string; label: string }[];
  bolehUbahPeran: boolean;
  labelTombol: string;
}) {
  const [keadaan, jalankan] = useActionState<KeadaanAnggota, FormData>(aksi, {});

  return (
    <form action={jalankan} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama lengkap" htmlFor="nama">
          <Input id="nama" name="nama" defaultValue={nilai.nama} required />
        </Field>
        <Field
          label="NPM"
          htmlFor="npm"
          petunjuk="11 digit. Kosongkan untuk akun dosen atau pengawas."
        >
          <Input id="npm" name="npm" inputMode="numeric" defaultValue={nilai.npm} />
        </Field>
        <Field
          label="Surel"
          htmlFor="email"
          petunjuk="Harus persis sama dengan surel Google kampus yang dipakai masuk."
        >
          <Input id="email" name="email" type="email" defaultValue={nilai.email} required />
        </Field>
        <Field label="Program studi" htmlFor="prodi">
          <Input id="prodi" name="prodi" defaultValue={nilai.prodi} required />
        </Field>
        <Field
          label="Fakultas"
          htmlFor="fakultas"
          petunjuk='Selain "Teknik" ditandai sebagai Anggota Afiliasi.'
        >
          <Input id="fakultas" name="fakultas" defaultValue={nilai.fakultas} required />
        </Field>
        <Field label="Angkatan" htmlFor="angkatan">
          <Input id="angkatan" name="angkatan" inputMode="numeric" defaultValue={nilai.angkatan} />
        </Field>
        <Field label="Semester" htmlFor="semester">
          <Input id="semester" name="semester" inputMode="numeric" defaultValue={nilai.semester} />
        </Field>
        <Field label="Squad" htmlFor="squadId">
          <Select id="squadId" name="squadId" defaultValue={nilai.squadId}>
            <option value="">Tanpa squad</option>
            {squad.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Jenjang" htmlFor="jenjang">
          <Select id="jenjang" name="jenjang" defaultValue={nilai.jenjang}>
            {JENJANG.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Status keanggotaan"
          htmlFor="status"
          petunjuk="NONAKTIF dan LULUS tidak dapat masuk ke sistem."
        >
          <Select id="status" name="status" defaultValue={nilai.status}>
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Peran"
          htmlFor="role"
          petunjuk={
            bolehUbahPeran
              ? "Menentukan seluruh hak akses. Perubahan tercatat di audit log."
              : "Hanya Kepala Laboratorium yang dapat mengubah peran."
          }
        >
          <Select id="role" name="role" defaultValue={nilai.role} disabled={!bolehUbahPeran}>
            {peran.map((p) => (
              <option key={p.nilai} value={p.nilai}>
                {p.label}
              </option>
            ))}
          </Select>
          {/* Peran tetap terkirim walau kendalinya nonaktif, supaya nilainya tidak hilang. */}
          {!bolehUbahPeran ? <input type="hidden" name="role" value={nilai.role} /> : null}
        </Field>
      </div>

      <TombolSimpan label={labelTombol} />

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
