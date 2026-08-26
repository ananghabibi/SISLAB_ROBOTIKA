"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

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
  const [catatan, setCatatan] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

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
      setGalat(
        kesalahan instanceof Error && /permission|denied/i.test(kesalahan.message)
          ? "Izin kamera ditolak. Aktifkan izin kamera untuk situs ini di pengaturan peramban."
          : "Kamera tidak dapat dibuka. Pastikan tidak ada aplikasi lain yang sedang memakainya.",
      );
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
          ...(aksi === "masuk" ? { rencana: catatan } : { uraian: catatan }),
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

          <Field
            label={aksi === "masuk" ? "Rencana hari ini (opsional)" : "Yang dikerjakan (opsional)"}
            htmlFor="catatan"
          >
            <Input
              id="catatan"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder={aksi === "masuk" ? "Kalibrasi sensor IMU" : "Kalibrasi selesai, data tersimpan"}
            />
          </Field>

          <Button
            size="besar"
            className="w-full"
            onClick={kirim}
            disabled={tahap === "mengirim" || kode.length !== 6}
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
