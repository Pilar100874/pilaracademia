-- AI API Keys
CREATE TABLE public.marketing_ai_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  provider TEXT NOT NULL,
  provider_display_name TEXT NOT NULL,
  api_key TEXT,
  api_secret TEXT,
  organization_id TEXT,
  project_id TEXT,
  base_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  validation_status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, provider)
);

ALTER TABLE public.marketing_ai_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage marketing ai keys"
  ON public.marketing_ai_api_keys
  FOR ALL
  USING (public.is_clinic_staff(auth.uid(), clinic_id))
  WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));

CREATE TRIGGER trg_marketing_ai_api_keys_updated
  BEFORE UPDATE ON public.marketing_ai_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Integration Credentials
CREATE TABLE public.marketing_integration_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  integration_type TEXT NOT NULL,
  integration_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  credentials_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  validation_status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, integration_name)
);

ALTER TABLE public.marketing_integration_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage marketing integration creds"
  ON public.marketing_integration_credentials
  FOR ALL
  USING (public.is_clinic_staff(auth.uid(), clinic_id))
  WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));

CREATE TRIGGER trg_marketing_integration_creds_updated
  BEFORE UPDATE ON public.marketing_integration_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Campaigns
CREATE TABLE public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  channel TEXT,
  start_date DATE,
  end_date DATE,
  budget NUMERIC,
  goal TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage marketing campaigns"
  ON public.marketing_campaigns
  FOR ALL
  USING (public.is_clinic_staff(auth.uid(), clinic_id))
  WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));

CREATE TRIGGER trg_marketing_campaigns_updated
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();