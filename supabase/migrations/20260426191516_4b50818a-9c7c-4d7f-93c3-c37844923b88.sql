-- Tabela de vínculo professor (instructor) <-> aluno (N:N)
CREATE TABLE IF NOT EXISTS public.student_instructors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  student_id uuid NOT NULL,
  instructor_user_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, instructor_user_id)
);

CREATE INDEX IF NOT EXISTS idx_student_instructors_clinic ON public.student_instructors(clinic_id);
CREATE INDEX IF NOT EXISTS idx_student_instructors_instructor ON public.student_instructors(instructor_user_id);
CREATE INDEX IF NOT EXISTS idx_student_instructors_student ON public.student_instructors(student_id);

ALTER TABLE public.student_instructors ENABLE ROW LEVEL SECURITY;

-- Staff da clínica gerencia vínculos
CREATE POLICY "Staff manage student_instructors"
ON public.student_instructors
FOR ALL TO authenticated
USING (public.is_clinic_staff(auth.uid(), clinic_id))
WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));

-- Professor vê seus próprios vínculos
CREATE POLICY "Instructor sees own links"
ON public.student_instructors
FOR SELECT TO authenticated
USING (instructor_user_id = auth.uid());

-- Função helper para checar se usuário é professor fixo de um aluno
CREATE OR REPLACE FUNCTION public.is_fixed_instructor_of_student(_user_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_instructors
    WHERE instructor_user_id = _user_id AND student_id = _student_id
  )
$$;