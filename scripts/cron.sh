#!/bin/sh
# =============================================================================
# Penjadwal internal SILAB.
#
# Membangunkan aplikasi setiap pukul 00:01 WIB untuk menerbitkan kode harian.
# Dibuat sebagai kontainer yang hidup terus, bukan cron sistem induk, supaya
# pengurus tahun berikutnya cukup menjalankan `docker compose up -d` tanpa perlu
# menyentuh crontab mesin.
#
# Kalau mini PC mati semalaman dan panggilan ini terlewat, laboratorium tetap
# aman: halaman /display menerbitkan kode hari itu begitu layar dinyalakan.
# =============================================================================
set -eu

JAM_TERBIT=00
MENIT_TERBIT=01
ALAMAT="${ALAMAT_APLIKASI:-http://app:3000}/api/cron/kode-harian"

echo "[cron] aktif, menerbitkan kode harian tiap pukul ${JAM_TERBIT}:${MENIT_TERBIT} WIB"

terbitkan() {
  jawaban=$(wget -qO- --header="x-cron-secret: ${CRON_SECRET}" --post-data='' "$ALAMAT" 2>&1) \
    && echo "[cron] $(date '+%F %T') $jawaban" \
    || echo "[cron] $(date '+%F %T') GAGAL memanggil $ALAMAT: $jawaban" >&2
}

while true; do
  sekarang=$(date +%H%M)
  if [ "$sekarang" = "${JAM_TERBIT}${MENIT_TERBIT}" ]; then
    terbitkan
    sleep 3600
  fi
  sleep 50
done
