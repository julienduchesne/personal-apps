import type { Score } from "./score";

async function access<T>(mode: IDBTransactionMode, request: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open("sightstring", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("scores", { keyPath: "id" });
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction("scores", mode);
      const operation = request(transaction.objectStore("scores"));
      transaction.oncomplete = () => resolve(operation.result);
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export const listScores = () => access<Score[]>("readonly", (store) => store.getAll());
export const saveScore = (score: Score) => access("readwrite", (store) => store.put(score));
