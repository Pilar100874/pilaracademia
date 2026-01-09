import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { CustomProduct } from '@/hooks/useCustomProducts';

export interface FoodKit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodKitItem {
  id: string;
  kit_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  created_at: string;
  product?: CustomProduct;
}

export interface FoodKitWithItems extends FoodKit {
  items: FoodKitItem[];
}

export function useFoodKits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: kits = [], isLoading, refetch } = useQuery({
    queryKey: ['food-kits', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('food_kits')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as FoodKit[];
    },
    enabled: !!user?.id,
  });

  const getKitWithItems = async (kitId: string): Promise<FoodKitWithItems | null> => {
    const { data: kit, error: kitError } = await supabase
      .from('food_kits')
      .select('*')
      .eq('id', kitId)
      .single();

    if (kitError) throw kitError;

    const { data: items, error: itemsError } = await supabase
      .from('food_kit_items')
      .select('*')
      .eq('kit_id', kitId);

    if (itemsError) throw itemsError;

    // Fetch products for each item
    const productIds = items.map(item => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from('custom_products')
      .select('*')
      .in('id', productIds);

    if (productsError) throw productsError;

    const itemsWithProducts = items.map(item => ({
      ...item,
      product: products.find(p => p.id === item.product_id),
    }));

    return {
      ...kit,
      items: itemsWithProducts,
    } as FoodKitWithItems;
  };

  const createKit = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data: kit, error } = await supabase
        .from('food_kits')
        .insert({
          user_id: user.id,
          name: data.name,
          description: data.description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return kit as FoodKit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-kits'] });
      toast.success('Kit criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar kit');
    },
  });

  const updateKit = useMutation({
    mutationFn: async (data: { id: string; name: string; description?: string }) => {
      const { data: kit, error } = await supabase
        .from('food_kits')
        .update({
          name: data.name,
          description: data.description || null,
        })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return kit as FoodKit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-kits'] });
      toast.success('Kit atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar kit');
    },
  });

  const deleteKit = useMutation({
    mutationFn: async (kitId: string) => {
      const { error } = await supabase
        .from('food_kits')
        .delete()
        .eq('id', kitId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-kits'] });
      toast.success('Kit excluído!');
    },
    onError: () => {
      toast.error('Erro ao excluir kit');
    },
  });

  const addItemToKit = useMutation({
    mutationFn: async (data: { kitId: string; productId: string; quantity: number; unit: string }) => {
      const { data: item, error } = await supabase
        .from('food_kit_items')
        .insert({
          kit_id: data.kitId,
          product_id: data.productId,
          quantity: data.quantity,
          unit: data.unit,
        })
        .select()
        .single();

      if (error) throw error;
      return item as FoodKitItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-kits'] });
    },
  });

  const updateKitItem = useMutation({
    mutationFn: async (data: { itemId: string; quantity: number; unit: string }) => {
      const { data: item, error } = await supabase
        .from('food_kit_items')
        .update({
          quantity: data.quantity,
          unit: data.unit,
        })
        .eq('id', data.itemId)
        .select()
        .single();

      if (error) throw error;
      return item as FoodKitItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-kits'] });
    },
  });

  const removeItemFromKit = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('food_kit_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-kits'] });
    },
  });

  const launchKit = async (kitId: string) => {
    if (!user?.id) throw new Error('Not authenticated');

    const kitWithItems = await getKitWithItems(kitId);
    if (!kitWithItems || kitWithItems.items.length === 0) {
      toast.error('Kit vazio ou não encontrado');
      return;
    }

    const foodEntries = kitWithItems.items.map(item => {
      const product = item.product;
      if (!product) return null;

      const refQty = product.reference_quantity || 100;
      const multiplier = item.quantity / refQty;

      return {
        user_id: user.id,
        name: product.name,
        calories: Math.round(product.calories * multiplier),
        protein: Math.round(product.protein * multiplier * 10) / 10,
        carbs: Math.round(product.carbs * multiplier * 10) / 10,
        fat: Math.round(product.fat * multiplier * 10) / 10,
        saturated_fat: Math.round((product.saturated_fat || 0) * multiplier * 10) / 10,
        trans_fat: Math.round((product.trans_fat || 0) * multiplier * 10) / 10,
        fiber: Math.round((product.fiber || 0) * multiplier * 10) / 10,
        sodium: Math.round((product.sodium || 0) * multiplier),
        quantity: item.quantity,
        unit: item.unit,
        source: 'kit',
        image_url: product.image_url,
        is_liquid: product.is_liquid,
        liquid_ml: product.is_liquid ? item.quantity : 0,
      };
    }).filter(Boolean);

    const { error } = await supabase
      .from('food_entries')
      .insert(foodEntries);

    if (error) throw error;

    toast.success(`Kit "${kitWithItems.name}" lançado!`, {
      description: `${foodEntries.length} itens adicionados`,
    });

    return kitWithItems;
  };

  return {
    kits,
    isLoading,
    refetch,
    getKitWithItems,
    createKit,
    updateKit,
    deleteKit,
    addItemToKit,
    updateKitItem,
    removeItemFromKit,
    launchKit,
  };
}
