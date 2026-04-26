
-- ============================================================
-- ENUM de papéis
-- ============================================================
CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'clinic_admin',
  'instructor',
  'receptionist',
  'student',
  'station'
);

CREATE TYPE public.prescription_context AS ENUM ('in_class', 'at_home');
CREATE TYPE public.prescription_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped');
CREATE TYPE public.live_session_status AS ENUM ('scheduled', 'in_progress', 'finished', 'cancelled');
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'revoked');

-- ============================================================
-- CLINICS
-- ============================================================
CREATE TABLE public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  owner_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USER ROLES
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, clinic_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_clinic ON public.user_roles(clinic_id);

-- ============================================================
-- SECURITY DEFINER FUNCTIONS (anti-recursão RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_clinic_member(_user_id UUID, _clinic_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND clinic_id = _clinic_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_clinic_staff(_user_id UUID, _clinic_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND clinic_id = _clinic_id
      AND role IN ('clinic_admin', 'instructor', 'receptionist')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_clinic_admin_or_instructor(_user_id UUID, _clinic_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND clinic_id = _clinic_id
      AND role IN ('clinic_admin', 'instructor')
  )
$$;

-- ============================================================
-- RLS clinics
-- ============================================================
CREATE POLICY "Members can view their clinic" ON public.clinics FOR SELECT
  USING (public.is_clinic_member(auth.uid(), id));
CREATE POLICY "Anyone authenticated can create a clinic" ON public.clinics FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "Clinic admins can update clinic" ON public.clinics FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND clinic_id = clinics.id AND role = 'clinic_admin'));
CREATE POLICY "Clinic admins can delete clinic" ON public.clinics FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND clinic_id = clinics.id AND role = 'clinic_admin'));

-- ============================================================
-- RLS user_roles
-- ============================================================
CREATE POLICY "Users see their own roles" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Clinic admins see clinic roles" ON public.user_roles FOR SELECT
  USING (clinic_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.clinic_id = user_roles.clinic_id AND ur.role = 'clinic_admin'));
CREATE POLICY "Clinic admins manage clinic roles" ON public.user_roles FOR INSERT
  WITH CHECK (clinic_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.clinic_id = user_roles.clinic_id AND ur.role = 'clinic_admin'));
CREATE POLICY "Clinic owner can self-assign admin" ON public.user_roles FOR INSERT
  WITH CHECK (user_id = auth.uid() AND role = 'clinic_admin' AND EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = user_roles.clinic_id AND c.owner_user_id = auth.uid()));
CREATE POLICY "Clinic admins can delete roles" ON public.user_roles FOR DELETE
  USING (clinic_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.clinic_id = user_roles.clinic_id AND ur.role = 'clinic_admin'));

-- ============================================================
-- CLINIC INVITES (senha temporária / convite)
-- ============================================================
CREATE TABLE public.clinic_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  temp_password TEXT,
  invite_token UUID NOT NULL DEFAULT gen_random_uuid(),
  status invite_status NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL,
  accepted_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);
ALTER TABLE public.clinic_invites ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_invites_token ON public.clinic_invites(invite_token);
CREATE INDEX idx_invites_email ON public.clinic_invites(email);

CREATE POLICY "Staff manage clinic invites" ON public.clinic_invites FOR ALL
  USING (public.is_clinic_staff(auth.uid(), clinic_id))
  WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));

-- ============================================================
-- CLINIC EQUIPMENT
-- ============================================================
CREATE TABLE public.clinic_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  identifier TEXT,
  station_token UUID NOT NULL DEFAULT gen_random_uuid(),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clinic_equipment ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_equipment_clinic ON public.clinic_equipment(clinic_id);

CREATE POLICY "Members view clinic equipment" ON public.clinic_equipment FOR SELECT
  USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Staff manage clinic equipment" ON public.clinic_equipment FOR ALL
  USING (public.is_clinic_admin_or_instructor(auth.uid(), clinic_id))
  WITH CHECK (public.is_clinic_admin_or_instructor(auth.uid(), clinic_id));

-- ============================================================
-- CLINIC SKILL LEVELS
-- ============================================================
CREATE TABLE public.clinic_skill_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rank INTEGER NOT NULL DEFAULT 1,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, name)
);
ALTER TABLE public.clinic_skill_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view skill levels" ON public.clinic_skill_levels FOR SELECT
  USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Staff manage skill levels" ON public.clinic_skill_levels FOR ALL
  USING (public.is_clinic_admin_or_instructor(auth.uid(), clinic_id))
  WITH CHECK (public.is_clinic_admin_or_instructor(auth.uid(), clinic_id));

-- ============================================================
-- CLINIC STUDENTS (vínculo + nível atual)
-- ============================================================
CREATE TABLE public.clinic_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  skill_level_id UUID REFERENCES public.clinic_skill_levels(id) ON DELETE SET NULL,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, user_id)
);
ALTER TABLE public.clinic_students ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_students_clinic ON public.clinic_students(clinic_id);
CREATE INDEX idx_students_user ON public.clinic_students(user_id);

CREATE POLICY "Staff manage clinic students" ON public.clinic_students FOR ALL
  USING (public.is_clinic_staff(auth.uid(), clinic_id))
  WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));
CREATE POLICY "Student sees own record" ON public.clinic_students FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- EXERCISE SEQUENCES (grades por equipamento + nível)
-- ============================================================
CREATE TABLE public.exercise_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  equipment_id UUID REFERENCES public.clinic_equipment(id) ON DELETE SET NULL,
  equipment_type TEXT,
  skill_level_id UUID REFERENCES public.clinic_skill_levels(id) ON DELETE SET NULL,
  estimated_minutes INTEGER,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exercise_sequences ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_seq_clinic ON public.exercise_sequences(clinic_id);
CREATE INDEX idx_seq_equipment ON public.exercise_sequences(equipment_id);
CREATE INDEX idx_seq_skill ON public.exercise_sequences(skill_level_id);

CREATE POLICY "Members view sequences" ON public.exercise_sequences FOR SELECT
  USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Staff manage sequences" ON public.exercise_sequences FOR ALL
  USING (public.is_clinic_admin_or_instructor(auth.uid(), clinic_id))
  WITH CHECK (public.is_clinic_admin_or_instructor(auth.uid(), clinic_id));

-- ============================================================
-- EXERCISE SEQUENCE ITEMS
-- ============================================================
CREATE TABLE public.exercise_sequence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.exercise_sequences(id) ON DELETE CASCADE,
  exercise_library_id UUID,
  name TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  video_url TEXT,
  video_type TEXT,
  video_start_seconds NUMERIC,
  video_end_seconds NUMERIC,
  sets INTEGER NOT NULL DEFAULT 3,
  reps INTEGER NOT NULL DEFAULT 12,
  duration_seconds INTEGER,
  rest_seconds INTEGER,
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exercise_sequence_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_seq_items_seq ON public.exercise_sequence_items(sequence_id);

CREATE POLICY "Members view sequence items" ON public.exercise_sequence_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.exercise_sequences s WHERE s.id = sequence_id AND public.is_clinic_member(auth.uid(), s.clinic_id)));
CREATE POLICY "Staff manage sequence items" ON public.exercise_sequence_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.exercise_sequences s WHERE s.id = sequence_id AND public.is_clinic_admin_or_instructor(auth.uid(), s.clinic_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.exercise_sequences s WHERE s.id = sequence_id AND public.is_clinic_admin_or_instructor(auth.uid(), s.clinic_id)));

-- ============================================================
-- PRESCRIPTIONS (sequência atribuída a aluno)
-- ============================================================
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.clinic_students(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES public.exercise_sequences(id) ON DELETE CASCADE,
  context prescription_context NOT NULL DEFAULT 'in_class',
  scheduled_for DATE,
  status prescription_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_presc_clinic ON public.prescriptions(clinic_id);
CREATE INDEX idx_presc_student ON public.prescriptions(student_id);
CREATE INDEX idx_presc_status ON public.prescriptions(status);

CREATE POLICY "Staff manage prescriptions" ON public.prescriptions FOR ALL
  USING (public.is_clinic_staff(auth.uid(), clinic_id))
  WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));
CREATE POLICY "Student views own prescriptions" ON public.prescriptions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.clinic_students cs WHERE cs.id = student_id AND cs.user_id = auth.uid()));
CREATE POLICY "Student updates own prescription status" ON public.prescriptions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.clinic_students cs WHERE cs.id = student_id AND cs.user_id = auth.uid()));

-- ============================================================
-- LIVE SESSIONS (aulas em andamento)
-- ============================================================
CREATE TABLE public.live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  status live_session_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_live_clinic ON public.live_sessions(clinic_id);
CREATE INDEX idx_live_status ON public.live_sessions(status);

CREATE POLICY "Members view live sessions" ON public.live_sessions FOR SELECT
  USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Staff manage live sessions" ON public.live_sessions FOR ALL
  USING (public.is_clinic_staff(auth.uid(), clinic_id))
  WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));

-- ============================================================
-- LIVE SESSION STUDENTS (quem está em aula, em qual estação, em qual exercício)
-- ============================================================
CREATE TABLE public.live_session_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_session_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.clinic_students(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  equipment_id UUID REFERENCES public.clinic_equipment(id) ON DELETE SET NULL,
  current_item_id UUID REFERENCES public.exercise_sequence_items(id) ON DELETE SET NULL,
  current_item_index INTEGER NOT NULL DEFAULT 0,
  total_items INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  UNIQUE (live_session_id, student_id)
);
ALTER TABLE public.live_session_students ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_lss_session ON public.live_session_students(live_session_id);
CREATE INDEX idx_lss_equipment ON public.live_session_students(equipment_id);

CREATE POLICY "Members view live session students" ON public.live_session_students FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.live_sessions ls WHERE ls.id = live_session_id AND public.is_clinic_member(auth.uid(), ls.clinic_id)));
CREATE POLICY "Staff manage live session students" ON public.live_session_students FOR ALL
  USING (EXISTS (SELECT 1 FROM public.live_sessions ls WHERE ls.id = live_session_id AND public.is_clinic_staff(auth.uid(), ls.clinic_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.live_sessions ls WHERE ls.id = live_session_id AND public.is_clinic_staff(auth.uid(), ls.clinic_id)));
CREATE POLICY "Student updates own progress" ON public.live_session_students FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.clinic_students cs WHERE cs.id = student_id AND cs.user_id = auth.uid()));

-- ============================================================
-- EXECUTION LOG (histórico de execução por aluno)
-- ============================================================
CREATE TABLE public.execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.clinic_students(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  sequence_id UUID REFERENCES public.exercise_sequences(id) ON DELETE SET NULL,
  sequence_item_id UUID REFERENCES public.exercise_sequence_items(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  context prescription_context NOT NULL DEFAULT 'in_class',
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.execution_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_exec_clinic ON public.execution_log(clinic_id);
CREATE INDEX idx_exec_student ON public.execution_log(student_id);
CREATE INDEX idx_exec_performed ON public.execution_log(performed_at DESC);

CREATE POLICY "Staff view execution log" ON public.execution_log FOR SELECT
  USING (public.is_clinic_staff(auth.uid(), clinic_id));
CREATE POLICY "Staff insert execution log" ON public.execution_log FOR INSERT
  WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));
CREATE POLICY "Student views own log" ON public.execution_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.clinic_students cs WHERE cs.id = student_id AND cs.user_id = auth.uid()));
CREATE POLICY "Student inserts own log" ON public.execution_log FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.clinic_students cs WHERE cs.id = student_id AND cs.user_id = auth.uid()));

-- ============================================================
-- TRIGGERS de updated_at
-- ============================================================
CREATE TRIGGER set_clinics_updated BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_students_updated BEFORE UPDATE ON public.clinic_students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_seq_updated BEFORE UPDATE ON public.exercise_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- REALTIME para aulas ao vivo
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_students;
ALTER TABLE public.live_session_students REPLICA IDENTITY FULL;
ALTER TABLE public.live_sessions REPLICA IDENTITY FULL;
