#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="rhsfish"
CONTAINER_NAME="${CONTAINER_NAME:-rhsfish-app}"
DATA_VOLUME="${DATA_VOLUME:-rhsfish_data}"
HOST_PORT="${HOST_PORT:-9999}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"

log() {
  printf '\n[%s-backup] %s\n' "$APP_NAME" "$*"
}

if [[ "${EUID}" -ne 0 ]]; then
  exec sudo -E bash "$0" "$@"
fi

command -v docker >/dev/null 2>&1 || { echo "Docker is required." >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "curl is required." >&2; exit 1; }
docker volume inspect "$DATA_VOLUME" >/dev/null 2>&1 || { echo "Docker volume $DATA_VOLUME does not exist." >&2; exit 1; }
[[ "$BACKUP_RETENTION_DAYS" =~ ^[0-9]+$ ]] || { echo "BACKUP_RETENTION_DAYS must be a non-negative integer." >&2; exit 1; }

mkdir -p "$BACKUP_DIR"
BACKUP_DIR="$(realpath "$BACKUP_DIR")"
umask 077

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive_name="${APP_NAME}-data-${timestamp}.tar.gz"
archive_path="$BACKUP_DIR/$archive_name"
container_was_running=0

restart_container() {
  if [[ "$container_was_running" == "1" ]]; then
    docker start "$CONTAINER_NAME" >/dev/null
    for _ in $(seq 1 40); do
      if curl -fsS "http://127.0.0.1:$HOST_PORT/api/health" >/dev/null 2>&1; then
        return 0
      fi
      sleep 2
    done
    docker logs "$CONTAINER_NAME" --tail=80 || true
    echo "Container $CONTAINER_NAME did not become healthy after the backup." >&2
    return 1
  fi
}

restart_container_on_exit() {
  if [[ "$container_was_running" == "1" ]]; then
    docker start "$CONTAINER_NAME" >/dev/null 2>&1 || true
  fi
}
trap restart_container_on_exit EXIT

if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  container_was_running=1
  log "Pausing $CONTAINER_NAME for a consistent data snapshot"
  docker stop --time 30 "$CONTAINER_NAME" >/dev/null
fi

log "Writing $archive_path"
docker run --rm --network none \
  -v "$DATA_VOLUME:/data:ro" \
  -v "$BACKUP_DIR:/backup" \
  alpine:3.20 \
  tar -czf "/backup/$archive_name" -C /data .

tar -tzf "$archive_path" >/dev/null
sha256sum "$archive_path" > "$archive_path.sha256"
chmod 600 "$archive_path" "$archive_path.sha256"

restart_container
container_was_running=0
trap - EXIT

log "Backup verified"
printf 'BACKUP_FILE=%s\n' "$archive_path"

if [[ "$BACKUP_RETENTION_DAYS" -gt 0 ]]; then
  log "Removing local backups older than $BACKUP_RETENTION_DAYS days"
  find "$BACKUP_DIR" -maxdepth 1 -type f \
    \( -name "${APP_NAME}-data-*.tar.gz" -o -name "${APP_NAME}-data-*.tar.gz.sha256" \) \
    -mtime "+$BACKUP_RETENTION_DAYS" -print -delete
fi
