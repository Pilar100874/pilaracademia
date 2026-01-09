import { supabase } from '@/integrations/supabase/client';
import { NutritionData } from '@/types/nutrition';

export interface FoodAnalysisResult {
  name: string;
  nutrition: NutritionData;
  confidence: 'alta' | 'média' | 'baixa';
  items: string[];
}

export async function analyzeFood(imageBase64: string): Promise<FoodAnalysisResult> {
  const { data, error } = await supabase.functions.invoke('analyze-food', {
    body: { imageBase64 },
  });

  if (error) {
    console.error('Error calling analyze-food:', error);
    throw new Error(error.message || 'Erro ao analisar imagem');
  }

  if (!data.success) {
    throw new Error(data.error || 'Erro ao analisar imagem');
  }

  const result = data.data;

  return {
    name: result.name || 'Prato não identificado',
    nutrition: {
      calories: Math.round(result.calories) || 0,
      protein: Math.round(result.protein * 10) / 10 || 0,
      carbs: Math.round(result.carbs * 10) / 10 || 0,
      fat: Math.round(result.fat * 10) / 10 || 0,
      saturatedFat: Math.round((result.saturatedFat || 0) * 10) / 10,
      transFat: Math.round((result.transFat || 0) * 10) / 10,
      fiber: Math.round((result.fiber || 0) * 10) / 10,
      sodium: Math.round(result.sodium || 0),
    },
    confidence: result.confidence || 'baixa',
    items: result.items || [],
  };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
