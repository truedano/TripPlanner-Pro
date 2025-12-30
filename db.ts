
import Dexie from 'dexie';
import type { Table } from 'dexie';
import { TripData } from './types';

// Using default import for Dexie class to ensure correct type inheritance and method availability
export class TripJournalDatabase extends Dexie {
  trips!: Table<TripData>;

  constructor() {
    super('TripJournalDB');
    // Defining database schema and version
    // The version method is used to define or upgrade the database schema
    this.version(1).stores({
      trips: 'id, lastModified' // id is the primary key, lastModified is indexed for efficient sorting
    });
  }
}

export const db = new TripJournalDatabase();
