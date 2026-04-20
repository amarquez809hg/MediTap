# Run MediTap on a Google Cloud VM (Docker + Keycloak)

This guide assumes a **Linux VM** (e.g. Debian/Ubuntu on Compute Engine) with a **public IP**, and that you clone MediTap on the VM and run the stack with **Docker Compose** from the `docker/` folder.

You will open:

| URL | Service |
|-----|---------|
| `http://<VM_EXTERNAL_IP>:8100` | MediTap SPA (Ionic dev server) |
| `http://<VM_EXTERNAL_IP>:8080` | Django API |
| `http://<VM_EXTERNAL_IP>:8081` | Keycloak admin & login |

All three ports must be reachable from your browser (firewall).

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

Set at minimum:

```env
# Replace with your VM’s external IP (no http://)
MEDITAP_PUBLIC_HOST=34.56.78.90

# Same host, SPA origin — Django CORS (comma-separated if you need more)
MEDITAP_CORS_EXTRA_ORIGINS=http://34.56.78.90:8100
```

Paste the **Keycloak elevate client secret** into `KEYCLOAK_ELEVATE_CLIENT_SECRET` (see `backend.dev.env` / Keycloak Admin after first boot) so staff elevation works.

`KEYCLOAK_TRUST_ISSUER_SUFFIX=true` is already set in Compose so the API accepts tokens whose issuer is `http://<your-ip>:8081/realms/meditap` without listing every IP in `KEYCLOAK_ALLOWED_ISSUERS`.

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

The one-shot `keycloak-config` service adds `http://<MEDITAP_PUBLIC_HOST>:8100/*` to the `meditap-spa` client when `MEDITAP_PUBLIC_HOST` is set.

If you **already ran** Compose without `MEDITAP_PUBLIC_HOST`, then set it in `docker/.env` and re-run only the config job:

```bash
cd docker
docker compose run --rm keycloak-config
docker compose restart backend frontend
```

---

## 6. Use the app

1. Open **`http://<VM_EXTERNAL_IP>:8100`** (Tab 3 login).
2. Keycloak loads from **`http://<VM_EXTERNAL_IP>:8081`** (`VITE_KEYCLOAK_URL=auto` in Compose).
3. The API is called at **`http://<VM_EXTERNAL_IP>:8080`** (derived in the SPA from the same hostname, or override with `VITE_API_BASE`).

**Keycloak admin console:** `http://<VM_EXTERNAL_IP>:8081` — user `admin` / password `admin` (change for anything beyond a demo).

Register the first user via the app (“Create an account”) or in Keycloak realm **meditap**.

---

## 7. Troubleshooting

| Symptom | Check |
|--------|--------|
| SPA loads but API calls fail / empty data | Browser devtools → request URL; confirm `:8080`. Run `docker compose ps`. Open `http://IP:8080/` → `{"status":"ok"}`. |
| CORS error in browser | Set `MEDITAP_CORS_EXTRA_ORIGINS=http://IP:8100` and `docker compose up -d backend`. |
| Keycloak “Invalid parameter: redirect_uri” | Set `MEDITAP_PUBLIC_HOST` and run `docker compose run --rm keycloak-config`, or add `http://IP:8100/*` under **Clients → meditap-spa → Valid redirect URIs** and matching **Web origins**. |
| API 401 “issuer” / token | Ensure you open the app with the **same host** you put in Keycloak (use external IP consistently, not mixing hostname and IP). |
| Staff elevation fails | `KEYCLOAK_ELEVATE_CLIENT_SECRET` must match Keycloak **Clients → meditap-elevate → Credentials**; assign realm role **meditap-record-editor** to staff users. |

---

## 8. Production hardening (not done by default)

- Use **HTTPS** (Google HTTPS load balancer or Caddy/nginx) and set Keycloak hostname / SSL modes accordingly.  
- Replace default **Keycloak** and **Postgres** passwords.  
- Set a real **`SECRET_KEY`** and `DEBUG=False` for Django.  
- Do not expose Postgres **5432** publicly; remove the port mapping in `docker-compose.yml` if not needed.  
- Prefer a **production** Keycloak hostname mode instead of `start-dev`.

This Compose file is optimized for **development / demos** on a VM, not a hardened production deployment.
