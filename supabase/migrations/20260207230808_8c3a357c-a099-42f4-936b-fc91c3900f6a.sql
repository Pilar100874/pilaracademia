-- Create glycemia_entries table for blood sugar tracking
CREATE TABLE public.glycemia_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  glucose_mg_dl INTEGER NOT NULL,
  measurement_type TEXT NOT NULL DEFAULT 'fasting', -- fasting, before_meal, after_meal, random
  measured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.glycemia_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own glycemia entries" 
ON public.glycemia_entries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own glycemia entries" 
ON public.glycemia_entries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own glycemia entries" 
ON public.glycemia_entries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own glycemia entries" 
ON public.glycemia_entries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add index for better query performance
CREATE INDEX idx_glycemia_entries_user_date ON public.glycemia_entries(user_id, measured_at DESC);