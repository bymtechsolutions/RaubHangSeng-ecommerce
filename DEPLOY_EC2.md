# Deploy RaubHangSeng to AWS EC2

This deployment runs the app in Docker on host port `9999`, then uses host Nginx to serve:

- `rhsfish.com`
- `www.rhsfish.com`

If your real subdomain is not `www.rhsfish.com`, replace it in `deploy/nginx/rhsfish.com.conf`.

## 1. EC2 Security Group

Open inbound:

- `80` HTTP
- `443` HTTPS
- `22` SSH, restricted to your IP

Do not open `9999` publicly. Docker binds it to `127.0.0.1` only.

## 2. DNS

Point both records to the EC2 public IPv4:

```text
rhsfish.com      A     <EC2_PUBLIC_IP>
www.rhsfish.com  A     <EC2_PUBLIC_IP>
```

## 3. Install Docker and Nginx

Ubuntu example:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx
sudo systemctl enable --now docker nginx
sudo usermod -aG docker $USER
```

Log out and back in after `usermod`.

## 4. Upload Or Clone The Project

Example path:

```bash
sudo mkdir -p /opt/rhsfish
sudo chown -R $USER:$USER /opt/rhsfish
cd /opt/rhsfish
```

Copy this repository into `/opt/rhsfish`.

Create the production env file:

```bash
cat > .env <<'EOF'
SELLER_PASSCODE=change-this-passcode
EOF
```

## 5. Start The App On Port 9999

```bash
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:9999/api/health
```

Expected health response:

```json
{"ok":true}
```

Persistent app data is stored in the Docker volume `rhsfish_data`.

## 6. Add Nginx Reverse Proxy

```bash
sudo cp deploy/nginx/rhsfish.com.conf /etc/nginx/sites-available/rhsfish.com.conf
sudo ln -s /etc/nginx/sites-available/rhsfish.com.conf /etc/nginx/sites-enabled/rhsfish.com.conf
sudo nginx -t
sudo systemctl reload nginx
```

If another project already uses Nginx on this EC2 instance, keep its server block. Nginx will route by `server_name`.

## 7. Enable HTTPS

After DNS points to the server:

```bash
sudo certbot --nginx -d rhsfish.com -d www.rhsfish.com
sudo systemctl reload nginx
```

## 8. Update Deployment

From `/opt/rhsfish`:

```bash
git pull
docker compose up -d --build
docker image prune -f
```

## Useful Commands

```bash
docker compose logs -f rhsfish
docker compose restart rhsfish
docker compose down
docker compose exec rhsfish node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>r.text()).then(console.log)"
```
