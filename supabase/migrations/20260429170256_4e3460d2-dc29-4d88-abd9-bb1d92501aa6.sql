ALTER TABLE public.exercise_library
ADD COLUMN IF NOT EXISTS video_optimized_at TIMESTAMP WITH TIME ZONE;

UPDATE public.exercise_library
SET video_optimized_at = COALESCE(video_optimized_at, updated_at, now())
WHERE video_type = 'upload'
  AND video_url IS NOT NULL
  AND lower(split_part(video_url, '?', 1)) LIKE '%.webm';

CREATE INDEX IF NOT EXISTS idx_exercise_library_video_optimized
ON public.exercise_library (user_id, video_type, video_optimized_at);