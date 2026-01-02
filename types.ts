
export interface SpotImage {
  url: string;
  caption: string;
}

export interface IdentifiableSpotImage extends SpotImage {
  internalId: string;
}

export enum ExpenseCategory {
  FOOD = '餐飲',
  TRANSPORT = '交通',
  TICKETS = '門票',
  SHOPPING = '購物',
  ACCOMMODATION = '住宿',
  OTHER = '其他'
}

export interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
}

export interface NoteItem {
  id: string;
  content: string;
}

export enum SpotType {
  SPOT = 'spot',
  TRANSPORT = 'transport',
  STAY = 'stay',
  MEAL = 'meal'
}

export interface Spot {
  id: string;
  type: SpotType;
  name: string;
  startTime: string;
  endTime: string;
  notes: NoteItem[];
  mapUrl: string;
  images?: SpotImage[];
  expenses: ExpenseItem[];
}

export interface DayPlan {
  date: string;
  spots: Spot[];
}

export interface TripData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  days: DayPlan[];
  lastModified: number;
  lastSyncedAt?: number;
  totalBudget?: number;
  currency?: string;
  customRequirements?: string;
}

export enum Step {
  DASHBOARD = 0,
  SETUP = 1,
  PLANNING = 2,
  SUMMARY = 3
}
