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
  created_at: string;
  updated_at: string;
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
  quantity: number;
  unit: string;
  source: 'photo' | 'barcode' | 'manual';
  consumed_at: string;
  created_at: string;
  updated_at: string;
}

// Activity level multipliers for TDEE calculation
export const activityMultipliers = {
  sedentary: 1.2,      // Pouco ou nenhum exercício
  light: 1.375,        // Exercício leve 1-3 dias/semana
  moderate: 1.55,      // Exercício moderado 3-5 dias/semana
  active: 1.725,       // Exercício intenso 6-7 dias/semana
  very_active: 1.9,    // Exercício muito intenso, trabalho físico
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

// Calculate macros based on calories
export function calculateMacros(calories: number, goal: 'lose' | 'maintain' | 'gain') {
  // Protein: 2g per kg for weight loss/gain, 1.6g for maintain (approximated by calories)
  // Carbs: 40-50% of calories
  // Fat: remaining calories

  let proteinPercent: number;
  let carbPercent: number;
  let fatPercent: number;

  switch (goal) {
    case 'lose':
      proteinPercent = 0.30; // 30% protein
      fatPercent = 0.30;     // 30% fat
      carbPercent = 0.40;    // 40% carbs
      break;
    case 'gain':
      proteinPercent = 0.25; // 25% protein
      fatPercent = 0.25;     // 25% fat
      carbPercent = 0.50;    // 50% carbs
      break;
    default:
      proteinPercent = 0.25; // 25% protein
      fatPercent = 0.30;     // 30% fat
      carbPercent = 0.45;    // 45% carbs
  }

  return {
    protein: Math.round((calories * proteinPercent) / 4), // 4 cal per gram
    carbs: Math.round((calories * carbPercent) / 4),      // 4 cal per gram
    fat: Math.round((calories * fatPercent) / 9),         // 9 cal per gram
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
