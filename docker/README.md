# MediTap Docker stack

Run all commands from **`docker/`** (paths in `docker-compose.yml` expect the repo parent as context).

## Local development (HTTP on localhost)

```bash
docker compose -f docker-compose.yml -f docker-compose.local-ports.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.local-ports.yml exec backend python manage.py migrate
```

- App: `http://localhost:8100`
- API: `http://localhost:8080`
- Keycloak: `http://localhost:8081`

## GCP / public IP with HTTPS (Keycloak + Web Crypto)

See **`../docs/deploy-gcp-vm.md`**. Short version:

```bash
cp docker-compose.override.public-https.example.yml docker-compose.override.yml
# edit .env (MEDITAP_PUBLIC_HOST, MEDITAP_PUBLIC_SCHEME=https, MEDITAP_CORS_EXTRA_ORIGINS)
docker compose run --rm keycloak-config
docker compose up -d --build
```

Use **`https://YOUR_IP:8100`** in the browser.

## Stop

```bash
docker compose down
```

(Compose auto-loads `docker-compose.override.yml` if present; use the same `-f` flags you used for `up`.)
