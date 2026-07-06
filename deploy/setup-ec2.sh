#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="rhsfish"
CONTAINER_NAME="rhsfish-app"
IMAGE_NAME="rhsfish:latest"
HOST_PORT="9999"
CONTAINER_PORT="3000"
DATA_VOLUME="rhsfish_data"
MAIN_DOMAIN="rhsfish.com"
MAIN_WWW_DOMAIN="www.rhsfish.com"
REDIRECT_DOMAIN="raubfish.com"
REDIRECT_WWW_DOMAIN="www.raubfish.com"
PUBLIC_IP="54.251.150.167"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NGINX_SOURCE="$ROOT_DIR/deploy/nginx/rhsfish.com.conf"
NGINX_TARGET="/etc/nginx/conf.d/rhsfish.com.conf"

log() {
  printf '\n[%s] %s\n' "$APP_NAME" "$*"
}

if [[ "${EUID}" -ne 0 ]]; then
  exec sudo -E bash "$0" "$@"
fi

cd "$ROOT_DIR"

if [[ ! -f "$ROOT_DIR/Dockerfile" || ! -f "$NGINX_SOURCE" ]]; then
  echo "Run this script from the project repository that contains Dockerfile and deploy/nginx/rhsfish.com.conf." >&2
  exit 1
fi

install_packages() {
  log "Installing Docker, Nginx, Certbot, and basic tools"

  if command -v apt-get >/dev/null 2>&1; then
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
      ca-certificates curl docker.io nginx certbot python3-certbot-nginx dnsutils
    return
  fi

  if command -v dnf >/dev/null 2>&1; then
    dnf install -y ca-certificates curl docker nginx certbot python3-certbot-nginx bind-utils || \
      dnf install -y ca-certificates curl docker nginx certbot bind-utils
    return
  fi

  if command -v yum >/dev/null 2>&1; then
    yum install -y ca-certificates curl docker nginx certbot python3-certbot-nginx bind-utils || \
      yum install -y ca-certificates curl docker nginx certbot bind-utils
    return
  fi

  echo "Unsupported OS: apt-get, dnf, or yum is required." >&2
  exit 1
}

enable_service() {
  local service_name="$1"
  if command -v systemctl >/dev/null 2>&1; then
    systemctl enable --now "$service_name"
  else
    service "$service_name" start
  fi
}

load_or_create_env() {
  if [[ ! -f "$ROOT_DIR/.env" ]]; then
    log "Creating .env"
    local passcode="${SELLER_PASSCODE:-8888}"
    cat > "$ROOT_DIR/.env" <<EOF
SELLER_PASSCODE=$passcode
EOF
    chmod 600 "$ROOT_DIR/.env"
    if [[ "$passcode" == "8888" ]]; then
      log "SELLER_PASSCODE was not provided, using default 8888. Change it in .env after deployment."
    fi
  fi

  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
}

run_container() {
  log "Building Docker image"
  docker build -t "$IMAGE_NAME" "$ROOT_DIR"

  log "Starting Docker container on 127.0.0.1:$HOST_PORT"
  docker volume create "$DATA_VOLUME" >/dev/null
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p "127.0.0.1:$HOST_PORT:$CONTAINER_PORT" \
    -v "$DATA_VOLUME:/app/data" \
    -e NODE_ENV=production \
    -e PORT="$CONTAINER_PORT" \
    -e RHS_DATA_FILE=/app/data/store.json \
    -e SELLER_PASSCODE="${SELLER_PASSCODE:-8888}" \
    "$IMAGE_NAME" >/dev/null
}

wait_for_app() {
  log "Waiting for app health check"
  for _ in $(seq 1 40); do
    if curl -fsS "http://127.0.0.1:$HOST_PORT/api/health" >/dev/null 2>&1; then
      curl -fsS "http://127.0.0.1:$HOST_PORT/api/health"
      printf '\n'
      return
    fi
    sleep 2
  done

  docker logs "$CONTAINER_NAME" --tail=80 || true
  echo "App did not become healthy on 127.0.0.1:$HOST_PORT." >&2
  exit 1
}

configure_nginx() {
  log "Installing Nginx config"
  mkdir -p /etc/nginx/conf.d
  cp "$NGINX_SOURCE" "$NGINX_TARGET"

  nginx -t

  if command -v systemctl >/dev/null 2>&1; then
    systemctl reload nginx
  else
    service nginx reload
  fi
}

domain_points_to_server() {
  local domain="$1"
  getent ahostsv4 "$domain" 2>/dev/null | awk '{print $1}' | grep -qx "$PUBLIC_IP"
}

enable_https_if_ready() {
  if [[ "${SKIP_CERTBOT:-0}" == "1" ]]; then
    log "Skipping Certbot because SKIP_CERTBOT=1"
    return
  fi

  if ! command -v certbot >/dev/null 2>&1; then
    log "Certbot is not installed, leaving HTTP configured"
    return
  fi

  local domains=("$MAIN_DOMAIN" "$MAIN_WWW_DOMAIN" "$REDIRECT_DOMAIN" "$REDIRECT_WWW_DOMAIN")
  for domain in "${domains[@]}"; do
    if ! domain_points_to_server "$domain"; then
      log "DNS for $domain is not pointing to $PUBLIC_IP yet. Skipping HTTPS for now."
      log "After DNS propagates, rerun: sudo CERTBOT_EMAIL=you@example.com bash deploy/setup-ec2.sh"
      return
    fi
  done

  log "Enabling HTTPS certificates"
  local certbot_args=(--nginx --non-interactive --agree-tos --redirect)
  if [[ -n "${CERTBOT_EMAIL:-}" ]]; then
    certbot_args+=(--email "$CERTBOT_EMAIL")
  else
    certbot_args+=(--register-unsafely-without-email)
  fi

  certbot "${certbot_args[@]}" \
    -d "$MAIN_DOMAIN" \
    -d "$MAIN_WWW_DOMAIN" \
    -d "$REDIRECT_DOMAIN" \
    -d "$REDIRECT_WWW_DOMAIN" || {
      log "Certbot failed. The app is still running over HTTP; check DNS and rerun this script."
      return
    }

  if command -v systemctl >/dev/null 2>&1; then
    systemctl reload nginx
  else
    service nginx reload
  fi
}

install_packages
enable_service docker
enable_service nginx
load_or_create_env
run_container
wait_for_app
configure_nginx
enable_https_if_ready

log "Done"
printf 'Main site: https://%s\n' "$MAIN_DOMAIN"
printf 'Redirect:  https://%s -> https://%s\n' "$REDIRECT_DOMAIN" "$MAIN_DOMAIN"
printf 'Local app: http://127.0.0.1:%s/api/health\n' "$HOST_PORT"
