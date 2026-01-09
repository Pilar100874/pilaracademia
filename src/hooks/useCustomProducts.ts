import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
    
    // Update local state
    setProducts((prev) => {
      const existing = prev.findIndex((p) => p.barcode === product.barcode);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = data as CustomProduct;
        return updated;
      }
      return [...prev, data as CustomProduct];
    });

    return data as CustomProduct;
  };

  const updateProduct = async (id: string, updates: Partial<CustomProduct>): Promise<CustomProduct> => {
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase
      .from('custom_products')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    
    setProducts((prev) => prev.map((p) => (p.id === id ? (data as CustomProduct) : p)));
    return data as CustomProduct;
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
    refetch: fetchProducts,
  };
}
