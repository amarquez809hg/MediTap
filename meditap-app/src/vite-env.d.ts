/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  /** Post-login path for the Ionic router (default `/tab3`). */
  readonly VITE_POST_LOGIN_PATH?: string;
  /** Must match Django group / JWT `realm_access.roles` for intake editors. */
  readonly VITE_MEDITAP_RECORD_EDITOR_ROLE?: string;
  readonly VITE_EPIC_DEVELOPER_PORTAL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
