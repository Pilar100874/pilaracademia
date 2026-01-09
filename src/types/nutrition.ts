export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
}

export interface FoodEntry {
  id: string;
  name: string;
  imageUrl?: string;
  nutrition: NutritionData;
  quantity: number;
  unit: string;
  timestamp: Date;
  source: 'photo' | 'barcode' | 'manual';
}

export interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailySummary {
  date: string;
  consumed: NutritionData;
  goals: DailyGoals;
  entries: FoodEntry[];
}

export interface BarcodeProduct {
  code: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  nutrition: NutritionData;
  servingSize: string;
}
