-- Create table for food kits
CREATE TABLE public.food_kits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for kit items (products in the kit)
CREATE TABLE public.food_kit_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kit_id UUID NOT NULL REFERENCES public.food_kits(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.custom_products(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'g',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.food_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_kit_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for food_kits
CREATE POLICY "Users can view their own kits" 
ON public.food_kits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own kits" 
ON public.food_kits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own kits" 
ON public.food_kits 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own kits" 
ON public.food_kits 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for food_kit_items (through kit ownership)
CREATE POLICY "Users can view items of their own kits" 
ON public.food_kit_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.food_kits 
  WHERE food_kits.id = food_kit_items.kit_id 
  AND food_kits.user_id = auth.uid()
));

CREATE POLICY "Users can add items to their own kits" 
ON public.food_kit_items 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.food_kits 
  WHERE food_kits.id = food_kit_items.kit_id 
  AND food_kits.user_id = auth.uid()
));

CREATE POLICY "Users can update items of their own kits" 
ON public.food_kit_items 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.food_kits 
  WHERE food_kits.id = food_kit_items.kit_id 
  AND food_kits.user_id = auth.uid()
));

CREATE POLICY "Users can delete items from their own kits" 
ON public.food_kit_items 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.food_kits 
  WHERE food_kits.id = food_kit_items.kit_id 
  AND food_kits.user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_food_kits_updated_at
BEFORE UPDATE ON public.food_kits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();