ALTER TABLE public.exercise_library
ADD COLUMN IF NOT EXISTS video_hash text;

CREATE INDEX IF NOT EXISTS idx_exercise_library_video_hash
  ON public.exercise_library (video_hash)
  WHERE video_hash IS NOT NULL;