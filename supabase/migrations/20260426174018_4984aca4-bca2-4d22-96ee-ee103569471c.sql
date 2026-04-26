
-- Recorrências semanais (ex: aluno X toda segunda 8h)
CREATE TABLE IF NOT EXISTS public.recurring_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  student_id uuid NOT NULL,
  instructor_id uuid,
  equipment_id uuid,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=domingo
  start_time time NOT NULL,
  duration_minutes int NOT NULL DEFAULT 50,
  active boolean NOT NULL DEFAULT true,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recurring_clinic ON public.recurring_schedules(clinic_id, active);
CREATE INDEX IF NOT EXISTS idx_recurring_student ON public.recurring_schedules(student_id);

ALTER TABLE public.recurring_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage recurring" ON public.recurring_schedules;
CREATE POLICY "Staff manage recurring" ON public.recurring_schedules
  FOR ALL USING (is_clinic_staff(auth.uid(), clinic_id))
  WITH CHECK (is_clinic_staff(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Student views own recurring" ON public.recurring_schedules;
CREATE POLICY "Student views own recurring" ON public.recurring_schedules
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.clinic_students cs
    WHERE cs.id = recurring_schedules.student_id AND cs.user_id = auth.uid()
  ));

CREATE TRIGGER update_recurring_updated_at
BEFORE UPDATE ON public.recurring_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vincular grade pré-montada ao agendamento
ALTER TABLE public.class_appointments
  ADD COLUMN IF NOT EXISTS sequence_id uuid,
  ADD COLUMN IF NOT EXISTS prescription_id uuid,
  ADD COLUMN IF NOT EXISTS recurring_schedule_id uuid;

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_day
  ON public.class_appointments(clinic_id, scheduled_at);
