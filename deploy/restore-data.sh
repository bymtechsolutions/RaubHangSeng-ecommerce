#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="rhsfish"
CONTAINER_NAME="${CONTAINER_NAME:-rhsfish-app}"
DATA_VOLUME="${DATA_VOLUME:-rhsfish_data}"
HOST_PORT="${HOST_PORT:-9999}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() {
  printf '\n[%s-restore] %s\n' "$APP_NAME" "$*"
}

if [[ "${EUID}" -ne 0 ]]; then
  exec sudo -E bash "$0" "$@"
fi

archive_input="${1:-}"
if [[ -z "$archive_input" || ! -f "$archive_input" ]]; then
  echo "Usage: RESTORE_CONFIRM=$DATA_VOLUME bash deploy/restore-data.sh /absolute/path/to/backup.tar.gz" >&2
  exit 1
fi
if [[ "${RESTORE_CONFIRM:-}" != "$DATA_VOLUME" ]]; then
  echo "Refusing to replace production data. Set RESTORE_CONFIRM=$DATA_VOLUME after verifying the backup path." >&2
  exit 1
fi

archive_path="$(realpath "$archive_input")"
archive_dir="$(dirname "$archive_path")"
archive_name="$(basename "$archive_path")"

command -v docker >/dev/null 2>&1 || { echo "Docker is required." >&2; exit 1; }
docker volume inspect "$DATA_VOLUME" >/dev/null 2>&1 || { echo "Docker volume $DATA_VOLUME does not exist." >&2; exit 1; }
docker inspect "$CONTAINER_NAME" >/dev/null 2>&1 || { echo "Container $CONTAINER_NAME does not exist. Deploy the app before restoring." >&2; exit 1; }

if [[ -f "$archive_path.sha256" ]]; then
  (cd "$archive_dir" && sha256sum -c "$(basename "$archive_path.sha256")")
fi
if tar -tzf "$archive_path" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
  echo "Backup contains an unsafe path and cannot be restored." >&2
  exit 1
fi

replace_volume_from_archive() {
  local source_archive="$1"
  local source_dir
  local source_name
  source_dir="$(dirname "$source_archive")"
  source_name="$(basename "$source_archive")"

  docker run --rm --network none -v "$DATA_VOLUME:/data" alpine:3.20 \
    sh -c 'find /data -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +'
  docker run --rm --network none \
    -v "$DATA_VOLUME:/data" \
    -v "$source_dir:/backup:ro" \
    alpine:3.20 \
    tar -xzf "/backup/$source_name" -C /data
}

wait_for_health() {
  for _ in $(seq 1 40); do
    if curl -fsS "http://127.0.0.1:$HOST_PORT/api/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

log "Creating a pre-restore safety backup"
backup_output="$(BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}" bash "$ROOT_DIR/deploy/backup-data.sh")"
printf '%s\n' "$backup_output"
pre_restore_backup="$(printf '%s\n' "$backup_output" | sed -n 's/^BACKUP_FILE=//p' | tail -1)"
if [[ -z "$pre_restore_backup" || ! -f "$pre_restore_backup" ]]; then
  echo "Pre-restore backup failed; production data was not changed." >&2
  exit 1
fi

log "Stopping $CONTAINER_NAME and restoring $archive_path"
docker stop --time 30 "$CONTAINER_NAME" >/dev/null
replace_volume_from_archive "$archive_path"
docker start "$CONTAINER_NAME" >/dev/null

if wait_for_health; then
  log "Restore completed and health check passed"
  exit 0
fi

log "Restored data failed health checks; rolling back to $pre_restore_backup"
docker stop --time 30 "$CONTAINER_NAME" >/dev/null 2>&1 || true
replace_volume_from_archive "$pre_restore_backup"
docker start "$CONTAINER_NAME" >/dev/null
if wait_for_health; then
  echo "Requested restore failed. The pre-restore production data was restored." >&2
else
  echo "Requested restore and automatic data rollback both failed. Inspect docker logs $CONTAINER_NAME immediately." >&2
fi
exit 1
