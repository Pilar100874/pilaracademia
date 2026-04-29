ALTER TABLE public.exercise_library
  ADD COLUMN IF NOT EXISTS body_analysis jsonb,
  ADD COLUMN IF NOT EXISTS aesthetic_analysis jsonb,
  ADD COLUMN IF NOT EXISTS body_analyzed_at timestamptz;