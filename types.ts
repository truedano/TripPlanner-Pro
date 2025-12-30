
export interface SpotImage {
  url: string;
  caption: string;
}

export enum ExpenseCategory {
  FOOD = '餐飲',
  TRANSPORT = '交通',
  TICKETS = '門票',
  SHOPPING = '購物',
  ACCOMMODATION = '住宿',
  OTHER = '其他'
}

export interface Expense {
  estimated: number;
  actual: number;
  category: ExpenseCategory;
}

export interface Spot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  notes: string;
  mapUrl: string;
  images?: SpotImage[]; 
  expense?: Expense;
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
