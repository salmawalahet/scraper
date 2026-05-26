#!/usr/bin/env bash
# ============================================
# LeadX Pro AI — Setup Cron Job for Daily Backups
# ============================================
# Registers backup-db.sh as a daily cron job at 2:00 AM.
# Safe to re-run: removes any existing LeadX backup cron entry first.
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup-db.sh"

# Verify the backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
  echo "❌ Error: backup-db.sh not found at ${BACKUP_SCRIPT}"
  exit 1
fi

# Make the backup script executable
chmod +x "$BACKUP_SCRIPT"

# Build the cron entry
# Runs daily at 2:00 AM, loading env from .env file if present
CRON_COMMENT="# LeadX Pro AI - Daily database backup"
ENV_FILE="${SCRIPT_DIR}/../.env"
CRON_CMD="0 2 * * * "

if [ -f "$ENV_FILE" ]; then
  # Source the .env file before running the backup so DB_* vars are available
  CRON_CMD+="set -a && source ${ENV_FILE} && set +a && "
fi

CRON_CMD+="bash ${BACKUP_SCRIPT} >> /dev/null 2>&1"

# Remove any existing LeadX backup cron entry, then add the new one
(
  crontab -l 2>/dev/null | grep -v "LeadX Pro AI" | grep -v "backup-db.sh"
  echo "$CRON_COMMENT"
  echo "$CRON_CMD"
) | crontab -

echo "✅ Cron job registered successfully!"
echo ""
echo "Current crontab:"
crontab -l | tail -3
echo ""
echo "Backup will run daily at 2:00 AM."
echo "To verify: crontab -l"
echo "To remove: crontab -l | grep -v 'backup-db.sh' | grep -v 'LeadX Pro AI' | crontab -"
