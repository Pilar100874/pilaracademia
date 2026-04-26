-- 1) Configurações por clínica
CREATE TABLE IF NOT EXISTS public.clinic_settings (
  clinic_id uuid PRIMARY KEY REFERENCES public.clinics(id) ON DELETE CASCADE,
  cancellation_min_hours integer NOT NULL DEFAULT 6,
  booking_open_days_ahead integer NOT NULL DEFAULT 30,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view clinic settings" ON public.clinic_settings
  FOR SELECT USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Admins manage clinic settings" ON public.clinic_settings
  FOR ALL USING (public.has_role(auth.uid(), 'clinic_admin'::app_role) AND public.is_clinic_member(auth.uid(), clinic_id))
  WITH CHECK (public.has_role(auth.uid(), 'clinic_admin'::app_role) AND public.is_clinic_member(auth.uid(), clinic_id));

-- 2) Slots reserváveis (grades vazias)
CREATE TABLE IF NOT EXISTS public.bookable_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 50,
  equipment_id uuid,
  instructor_id uuid,
  capacity integer NOT NULL DEFAULT 1,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bookable_slots_clinic_time ON public.bookable_slots(clinic_id, scheduled_at);
ALTER TABLE public.bookable_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view bookable slots" ON public.bookable_slots
  FOR SELECT USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Staff manage bookable slots" ON public.bookable_slots
  FOR ALL USING (public.is_clinic_staff(auth.uid(), clinic_id))
  WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));

-- 3) Reservas feitas pelos alunos a partir de slots
ALTER TABLE public.class_appointments
  ADD COLUMN IF NOT EXISTS bookable_slot_id uuid,
  ADD COLUMN IF NOT EXISTS booked_by_student boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid;

-- Permitir alunos criarem appointment a partir de um slot (auto-reserva)
CREATE POLICY "Students self-book slot" ON public.class_appointments
  FOR INSERT WITH CHECK (
    booked_by_student = true
    AND bookable_slot_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.clinic_students cs
      WHERE cs.id = class_appointments.student_id AND cs.user_id = auth.uid()
    )
  );

-- Permitir alunos cancelarem a própria reserva (atualizar para 'cancelled')
CREATE POLICY "Students cancel own appointment" ON public.class_appointments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.clinic_students cs
      WHERE cs.id = class_appointments.student_id AND cs.user_id = auth.uid()
    )
  );

-- 4) Contrato do aluno
ALTER TABLE public.clinic_students
  ADD COLUMN IF NOT EXISTS contract_type text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS contract_classes_total integer,
  ADD COLUMN IF NOT EXISTS contract_classes_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS contract_end_date date;

-- 5) Trigger: valida e ajusta contrato e cancelamento mínimo
CREATE OR REPLACE FUNCTION public.handle_appointment_contract()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_student RECORD;
  v_min_hours integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO v_student FROM public.clinic_students WHERE id = NEW.student_id;
    IF v_student.contract_type = 'period' THEN
      IF v_student.contract_end_date IS NOT NULL AND NEW.scheduled_at::date > v_student.contract_end_date THEN
        RAISE EXCEPTION 'Aula fora do período do contrato (termina em %)', v_student.contract_end_date;
      END IF;
      IF v_student.contract_start_date IS NOT NULL AND NEW.scheduled_at::date < v_student.contract_start_date THEN
        RAISE EXCEPTION 'Aula antes do início do contrato (% )', v_student.contract_start_date;
      END IF;
    ELSIF v_student.contract_type = 'classes' THEN
      IF v_student.contract_classes_total IS NOT NULL
         AND v_student.contract_classes_used >= v_student.contract_classes_total THEN
        RAISE EXCEPTION 'Pacote de aulas esgotado (%/%).',
          v_student.contract_classes_used, v_student.contract_classes_total;
      END IF;
      UPDATE public.clinic_students
        SET contract_classes_used = contract_classes_used + 1
        WHERE id = NEW.student_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Cancelamento por aluno: respeita janela mínima
    IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
      IF NEW.cancelled_by IS NOT NULL AND NEW.cancelled_by <> OLD.created_by THEN
        SELECT COALESCE(cs.cancellation_min_hours, 6) INTO v_min_hours
          FROM public.clinic_settings cs WHERE cs.clinic_id = NEW.clinic_id;
        v_min_hours := COALESCE(v_min_hours, 6);
        IF NEW.scheduled_at - now() < (v_min_hours || ' hours')::interval THEN
          RAISE EXCEPTION 'Cancelamento permitido apenas com mais de % horas de antecedência.', v_min_hours;
        END IF;
      END IF;
      -- devolve crédito do contrato
      SELECT * INTO v_student FROM public.clinic_students WHERE id = NEW.student_id;
      IF v_student.contract_type = 'classes' AND v_student.contract_classes_used > 0 THEN
        UPDATE public.clinic_students
          SET contract_classes_used = GREATEST(contract_classes_used - 1, 0)
          WHERE id = NEW.student_id;
      END IF;
      NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    SELECT * INTO v_student FROM public.clinic_students WHERE id = OLD.student_id;
    IF v_student.contract_type = 'classes' AND OLD.status <> 'cancelled' AND v_student.contract_classes_used > 0 THEN
      UPDATE public.clinic_students
        SET contract_classes_used = GREATEST(contract_classes_used - 1, 0)
        WHERE id = OLD.student_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointment_contract_ins ON public.class_appointments;
CREATE TRIGGER appointment_contract_ins
  BEFORE INSERT ON public.class_appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_appointment_contract();

DROP TRIGGER IF EXISTS appointment_contract_upd ON public.class_appointments;
CREATE TRIGGER appointment_contract_upd
  BEFORE UPDATE ON public.class_appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_appointment_contract();

DROP TRIGGER IF EXISTS appointment_contract_del ON public.class_appointments;
CREATE TRIGGER appointment_contract_del
  BEFORE DELETE ON public.class_appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_appointment_contract();
