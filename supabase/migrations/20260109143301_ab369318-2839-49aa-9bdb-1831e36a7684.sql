-- Add liquid tracking columns to food_entries
ALTER TABLE public.food_entries ADD COLUMN IF NOT EXISTS is_liquid boolean DEFAULT false;
ALTER TABLE public.food_entries ADD COLUMN IF NOT EXISTS liquid_ml numeric DEFAULT 0;

-- Add daily liquid goal to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_liquid_ml integer DEFAULT 2000;

-- Create a separate table for quick liquid entries (water, etc)
CREATE TABLE IF NOT EXISTS public.liquid_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount_ml numeric NOT NULL DEFAULT 250,
  type text NOT NULL DEFAULT 'water',
  consumed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.liquid_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own liquid entries"
ON public.liquid_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own liquid entries"
ON public.liquid_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own liquid entries"
ON public.liquid_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own liquid entries"
ON public.liquid_entries FOR DELETE
USING (auth.uid() = user_id);