
CREATE TABLE public.body_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  image_url text,
  measured_at timestamptz,
  extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text,
  score integer,
  profile_label text,
  goal text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.body_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own body analyses"
  ON public.body_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own body analyses"
  ON public.body_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own body analyses"
  ON public.body_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own body analyses"
  ON public.body_analyses FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_body_analyses_user_created ON public.body_analyses(user_id, created_at DESC);

CREATE TRIGGER update_body_analyses_updated_at
  BEFORE UPDATE ON public.body_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket público para imagens de relatórios de bioimpedância
INSERT INTO storage.buckets (id, name, public)
VALUES ('body-analysis-reports', 'body-analysis-reports', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Body reports are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'body-analysis-reports');

CREATE POLICY "Users upload own body reports"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'body-analysis-reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own body reports"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'body-analysis-reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own body reports"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'body-analysis-reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
