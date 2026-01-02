import Dexie, { type Table } from 'dexie';
import { TripData } from './types';
import CryptoJS from 'crypto-js';

const DB_SECRET = 'trip_planner_pro_db_secure_key_v1';

// Internal interface for stored data where days might be encrypted (string)
interface StoredTripData extends Omit<TripData, 'days'> {
  days: any[] | string;
}

// Using default import for Dexie class to ensure correct type inheritance and method availability
export class TripJournalDatabase extends Dexie {
  trips!: Table<TripData>;

  constructor() {
    super('TripJournalDB');
    // Defining database schema and version
    (this as any).version(1).stores({
      trips: 'id, lastModified' // id is the primary key, lastModified is indexed for efficient sorting
    });

    // Hook: Reading - Auto Decrypt
    this.trips.hook('reading', (obj: StoredTripData) => {
      // If 'days' is stored as a string, it means it's encrypted. Decrypt it.
      if (obj && typeof obj.days === 'string') {
        try {
          const bytes = CryptoJS.AES.decrypt(obj.days, DB_SECRET);
          const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
          return { ...obj, days: decryptedData };
        } catch (error) {
          console.error('Failed to decrypt trip data:', error);
          // Return as is or handle error, might allow app to handle empty/corrupt data
          return { ...obj, days: [] };
        }
      }
      return obj as unknown as TripData;
    });

    // Hook: Creating - Auto Encrypt
    this.trips.hook('creating', (primKey, obj: TripData) => {
      const clone = { ...obj } as any;
      if (clone.days) {
        clone.days = CryptoJS.AES.encrypt(JSON.stringify(clone.days), DB_SECRET).toString();
      }
      return clone;
    });

    // Hook: Updating - Auto Encrypt
    this.trips.hook('updating', (modifications: Partial<TripData>, primKey, obj: TripData) => {
      const updates = { ...modifications } as any;
      if (updates.days) {
        updates.days = CryptoJS.AES.encrypt(JSON.stringify(updates.days), DB_SECRET).toString();
      }
      return updates;
    });
  }
}

export const db = new TripJournalDatabase();