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
sudo env SELLER_PASSCODE='8888' CERTBOT_EMAIL='you@example.com' bash deploy/setup-ec2.sh
```

That command will:

- Install Docker, Nginx, Certbot, and required tools.
- Build the Docker image.
- Run the app container on `127.0.0.1:9999`.
- Install `/etc/nginx/conf.d/00-rhsfish.com.conf`.
- Reload Nginx.
- Enable HTTPS if all four DNS names already resolve to `54.251.150.167`.

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
curl http://127.0.0.1:9999/api/health
curl -I http://rhsfish.com
curl -I https://rhsfish.com
curl -I http://raubfish.com
sudo certbot renew --dry-run
```

Expected local health response:

```json
{"ok":true}
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
git pull
sudo env SELLER_PASSCODE='8888' CERTBOT_EMAIL='you@example.com' bash deploy/setup-ec2.sh
docker image prune -f
```

## Useful Commands

```bash
docker logs -f rhsfish-app
docker restart rhsfish-app
docker rm -f rhsfish-app
docker exec rhsfish-app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>r.text()).then(console.log)"
sudo nginx -t
sudo systemctl reload nginx
```

Persistent app data is stored in the Docker volume `rhsfish_data`.
