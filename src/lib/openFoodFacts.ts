import { BarcodeProduct, NutritionData } from '@/types/nutrition';

const API_BASE = 'https://world.openfoodfacts.org/api/v2';

interface OpenFoodFactsProduct {
  code: string;
  product_name?: string;
  brands?: string;
  image_url?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'proteins_100g'?: number;
    'carbohydrates_100g'?: number;
    'fat_100g'?: number;
    'fiber_100g'?: number;
    'sugars_100g'?: number;
  };
  serving_size?: string;
}

interface ApiResponse {
  status: number;
  product?: OpenFoodFactsProduct;
}

export async function fetchProductByBarcode(barcode: string): Promise<BarcodeProduct | null> {
  try {
    const response = await fetch(`${API_BASE}/product/${barcode}.json`);
    const data: ApiResponse = await response.json();

    if (data.status !== 1 || !data.product) {
      return null;
    }

    const product = data.product;
    const nutriments = product.nutriments || {};

    const nutrition: NutritionData = {
      calories: Math.round(nutriments['energy-kcal_100g'] || 0),
      protein: Math.round((nutriments['proteins_100g'] || 0) * 10) / 10,
      carbs: Math.round((nutriments['carbohydrates_100g'] || 0) * 10) / 10,
      fat: Math.round((nutriments['fat_100g'] || 0) * 10) / 10,
      fiber: nutriments['fiber_100g'],
      sugar: nutriments['sugars_100g'],
    };

    return {
      code: barcode,
      name: product.product_name || 'Produto desconhecido',
      brand: product.brands,
      imageUrl: product.image_url,
      nutrition,
      servingSize: product.serving_size || '100g',
    };
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

export function calculateNutritionForPortion(
  nutritionPer100g: NutritionData,
  portionGrams: number
): NutritionData {
  const multiplier = portionGrams / 100;
  return {
    calories: Math.round(nutritionPer100g.calories * multiplier),
    protein: Math.round(nutritionPer100g.protein * multiplier * 10) / 10,
    carbs: Math.round(nutritionPer100g.carbs * multiplier * 10) / 10,
    fat: Math.round(nutritionPer100g.fat * multiplier * 10) / 10,
    fiber: nutritionPer100g.fiber ? Math.round(nutritionPer100g.fiber * multiplier * 10) / 10 : undefined,
    sugar: nutritionPer100g.sugar ? Math.round(nutritionPer100g.sugar * multiplier * 10) / 10 : undefined,
  };
}
