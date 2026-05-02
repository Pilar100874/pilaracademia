
-- Tabela de exames de sangue
CREATE TABLE public.blood_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_url TEXT,
  file_name TEXT,
  collected_at DATE,
  lab_name TEXT,
  markers JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  alerts JSONB NOT NULL DEFAULT '[]'::jsonb,
  diet_recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blood_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own blood exams" ON public.blood_exams
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own blood exams" ON public.blood_exams
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own blood exams" ON public.blood_exams
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own blood exams" ON public.blood_exams
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_blood_exams_updated_at
BEFORE UPDATE ON public.blood_exams
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_blood_exams_user_collected ON public.blood_exams(user_id, collected_at DESC);

-- Storage bucket privado
INSERT INTO storage.buckets (id, name, public) VALUES ('blood-exams', 'blood-exams', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users view own blood exam files" ON storage.objects
  FOR SELECT USING (bucket_id = 'blood-exams' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own blood exam files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'blood-exams' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own blood exam files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'blood-exams' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own blood exam files" ON storage.objects
  FOR DELETE USING (bucket_id = 'blood-exams' AND auth.uid()::text = (storage.foldername(name))[1]);
