
export interface SpotImage {
  url: string;
  caption: string;
}

export interface Spot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  notes: string;
  mapUrl: string;
  images?: SpotImage[]; 
}

export interface DayPlan {
  date: string;
  spots: Spot[];
}

export interface TripData {
  id: string; // Unique identifier
  name: string;
  startDate: string;
  endDate: string;
  days: DayPlan[];
  lastModified: number;
}

export enum Step {
  DASHBOARD = 0,
  SETUP = 1,
  PLANNING = 2,
  SUMMARY = 3
}
