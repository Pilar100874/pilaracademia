-- Add nutrition override fields driven by body analysis
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_calories_override integer,
  ADD COLUMN IF NOT EXISTS daily_protein_override integer,
  ADD COLUMN IF NOT EXISTS daily_carbs_override integer,
  ADD COLUMN IF NOT EXISTS daily_fat_override integer,
  ADD COLUMN IF NOT EXISTS daily_fiber_override integer,
  ADD COLUMN IF NOT EXISTS daily_liquid_ml_override integer,
  ADD COLUMN IF NOT EXISTS nutrition_override_source text,
  ADD COLUMN IF NOT EXISTS nutrition_override_set_at timestamptz;