#!/bin/sh
# =============================================================================
# Penjadwal internal SILAB.
#
# Membangunkan aplikasi setiap lewat tengah malam WIB untuk dua pekerjaan:
# menerbitkan kode harian, lalu menandai pinjaman yang lewat tenggat.
# Dibuat sebagai kontainer yang hidup terus, bukan cron sistem induk, supaya
# pengurus tahun berikutnya cukup menjalankan `docker compose up -d` tanpa perlu
# menyentuh crontab mesin.
#
# Kalau mini PC mati semalaman dan panggilan ini terlewat, laboratorium tetap
# aman: halaman /display menerbitkan kode hari itu begitu layar dinyalakan, dan
# potongan skor untuk alat yang belum kembali dihitung dari tenggatnya langsung,
# bukan dari label TERLAMBAT yang dipasang di sini.
# =============================================================================
set -eu

JAM_TERBIT=00
MENIT_TERBIT=01
DASAR="${ALAMAT_APLIKASI:-http://app:3000}"

echo "[cron] aktif, tugas harian tiap pukul ${JAM_TERBIT}:${MENIT_TERBIT} WIB"

panggil() {
  jalur=$1
  jawaban=$(wget -qO- --header="x-cron-secret: ${CRON_SECRET}" --post-data='' "${DASAR}${jalur}" 2>&1) \
    && echo "[cron] $(date '+%F %T') ${jalur} $jawaban" \
    || echo "[cron] $(date '+%F %T') GAGAL memanggil ${DASAR}${jalur}: $jawaban" >&2
}

tugas_harian() {
  panggil /api/cron/kode-harian
  panggil /api/cron/tandai-terlambat
}

while true; do
  sekarang=$(date +%H%M)
  if [ "$sekarang" = "${JAM_TERBIT}${MENIT_TERBIT}" ]; then
    tugas_harian
    sleep 3600
  fi
  sleep 50
done
