export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  birth_date: string | null;
  gender: 'male' | 'female' | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null;
  goal: 'lose' | 'maintain' | 'gain' | null;
  daily_calories: number | null;
  daily_protein: number | null;
  daily_carbs: number | null;
  daily_fat: number | null;
  daily_saturated_fat: number | null;
  daily_trans_fat: number | null;
  daily_fiber: number | null;
  daily_sodium: number | null;
  daily_liquid_ml: number | null;
  created_at: string;
  updated_at: string;
}

export interface OriginalFoodItem {
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodEntryDB {
  id: string;
  user_id: string;
  name: string;
  image_url: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  saturated_fat: number;
  trans_fat: number;
  fiber: number;
  sodium: number;
  quantity: number;
  unit: string;
  source: 'photo' | 'barcode' | 'manual' | 'voice';
  consumed_at: string;
  is_liquid: boolean;
  liquid_ml: number;
  product_id: string | null;
  original_items: OriginalFoodItem[] | null;
  created_at: string;
  updated_at: string;
}

// Activity level multipliers for TDEE calculation
export const activityMultipliers = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const activityLabels = {
  sedentary: 'Sedentário (pouco ou nenhum exercício)',
  light: 'Leve (exercício 1-3 dias/semana)',
  moderate: 'Moderado (exercício 3-5 dias/semana)',
  active: 'Ativo (exercício 6-7 dias/semana)',
  very_active: 'Muito ativo (exercício intenso diário)',
};

export const goalLabels = {
  lose: 'Perder peso (-500 kcal/dia)',
  maintain: 'Manter peso',
  gain: 'Ganhar peso (+500 kcal/dia)',
};

// Calculate BMR using Mifflin-St Jeor equation
export function calculateBMR(
  gender: 'male' | 'female',
  weightKg: number,
  heightCm: number,
  ageYears: number
): number {
  if (gender === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
  } else {
    return 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
  }
}

// Calculate TDEE (Total Daily Energy Expenditure)
export function calculateTDEE(
  bmr: number,
  activityLevel: keyof typeof activityMultipliers
): number {
  return Math.round(bmr * activityMultipliers[activityLevel]);
}

// Calculate daily calories based on goal
export function calculateDailyCalories(
  tdee: number,
  goal: 'lose' | 'maintain' | 'gain'
): number {
  switch (goal) {
    case 'lose':
      return Math.round(tdee - 500);
    case 'gain':
      return Math.round(tdee + 500);
    default:
      return tdee;
  }
}

// Calculate all macros and nutrients based on calories and goal
// Based on ANVISA/OMS recommendations
export function calculateAllNutrients(calories: number, goal: 'lose' | 'maintain' | 'gain') {
  let proteinPercent: number;
  let carbPercent: number;
  let fatPercent: number;

  switch (goal) {
    case 'lose':
      proteinPercent = 0.30;
      fatPercent = 0.30;
      carbPercent = 0.40;
      break;
    case 'gain':
      proteinPercent = 0.25;
      fatPercent = 0.25;
      carbPercent = 0.50;
      break;
    default:
      proteinPercent = 0.25;
      fatPercent = 0.30;
      carbPercent = 0.45;
  }

  // Daily recommendations based on ANVISA/OMS for 2000kcal diet, scaled proportionally
  const calorieRatio = calories / 2000;

  return {
    protein: Math.round((calories * proteinPercent) / 4),
    carbs: Math.round((calories * carbPercent) / 4),
    fat: Math.round((calories * fatPercent) / 9),
    // Saturated fat: max 10% of total calories (ANVISA)
    saturatedFat: Math.round((calories * 0.10) / 9),
    // Trans fat: max 1% of total calories (OMS recommends 0, ANVISA allows up to 2g)
    transFat: Math.round(Math.min(2, (calories * 0.01) / 9)),
    // Fiber: 25g for 2000kcal, scaled proportionally (ANVISA)
    fiber: Math.round(25 * calorieRatio),
    // Sodium: max 2000mg/day (OMS recommendation)
    sodium: 2000,
  };
}

// Calculate age from birth date
export function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Nutrient labels and units for display
export const nutrientInfo = {
  calories: { label: 'Calorias', unit: 'kcal', color: 'primary' },
  protein: { label: 'Proteína', unit: 'g', color: 'accent' },
  carbs: { label: 'Carboidratos', unit: 'g', color: 'blue' },
  fat: { label: 'Gordura Total', unit: 'g', color: 'pink' },
  saturatedFat: { label: 'Gordura Saturada', unit: 'g', color: 'orange' },
  transFat: { label: 'Gordura Trans', unit: 'g', color: 'red' },
  fiber: { label: 'Fibra', unit: 'g', color: 'green' },
  sodium: { label: 'Sódio', unit: 'mg', color: 'purple' },
};
