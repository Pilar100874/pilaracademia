-- ============ Agenda de aulas ============
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'checked_in', 'in_progress', 'completed', 'no_show', 'cancelled');

CREATE TABLE public.class_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  student_id UUID NOT NULL,
  instructor_id UUID,
  equipment_id UUID,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 50,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_class_appointments_clinic_date ON public.class_appointments(clinic_id, scheduled_at);
CREATE INDEX idx_class_appointments_student ON public.class_appointments(student_id, scheduled_at);

ALTER TABLE public.class_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage appointments"
  ON public.class_appointments
  FOR ALL
  USING (public.is_clinic_staff(auth.uid(), clinic_id))
  WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));

CREATE POLICY "Students view own appointments"
  ON public.class_appointments
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.clinic_students cs
    WHERE cs.id = class_appointments.student_id AND cs.user_id = auth.uid()
  ));

CREATE TRIGGER update_class_appointments_updated_at
  BEFORE UPDATE ON public.class_appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Notificações ============
CREATE TYPE public.notification_type AS ENUM ('appointment_reminder', 'home_prescription', 'progress', 'general');

CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  clinic_id UUID,
  type notification_type NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read_at);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own notifications"
  ON public.notifications
  FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Staff create notifications in clinic"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    clinic_id IS NULL
    OR public.is_clinic_staff(auth.uid(), clinic_id)
  );

-- ============ Realtime para agenda e notifications ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.class_appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;