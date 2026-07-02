/** Persist Tab14 uploaded file table rows across navigation (IndexedDB blobs + metadata). */

const DB_NAME = 'meditap-tab14-uploads';
const DB_VERSION = 1;
const STORE = 'files';

export type Tab14PersistedUploadRecord = {
  id: string;
  scope: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  parseStatus: string;
  blob: Blob;
};

export type Tab14UploadedFileEntry = {
  id: string;
  file: File;
  previewUrl: string;
  uploadedAt: string;
  parseStatus?: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('scope', 'scope', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

function recordFromEntry(scope: string, entry: Tab14UploadedFileEntry): Tab14PersistedUploadRecord {
  return {
    id: entry.id,
    scope,
    name: entry.file.name,
    size: entry.file.size,
    type: entry.file.type,
    uploadedAt: entry.uploadedAt,
    parseStatus: entry.parseStatus?.trim() ?? '',
    blob: entry.file,
  };
}

function entryFromRecord(record: Tab14PersistedUploadRecord): Tab14UploadedFileEntry {
  const file = new File([record.blob], record.name, {
    type: record.type || 'application/octet-stream',
    lastModified: Date.now(),
  });
  return {
    id: record.id,
    file,
    previewUrl: URL.createObjectURL(file),
    uploadedAt: record.uploadedAt,
    parseStatus: record.parseStatus || undefined,
  };
}

export async function persistTab14UploadedFile(
  scope: string,
  entry: Tab14UploadedFileEntry
): Promise<void> {
  if (!scope.trim() || typeof indexedDB === 'undefined') return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(recordFromEntry(scope, entry));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
  });
}

export async function loadTab14UploadedFiles(scope: string): Promise<Tab14UploadedFileEntry[]> {
  if (!scope.trim() || typeof indexedDB === 'undefined') return [];
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).index('scope').getAll(IDBKeyRange.only(scope));
    req.onsuccess = () => {
      const rows = (req.result as Tab14PersistedUploadRecord[] | undefined) ?? [];
      resolve(rows.map(entryFromRecord));
    };
    req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'));
  });
}

export async function removeTab14PersistedUpload(scope: string, id: string): Promise<void> {
  if (!scope.trim() || typeof indexedDB === 'undefined') return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const row = getReq.result as Tab14PersistedUploadRecord | undefined;
      if (row?.scope === scope) store.delete(id);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB delete failed'));
  });
}

export async function clearTab14PersistedUploads(scope: string): Promise<void> {
  if (!scope.trim() || typeof indexedDB === 'undefined') return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.index('scope').openCursor(IDBKeyRange.only(scope));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB clear failed'));
  });
}

export async function clearAllTab14PersistedUploads(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB clear failed'));
  });
}
