#!/usr/bin/env bash
set -Eeuo pipefail

APP_CONTAINER="${APP_CONTAINER:-rhsfish-app}"
PROXY_CONTAINER="${PROXY_CONTAINER:-mysellerbase-prod-proxy-1}"
MSB_DIR="${1:-${MSB_DIR:-}}"
CERT_NAME="${CERT_NAME:-rhsfish.com}"

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

  if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -qx "$PROXY_CONTAINER"; then
    local proxy_source
    proxy_source="$(docker inspect "$PROXY_CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "/etc/nginx/conf.d/default.conf"}}{{println .Source}}{{end}}{{end}}' 2>/dev/null || true)"
    if [[ -n "$proxy_source" && -f "$proxy_source" ]]; then
      printf '%s\n' "$(cd "$(dirname "$proxy_source")/.." && pwd)"
      return
    fi
  fi
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
COMPOSE_FILE="$MSB_DIR/docker-compose.prod.yml"
CERTBOT_WEBROOT="$MSB_DIR/certbot/www"
CERT_LIVE_DIR="/etc/letsencrypt/live/$CERT_NAME"

if [[ ! -f "$PROXY_FILE" || ! -f "$COMPOSE_FILE" ]]; then
  echo "Cannot find $PROXY_FILE or $COMPOSE_FILE" >&2
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
  docker network connect --alias "$APP_CONTAINER" "$network" "$APP_CONTAINER"
done <<< "$networks"

route_file="$(mktemp)"
tmp_file="$(mktemp)"
backup_file="$PROXY_FILE.bak.$(date +%Y%m%d%H%M%S)"
compose_backup_file="$COMPOSE_FILE.bak.$(date +%Y%m%d%H%M%S)"
trap 'rm -f "$route_file" "$tmp_file"' EXIT

install_routes() {
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
      printf "%s", routes
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

  cp "$tmp_file" "$PROXY_FILE"
}

ensure_proxy_tls_mounts() {
  cp "$COMPOSE_FILE" "$compose_backup_file"

  if ! grep -q '"443:443"' "$COMPOSE_FILE"; then
    sed -i 's/    ports: \["80:80"\]/    ports:\n      - "80:80"\n      - "443:443"/' "$COMPOSE_FILE"
  fi

  if ! grep -q '/etc/letsencrypt:/etc/letsencrypt:ro' "$COMPOSE_FILE"; then
    sed -i '\|./deploy/reverse-proxy.conf:/etc/nginx/conf.d/default.conf:ro|a\      - /etc/letsencrypt:/etc/letsencrypt:ro' "$COMPOSE_FILE"
  fi

  if ! grep -q './certbot/www:/var/www/certbot:ro' "$COMPOSE_FILE"; then
    sed -i '\|/etc/letsencrypt:/etc/letsencrypt:ro|a\      - ./certbot/www:/var/www/certbot:ro' "$COMPOSE_FILE"
  fi

  if ! grep -q '"443:443"' "$COMPOSE_FILE" || ! grep -q '/etc/letsencrypt:/etc/letsencrypt:ro' "$COMPOSE_FILE"; then
    cp "$compose_backup_file" "$COMPOSE_FILE"
    echo "Could not configure TLS mounts in $COMPOSE_FILE." >&2
    exit 1
  fi
}

cat > "$route_file" <<'ROUTES'
# BEGIN RHSFISH ROUTES
server {
  listen 80;
  server_name raubfish.com www.raubfish.com;

  location ^~ /.well-known/acme-challenge/ {
    root /var/www/certbot;
    default_type text/plain;
    try_files $uri =404;
  }

  location / {
    return 301 https://rhsfish.com$request_uri;
  }
}

server {
  listen 80;
  server_name rhsfish.com www.rhsfish.com;
  client_max_body_size 25m;

  location ^~ /.well-known/acme-challenge/ {
    root /var/www/certbot;
    default_type text/plain;
    try_files $uri =404;
  }

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

log "Installing ACME challenge routes into $PROXY_FILE"
if [[ ! -f "$CERT_LIVE_DIR/fullchain.pem" || ! -f "$CERT_LIVE_DIR/privkey.pem" ]]; then
  install_routes

  if ! docker exec "$PROXY_CONTAINER" nginx -t; then
    cat "$backup_file" > "$PROXY_FILE"
    echo "Nginx config test failed. Restored $backup_file." >&2
    exit 1
  fi

  docker exec "$PROXY_CONTAINER" nginx -s reload
else
  log "Existing certificate found; keeping the current HTTPS routes active"
fi

log "Exposing HTTPS and mounting the certificate directories"
ensure_proxy_tls_mounts
mkdir -p "$CERTBOT_WEBROOT"
(cd "$MSB_DIR" && docker compose --env-file "$MSB_DIR/.env.prod" -f "$COMPOSE_FILE" --profile proxy up -d proxy)

if ! command -v certbot >/dev/null 2>&1; then
  echo "Certbot is required on the host before HTTPS can be enabled." >&2
  exit 1
fi

log "Requesting the Let's Encrypt certificate"
certbot_args=(certonly --webroot --webroot-path "$CERTBOT_WEBROOT" --non-interactive --agree-tos --keep-until-expiring)
if [[ -n "${CERTBOT_EMAIL:-}" ]]; then
  certbot_args+=(--email "$CERTBOT_EMAIL")
else
  certbot_args+=(--register-unsafely-without-email)
fi

certbot "${certbot_args[@]}" \
  --cert-name "$CERT_NAME" \
  -d rhsfish.com \
  -d www.rhsfish.com \
  -d raubfish.com \
  -d www.raubfish.com

if [[ ! -f "$CERT_LIVE_DIR/fullchain.pem" || ! -f "$CERT_LIVE_DIR/privkey.pem" ]]; then
  echo "Certificate files were not created in $CERT_LIVE_DIR." >&2
  exit 1
fi

cat > "$route_file" <<'ROUTES'
# BEGIN RHSFISH ROUTES
server {
  listen 80;
  server_name rhsfish.com www.rhsfish.com raubfish.com www.raubfish.com;

  location ^~ /.well-known/acme-challenge/ {
    root /var/www/certbot;
    default_type text/plain;
    try_files $uri =404;
  }

  location / {
    return 301 https://rhsfish.com$request_uri;
  }
}

server {
  listen 443 ssl;
  server_name raubfish.com www.raubfish.com;

  ssl_certificate /etc/letsencrypt/live/rhsfish.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/rhsfish.com/privkey.pem;

  return 301 https://rhsfish.com$request_uri;
}

server {
  listen 443 ssl;
  server_name rhsfish.com www.rhsfish.com;
  client_max_body_size 25m;

  ssl_certificate /etc/letsencrypt/live/rhsfish.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/rhsfish.com/privkey.pem;

  location / {
    set $rhsfish_upstream "http://rhsfish-app:3000";
    proxy_pass $rhsfish_upstream;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-Host  $host;
    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        $msb_conn_upgrade;
  }
}
# END RHSFISH ROUTES
ROUTES

log "Enabling HTTPS routes"
install_routes

if ! docker exec "$PROXY_CONTAINER" nginx -t; then
  cat "$backup_file" > "$PROXY_FILE"
  echo "HTTPS Nginx config test failed. Restored $backup_file." >&2
  exit 1
fi

docker exec "$PROXY_CONTAINER" nginx -s reload

renewal_hook="/etc/letsencrypt/renewal-hooks/deploy/reload-rhsfish-proxy.sh"
mkdir -p "$(dirname "$renewal_hook")"
cat > "$renewal_hook" <<EOF
#!/usr/bin/env sh
docker exec "$PROXY_CONTAINER" nginx -t && docker exec "$PROXY_CONTAINER" nginx -s reload
EOF
chmod 700 "$renewal_hook"

log "Done. HTTPS is enabled. Backups saved at $backup_file and $compose_backup_file"
