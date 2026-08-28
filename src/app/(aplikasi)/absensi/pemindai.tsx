"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
// Diimpor dari modul yang tidak menyentuh Prisma, supaya tidak ikut menyeret
// klien basis data ke dalam berkas yang berjalan di peramban.
import { PANJANG_KENDALA_MINIMAL, PANJANG_URAIAN_MINIMAL } from "@/lib/catatan-pulang";
import { peringatanKameraTidakAman, pesanGalatKamera } from "@/lib/kamera";

type Tahap = "diam" | "memindai" | "konfirmasi" | "mengirim" | "selesai";

const KEGIATAN = [
  ["RISET", "Riset squad"],
  ["PIKET", "Piket"],
  ["RAPAT", "Rapat"],
  ["PELATIHAN", "Pelatihan"],
  ["PENGABDIAN", "Pengabdian"],
  ["ADMINISTRASI", "Administrasi"],
  ["LAINNYA", "Lainnya"],
] as const;

const ID_KOTAK_PINDAI = "kotak-pindai-qr";

export function Pemindai({ aksi }: { aksi: "masuk" | "pulang" }) {
  const router = useRouter();
  const [tahap, setTahap] = useState<Tahap>("diam");
  const [token, setToken] = useState("");
  const [kode, setKode] = useState("");
  const [jenisKegiatan, setJenisKegiatan] = useState("RISET");
  const [rencana, setRencana] = useState("");
  const [uraian, setUraian] = useState("");
  const [kendala, setKendala] = useState("");
  const [tanpaKendala, setTanpaKendala] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  // Diisi sesudah komponen terpasang: `isSecureContext` tidak ada di peladen.
  const [peringatan, setPeringatan] = useState<string | null>(null);

  // Disimpan di ref, bukan state: instans pemindai tidak boleh ikut memicu render.
  const pemindaiRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

  const hentikanPemindai = useCallback(async () => {
    const pemindai = pemindaiRef.current;
    pemindaiRef.current = null;
    if (!pemindai) return;
    try {
      await pemindai.stop();
      pemindai.clear();
    } catch {
      // Pemindai sudah berhenti sendiri; tidak ada yang perlu dilakukan.
    }
  }, []);

  // Kamera wajib dimatikan saat komponen dilepas. Kalau tidak, lampu kamera
  // ponsel tetap menyala setelah pengguna berpindah halaman.
  useEffect(() => () => void hentikanPemindai(), [hentikanPemindai]);

  useEffect(() => setPeringatan(peringatanKameraTidakAman()), []);

  async function mulaiPindai() {
    setGalat(null);
    setTahap("memindai");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const pemindai = new Html5Qrcode(ID_KOTAK_PINDAI);
      pemindaiRef.current = pemindai;

      await pemindai.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (teks) => {
          setToken(teks);
          void hentikanPemindai();
          setTahap("konfirmasi");
        },
        () => {
          // Dipanggil sangat sering selama tidak ada QR di bidikan. Diabaikan.
        },
      );
    } catch (kesalahan) {
      await hentikanPemindai();
      setTahap("diam");
      setGalat(pesanGalatKamera(kesalahan));
    }
  }

  async function kirim() {
    setGalat(null);
    setTahap("mengirim");
    try {
      const jawaban = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aksi,
          token,
          kode,
          jenisKegiatan,
          ...(aksi === "masuk" ? { rencana } : { uraian, kendala, tanpaKendala }),
        }),
      });
      const isi = (await jawaban.json()) as { ok: boolean; pesan: string };

      if (!jawaban.ok || !isi.ok) {
        setGalat(isi.pesan ?? "Absensi gagal. Coba lagi.");
        // Token sekali pakai: apa pun sebabnya, pemindaian harus diulang.
        setToken("");
        setTahap("diam");
        return;
      }

      setPesan(isi.pesan);
      setTahap("selesai");
      router.refresh();
    } catch {
      setGalat("Peladen tidak dapat dihubungi. Pastikan Anda tersambung WiFi laboratorium.");
      setTahap("diam");
    }
  }

  if (tahap === "selesai") {
    return (
      <div className="rounded-xl bg-berhasil-lembut px-4 py-4 text-center">
        <p className="text-lg font-semibold text-berhasil">{pesan}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tahap === "diam" && peringatan ? (
        <p role="status" className="rounded-lg bg-peringatan-lembut px-3 py-2 text-sm text-peringatan">
          {peringatan}
        </p>
      ) : null}

      {tahap === "diam" ? (
        <Button size="besar" className="w-full" onClick={mulaiPindai}>
          {aksi === "masuk" ? "Pindai QR untuk absen masuk" : "Pindai QR untuk absen pulang"}
        </Button>
      ) : null}

      {/* Wadah pemindai harus tetap ada di DOM selagi kamera hidup. */}
      <div className={tahap === "memindai" ? "space-y-3" : "hidden"}>
        <div id={ID_KOTAK_PINDAI} className="overflow-hidden rounded-xl bg-black" />
        <p className="text-center text-sm text-teks-redup">
          Arahkan kamera ke QR di layar laboratorium.
        </p>
        <Button
          variant="garis"
          className="w-full"
          onClick={async () => {
            await hentikanPemindai();
            setTahap("diam");
          }}
        >
          Batal
        </Button>
      </div>

      {tahap === "konfirmasi" || tahap === "mengirim" ? (
        <div className="space-y-3">
          <p className="rounded-lg bg-berhasil-lembut px-3 py-2 text-sm text-berhasil">
            QR terbaca. Sekarang ketik kode harian yang tampil di layar.
          </p>

          <Field label="Kode harian" htmlFor="kode" petunjuk="6 karakter, dibaca dari layar lab.">
            <Input
              id="kode"
              value={kode}
              onChange={(e) => setKode(e.target.value.toUpperCase())}
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              inputMode="text"
              maxLength={6}
              className="text-center font-mono text-2xl tracking-[0.3em]"
            />
          </Field>

          {aksi === "masuk" ? (
            <Field label="Jenis kegiatan" htmlFor="jenisKegiatan">
              <Select
                id="jenisKegiatan"
                value={jenisKegiatan}
                onChange={(e) => setJenisKegiatan(e.target.value)}
              >
                {KEGIATAN.map(([nilai, label]) => (
                  <option key={nilai} value={nilai}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          {aksi === "masuk" ? (
            <Field label="Rencana hari ini (opsional)" htmlFor="rencana">
              <Input
                id="rencana"
                value={rencana}
                onChange={(e) => setRencana(e.target.value)}
                placeholder="Kalibrasi sensor IMU"
              />
            </Field>
          ) : (
            <>
              {/* Wajib. Sesi tanpa keterangan tidak bisa dipertanggungjawabkan
                  saat rekap kontribusi diaudit Program Studi. */}
              <Field
                label="Apa yang Anda kerjakan hari ini?"
                htmlFor="uraian"
                petunjuk={`Wajib diisi, sedikitnya ${PANJANG_URAIAN_MINIMAL} karakter. Inilah yang dibaca Kepala Laboratorium saat menilai kontribusi Anda.`}
              >
                <textarea
                  id="uraian"
                  value={uraian}
                  onChange={(e) => setUraian(e.target.value)}
                  rows={3}
                  required
                  minLength={PANJANG_URAIAN_MINIMAL}
                  className="w-full rounded-lg border border-garis bg-permukaan px-3 py-2 text-base"
                  placeholder="Kalibrasi ulang sensor IMU dan menyimpan datanya ke logbook squad."
                />
              </Field>

              <Field
                label="Kendala hari ini"
                htmlFor="kendala"
                petunjuk="Wajib dijawab. Bila memang tidak ada, centang kotak di bawah."
              >
                <textarea
                  id="kendala"
                  value={kendala}
                  onChange={(e) => setKendala(e.target.value)}
                  rows={2}
                  disabled={tanpaKendala}
                  required={!tanpaKendala}
                  minLength={PANJANG_KENDALA_MINIMAL}
                  className="w-full rounded-lg border border-garis bg-permukaan px-3 py-2 text-base disabled:bg-dasar disabled:text-teks-redup"
                  placeholder="Baterai drone rusak, pengujian terbang ditunda."
                />
              </Field>

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={tanpaKendala}
                  onChange={(e) => {
                    setTanpaKendala(e.target.checked);
                    if (e.target.checked) setKendala("");
                  }}
                  className="h-5 min-h-0 w-5 shrink-0"
                />
                Tidak ada kendala hari ini
              </label>
            </>
          )}

          <Button
            size="besar"
            className="w-full"
            onClick={kirim}
            disabled={
              tahap === "mengirim" ||
              kode.length !== 6 ||
              (aksi === "pulang" &&
                (uraian.trim().length < PANJANG_URAIAN_MINIMAL ||
                  (!tanpaKendala && kendala.trim().length < PANJANG_KENDALA_MINIMAL)))
            }
          >
            {tahap === "mengirim"
              ? "Mengirim…"
              : aksi === "masuk"
                ? "Catat absen masuk"
                : "Catat absen pulang"}
          </Button>
        </div>
      ) : null}

      {galat ? (
        <p role="alert" className="rounded-lg bg-bahaya-lembut px-3 py-2 text-sm text-bahaya">
          {galat}
        </p>
      ) : null}
    </div>
  );
}
