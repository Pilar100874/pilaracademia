import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface CustomProduct {
  id: string;
  user_id: string;
  barcode: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  saturated_fat: number | null;
  trans_fat: number | null;
  fiber: number | null;
  sodium: number | null;
  reference_quantity: number;
  reference_unit: string;
  is_liquid: boolean;
  is_natural: boolean;
  package_total_weight: number | null;
  package_total_units: number | null;
  package_volume_ml: number | null;
  created_at: string;
  updated_at: string;
}

export function useCustomProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<CustomProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    if (!user) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('custom_products')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (!error && data) {
      setProducts(data as CustomProduct[]);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const getProductByBarcode = async (barcode: string): Promise<CustomProduct | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('custom_products')
      .select('*')
      .eq('user_id', user.id)
      .eq('barcode', barcode)
      .maybeSingle();

    if (error || !data) return null;
    return data as CustomProduct;
  };

  const saveProduct = async (product: Omit<CustomProduct, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<CustomProduct> => {
    if (!user) throw new Error('Usuário não autenticado');

    console.log('Salvando produto:', product);
    
    // Check if this is an update (product already exists)
    const existingProduct = products.find(p => p.barcode === product.barcode);
    
    // Upsert - insert or update if exists
    const { data, error } = await supabase
      .from('custom_products')
      .upsert({
        user_id: user.id,
        barcode: product.barcode,
        name: product.name,
        brand: product.brand,
        image_url: product.image_url,
        calories: product.calories,
        protein: product.protein,
        carbs: product.carbs,
        fat: product.fat,
        saturated_fat: product.saturated_fat,
        trans_fat: product.trans_fat,
        fiber: product.fiber,
        sodium: product.sodium,
        reference_quantity: product.reference_quantity,
        reference_unit: product.reference_unit,
        is_liquid: product.is_liquid || false,
        is_natural: product.is_natural || false,
        package_total_weight: product.package_total_weight,
        package_total_units: product.package_total_units,
        package_volume_ml: product.package_volume_ml,
      }, {
        onConflict: 'user_id,barcode'
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar no Supabase:', error);
      throw error;
    }
    
    console.log('Produto salvo:', data);
    
    const savedProduct = data as CustomProduct;
    
    // If this was an update, reprocess all food entries
    if (existingProduct) {
      const reprocessedCount = await reprocessEntriesForProduct(savedProduct);
      if (reprocessedCount > 0) {
        toast.success(`${reprocessedCount} consumo(s) atualizado(s)`, {
          description: `Os registros de "${savedProduct.name}" foram recalculados`,
        });
      }
    }
    
    // Update local state
    setProducts((prev) => {
      const existing = prev.findIndex((p) => p.barcode === product.barcode);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = savedProduct;
        return updated;
      }
      return [...prev, savedProduct];
    });

    return savedProduct;
  };

  const updateProduct = async (id: string, updates: Partial<CustomProduct>): Promise<CustomProduct> => {
    if (!user) throw new Error('Usuário não autenticado');

    // Get the existing product to check for nutrition changes
    const existingProduct = products.find(p => p.id === id);
    
    const { data, error } = await supabase
      .from('custom_products')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    const updatedProduct = data as CustomProduct;
    
    // Only reprocess if nutrition values actually changed
    const nutritionChanged = existingProduct && (
      existingProduct.calories !== updatedProduct.calories ||
      existingProduct.protein !== updatedProduct.protein ||
      existingProduct.carbs !== updatedProduct.carbs ||
      existingProduct.fat !== updatedProduct.fat ||
      existingProduct.fiber !== updatedProduct.fiber ||
      existingProduct.sodium !== updatedProduct.sodium ||
      existingProduct.saturated_fat !== updatedProduct.saturated_fat ||
      existingProduct.trans_fat !== updatedProduct.trans_fat ||
      existingProduct.reference_quantity !== updatedProduct.reference_quantity
    );
    
    if (nutritionChanged) {
      const reprocessedCount = await reprocessEntriesForProduct(updatedProduct);
      
      if (reprocessedCount > 0) {
        toast.success(`${reprocessedCount} consumo(s) atualizado(s)`, {
          description: `Os registros de "${updatedProduct.name}" foram recalculados`,
        });
      }
    }
    
    setProducts((prev) => prev.map((p) => (p.id === id ? updatedProduct : p)));
    return updatedProduct;
  };
  
  // Reprocess food entries when a product is updated
  const reprocessEntriesForProduct = async (product: CustomProduct): Promise<number> => {
    if (!user) return 0;

    // Get all food entries that used this product
    const { data: entries, error: fetchError } = await supabase
      .from('food_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('product_id', product.id);

    if (fetchError || !entries || entries.length === 0) {
      console.log('No entries to reprocess for product:', product.id);
      return 0;
    }

    console.log(`Reprocessing ${entries.length} entries for product:`, product.name);

    // Calculate new nutrition values for each entry based on the updated product
    const refQty = product.reference_quantity || 100;
    
    for (const entry of entries) {
      const consumedQty = entry.quantity || refQty;
      const factor = consumedQty / refQty;
      
      const newNutrition = {
        calories: Math.round(product.calories * factor),
        protein: Number((product.protein * factor).toFixed(1)),
        carbs: Number((product.carbs * factor).toFixed(1)),
        fat: Number((product.fat * factor).toFixed(1)),
        saturated_fat: Number(((product.saturated_fat || 0) * factor).toFixed(1)),
        trans_fat: Number(((product.trans_fat || 0) * factor).toFixed(1)),
        fiber: Number(((product.fiber || 0) * factor).toFixed(1)),
        sodium: Number(((product.sodium || 0) * factor).toFixed(1)),
        name: product.name,
        image_url: product.image_url,
      };

      const { error: updateError } = await supabase
        .from('food_entries')
        .update(newNutrition)
        .eq('id', entry.id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating entry:', entry.id, updateError);
      }
    }

    return entries.length;
  };

  const deleteProduct = async (id: string): Promise<void> => {
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('custom_products')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return {
    products,
    isLoading,
    getProductByBarcode,
    saveProduct,
    updateProduct,
    deleteProduct,
    reprocessEntriesForProduct,
    refetch: fetchProducts,
  };
}
