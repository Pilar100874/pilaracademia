-- Tabela para exercícios
CREATE TABLE IF NOT EXISTS public.exercise_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  calories_burned numeric NOT NULL DEFAULT 0,
  exercise_type text NOT NULL DEFAULT 'other',
  performed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exercise_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own exercise entries"
ON public.exercise_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exercise entries"
ON public.exercise_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise entries"
ON public.exercise_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise entries"
ON public.exercise_entries FOR DELETE
USING (auth.uid() = user_id);