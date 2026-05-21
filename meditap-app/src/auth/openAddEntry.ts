/** After staff unlock, target tab reads this and opens its “new entry” flow. */
const STORAGE_KEY = 'meditap_open_add_path';

export type OpenAddEntryPath = '/tab4' | '/tab5' | '/tab6' | '/tab7';

export function queueOpenAddEntry(path: OpenAddEntryPath): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    /* private mode */
  }
}

export function consumeOpenAddEntry(path: OpenAddEntryPath): boolean {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === path) {
      sessionStorage.removeItem(STORAGE_KEY);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
