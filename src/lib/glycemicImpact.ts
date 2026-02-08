// Glycemic impact estimation based on carbohydrates
// This is an educational estimate, not medical advice

export interface GlycemicImpactResult {
  level: 'low' | 'moderate' | 'high' | 'very_high';
  label: string;
  color: string;
  bgColor: string;
  estimatedSpike: string;
  carbsNet: number;
}

/**
 * Calculate glycemic impact based on net carbs (carbs - fiber)
 * Reference values:
 * - Low: < 15g net carbs
 * - Moderate: 15-30g net carbs
 * - High: 30-50g net carbs
 * - Very High: > 50g net carbs
 */
export function calculateGlycemicImpact(
  carbs: number,
  fiber: number = 0
): GlycemicImpactResult {
  const carbsNet = Math.max(0, carbs - fiber);
  
  if (carbsNet < 15) {
    return {
      level: 'low',
      label: 'Baixo',
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
      estimatedSpike: '~10-20 mg/dL',
      carbsNet,
    };
  }
  
  if (carbsNet < 30) {
    return {
      level: 'moderate',
      label: 'Moderado',
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
      estimatedSpike: '~20-40 mg/dL',
      carbsNet,
    };
  }
  
  if (carbsNet < 50) {
    return {
      level: 'high',
      label: 'Alto',
      color: 'text-orange-600',
      bgColor: 'bg-orange-500/10',
      estimatedSpike: '~40-60 mg/dL',
      carbsNet,
    };
  }
  
  return {
    level: 'very_high',
    label: 'Muito Alto',
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    estimatedSpike: '~60+ mg/dL',
    carbsNet,
  };
}

/**
 * Get warning message for high carb meals
 */
export function getHighCarbWarning(carbs: number, fiber: number = 0): string | null {
  const impact = calculateGlycemicImpact(carbs, fiber);
  
  if (impact.level === 'very_high') {
    return `⚠️ Refeição com ${impact.carbsNet}g de carboidratos líquidos - impacto glicêmico muito alto`;
  }
  
  if (impact.level === 'high') {
    return `⚠️ Atenção: ${impact.carbsNet}g de carboidratos líquidos`;
  }
  
  return null;
}

/**
 * Should show glycemic warning badge
 */
export function shouldShowGlycemicWarning(carbs: number, fiber: number = 0): boolean {
  const impact = calculateGlycemicImpact(carbs, fiber);
  return impact.level === 'high' || impact.level === 'very_high';
}
