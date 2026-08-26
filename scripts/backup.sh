#!/bin/sh
# =============================================================================
# Cadangan harian basis data SILAB.
#
# Berjalan sebagai kontainer yang hidup terus: tidur sampai pukul 02:00 WIB,
# membuat dump terkompresi, lalu membuang dump yang lebih tua dari 30 hari.
# Cara ini dipilih agar tidak bergantung pada cron di sistem induk — pengurus
# tahun berikutnya cukup menjalankan `docker compose up -d`.
# =============================================================================
set -eu

JAM_CADANGAN=02
DIR=/backups
RETENSI_HARI=30

mkdir -p "$DIR"

buat_cadangan() {
  stempel=$(date +%Y-%m-%d_%H%M)
  berkas="$DIR/silab_${stempel}.sql.gz"
  echo "[cadangan] menulis $berkas"
  if pg_dump -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists | gzip -9 > "$berkas.tmp"; then
    mv "$berkas.tmp" "$berkas"
    echo "[cadangan] selesai: $(du -h "$berkas" | cut -f1)"
  else
    rm -f "$berkas.tmp"
    echo "[cadangan] GAGAL pada $stempel" >&2
    return 1
  fi
  # Buang cadangan lama. Dilakukan hanya setelah dump baru berhasil,
  # supaya kegagalan beruntun tidak menghabiskan riwayat cadangan.
  find "$DIR" -name 'silab_*.sql.gz' -mtime +"$RETENSI_HARI" -delete
}

echo "[cadangan] penjadwal aktif, dump harian pukul ${JAM_CADANGAN}:00 WIB, retensi ${RETENSI_HARI} hari"
while true; do
  sekarang=$(date +%H%M)
  if [ "$sekarang" = "${JAM_CADANGAN}00" ]; then
    buat_cadangan || true
    sleep 3600
  fi
  sleep 50
done
