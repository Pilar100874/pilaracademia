ALTER TABLE public.master_settings ADD COLUMN IF NOT EXISTS ai_markup_percent numeric NOT NULL DEFAULT 80;

CREATE TABLE public.ai_credit_balances (
  user_id uuid NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox',
  balance_cents bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, environment)
);
GRANT SELECT ON public.ai_credit_balances TO authenticated;
GRANT ALL ON public.ai_credit_balances TO service_role;
ALTER TABLE public.ai_credit_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own balance" ON public.ai_credit_balances FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_master_admin(auth.uid()));

CREATE TABLE public.ai_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox',
  kind text NOT NULL,
  feature text,
  amount_cents bigint NOT NULL,
  cost_cents numeric NOT NULL DEFAULT 0,
  margin_cents numeric NOT NULL DEFAULT 0,
  stripe_session_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.ai_credit_ledger(user_id, created_at DESC);
GRANT SELECT ON public.ai_credit_ledger TO authenticated;
GRANT ALL ON public.ai_credit_ledger TO service_role;
ALTER TABLE public.ai_credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ledger" ON public.ai_credit_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_master_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.add_ai_credits(_user uuid, _env text, _amount bigint, _session text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO ai_credit_ledger(user_id, environment, kind, amount_cents, stripe_session_id)
  VALUES (_user, _env, 'purchase', _amount, _session) ON CONFLICT (stripe_session_id) DO NOTHING;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO ai_credit_balances(user_id, environment, balance_cents) VALUES (_user, _env, _amount)
  ON CONFLICT (user_id, environment) DO UPDATE SET balance_cents = ai_credit_balances.balance_cents + _amount, updated_at = now();
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.consume_ai_credits(_user uuid, _env text, _feature text, _cost numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _markup numeric; _price bigint; _bal bigint;
BEGIN
  SELECT COALESCE(ai_markup_percent, 80) INTO _markup FROM master_settings WHERE id = 1;
  _markup := COALESCE(_markup, 80);
  _price := CEIL(_cost * (1 + _markup / 100.0));
  UPDATE ai_credit_balances SET balance_cents = balance_cents - _price, updated_at = now()
   WHERE user_id = _user AND environment = _env AND balance_cents >= _price
   RETURNING balance_cents INTO _bal;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'price', _price); END IF;
  INSERT INTO ai_credit_ledger(user_id, environment, kind, feature, amount_cents, cost_cents, margin_cents)
  VALUES (_user, _env, 'usage', _feature, -_price, _cost, _price - _cost);
  RETURN jsonb_build_object('ok', true, 'price', _price, 'balance', _bal);
END $$;

REVOKE ALL ON FUNCTION public.add_ai_credits(uuid,text,bigint,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_ai_credits(uuid,text,text,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_ai_credits(uuid,text,bigint,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_ai_credits(uuid,text,text,numeric) TO service_role;