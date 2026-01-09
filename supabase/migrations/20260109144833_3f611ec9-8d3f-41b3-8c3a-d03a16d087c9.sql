-- Tabela para histórico de peso
CREATE TABLE IF NOT EXISTS public.weight_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  weight_kg numeric NOT NULL,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weight_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own weight history"
ON public.weight_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weight history"
ON public.weight_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weight history"
ON public.weight_history FOR DELETE
USING (auth.uid() = user_id);