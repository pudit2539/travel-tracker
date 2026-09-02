// src/lib/localReceipts.ts
/**
 * Local Device Receipt Storage using IndexedDB
 * Saves high-res receipt photos directly onto the user's phone/device storage
 * to avoid bloating the production database with heavy base64 blobs.
 */

const DB_NAME = 'TravelTrackerReceiptsDB';
const DB_VERSION = 1;
const STORE_NAME = 'receipt_photos';

function openReceiptsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save receipt image to local phone/device storage
 * @param receiptId Unique ID for the receipt (e.g. `expense_${id}` or uuid)
 * @param dataUrl Base64 or Blob Data URL
 */
export async function saveLocalReceiptPhoto(receiptId: string, dataUrl: string): Promise<boolean> {
  if (typeof window === 'undefined' || !receiptId || !dataUrl) return false;

  try {
    const db = await openReceiptsDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({
        id: receiptId,
        dataUrl,
        savedAt: new Date().toISOString(),
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => {
        try {
          localStorage.setItem(`receipt_cache_${receiptId}`, dataUrl);
          resolve(true);
        } catch {
          resolve(false);
        }
      };
    });
  } catch (e) {
    try {
      localStorage.setItem(`receipt_cache_${receiptId}`, dataUrl);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get receipt image from local phone/device storage
 */
export async function getLocalReceiptPhoto(receiptId: string): Promise<string | null> {
  if (typeof window === 'undefined' || !receiptId) return null;

  try {
    const db = await openReceiptsDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(receiptId);
      req.onsuccess = () => {
        if (req.result?.dataUrl) {
          resolve(req.result.dataUrl);
        } else {
          const cached = localStorage.getItem(`receipt_cache_${receiptId}`);
          resolve(cached || null);
        }
      };
      req.onerror = () => {
        const cached = localStorage.getItem(`receipt_cache_${receiptId}`);
        resolve(cached || null);
      };
    });
  } catch {
    try {
      const cached = localStorage.getItem(`receipt_cache_${receiptId}`);
      return cached || null;
    } catch {
      return null;
    }
  }
}

/**
 * Delete receipt photo from local device
 */
export async function deleteLocalReceiptPhoto(receiptId: string): Promise<void> {
  if (typeof window === 'undefined' || !receiptId) return;

  try {
    localStorage.removeItem(`receipt_cache_${receiptId}`);
    const db = await openReceiptsDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(receiptId);
  } catch {}
}
