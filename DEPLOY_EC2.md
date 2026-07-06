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
sudo env SELLER_PASSCODE='change-this-passcode' CERTBOT_EMAIL='you@example.com' bash deploy/setup-ec2.sh
```

That command will:

- Install Docker, Nginx, Certbot, and required tools.
- Build the Docker image.
- Run the app container on `127.0.0.1:9999`.
- Install `/etc/nginx/conf.d/rhsfish.com.conf`.
- Reload Nginx.
- Enable HTTPS if all four DNS names already resolve to `54.251.150.167`.

If DNS has not propagated yet, the script keeps HTTP working and skips HTTPS. Rerun the same command after DNS is ready.

## Verify

```bash
curl http://127.0.0.1:9999/api/health
curl -I http://rhsfish.com
curl -I http://raubfish.com
```

Expected local health response:

```json
{"ok":true}
```

Expected redirect:

```text
raubfish.com -> https://rhsfish.com
```

## Update Deployment

From `/opt/rhsfish`:

```bash
git pull
sudo env SELLER_PASSCODE='change-this-passcode' CERTBOT_EMAIL='you@example.com' bash deploy/setup-ec2.sh
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
