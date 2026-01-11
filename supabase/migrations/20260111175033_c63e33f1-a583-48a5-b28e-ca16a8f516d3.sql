-- Adicionar coluna para armazenar itens originais digitados
ALTER TABLE public.food_entries 
ADD COLUMN IF NOT EXISTS original_items jsonb DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.food_entries.original_items IS 'Armazena os itens originais digitados pelo usuário antes da análise (formato: [{name, quantity, calories, protein, carbs, fat}])';