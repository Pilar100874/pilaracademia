-- Create table for custom/adjusted barcode products
CREATE TABLE public.custom_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  barcode TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  image_url TEXT,
  calories NUMERIC NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  fat NUMERIC NOT NULL DEFAULT 0,
  saturated_fat NUMERIC DEFAULT 0,
  trans_fat NUMERIC DEFAULT 0,
  fiber NUMERIC DEFAULT 0,
  sodium NUMERIC DEFAULT 0,
  reference_quantity NUMERIC NOT NULL DEFAULT 100,
  reference_unit TEXT NOT NULL DEFAULT 'g',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, barcode)
);

-- Enable Row Level Security
ALTER TABLE public.custom_products ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own custom products" 
ON public.custom_products 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom products" 
ON public.custom_products 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom products" 
ON public.custom_products 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom products" 
ON public.custom_products 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_custom_products_updated_at
BEFORE UPDATE ON public.custom_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();