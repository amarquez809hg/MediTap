#!/bin/sh
# One-shot: allow Keycloak admin + realms over plain HTTP in local/dev (any Host / LAN IP).
# See keycloak/keycloak#42284 — sslRequired=NONE avoids "HTTPS required" for non-local Docker bridge IPs.
set -u
ADMIN_USER="${KEYCLOAK_ADMIN:-admin}"
ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
KC_INTERNAL="${KEYCLOAK_INTERNAL_URL:-http://auth:8080}"

echo "Waiting for Keycloak at ${KC_INTERNAL} ..."
LOGGED_IN=0
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 \
         31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 \
         51 52 53 54 55 56 57 58 59 60 61 62 63 64 65 66 67 68 69 70 \
         71 72 73 74 75 76 77 78 79 80 81 82 83 84 85 86 87 88 89 90; do
  if /opt/keycloak/bin/kcadm.sh config credentials \
      --server "${KC_INTERNAL}" \
      --realm master \
      --user "${ADMIN_USER}" \
      --password "${ADMIN_PASS}" 2>/dev/null; then
    LOGGED_IN=1
    echo "kcadm authenticated."
    break
  fi
  sleep 2
done

if [ "$LOGGED_IN" != 1 ]; then
  echo "ERROR: Could not log into Keycloak admin. Is 'auth' up and KEYCLOAK_ADMIN_* correct?" >&2
  exit 1
fi

/opt/keycloak/bin/kcadm.sh update realms/master -s sslRequired=NONE
echo "realm master: sslRequired=NONE"

if /opt/keycloak/bin/kcadm.sh get realms/meditap >/dev/null 2>&1; then
  /opt/keycloak/bin/kcadm.sh update realms/meditap -s sslRequired=NONE
  echo "realm meditap: sslRequired=NONE (updated)"
else
  if /opt/keycloak/bin/kcadm.sh create realms -s realm=meditap -s enabled=true -s sslRequired=NONE; then
    echo "realm meditap: created with sslRequired=NONE"
  fi
fi

if ! /opt/keycloak/bin/kcadm.sh get realms/meditap >/dev/null 2>&1; then
  echo "ERROR: realm meditap is missing; cannot create OIDC client." >&2
  exit 1
fi

# Self-service signup in dev (Keycloak “Register” / kc.register())
/opt/keycloak/bin/kcadm.sh update realms/meditap -s registrationAllowed=true 2>/dev/null || true

# Browser tab / login header text (otherwise Keycloak may show the old realm id, e.g. “caretap”).
/opt/keycloak/bin/kcadm.sh update realms/meditap -s displayName=MediTap -s displayNameHtml=MediTap 2>/dev/null || true

# SPA client expected by meditap-app (VITE_KEYCLOAK_CLIENT_ID). Without it, Keycloak shows “Client not found.”
if /opt/keycloak/bin/kcadm.sh get clients -r meditap -q clientId=meditap-spa 2>/dev/null | grep -q meditap-spa; then
  echo "client meditap-spa: already exists"
else
  /opt/keycloak/bin/kcadm.sh create clients -r meditap \
    -s clientId=meditap-spa \
    -s name="MediTap SPA" \
    -s enabled=true \
    -s publicClient=true \
    -s standardFlowEnabled=true \
    -s directAccessGrantsEnabled=false \
    -s implicitFlowEnabled=false \
    -s 'redirectUris=["http://localhost:8100/*","http://127.0.0.1:8100/*"]' \
    -s 'webOrigins=["http://localhost:8100","http://127.0.0.1:8100"]' \
    && echo "client meditap-spa: created (add http://<LAN-IP>:8100/* here if you test on phones)"
fi

# Confidential client for staff password grant (POST /api/auth/staff-elevate/).
# Secret must match KEYCLOAK_ELEVATE_CLIENT_SECRET in docker/backend.dev.env (dev only).
ELEVATE_SECRET="${MEDITAP_ELEVATE_DEV_SECRET:-rm3HOighuuYUXo1vi4sIXdNz53kzIhIx}"

if ! /opt/keycloak/bin/kcadm.sh get roles/meditap-record-editor -r meditap >/dev/null 2>&1; then
  /opt/keycloak/bin/kcadm.sh create roles -r meditap \
    -s name=meditap-record-editor \
    -s 'description=Staff may edit patient intake when elevated (Tab12/Tab14)' \
    && echo "realm role meditap-record-editor: created"
else
  echo "realm role meditap-record-editor: already exists"
fi

elevate_client_internal_id() {
  /opt/keycloak/bin/kcadm.sh get clients -r meditap -q clientId=meditap-elevate --fields id 2>/dev/null \
    | tr -d ' \n' | sed 's/.*"id":"\([^"]*\)".*/\1/'
}

if /opt/keycloak/bin/kcadm.sh get clients -r meditap -q clientId=meditap-elevate 2>/dev/null | grep -q meditap-elevate; then
  echo "client meditap-elevate: exists — ensuring direct access grants (NOT overwriting client secret)"
  echo "  If staff sign-in fails with invalid_client, copy the secret from Keycloak → Clients →"
  echo "  meditap-elevate → Credentials into KEYCLOAK_ELEVATE_CLIENT_SECRET (docker/.env or backend.dev.env)."
  EID="$(elevate_client_internal_id)"
  if [ -n "$EID" ]; then
    /opt/keycloak/bin/kcadm.sh update "clients/${EID}" -r meditap \
      -s enabled=true \
      -s publicClient=false \
      -s directAccessGrantsEnabled=true \
      -s standardFlowEnabled=true \
      -s serviceAccountsEnabled=false \
      -s 'clientAuthenticatorType=client-secret' \
      && echo "client meditap-elevate: updated (secret unchanged in Keycloak)"
  else
    echo "WARN: could not resolve meditap-elevate internal id; fix client in Keycloak Admin UI." >&2
  fi
else
  /opt/keycloak/bin/kcadm.sh create clients -r meditap \
    -s clientId=meditap-elevate \
    -s name="MediTap staff elevation (dev)" \
    -s enabled=true \
    -s publicClient=false \
    -s directAccessGrantsEnabled=true \
    -s standardFlowEnabled=true \
    -s serviceAccountsEnabled=false \
    -s 'clientAuthenticatorType=client-secret' \
    -s "secret=${ELEVATE_SECRET}" \
    && echo "client meditap-elevate: created (secret matches docker/backend.dev.env for dev)"
fi

echo "Keycloak HTTP dev configuration finished."
echo "Staff elevate: assign realm role meditap-record-editor to each staff Keycloak user"
echo "  (Users → <user> → Role mapping → Assign role → meditap-record-editor), then use that user's password in the app."
echo "Google SSO: In Admin UI, realm meditap → Authentication → Flows → Browser: ensure"
echo "  'Identity Provider Redirector' is not Disabled (it applies kc_idp_hint → Google)."
echo "  Identity providers → Google alias should match VITE_KEYCLOAK_IDP_GOOGLE (default google)."
