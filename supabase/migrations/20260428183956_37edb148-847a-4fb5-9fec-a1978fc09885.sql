-- AI Creations
CREATE TABLE public.marketing_ai_creations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  creation_type TEXT NOT NULL DEFAULT 'text',
  prompt TEXT NOT NULL,
  result_text TEXT,
  result_url TEXT,
  model TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.marketing_ai_creations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage marketing ai creations"
  ON public.marketing_ai_creations FOR ALL
  USING (public.is_clinic_staff(auth.uid(), clinic_id))
  WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));
CREATE INDEX idx_marketing_ai_creations_clinic ON public.marketing_ai_creations(clinic_id, created_at DESC);

-- Landing pages
CREATE TABLE public.marketing_landing_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  theme JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  view_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, slug)
);
ALTER TABLE public.marketing_landing_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage marketing landing pages"
  ON public.marketing_landing_pages FOR ALL
  USING (public.is_clinic_staff(auth.uid(), clinic_id))
  WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));
CREATE POLICY "Public read published landing pages"
  ON public.marketing_landing_pages FOR SELECT
  USING (status = 'published');
CREATE TRIGGER update_marketing_landing_pages_updated_at
  BEFORE UPDATE ON public.marketing_landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Strategies
CREATE TABLE public.marketing_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  name TEXT NOT NULL,
  goal TEXT,
  target_audience TEXT,
  plan JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.marketing_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage marketing strategies"
  ON public.marketing_strategies FOR ALL
  USING (public.is_clinic_staff(auth.uid(), clinic_id))
  WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));
CREATE TRIGGER update_marketing_strategies_updated_at
  BEFORE UPDATE ON public.marketing_strategies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Catalogs
CREATE TABLE public.marketing_catalogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  cover_url TEXT,
  pdf_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.marketing_catalogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage marketing catalogs"
  ON public.marketing_catalogs FOR ALL
  USING (public.is_clinic_staff(auth.uid(), clinic_id))
  WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));
CREATE TRIGGER update_marketing_catalogs_updated_at
  BEFORE UPDATE ON public.marketing_catalogs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();