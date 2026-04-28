-- Bulk sends history
CREATE TABLE public.marketing_bulk_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  message TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  recipient_filter JSONB,
  status TEXT NOT NULL DEFAULT 'sent',
  webhook_url TEXT,
  scheduled_for TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_bulk_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage marketing bulk sends"
  ON public.marketing_bulk_sends FOR ALL
  USING (public.is_clinic_staff(auth.uid(), clinic_id))
  WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));

CREATE INDEX idx_marketing_bulk_sends_clinic ON public.marketing_bulk_sends(clinic_id, created_at DESC);

-- Media library
CREATE TABLE public.marketing_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL DEFAULT 'image',
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  folder TEXT,
  size_bytes BIGINT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage marketing media"
  ON public.marketing_media FOR ALL
  USING (public.is_clinic_staff(auth.uid(), clinic_id))
  WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));

CREATE INDEX idx_marketing_media_clinic ON public.marketing_media(clinic_id, created_at DESC);

-- Automations
CREATE TABLE public.marketing_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_config JSONB DEFAULT '{}'::jsonb,
  action_type TEXT NOT NULL DEFAULT 'webhook',
  action_config JSONB DEFAULT '{}'::jsonb,
  webhook_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  run_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage marketing automations"
  ON public.marketing_automations FOR ALL
  USING (public.is_clinic_staff(auth.uid(), clinic_id))
  WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));

CREATE TRIGGER update_marketing_automations_updated_at
  BEFORE UPDATE ON public.marketing_automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-media', 'marketing-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read marketing media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketing-media');

CREATE POLICY "Authenticated upload marketing media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'marketing-media' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated update marketing media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'marketing-media' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete marketing media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'marketing-media' AND auth.role() = 'authenticated');