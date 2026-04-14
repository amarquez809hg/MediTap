/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_KEYCLOAK_URL?: string;
  readonly VITE_KEYCLOAK_REALM?: string;
  readonly VITE_KEYCLOAK_CLIENT_ID?: string;
  readonly VITE_KEYCLOAK_REDIRECT_PATH?: string;
  /** Keycloak Google IdP alias (default `google`). */
  readonly VITE_KEYCLOAK_IDP_GOOGLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
