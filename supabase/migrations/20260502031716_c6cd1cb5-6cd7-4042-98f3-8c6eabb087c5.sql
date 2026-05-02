-- ============= FOOD PREFERENCES =============
CREATE TABLE IF NOT EXISTS public.food_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  restrictions TEXT[] NOT NULL DEFAULT '{}',
  disliked_foods TEXT[] NOT NULL DEFAULT '{}',
  favorite_foods TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.food_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own food preferences"
  ON public.food_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own food preferences"
  ON public.food_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own food preferences"
  ON public.food_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own food preferences"
  ON public.food_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_food_prefs_updated_at
  BEFORE UPDATE ON public.food_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============= SHARE SUMMARIES =============
CREATE TABLE IF NOT EXISTS public.share_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  period_days INTEGER NOT NULL DEFAULT 30,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_summaries_token ON public.share_summaries(token);
CREATE INDEX IF NOT EXISTS idx_share_summaries_user ON public.share_summaries(user_id);

ALTER TABLE public.share_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own share summaries"
  ON public.share_summaries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own share summaries"
  ON public.share_summaries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own share summaries"
  ON public.share_summaries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own share summaries"
  ON public.share_summaries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Validação de expiração via trigger (CHECK não pode usar now())
CREATE OR REPLACE FUNCTION public.validate_share_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at <= now() AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Data de expiração deve ser futura';
  END IF;
  IF NEW.period_days < 1 OR NEW.period_days > 365 THEN
    RAISE EXCEPTION 'Período deve estar entre 1 e 365 dias';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_share_summary
  BEFORE INSERT OR UPDATE ON public.share_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_share_summary();