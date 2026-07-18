#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="rhsfish"
BASE_URL="${BASE_URL:-https://rhsfish.com}"
REDIRECT_URL="${REDIRECT_URL:-https://raubfish.com}"
EXPECTED_REDIRECT_TARGET="${EXPECTED_REDIRECT_TARGET:-https://rhsfish.com}"

BASE_URL="${BASE_URL%/}"
REDIRECT_URL="${REDIRECT_URL%/}"
EXPECTED_REDIRECT_TARGET="${EXPECTED_REDIRECT_TARGET%/}"

log() {
  printf '\n[%s-verify] %s\n' "$APP_NAME" "$*"
}

fail() {
  echo "Verification failed: $*" >&2
  exit 1
}

command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v grep >/dev/null 2>&1 || fail "grep is required"

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT
headers_file="$work_dir/headers"
body_file="$work_dir/body"
curl_args=(--silent --show-error --connect-timeout 10 --max-time 30)

request() {
  local url="$1"
  curl "${curl_args[@]}" -D "$headers_file" -o "$body_file" -w '%{http_code}' "$url"
}

require_header() {
  local header_name="$1"
  local expected_pattern="$2"
  grep -Eiq "^${header_name}:[[:space:]]*${expected_pattern}" "$headers_file" || \
    fail "$header_name is missing or invalid for $BASE_URL"
}

log "Checking persistent-store health"
status="$(request "$BASE_URL/api/health")"
[[ "$status" == "200" ]] || fail "/api/health returned HTTP $status"
grep -Eq '"ok"[[:space:]]*:[[:space:]]*true' "$body_file" || fail "/api/health did not report ok=true"
health_release="$(grep -oE '"release"[[:space:]]*:[[:space:]]*"[^"]+"' "$body_file" | head -1 | sed -E 's/^.*"release"[[:space:]]*:[[:space:]]*"([^"]+)".*$/\1/' || true)"
[[ -n "$health_release" ]] || fail "/api/health did not report a release ID"
if [[ -n "${EXPECTED_RELEASE:-}" && "$health_release" != "$EXPECTED_RELEASE" ]]; then
  fail "expected release $EXPECTED_RELEASE but the server reports $health_release"
fi

log "Checking storefront and production security headers"
status="$(request "$BASE_URL/")"
[[ "$status" == "200" ]] || fail "storefront returned HTTP $status"
grep -Eq '<div[^>]+id="root"' "$body_file" || fail "storefront HTML does not contain the application root"
grep -Eq '<link[^>]+rel="canonical"[^>]+href="https://rhsfish\.com/"' "$body_file" || fail "storefront canonical URL is missing"
grep -Eq '<meta[^>]+property="og:title"' "$body_file" || fail "storefront Open Graph metadata is missing"
require_header 'cache-control' 'no-cache'
require_header 'x-request-id' '[a-zA-Z0-9._-]{8,80}'
require_header 'x-content-type-options' 'nosniff'
require_header 'x-frame-options' 'DENY'
require_header 'referrer-policy' 'strict-origin-when-cross-origin'
require_header 'content-security-policy' '.+'
if [[ "$BASE_URL" == https://* ]]; then
  require_header 'strict-transport-security' 'max-age=[0-9]+'
fi

entry_asset="$(grep -oE 'src="/assets/[^"]+\.js"' "$body_file" | head -1 | cut -d '"' -f2 || true)"
[[ -n "$entry_asset" ]] || fail "storefront HTML does not reference a JavaScript entry asset"
status="$(curl "${curl_args[@]}" -H 'Accept-Encoding: gzip' -D "$headers_file" -o "$body_file" -w '%{http_code}' "$BASE_URL$entry_asset")"
[[ "$status" == "200" ]] || fail "storefront entry asset returned HTTP $status"
require_header 'cache-control' 'public,.*max-age=31536000.*immutable'
if [[ "$BASE_URL" == https://* ]]; then
  require_header 'content-encoding' 'gzip'
fi

log "Checking search-engine discovery files"
status="$(request "$BASE_URL/robots.txt")"
[[ "$status" == "200" ]] || fail "/robots.txt returned HTTP $status"
grep -Eq '^Disallow: /seller$' "$body_file" || fail "/robots.txt does not protect the seller route"
grep -Eq '^Sitemap: https://rhsfish\.com/sitemap\.xml$' "$body_file" || fail "/robots.txt does not advertise the canonical sitemap"
status="$(request "$BASE_URL/sitemap.xml")"
[[ "$status" == "200" ]] || fail "/sitemap.xml returned HTTP $status"
grep -Eq '<loc>https://rhsfish\.com/shop</loc>' "$body_file" || fail "/sitemap.xml does not list the shop"
grep -Eq '<loc>https://rhsfish\.com/product/[^<]+</loc>' "$body_file" || fail "/sitemap.xml does not list product pages"

log "Checking public-store privacy boundary"
status="$(request "$BASE_URL/api/store")"
[[ "$status" == "200" ]] || fail "/api/store returned HTTP $status"
grep -Eq '"products"[[:space:]]*:' "$body_file" || fail "/api/store does not contain products"
if grep -Eq '"(members|sellerAccount|sellerPasscode|passwordHash|idempotencyKeyHash|requestFingerprint|loyaltyPointsAwarded)"[[:space:]]*:' "$body_file"; then
  fail "/api/store exposed a private persistence field"
fi

log "Checking anonymous seller-access boundary"
status="$(request "$BASE_URL/api/seller/store")"
[[ "$status" == "401" ]] || fail "anonymous /api/seller/store returned HTTP $status instead of 401"
grep -Eq '"code"[[:space:]]*:[[:space:]]*"SELLER_AUTH_REQUIRED"' "$body_file" || \
  fail "anonymous seller request did not return the expected auth error"

if [[ "${SKIP_REDIRECT:-0}" != "1" ]]; then
  log "Checking legacy-domain redirect"
  status="$(request "$REDIRECT_URL/release-verification")"
  [[ "$status" =~ ^30[12378]$ ]] || fail "$REDIRECT_URL returned HTTP $status instead of a redirect"
  require_header 'location' "${EXPECTED_REDIRECT_TARGET}/release-verification"
fi

log "Production verification passed"
printf 'Storefront: %s\n' "$BASE_URL"
printf 'Health:     %s/api/health\n' "$BASE_URL"
printf 'Release:    %s\n' "$health_release"
