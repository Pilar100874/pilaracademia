ALTER TABLE public.exercise_library
  ADD COLUMN IF NOT EXISTS is_gif boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS exercise_library_is_gif_idx
  ON public.exercise_library (is_gif) WHERE is_gif;