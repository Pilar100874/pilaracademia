-- =========================================
-- Weekly check-ins
-- =========================================
CREATE TABLE public.weekly_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  highlights JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  adherence_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_start)
);

ALTER TABLE public.weekly_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own weekly checkins"
ON public.weekly_checkins FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own weekly checkins"
ON public.weekly_checkins FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own weekly checkins"
ON public.weekly_checkins FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own weekly checkins"
ON public.weekly_checkins FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER weekly_checkins_updated_at
  BEFORE UPDATE ON public.weekly_checkins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- Progress photos
-- =========================================
CREATE TABLE public.progress_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  angle TEXT NOT NULL CHECK (angle IN ('front', 'side', 'back')),
  image_url TEXT NOT NULL,
  weight_kg NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own progress photos"
ON public.progress_photos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own progress photos"
ON public.progress_photos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own progress photos"
ON public.progress_photos FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own progress photos"
ON public.progress_photos FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_progress_photos_user_taken ON public.progress_photos(user_id, taken_at DESC);

-- =========================================
-- Storage bucket: progress-photos (private)
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own progress photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'progress-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users upload own progress photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'progress-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users update own progress photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'progress-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users delete own progress photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'progress-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);