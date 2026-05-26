#!/usr/bin/env bash
# ============================================
# LeadX Pro AI — Automated MySQL Backup Script
# ============================================
# Reads DB credentials from environment variables and creates
# a timestamped, gzipped mysqldump. Retains only the last 7 backups.
#
# Usage:
#   export DB_HOST=localhost DB_PORT=3306 DB_USER=root DB_PASSWORD=secret DB_NAME=leadx_pro_ai
#   bash backup-db.sh
# ============================================

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────
DB_HOST="${DB_HOST:?ERROR: DB_HOST environment variable is not set}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:?ERROR: DB_USER environment variable is not set}"
DB_PASSWORD="${DB_PASSWORD:?ERROR: DB_PASSWORD environment variable is not set}"
DB_NAME="${DB_NAME:?ERROR: DB_NAME environment variable is not set}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/../backups"
LOG_FILE="${BACKUP_DIR}/backup.log"
MAX_BACKUPS=7

# ── Helpers ────────────────────────────────────────────────────
timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

log() {
  local msg="[$(timestamp)] $1"
  echo "$msg"
  echo "$msg" >> "$LOG_FILE"
}

# ── Setup ──────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"
touch "$LOG_FILE"

DUMP_FILENAME="leadx_$(date '+%Y-%m-%d_%H-%M').sql.gz"
DUMP_PATH="${BACKUP_DIR}/${DUMP_FILENAME}"

# ── Perform Backup ─────────────────────────────────────────────
log "Starting backup of database '${DB_NAME}' on ${DB_HOST}:${DB_PORT}..."

if mysqldump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --user="$DB_USER" \
    --password="$DB_PASSWORD" \
    --single-transaction \
    --routines \
    --triggers \
    --add-drop-table \
    --set-gtid-purged=OFF \
    "$DB_NAME" 2>/dev/null | gzip > "$DUMP_PATH"; then

  FILESIZE=$(du -h "$DUMP_PATH" | cut -f1)
  log "✅ Backup successful: ${DUMP_FILENAME} (${FILESIZE})"
else
  log "❌ Backup FAILED for database '${DB_NAME}'"
  rm -f "$DUMP_PATH"   # Clean up partial file
  exit 1
fi

# ── Rotate Old Backups (keep only last 7) ──────────────────────
BACKUP_COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -name 'leadx_*.sql.gz' -type f | wc -l)

if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
  FILES_TO_DELETE=$((BACKUP_COUNT - MAX_BACKUPS))
  log "Rotating backups: removing ${FILES_TO_DELETE} old file(s)..."

  find "$BACKUP_DIR" -maxdepth 1 -name 'leadx_*.sql.gz' -type f -printf '%T@ %p\n' \
    | sort -n \
    | head -n "$FILES_TO_DELETE" \
    | awk '{print $2}' \
    | while read -r old_file; do
        rm -f "$old_file"
        log "  Deleted: $(basename "$old_file")"
      done
else
  log "No rotation needed (${BACKUP_COUNT}/${MAX_BACKUPS} backups stored)"
fi

log "Backup process complete."
echo "---"
