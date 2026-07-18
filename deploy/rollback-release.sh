#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="rhsfish"
CONTAINER_NAME="${CONTAINER_NAME:-rhsfish-app}"
CURRENT_IMAGE="${CURRENT_IMAGE:-rhsfish:latest}"
ROLLBACK_IMAGE="${ROLLBACK_IMAGE:-rhsfish:previous}"
TEMP_IMAGE="${TEMP_IMAGE:-rhsfish:rollback-source}"
DATA_VOLUME="${DATA_VOLUME:-rhsfish_data}"
HOST_PORT="${HOST_PORT:-9999}"
CONTAINER_PORT="${CONTAINER_PORT:-3000}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() {
  printf '\n[%s-rollback] %s\n' "$APP_NAME" "$*"
}

if [[ "${EUID}" -ne 0 ]]; then
  exec sudo -E bash "$0" "$@"
fi

command -v docker >/dev/null 2>&1 || { echo "Docker is required." >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "curl is required." >&2; exit 1; }
docker image inspect "$CURRENT_IMAGE" >/dev/null 2>&1 || { echo "Current image $CURRENT_IMAGE does not exist." >&2; exit 1; }
docker image inspect "$ROLLBACK_IMAGE" >/dev/null 2>&1 || { echo "Rollback image $ROLLBACK_IMAGE does not exist." >&2; exit 1; }
docker volume inspect "$DATA_VOLUME" >/dev/null 2>&1 || { echo "Docker volume $DATA_VOLUME does not exist." >&2; exit 1; }
docker inspect "$CONTAINER_NAME" >/dev/null 2>&1 || { echo "Container $CONTAINER_NAME does not exist." >&2; exit 1; }

if [[ "${ROLLBACK_CONFIRM:-}" != "$ROLLBACK_IMAGE" ]]; then
  echo "Refusing to replace the running release. Set ROLLBACK_CONFIRM=$ROLLBACK_IMAGE after reviewing docker images." >&2
  exit 1
fi

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

session_secret_value="${SESSION_SECRET:-}"
if [[ ${#session_secret_value} -lt 32 ]]; then
  echo "SESSION_SECRET in $ROOT_DIR/.env must contain at least 32 characters." >&2
  exit 1
fi

legacy_seller_password="${SELLER_PASSCODE:-${SELLER_PASSWORD:-abcd1234}}"
if [[ ${#legacy_seller_password} -lt 8 ]]; then
  legacy_seller_password="abcd1234"
fi

mapfile -t app_networks < <(
  docker inspect "$CONTAINER_NAME" \
    --format '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}' 2>/dev/null |
    awk 'NF && $0 != "bridge" && $0 != "host" && $0 != "none"'
)

start_image() {
  local image_name="$1"
  local network_args=()
  if [[ ${#app_networks[@]} -gt 0 ]]; then
    network_args=(--network "${app_networks[0]}" --network-alias "$CONTAINER_NAME")
  fi

  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    --init \
    --cap-drop ALL \
    --security-opt no-new-privileges:true \
    --log-opt max-size=10m \
    --log-opt max-file=3 \
    "${network_args[@]}" \
    -p "127.0.0.1:$HOST_PORT:$CONTAINER_PORT" \
    -v "$DATA_VOLUME:/app/data" \
    -e NODE_ENV=production \
    -e PORT="$CONTAINER_PORT" \
    -e RHS_DATA_FILE=/app/data/store.json \
    -e RHS_UPLOAD_DIR=/app/data/uploads \
    -e SELLER_PASSWORD="${SELLER_PASSWORD:-}" \
    -e SELLER_PASSCODE="$legacy_seller_password" \
    -e SESSION_SECRET="$session_secret_value" \
    "$image_name" >/dev/null

  local index
  for ((index = 1; index < ${#app_networks[@]}; index += 1)); do
    docker network connect --alias "$CONTAINER_NAME" "${app_networks[$index]}" "$CONTAINER_NAME"
  done
}

wait_for_health() {
  for _ in $(seq 1 40); do
    if curl -fsS "http://127.0.0.1:$HOST_PORT/api/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  docker logs "$CONTAINER_NAME" --tail=80 || true
  return 1
}

log "Creating a verified safety backup before changing the release"
bash "$ROOT_DIR/deploy/backup-data.sh"

docker tag "$CURRENT_IMAGE" "$TEMP_IMAGE"
log "Starting $ROLLBACK_IMAGE"
if ! start_image "$ROLLBACK_IMAGE" || ! wait_for_health; then
  log "Rollback image failed; restoring $CURRENT_IMAGE"
  if start_image "$CURRENT_IMAGE" && wait_for_health; then
    docker image rm "$TEMP_IMAGE" >/dev/null 2>&1 || true
    echo "Rollback failed, but the original release was restored and is healthy." >&2
  else
    echo "Rollback and original-release recovery both failed. Inspect docker logs $CONTAINER_NAME immediately." >&2
  fi
  exit 1
fi

docker tag "$ROLLBACK_IMAGE" "$CURRENT_IMAGE"
docker tag "$TEMP_IMAGE" "$ROLLBACK_IMAGE"
docker image rm "$TEMP_IMAGE" >/dev/null 2>&1 || true

log "Rollback completed and the previous release is healthy"
printf 'Current image:  %s\n' "$CURRENT_IMAGE"
printf 'Next fallback:  %s\n' "$ROLLBACK_IMAGE"
printf 'Local health:   http://127.0.0.1:%s/api/health\n' "$HOST_PORT"
