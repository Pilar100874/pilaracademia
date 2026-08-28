ALTER TABLE public.exercise_categories
  ADD COLUMN IF NOT EXISTS is_gif boolean NOT NULL DEFAULT false;