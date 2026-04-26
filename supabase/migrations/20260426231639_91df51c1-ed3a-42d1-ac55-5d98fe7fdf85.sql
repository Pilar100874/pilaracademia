-- ============ Subscription Plans (master gerencia) ============
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  max_students INTEGER,                   -- NULL = ilimitado
  price_monthly_cents INTEGER NOT NULL DEFAULT 0,
  price_yearly_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  paddle_price_id_monthly TEXT,           -- ID do price no provedor (test ou live conforme modo)
  paddle_price_id_yearly TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated views active plans"
ON public.subscription_plans FOR SELECT TO authenticated
USING (active = true OR has_role(auth.uid(), 'master_admin'::app_role));

CREATE POLICY "Master manages plans"
ON public.subscription_plans FOR ALL TO authenticated
USING (has_role(auth.uid(), 'master_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'master_admin'::app_role));

CREATE TRIGGER trg_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Clinic Subscriptions ============
CREATE TYPE public.subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'cancelled', 'expired'
);

CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'yearly');

CREATE TABLE public.clinic_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL UNIQUE,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  cycle public.billing_cycle,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  paddle_customer_id TEXT,
  paddle_subscription_id TEXT,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  last_payment_at TIMESTAMPTZ,
  last_event_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clinic_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own clinic subscription"
ON public.clinic_subscriptions FOR SELECT TO authenticated
USING (is_clinic_member(auth.uid(), clinic_id) OR has_role(auth.uid(), 'master_admin'::app_role));

CREATE POLICY "Master manages subscriptions"
ON public.clinic_subscriptions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'master_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'master_admin'::app_role));

CREATE TRIGGER trg_subs_updated_at
BEFORE UPDATE ON public.clinic_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Master Settings (modo teste/produção) ============
CREATE TABLE public.master_settings (
  id INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
  payments_mode TEXT NOT NULL DEFAULT 'test',  -- 'test' | 'live'
  trial_days INTEGER NOT NULL DEFAULT 7,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1),
  CONSTRAINT valid_mode CHECK (payments_mode IN ('test','live'))
);

INSERT INTO public.master_settings (id, payments_mode, trial_days) VALUES (1, 'test', 7);

ALTER TABLE public.master_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated reads master settings"
ON public.master_settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Master updates settings"
ON public.master_settings FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'master_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'master_admin'::app_role));

-- ============ Demo flag em clinics ============
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

-- ============ Trigger: criar trial de N dias ao criar clínica ============
CREATE OR REPLACE FUNCTION public.start_clinic_trial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days INTEGER;
BEGIN
  SELECT trial_days INTO v_days FROM public.master_settings WHERE id = 1;
  v_days := COALESCE(v_days, 7);

  INSERT INTO public.clinic_subscriptions (clinic_id, status, trial_ends_at)
  VALUES (
    NEW.id,
    CASE WHEN NEW.is_demo THEN 'active'::subscription_status ELSE 'trialing'::subscription_status END,
    CASE WHEN NEW.is_demo THEN NULL ELSE now() + (v_days || ' days')::interval END
  )
  ON CONFLICT (clinic_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_start_clinic_trial
AFTER INSERT ON public.clinics
FOR EACH ROW EXECUTE FUNCTION public.start_clinic_trial();

-- ============ Garante assinatura para clínicas existentes ============
INSERT INTO public.clinic_subscriptions (clinic_id, status, trial_ends_at)
SELECT c.id, 'trialing'::subscription_status, now() + interval '7 days'
FROM public.clinics c
WHERE NOT EXISTS (SELECT 1 FROM public.clinic_subscriptions s WHERE s.clinic_id = c.id);

-- ============ Helper: clinic_has_access ============
CREATE OR REPLACE FUNCTION public.clinic_has_access(_clinic_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT
       (s.status = 'active')
       OR (s.status = 'trialing' AND s.trial_ends_at > now())
       OR (c.is_demo = true)
     FROM public.clinics c
     LEFT JOIN public.clinic_subscriptions s ON s.clinic_id = c.id
     WHERE c.id = _clinic_id),
    false
  );
$$;