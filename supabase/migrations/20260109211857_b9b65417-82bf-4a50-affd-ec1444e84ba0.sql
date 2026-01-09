-- Add product_id to food_entries to track which product was used for the entry
-- This allows reprocessing of nutrition values when products are updated
ALTER TABLE public.food_entries 
ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.custom_products(id) ON DELETE SET NULL;

-- Create an index for faster lookups when reprocessing
CREATE INDEX IF NOT EXISTS idx_food_entries_product_id ON public.food_entries(product_id);