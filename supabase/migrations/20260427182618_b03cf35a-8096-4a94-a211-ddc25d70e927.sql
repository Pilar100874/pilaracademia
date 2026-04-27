-- Tabela de bloqueios padrão recorrentes (ex: almoço seg-sex 12-13h)
CREATE TABLE public.clinic_blocked_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  name text NOT NULL,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  room_id uuid NULL,
  color text NULL,
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX idx_blocked_periods_clinic_dow ON public.clinic_blocked_periods (clinic_id, day_of_week, active);

ALTER TABLE public.clinic_blocked_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view blocked periods"
ON public.clinic_blocked_periods FOR SELECT
USING (is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Staff manage blocked periods"
ON public.clinic_blocked_periods FOR ALL
USING (is_clinic_staff(auth.uid(), clinic_id))
WITH CHECK (is_clinic_staff(auth.uid(), clinic_id));

CREATE TRIGGER trg_blocked_periods_updated
BEFORE UPDATE ON public.clinic_blocked_periods
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de exceções (liberações pontuais por dia)
CREATE TABLE public.clinic_blocked_period_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocked_period_id uuid NOT NULL REFERENCES public.clinic_blocked_periods(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL,
  exception_date date NOT NULL,
  reason text NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocked_period_id, exception_date)
);

CREATE INDEX idx_blocked_exceptions_clinic_date ON public.clinic_blocked_period_exceptions (clinic_id, exception_date);

ALTER TABLE public.clinic_blocked_period_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view blocked exceptions"
ON public.clinic_blocked_period_exceptions FOR SELECT
USING (is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Staff manage blocked exceptions"
ON public.clinic_blocked_period_exceptions FOR ALL
USING (is_clinic_staff(auth.uid(), clinic_id))
WITH CHECK (is_clinic_staff(auth.uid(), clinic_id));