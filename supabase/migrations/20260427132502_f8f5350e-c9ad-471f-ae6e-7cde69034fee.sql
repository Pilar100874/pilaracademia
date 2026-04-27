-- Etapa 1: estrutura para regras fixas com padrão por semana do mês

-- 1) Adiciona room_id em recurring_schedules (sala da reserva fixa)
ALTER TABLE public.recurring_schedules
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.clinic_rooms(id) ON DELETE SET NULL;

-- 2) Adiciona nome/título opcional para identificar a "regra" (ex.: "Pacote Maria 3x")
ALTER TABLE public.recurring_schedules
  ADD COLUMN IF NOT EXISTS title text;

-- 3) Tabela de ocorrências por semana do mês.
--    Cada linha = um dia da semana + hora dentro de uma "semana do mês" (1..5; 5 = última).
--    Se uma regra não usa padrão por semana do mês, basta NÃO inserir nenhuma linha aqui
--    e o sistema cai no comportamento legado (day_of_week/start_time da própria recurring_schedules).
CREATE TABLE IF NOT EXISTS public.recurring_schedule_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_schedule_id uuid NOT NULL REFERENCES public.recurring_schedules(id) ON DELETE CASCADE,
  week_of_month smallint NOT NULL CHECK (week_of_month BETWEEN 1 AND 5), -- 5 = última
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 50,
  room_id uuid REFERENCES public.clinic_rooms(id) ON DELETE SET NULL,
  equipment_id uuid REFERENCES public.clinic_equipment(id) ON DELETE SET NULL,
  instructor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recurring_schedule_id, week_of_month, day_of_week, start_time)
);

CREATE INDEX IF NOT EXISTS idx_rec_weeks_recurring ON public.recurring_schedule_weeks(recurring_schedule_id);

ALTER TABLE public.recurring_schedule_weeks ENABLE ROW LEVEL SECURITY;

-- RLS: equipe da clínica gerencia (via recurring pai); aluno vê os próprios.
CREATE POLICY "Staff manage recurring weeks"
ON public.recurring_schedule_weeks
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.recurring_schedules r
  WHERE r.id = recurring_schedule_weeks.recurring_schedule_id
    AND public.is_clinic_staff(auth.uid(), r.clinic_id)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.recurring_schedules r
  WHERE r.id = recurring_schedule_weeks.recurring_schedule_id
    AND public.is_clinic_staff(auth.uid(), r.clinic_id)
));

CREATE POLICY "Student views own recurring weeks"
ON public.recurring_schedule_weeks
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.recurring_schedules r
  JOIN public.clinic_students cs ON cs.id = r.student_id
  WHERE r.id = recurring_schedule_weeks.recurring_schedule_id
    AND cs.user_id = auth.uid()
));

-- 4) Linka cada appointment materializado de volta na "semana do mês" usada (auditoria/desfazer)
ALTER TABLE public.class_appointments
  ADD COLUMN IF NOT EXISTS recurring_week_id uuid REFERENCES public.recurring_schedule_weeks(id) ON DELETE SET NULL;