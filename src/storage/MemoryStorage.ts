import type { PhotoMetadata, StoredPhotoRecord } from '../photos/PhotoManager';

const DB_NAME = 'christmas-wish.memories';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

interface StoredRow {
  id: string;
  name: string;
  mime: string;
  blob: Blob;
  metadata: PhotoMetadata;
  order: number;
}

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });

const transactionDone = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });

export class MemoryStorage {
  async saveAll(records: StoredPhotoRecord[]): Promise<void> {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      for (const record of records) {
        const row: StoredRow = {
          id: record.id,
          name: record.name,
          mime: record.mime,
          blob: record.blob,
          metadata: record.metadata,
          order: record.order
        };
        store.put(row);
      }
      await transactionDone(tx);
    } finally {
      db.close();
    }
  }

  async loadAll(): Promise<StoredPhotoRecord[]> {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const rows = await new Promise<StoredRow[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve((request.result as StoredRow[]) ?? []);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'));
      });
      await transactionDone(tx);
      return rows
        .sort((a, b) => a.order - b.order)
        .map((row) => ({
          id: row.id,
          name: row.name,
          mime: row.mime,
          blob: row.blob,
          metadata: row.metadata,
          order: row.order
        }));
    } finally {
      db.close();
    }
  }

  async clear(): Promise<void> {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      await transactionDone(tx);
    } finally {
      db.close();
    }
  }

  async estimate(): Promise<{ usage: number; quota: number } | null> {
    if (!navigator.storage?.estimate) return null;
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage ?? 0,
      quota: estimate.quota ?? 0
    };
  }
}
