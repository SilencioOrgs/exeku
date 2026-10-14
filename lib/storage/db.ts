/**
 * Exeku IndexedDB Storage Engine
 * Provides Promise-based access to the local IndexedDB database 'exeku_local_v1'.
 * Fallbacks to an in-memory storage in SSR/test environments where indexedDB is not available.
 */

const DB_NAME = "exeku_local_v1";
const DB_VERSION = 2;
export const PROFILE_STORE = "profiles";
export const DRAFT_STORE = "drafts";

// In-memory fallback map for non-browser / test environments
const inMemoryStores = new Map<string, Map<string, unknown>>();

function getMemoryStore(storeName: string): Map<string, unknown> {
  if (!inMemoryStores.has(storeName)) {
    inMemoryStores.set(storeName, new Map<string, unknown>());
  }
  return inMemoryStores.get(storeName)!;
}

function isIndexedDBAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.indexedDB !== "undefined" &&
    window.indexedDB !== null
  );
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      return reject(new Error("IndexedDB is not available in this environment."));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PROFILE_STORE)) {
        const store = db.createObjectStore(PROFILE_STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        const draftStore = db.createObjectStore(DRAFT_STORE, { keyPath: "id" });
        draftStore.createIndex("profileId", "profileId", { unique: false });
        draftStore.createIndex("language", "language", { unique: false });
        draftStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error || new Error("Failed to open IndexedDB"));
    };
  });
}

export async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  if (!isIndexedDBAvailable()) {
    const mem = getMemoryStore(storeName);
    return (mem.get(key) as T) ?? null;
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(key);

      req.onsuccess = () => {
        resolve(req.result !== undefined ? (req.result as T) : null);
      };
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function idbGetAll<T>(storeName: string): Promise<T[]> {
  if (!isIndexedDBAvailable()) {
    const mem = getMemoryStore(storeName);
    return Array.from(mem.values()) as T[];
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAll();

      req.onsuccess = () => {
        resolve((req.result as T[]) || []);
      };
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function idbPut<T extends { id: string }>(storeName: string, value: T): Promise<T> {
  if (!isIndexedDBAvailable()) {
    const mem = getMemoryStore(storeName);
    mem.set(value.id, value);
    return value;
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.put(value);

      req.onsuccess = () => resolve(value);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function idbDelete(storeName: string, key: string): Promise<void> {
  if (!isIndexedDBAvailable()) {
    const mem = getMemoryStore(storeName);
    mem.delete(key);
    return;
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.delete(key);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function idbClear(storeName: string): Promise<void> {
  if (!isIndexedDBAvailable()) {
    const mem = getMemoryStore(storeName);
    mem.clear();
    return;
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Updates one record atomically and confirms the transaction committed.
 */
export async function idbUpdate<T extends { id: string }>(
  storeName: string,
  key: string,
  update: (existing: T | null) => T
): Promise<T> {
  if (!isIndexedDBAvailable()) {
    const store = getMemoryStore(storeName);
    const value = update((store.get(key) as T) ?? null);
    store.set(key, value);
    return value;
  }
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    let value: T;
    let failure: unknown;
    tx.oncomplete = () => resolve(value);
    tx.onabort = () => reject(failure ?? tx.error ?? new Error("Storage transaction aborted"));
    tx.onerror = () => reject(tx.error ?? new Error("Storage transaction failed"));
    const request = store.get(key);
    request.onsuccess = () => {
      try {
        value = update(request.result ?? null);
        store.put(value);
      } catch (error) {
        failure = error;
        tx.abort();
      }
    };
  });
}
