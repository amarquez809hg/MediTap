# MediTap Docker stack

Run all commands from **`docker/`** (paths in `docker-compose.yml` expect the repo parent as context).

## Local development (HTTP on localhost)

```bash
docker compose -f docker-compose.yml -f docker-compose.local-ports.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.local-ports.yml exec backend python manage.py migrate
```

- App: `http://localhost:8100`
- API: `http://localhost:8080`

Sign-in uses **Django users + JWT** (`/api/auth/register/`, `/api/auth/token/`). Create a user with `createsuperuser`, the registration page, or Admin.

To **delete every Django user** and start accounts from scratch (also removes incidents that reference users, JWT blacklist rows, and sessions):

```bash
docker compose -f docker-compose.yml -f docker-compose.local-ports.yml exec backend python manage.py wipe_users --yes
```

After a wipe, **recreate roles + optional first superuser** (requires `DEBUG=True` and env password for the superuser step):

```bash
docker compose -f docker-compose.yml -f docker-compose.local-ports.yml exec backend python manage.py bootstrap_meditap_access
```

Set `MEDITAP_BOOTSTRAP_SUPERUSER_PASSWORD` (and optionally `MEDITAP_BOOTSTRAP_SUPERUSER_USERNAME`, default `admin`) in `docker/backend.dev.env` or `docker/.env` before running; remove those secrets after the user exists. Staff who edit intake in the SPA need the **`meditap-record-editor`** Django group (or superuser); assign in **Django Admin → Users** or **Groups**.

## GCP / public IP with HTTPS

See **`../docs/deploy-gcp-vm.md`** (may still describe older Keycloak-based setups—auth is Django + JWT only).

```bash
cp docker-compose.override.public-https.example.yml docker-compose.override.yml
# edit .env (MEDITAP_PUBLIC_HOST, MEDITAP_PUBLIC_SCHEME=https, MEDITAP_CORS_EXTRA_ORIGINS)
docker compose up -d --build
```

Use **`https://YOUR_IP:8100`** in the browser when using the HTTPS override.

## Stop

```bash
docker compose down
```

(Compose auto-loads `docker-compose.override.yml` if present; use the same `-f` flags you used for `up`.)
