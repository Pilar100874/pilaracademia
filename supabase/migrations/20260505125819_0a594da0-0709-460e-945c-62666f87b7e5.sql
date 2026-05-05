-- Tabela para compartilhar treinos (QR / link)
CREATE TABLE public.workout_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workout_plan_id uuid NOT NULL,
  plan_name text NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_workout_shares_token ON public.workout_shares(token);
CREATE INDEX idx_workout_shares_user ON public.workout_shares(user_id);

ALTER TABLE public.workout_shares ENABLE ROW LEVEL SECURITY;

-- Público (anon + authenticated) pode ler snapshot via token enquanto ativo e dentro do prazo
CREATE POLICY "Public read active share by token"
  ON public.workout_shares
  FOR SELECT
  TO anon, authenticated
  USING (active = true AND expires_at > now());

-- Owner pode gerenciar seus shares
CREATE POLICY "Owner inserts own share"
  ON public.workout_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner updates own share"
  ON public.workout_shares
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owner deletes own share"
  ON public.workout_shares
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Função para incrementar visualizações sem expor UPDATE público
CREATE OR REPLACE FUNCTION public.register_workout_share_view(_token uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.workout_shares
  SET view_count = view_count + 1
  WHERE token = _token
    AND active = true
    AND expires_at > now();
END;
$$;