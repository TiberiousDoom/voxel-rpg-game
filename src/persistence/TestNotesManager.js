/**
 * TestNotesManager — IndexedDB persistence for test tracker notes/status/screenshots.
 *
 * Separate database from game saves so clearing game data doesn't affect QA notes.
 * Follows the same IDB pattern as Game3DSaveManager.
 */

class TestNotesManager {
  constructor() {
    this.db = null;
    this.dbReady = this._initIndexedDB();
  }

  async _initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('test-tracker-notes', 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('criteria')) {
          db.createObjectStore('criteria', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Load all criterion records from IDB.
   * @returns {Promise<Map<string, object>>} Map of id → record
   */
  async loadAll() {
    await this.dbReady;
    const tx = this.db.transaction(['criteria'], 'readonly');
    const store = tx.objectStore('criteria');

    const records = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const map = new Map();
    for (const rec of records) {
      map.set(rec.id, rec);
    }
    return map;
  }

  /**
   * Save a single criterion record.
   * @param {string} id - Criterion ID
   * @param {object} record - { id, status, notes, screenshot, screenshotTimestamp, lastModified }
   */
  async saveCriterion(id, record) {
    await this.dbReady;
    const tx = this.db.transaction(['criteria'], 'readwrite');
    const store = tx.objectStore('criteria');

    const data = { ...record, id, lastModified: Date.now() };

    await new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Export all data as JSON (screenshots encoded as base64).
   * @returns {Promise<object>} Serializable object
   */
  async exportAsJSON() {
    const map = await this.loadAll();
    const entries = [];

    for (const [id, rec] of map) {
      const entry = {
        id,
        status: rec.status || 'untested',
        notes: rec.notes || '',
        screenshotTimestamp: rec.screenshotTimestamp || null,
        lastModified: rec.lastModified || null,
        screenshot: null,
      };

      if (rec.screenshot) {
        // Convert ArrayBuffer to base64
        const bytes = new Uint8Array(rec.screenshot);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        entry.screenshot = btoa(binary);
      }

      entries.push(entry);
    }

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      criteria: entries,
    };
  }

  /**
   * Import data from a previously exported JSON object.
   * @param {object} data - The exported JSON data
   */
  async importFromJSON(data) {
    if (!data || !data.criteria) return;

    await this.dbReady;
    const tx = this.db.transaction(['criteria'], 'readwrite');
    const store = tx.objectStore('criteria');

    const promises = data.criteria.map((entry) => {
      const record = {
        id: entry.id,
        status: entry.status || 'untested',
        notes: entry.notes || '',
        screenshotTimestamp: entry.screenshotTimestamp || null,
        lastModified: entry.lastModified || Date.now(),
        screenshot: null,
      };

      if (entry.screenshot) {
        // Convert base64 back to ArrayBuffer
        const binary = atob(entry.screenshot);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        record.screenshot = bytes.buffer;
      }

      return new Promise((resolve, reject) => {
        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
  }

  /**
   * Clear all test tracker data.
   */
  async clearAll() {
    await this.dbReady;
    const tx = this.db.transaction(['criteria'], 'readwrite');
    const store = tx.objectStore('criteria');

    await new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const testNotesManager = new TestNotesManager();
export default TestNotesManager;
