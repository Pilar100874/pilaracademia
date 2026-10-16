CREATE TABLE public.health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  metric_type text NOT NULL,
  value numeric NOT NULL,
  value2 numeric,
  unit text,
  recorded_at timestamptz NOT NULL,
  source text NOT NULL DEFAULT 'samsung_health',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, metric_type, recorded_at)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_metrics TO authenticated;
GRANT ALL ON public.health_metrics TO service_role;
ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own metrics select" ON public.health_metrics FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_manager_of(auth.uid(), user_id));
CREATE POLICY "own metrics insert" ON public.health_metrics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own metrics update" ON public.health_metrics FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own metrics delete" ON public.health_metrics FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX health_metrics_user_type_time ON public.health_metrics (user_id, metric_type, recorded_at DESC);