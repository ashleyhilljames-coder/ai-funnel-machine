const DB_NAME = 'SyncroScaleOfflineDB';
const DB_VERSION = 1;

export interface PendingMoisture {
  id?: number;
  job_id: string;
  room_name: string;
  ambient_temp_f: number;
  relative_humidity_pct: number;
  wood_moisture_pct: number;
  drywall_moisture_pct: number;
  air_movers_count: number;
  dehumidifiers_count: number;
  tech_notes: string;
  timestamp: string;
}

export interface PendingEquipment {
  id?: number;
  job_id: string;
  equipment_name: string;
  serial_no: string;
  room_name: string;
  status: 'ACTIVE' | 'REMOVED';
  placed_at: string;
}

export interface PendingPhoto {
  id?: number;
  job_id: string;
  photo_url: string;
  caption: string;
  category: 'INITIAL_DAMAGE' | 'EQUIPMENT_SETUP' | 'POST_DRYING';
  timestamp: string;
}

class IndexedDbSyncService {
  private dbPromise: Promise<IDBDatabase>;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.dbPromise = this.initDb();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[IndexedDB Sync] Device reconnected to internet. Auto-flushing offline queue...');
        this.flushOfflineQueue();
      });
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  private initDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not supported in this environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('pending_moisture_readings')) {
          db.createObjectStore('pending_moisture_readings', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('pending_equipment_logs')) {
          db.createObjectStore('pending_equipment_logs', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('pending_loss_photos')) {
          db.createObjectStore('pending_loss_photos', { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async saveOfflineMoisture(data: PendingMoisture): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_moisture_readings', 'readwrite');
      const store = tx.objectStore('pending_moisture_readings');
      store.add(data);
      tx.oncomplete = () => {
        console.log('[IndexedDB] Saved moisture reading locally while offline.');
        this.notify();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  public async saveOfflineEquipment(data: PendingEquipment): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_equipment_logs', 'readwrite');
      const store = tx.objectStore('pending_equipment_logs');
      store.add(data);
      tx.oncomplete = () => {
        console.log('[IndexedDB] Saved equipment log locally while offline.');
        this.notify();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  public async saveOfflinePhoto(data: PendingPhoto): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pending_loss_photos', 'readwrite');
      const store = tx.objectStore('pending_loss_photos');
      store.add(data);
      tx.oncomplete = () => {
        console.log('[IndexedDB] Saved loss photo locally while offline.');
        this.notify();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getPendingCount(): Promise<number> {
    try {
      const db = await this.dbPromise;
      const counts = await Promise.all([
        this.storeCount(db, 'pending_moisture_readings'),
        this.storeCount(db, 'pending_equipment_logs'),
        this.storeCount(db, 'pending_loss_photos')
      ]);
      return counts.reduce((a, b) => a + b, 0);
    } catch {
      return 0;
    }
  }

  private storeCount(db: IDBDatabase, storeName: string): Promise<number> {
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  }

  public async getAllPending(): Promise<{
    moistureReadings: PendingMoisture[];
    equipmentLogs: PendingEquipment[];
    lossPhotos: PendingPhoto[];
  }> {
    const db = await this.dbPromise;
    const moistureReadings = await this.getAllFromStore<PendingMoisture>(db, 'pending_moisture_readings');
    const equipmentLogs = await this.getAllFromStore<PendingEquipment>(db, 'pending_equipment_logs');
    const lossPhotos = await this.getAllFromStore<PendingPhoto>(db, 'pending_loss_photos');

    return { moistureReadings, equipmentLogs, lossPhotos };
  }

  private getAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  public async flushOfflineQueue(): Promise<{ success: boolean; syncedCount: number }> {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.log('[IndexedDB Sync] Device is offline. Cannot flush queue yet.');
        return { success: false, syncedCount: 0 };
      }

      const pending = await this.getAllPending();
      const totalPending = pending.moistureReadings.length + pending.equipmentLogs.length + pending.lossPhotos.length;

      if (totalPending === 0) {
        return { success: true, syncedCount: 0 };
      }

      console.log(`[IndexedDB Sync] Flushing ${totalPending} offline records to server...`);

      const res = await fetch('/api/mission-control/sync-offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pending)
      });

      if (res.ok) {
        const db = await this.dbPromise;
        await this.clearStore(db, 'pending_moisture_readings');
        await this.clearStore(db, 'pending_equipment_logs');
        await this.clearStore(db, 'pending_loss_photos');

        console.log('✅ [IndexedDB Sync] Offline queue cleared after server sync.');
        this.notify();
        return { success: true, syncedCount: totalPending };
      }

      return { success: false, syncedCount: 0 };
    } catch (err) {
      console.warn('[IndexedDB Sync] Queue flush failed:', err);
      return { success: false, syncedCount: 0 };
    }
  }

  private clearStore(db: IDBDatabase, storeName: string): Promise<void> {
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve();
    });
  }
}

export const indexedDbSync = new IndexedDbSyncService();
