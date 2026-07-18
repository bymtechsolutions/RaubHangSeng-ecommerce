# One-Command EC2 Deploy

This deployment runs the app in Docker on host port `9999`, then uses host Nginx to serve:

- `rhsfish.com` as the main website
- `www.rhsfish.com` as the same website
- `raubfish.com` redirected to `https://rhsfish.com`
- `www.raubfish.com` redirected to `https://rhsfish.com`

The app port `9999` is bound to `127.0.0.1` only, so it does not conflict with other projects on the same EC2 instance and is not public.

## DNS Records

Create these records at your DNS provider:

```text
rhsfish.com       A     54.251.150.167
www.rhsfish.com   A     54.251.150.167
raubfish.com      A     54.251.150.167
www.raubfish.com  A     54.251.150.167
```

## AWS Security Group

Open inbound:

- `80` HTTP
- `443` HTTPS
- `22` SSH, restricted to your IP

Do not open `9999`.

## Upload Or Clone The Project

Example path:

```bash
sudo mkdir -p /opt/rhsfish
sudo chown -R $USER:$USER /opt/rhsfish
cd /opt/rhsfish
```

Copy this repository into `/opt/rhsfish`.

## One Command

Run this from the project root on EC2:

```bash
sudo env CERTBOT_EMAIL='you@example.com' bash deploy/setup-ec2.sh
```

That command will:

- Install Docker, Nginx, Certbot, and required tools.
- Create a verified pre-deploy backup when the data volume already exists.
- Build and health-check a candidate Docker image.
- Bake the Git commit ID into the image and reject promotion if the health endpoint reports a different release.
- Automatically restore the previous image if the candidate fails its health check.
- Retain the last healthy release as `rhsfish:previous` for a later manual rollback.
- Run the app container on `127.0.0.1:9999`.
- Drop Linux capabilities, prevent privilege escalation, and rotate container logs.
- Install `/etc/nginx/conf.d/00-rhsfish.com.conf`.
- Reload Nginx.
- Enable HTTPS if all four DNS names already resolve to `54.251.150.167`.

The deployment script creates and preserves a random `SESSION_SECRET` in `/opt/rhsfish/.env`; keep that file private and stable because changing the secret signs every member and seller out.

For a brand-new data volume, the store-owner login is:

```text
Owner ID: admin
Password: abcd1234
```

Sign in at `/seller`, open **Store Settings**, and change the initial password immediately. The password is stored as a salted hash in the backend. If the Docker volume already contains a seller password from an earlier release, that password is preserved and used with the new `admin` owner ID.

Before deployment, run the production boundary test:

```bash
npm run test:production
npm run build:all
```

The single-container data store uses serialized atomic writes and keeps the previous valid state at `/app/data/store.json.backup`. Continue backing up the `rhsfish_data` Docker volume as part of the server backup schedule. Horizontal scaling requires migrating this store to a shared transactional database first.

If DNS has not propagated yet, the script keeps HTTP working and skips HTTPS. Rerun the same command after DNS is ready.

If another Docker proxy already owns port `80`, the script still starts this app on `127.0.0.1:9999`, then skips host Nginx. In that setup, route `rhsfish.com` from the existing proxy instead.

## Existing MySellerBase Proxy

If `docker ps` shows `mysellerbase-prod-proxy-1` publishing `0.0.0.0:80->80/tcp`, do not start a second public Nginx. Run this after `deploy/setup-ec2.sh`:

```bash
sudo env CERTBOT_EMAIL='you@example.com' bash deploy/configure-mysellerbase-proxy.sh /path/to/MySellerBase
```

The helper connects the RHS Fish app to the existing proxy, provisions a Let's Encrypt certificate for all four fish domains, exposes port `443`, redirects HTTP to HTTPS, and installs a renewal hook that reloads the proxy after future certificate renewals.

The script connects `rhsfish-app` to the MySellerBase proxy Docker network, then inserts these routes into MySellerBase `deploy/reverse-proxy.conf` before the storefront `default_server` block:

```nginx
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
```

If MySellerBase terminates TLS through Cloudflare instead, add `rhsfish.com`, `www.rhsfish.com`, `raubfish.com`, and `www.raubfish.com` in Cloudflare as proxied A records to this EC2 public IP. For DNS-only records, use the helper above so the origin serves HTTPS directly.

To reload the MySellerBase proxy manually:

```bash
cd /path/to/MySellerBase
docker exec mysellerbase-prod-proxy-1 nginx -t
docker exec mysellerbase-prod-proxy-1 nginx -s reload
```

## Verify

```bash
sudo bash deploy/verify-production.sh
sudo certbot renew --dry-run
```

The verifier checks the persistent-store health endpoint, storefront metadata, robots and sitemap discovery, HTTPS security headers, immutable asset caching and compression, public-store privacy boundary, anonymous seller-access boundary, and the `raubfish.com` redirect. For a local-only check before DNS is ready:

```bash
sudo env BASE_URL='http://127.0.0.1:9999' SKIP_REDIRECT=1 \
  bash deploy/verify-production.sh
```

Expected local health response:

```json
{"ok":true,"release":"<git-commit-id>"}
```

Expected redirect:

```text
raubfish.com -> https://rhsfish.com
```

## If You Still See MySellerBase

This means Nginx is still routing `rhsfish.com` to the old project, or the new config has not been loaded on the EC2 server. Run these on EC2, not on Windows:

```bash
curl http://127.0.0.1:9999/api/health
sudo grep -RInE 'rhsfish\.com|raubfish\.com|store-unavailable|mysellerbase' /etc/nginx
sudo nginx -T | grep -nE 'server_name|proxy_pass|rhsfish\.com|raubfish\.com'
```

Only `/etc/nginx/conf.d/00-rhsfish.com.conf` should own `rhsfish.com` and `raubfish.com`. If another MySellerBase config also contains those domains, remove those domain names from the old config, then reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Update Deployment

From `/opt/rhsfish`:

```bash
git pull --ff-only origin main
sudo env CERTBOT_EMAIL='you@example.com' bash deploy/setup-ec2.sh
sudo env EXPECTED_RELEASE="$(git rev-parse --short=12 HEAD)" bash deploy/verify-production.sh
docker image prune -f
```

The setup script preserves the Docker data volume, creates a backup before replacing the container, and only promotes the candidate image after `/api/health` confirms that the persistent store is readable. If the candidate fails, it restarts the previous production image automatically. After a successful promotion, the release that was previously live remains tagged as `rhsfish:previous`.

If a problem is discovered after promotion, inspect the retained images and perform a health-checked rollback:

```bash
docker image ls rhsfish
sudo env ROLLBACK_CONFIRM='rhsfish:previous' bash deploy/rollback-release.sh
sudo bash deploy/verify-production.sh
```

Rollback first creates a verified data backup. If the previous image does not start or pass health checks, the script automatically restores the release that was running before the rollback attempt. The two release tags are swapped after success, so the same command can reverse the rollback if necessary.

## Data Backup And Restore

Create an additional on-demand backup:

```bash
cd /opt/rhsfish
sudo bash deploy/backup-data.sh
```

Backups and SHA-256 checksum files are written to `/opt/rhsfish/backups`. They include orders, member profiles, password hashes, payment slips, and uploaded product media, so keep them private and copy them to a separate encrypted backup location. Local archives are retained for 30 days by default; set `BACKUP_RETENTION_DAYS` when running the backup script to change the window (`0` disables pruning).

To restore a verified backup, first inspect the exact filename, then run:

```bash
cd /opt/rhsfish
sudo env RESTORE_CONFIRM=rhsfish_data \
  bash deploy/restore-data.sh /opt/rhsfish/backups/rhsfish-data-YYYYMMDDTHHMMSSZ.tar.gz
```

Restore creates a new safety backup before changing the volume. If the restored data fails the application health check, the script automatically puts the pre-restore data back.

For scheduled daily backups, add this root cron entry and copy the resulting archives off the EC2 instance:

```cron
15 3 * * * cd /opt/rhsfish && bash deploy/backup-data.sh >> /var/log/rhsfish-backup.log 2>&1
```

## Useful Commands

```bash
docker logs -f rhsfish-app
docker restart rhsfish-app
docker image ls rhsfish
docker exec rhsfish-app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>r.text()).then(console.log)"
sudo nginx -t
sudo systemctl reload nginx
```

Persistent app data is stored in the Docker volume `rhsfish_data`.
