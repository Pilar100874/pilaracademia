ALTER TABLE public.exercise_library
  ADD COLUMN IF NOT EXISTS video_type text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_start_seconds numeric,
  ADD COLUMN IF NOT EXISTS video_end_seconds numeric;

ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS video_type text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_start_seconds numeric,
  ADD COLUMN IF NOT EXISTS video_end_seconds numeric;

INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-videos', 'exercise-videos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Exercise videos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'exercise-videos');

CREATE POLICY "Users can upload their own exercise videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exercise-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own exercise videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'exercise-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own exercise videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'exercise-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);