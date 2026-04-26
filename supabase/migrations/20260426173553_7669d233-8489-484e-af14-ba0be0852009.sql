
-- 1. Garantir triggers em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_link_student ON auth.users;
CREATE TRIGGER on_auth_user_created_link_student
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.link_student_to_clinic();

-- 2. Anamnese e foto do aluno
ALTER TABLE public.clinic_students
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS weight_kg numeric,
  ADD COLUMN IF NOT EXISTS height_cm numeric,
  ADD COLUMN IF NOT EXISTS injuries text,
  ADD COLUMN IF NOT EXISTS restrictions text,
  ADD COLUMN IF NOT EXISTS medical_conditions text,
  ADD COLUMN IF NOT EXISTS medications text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS goals text;

-- 3. Flag de senha temporária
ALTER TABLE public.clinic_invites
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT true;

-- Tabela para marcar quem precisa trocar a senha no primeiro login
CREATE TABLE IF NOT EXISTS public.user_security_flags (
  user_id uuid PRIMARY KEY,
  must_change_password boolean NOT NULL DEFAULT false,
  password_changed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_security_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own security flag" ON public.user_security_flags;
CREATE POLICY "Users see own security flag" ON public.user_security_flags
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own security flag" ON public.user_security_flags;
CREATE POLICY "Users update own security flag" ON public.user_security_flags
  FOR UPDATE USING (user_id = auth.uid());

-- 4. Storage bucket para avatares de alunos
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-avatars', 'student-avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read student avatars" ON storage.objects;
CREATE POLICY "Public read student avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'student-avatars');

DROP POLICY IF EXISTS "Auth upload student avatars" ON storage.objects;
CREATE POLICY "Auth upload student avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'student-avatars');

DROP POLICY IF EXISTS "Auth update student avatars" ON storage.objects;
CREATE POLICY "Auth update student avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'student-avatars');

DROP POLICY IF EXISTS "Auth delete student avatars" ON storage.objects;
CREATE POLICY "Auth delete student avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'student-avatars');

-- 5. Trigger: ao registrar execução de exercício na aula, criar exercise_entry para o app de calorias
CREATE OR REPLACE FUNCTION public.sync_pilates_to_calories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_calories numeric;
BEGIN
  -- Busca o user_id do aluno (se ele tiver login)
  SELECT user_id INTO v_user_id
  FROM public.clinic_students
  WHERE id = NEW.student_id;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Pilates queima ~5 kcal/min (estimativa). Assume 5 min por exercício como padrão.
  v_calories := 25;

  INSERT INTO public.exercise_entries (
    user_id, name, duration_minutes, calories_burned, exercise_type, performed_at
  ) VALUES (
    v_user_id,
    'Pilates: ' || NEW.exercise_name,
    5,
    v_calories,
    'pilates',
    NEW.performed_at
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS execution_log_to_calories ON public.execution_log;
CREATE TRIGGER execution_log_to_calories
AFTER INSERT ON public.execution_log
FOR EACH ROW EXECUTE FUNCTION public.sync_pilates_to_calories();
