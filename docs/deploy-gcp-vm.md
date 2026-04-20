# Run MediTap on a Google Cloud VM (Docker + Keycloak)

This guide assumes a **Linux VM** (e.g. Debian/Ubuntu on Compute Engine) with a **public IP**, and that you clone MediTap on the VM and run the stack with **Docker Compose** from the `docker/` folder.

## 0. Public IP + Keycloak: use HTTPS (required for browser sign-in)

Browsers only expose the **Web Crypto API** in a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts): **`https://`**, **`http://localhost`**, etc. **`http://34.x.x.x`** is **not** secure, so **Keycloak-js fails** with *“Web Crypto API is not available”*.

**Fix:** terminate TLS on the VM with the provided **Caddy** override (self-signed on the **same ports** 8100 / 8080 / 8081), then open:

| URL | Service |
|-----|---------|
| `https://<VM_EXTERNAL_IP>:8100` | MediTap SPA |
| `https://<VM_EXTERNAL_IP>:8080` | Django API |
| `https://<VM_EXTERNAL_IP>:8081` | Keycloak |

Accept the browser certificate warning the first time (or install Caddy’s root CA from `/data` if you mount it — optional).

**Steps:**

1. In `docker/.env` set (replace the IP):

   ```env
   MEDITAP_PUBLIC_HOST=34.72.190.141
   MEDITAP_PUBLIC_SCHEME=https
   MEDITAP_CORS_EXTRA_ORIGINS=https://34.72.190.141:8100
   ```

2. Enable the override (from the `docker/` directory):

   ```bash
   cp docker-compose.override.public-https.example.yml docker-compose.override.yml
   ```

3. Recreate Keycloak client redirects and start everything:

   ```bash
   docker compose run --rm keycloak-config
   docker compose up -d --build
   ```

4. Open **`https://<VM_EXTERNAL_IP>:8100/tab3`** (not `http://`).

**If the browser shows *“Client sent an HTTP request to an HTTPS server”***  
You opened **`http://34.x.x.x:8100`**. Port **8100** is **HTTPS only** (Caddy). Change the address bar to **`https://`** (same IP and port) and reload.

For **local / LAN only** demos over HTTP, you can skip the override and keep `http://` — **do not** use plain `http://` with a **public numeric IP** for Keycloak login.

---

### URLs without the HTTPS override (localhost / LAN HTTP only)

| URL | Service |
|-----|---------|
| `http://<host>:8100` | MediTap SPA |
| `http://<host>:8080` | Django API |
| `http://<host>:8081` | Keycloak |

All three ports must be reachable from your browser (firewall). Use this only when `http://` is still a secure context (e.g. `localhost`) or for API checks from SSH on the VM.

---

## 1. VM setup

1. Create a VM with enough RAM for Keycloak + Postgres (e.g. **e2-standard-4** or larger for a comfortable dev demo).
2. Install Docker Engine and the Compose plugin (official Docker docs for your distro).
3. Clone the repo, e.g. `git clone … && cd MediTap`.

---

## 2. Open firewall ports (GCP)

Create a VPC firewall rule allowing **TCP 8100, 8080, 8081** to the VM’s network tag or service account (restrict source IPs in production).

Example (Console): **VPC network → Firewall rules → Create rule**

- Direction: Ingress  
- Targets: your VM’s network tags  
- Source IP ranges: `0.0.0.0/0` (tighten for production)  
- Protocols and ports: `tcp:8100,tcp:8080,tcp:8081`

Or with `gcloud` (replace `NETWORK_TAG`):

```bash
gcloud compute firewall-rules create allow-meditap-http \
  --network=default \
  --allow=tcp:8100,tcp:8080,tcp:8081 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=NETWORK_TAG
```

Tag the VM with `NETWORK_TAG` if you use `--target-tags`.

---

## 3. Configure `docker/.env` for your public IP

In the `docker/` directory, copy the example and edit values.

```bash
cd docker
cp .env.gcp.example .env   # if present; otherwise edit existing .env
```

Set at minimum (use **`https://`** values if you enabled the Caddy override in **§0**):

```env
MEDITAP_PUBLIC_HOST=34.56.78.90
MEDITAP_PUBLIC_SCHEME=https
MEDITAP_CORS_EXTRA_ORIGINS=https://34.56.78.90:8100
```

Paste the **Keycloak elevate client secret** into `KEYCLOAK_ELEVATE_CLIENT_SECRET` (see `backend.dev.env` / Keycloak Admin after first boot) so staff elevation works.

`KEYCLOAK_TRUST_ISSUER_SUFFIX=true` is already set in Compose so the API accepts tokens whose issuer ends with `/realms/meditap` for both **`http://`** and **`https://`** front URLs.

---

## 4. Start the stack

From the **`docker`** directory (important: paths in `docker-compose.yml` expect this):

```bash
cd docker
docker compose build
docker compose up -d
```

First-time **database migrations**:

```bash
docker compose exec backend python manage.py migrate
```

Watch logs until healthy:

```bash
docker compose logs -f auth backend
```

---

## 5. Keycloak redirects if you change the public IP later

The one-shot `keycloak-config` service adds `<MEDITAP_PUBLIC_SCHEME>://<MEDITAP_PUBLIC_HOST>:8100/*` to the `meditap-spa` client when `MEDITAP_PUBLIC_HOST` is set.

If you **change** the IP, scheme, or Caddy setup, update `docker/.env` and re-run:

```bash
cd docker
docker compose run --rm keycloak-config
docker compose restart backend frontend auth caddy
```

---

## 6. Use the app

With **HTTPS (Caddy) override** (recommended for a **public IP**):

1. Open **`https://<VM_EXTERNAL_IP>:8100/tab3`**.
2. Keycloak is reached at **`https://<VM_EXTERNAL_IP>:8081`** (`VITE_KEYCLOAK_URL=auto` uses the same hostname and ports as the page).
3. The API is **`https://<VM_EXTERNAL_IP>:8080`**.

**Keycloak admin console:** same **`https://<VM_EXTERNAL_IP>:8081`** — user `admin` / password `admin` (change for anything beyond a demo).

Without the override (e.g. SSH tunnel to `localhost`), use **`http://localhost:8100`** etc. as in §0.

Register the first user via the app (“Create an account”) or in Keycloak realm **meditap**.

---

## 7. Troubleshooting

| Symptom | Check |
|--------|--------|
| **“Web Crypto API is not available”** on login | You are on **`http://` + public IP**. Use the **Caddy HTTPS override** (§0) and open **`https://IP:8100`**, or use an **SSH tunnel** and `http://localhost:8100`. |
| SPA loads but API calls fail / empty data | Devtools → Network: API URL must match scheme/host (`https://IP:8080` with Caddy). `docker compose ps` should show **caddy** when using the override. |
| CORS error in browser | Set `MEDITAP_CORS_EXTRA_ORIGINS` to the **exact** SPA origin (`https://IP:8100` or `http://…`) and `docker compose up -d backend`. |
| Keycloak “Invalid parameter: redirect_uri” | Set `MEDITAP_PUBLIC_HOST` + `MEDITAP_PUBLIC_SCHEME` and run `docker compose run --rm keycloak-config`, or fix **Clients → meditap-spa** redirect URIs / web origins to match how you open the app. |
| API 401 “issuer” / token | Same scheme/host everywhere; with HTTPS, token `iss` is often `https://IP:8081/realms/meditap` (supported when `KEYCLOAK_TRUST_ISSUER_SUFFIX=true`). |
| Staff elevation fails | `KEYCLOAK_ELEVATE_CLIENT_SECRET` must match Keycloak **Clients → meditap-elevate → Credentials**; assign realm role **meditap-record-editor** to staff users. |
| **`Bind for :::8081 failed: port is already allocated`** on `auth` | Compose **merged** base `ports` with the override instead of replacing them. Ensure `docker-compose.override.yml` uses **`ports: !reset []`** for `frontend`, `auth`, and `backend` (see `docker-compose.override.public-https.example.yml`), and upgrade **Docker Compose to v2.24+**. Then `docker compose down` and `docker compose up -d`. |

---

## 8. Production hardening (not done by default)

- Use **HTTPS** (Google HTTPS load balancer or Caddy/nginx) and set Keycloak hostname / SSL modes accordingly.  
- Replace default **Keycloak** and **Postgres** passwords.  
- Set a real **`SECRET_KEY`** and `DEBUG=False` for Django.  
- Do not expose Postgres **5432** publicly; remove the port mapping in `docker-compose.yml` if not needed.  
- Prefer a **production** Keycloak hostname mode instead of `start-dev`.

This Compose file is optimized for **development / demos** on a VM, not a hardened production deployment.
