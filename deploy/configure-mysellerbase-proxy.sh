#!/usr/bin/env bash
set -Eeuo pipefail

APP_CONTAINER="${APP_CONTAINER:-rhsfish-app}"
PROXY_CONTAINER="${PROXY_CONTAINER:-mysellerbase-prod-proxy-1}"
MSB_DIR="${1:-${MSB_DIR:-}}"

log() {
  printf '\n[rhsfish-proxy] %s\n' "$*"
}

detect_msb_dir() {
  local candidates=(
    "$HOME/MySellerBase"
    "$HOME/mysellerbase/MySellerBase"
    "$HOME/New folder/mysellerbase/MySellerBase"
    "/opt/MySellerBase"
    "/opt/mysellerbase/MySellerBase"
    "../MySellerBase"
    "../mysellerbase/MySellerBase"
  )

  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -f "$candidate/deploy/reverse-proxy.conf" && -f "$candidate/docker-compose.prod.yml" ]]; then
      printf '%s\n' "$(cd "$candidate" && pwd)"
      return
    fi
  done
}

if [[ -z "$MSB_DIR" ]]; then
  MSB_DIR="$(detect_msb_dir || true)"
fi

if [[ -z "$MSB_DIR" ]]; then
  echo "Usage: bash deploy/configure-mysellerbase-proxy.sh /path/to/MySellerBase" >&2
  exit 1
fi

MSB_DIR="$(cd "$MSB_DIR" && pwd)"
PROXY_FILE="$MSB_DIR/deploy/reverse-proxy.conf"

if [[ ! -f "$PROXY_FILE" ]]; then
  echo "Cannot find $PROXY_FILE" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$PROXY_CONTAINER"; then
  echo "Docker proxy container $PROXY_CONTAINER is not running." >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$APP_CONTAINER"; then
  echo "App container $APP_CONTAINER is not running. Run deploy/setup-ec2.sh first." >&2
  exit 1
fi

log "Connecting $APP_CONTAINER to $PROXY_CONTAINER Docker network"
networks="$(docker inspect "$PROXY_CONTAINER" --format '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}')"
while IFS= read -r network; do
  [[ -z "$network" ]] && continue
  if docker inspect "$APP_CONTAINER" --format '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}' | grep -qx "$network"; then
    continue
  fi
  docker network connect "$network" "$APP_CONTAINER"
done <<< "$networks"

route_file="$(mktemp)"
tmp_file="$(mktemp)"
backup_file="$PROXY_FILE.bak.$(date +%Y%m%d%H%M%S)"
trap 'rm -f "$route_file" "$tmp_file"' EXIT

cat > "$route_file" <<'ROUTES'
# BEGIN RHSFISH ROUTES
server {
  listen 80;
  server_name raubfish.com www.raubfish.com;
  return 301 https://rhsfish.com$request_uri;
}

server {
  listen 80;
  server_name rhsfish.com www.rhsfish.com;
  client_max_body_size 25m;
  location / {
    set $rhsfish_upstream "http://rhsfish-app:3000";
    proxy_pass $rhsfish_upstream;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $msb_fwd_proto;
    proxy_set_header X-Forwarded-Host  $host;
    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        $msb_conn_upgrade;
  }
}
# END RHSFISH ROUTES
ROUTES

cp "$PROXY_FILE" "$backup_file"

log "Installing rhsfish.com routes into $PROXY_FILE"
if ! awk -v route_file="$route_file" '
  BEGIN {
    while ((getline line < route_file) > 0) {
      routes = routes line ORS
    }
  }
  /^# BEGIN RHSFISH ROUTES$/ {
    skipping = 1
    next
  }
  /^# END RHSFISH ROUTES$/ {
    skipping = 0
    next
  }
  !skipping && !inserted && /^# --- Storefront/ {
    printf "%s\n", routes
    inserted = 1
  }
  !skipping {
    print
  }
  END {
    if (!inserted) {
      exit 2
    }
  }
' "$PROXY_FILE" > "$tmp_file"; then
  echo "Could not find the MySellerBase storefront block in $PROXY_FILE. No changes applied." >&2
  exit 1
fi

mv "$tmp_file" "$PROXY_FILE"

if ! docker exec "$PROXY_CONTAINER" nginx -t; then
  cp "$backup_file" "$PROXY_FILE"
  echo "Nginx config test failed. Restored $backup_file." >&2
  exit 1
fi

docker exec "$PROXY_CONTAINER" nginx -s reload || docker restart "$PROXY_CONTAINER"

log "Done. Backup saved at $backup_file"
