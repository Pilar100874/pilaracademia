-- Tabela de permissões granulares por usuário em uma clínica
CREATE TABLE IF NOT EXISTS public.clinic_user_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL,
  user_id uuid NOT NULL,
  can_create_exercises boolean NOT NULL DEFAULT false,
  can_create_sequences boolean NOT NULL DEFAULT false,
  can_prescribe_workouts boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, user_id)
);

ALTER TABLE public.clinic_user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manages clinic permissions"
ON public.clinic_user_permissions FOR ALL
USING (public.is_clinic_admin(auth.uid(), clinic_id))
WITH CHECK (public.is_clinic_admin(auth.uid(), clinic_id));

CREATE POLICY "Member views own permissions"
ON public.clinic_user_permissions FOR SELECT
USING (user_id = auth.uid() OR public.is_clinic_admin(auth.uid(), clinic_id));

CREATE TRIGGER update_clinic_user_permissions_updated_at
BEFORE UPDATE ON public.clinic_user_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função: o usuário tem a permissão? Admin sempre tem tudo.
-- Instrutor por padrão tem tudo (compatibilidade), exceto se houver registro explícito desabilitando.
-- Recepcionista por padrão NÃO tem nada, exceto se houver registro explícito habilitando.
CREATE OR REPLACE FUNCTION public.has_clinic_permission(_user_id uuid, _clinic_id uuid, _permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
  v_explicit boolean;
BEGIN
  -- Admin tem tudo
  IF public.is_clinic_admin(_user_id, _clinic_id) THEN
    RETURN true;
  END IF;

  -- Pega o papel principal na clínica
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = _user_id AND clinic_id = _clinic_id
  ORDER BY CASE role
    WHEN 'clinic_admin' THEN 1
    WHEN 'instructor' THEN 2
    WHEN 'receptionist' THEN 3
    ELSE 4
  END
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  -- Procura override explícito
  SELECT CASE _permission
    WHEN 'create_exercises' THEN can_create_exercises
    WHEN 'create_sequences' THEN can_create_sequences
    WHEN 'prescribe_workouts' THEN can_prescribe_workouts
    ELSE false
  END
  INTO v_explicit
  FROM public.clinic_user_permissions
  WHERE user_id = _user_id AND clinic_id = _clinic_id;

  IF v_explicit IS NOT NULL THEN
    RETURN v_explicit;
  END IF;

  -- Default por papel: instrutor tem tudo, recepcionista nada
  IF v_role = 'instructor' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Atualizar policies de exercise_library para usar a permissão
DROP POLICY IF EXISTS "Insert clinic exercise as staff" ON public.exercise_library;
DROP POLICY IF EXISTS "Update clinic exercise as staff" ON public.exercise_library;
DROP POLICY IF EXISTS "Delete clinic exercise as staff" ON public.exercise_library;

CREATE POLICY "Insert clinic exercise as staff"
ON public.exercise_library FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND clinic_id IS NOT NULL
  AND is_global = false
  AND public.has_clinic_permission(auth.uid(), clinic_id, 'create_exercises')
);

CREATE POLICY "Update clinic exercise as staff"
ON public.exercise_library FOR UPDATE
USING (clinic_id IS NOT NULL AND public.has_clinic_permission(auth.uid(), clinic_id, 'create_exercises'));

CREATE POLICY "Delete clinic exercise as staff"
ON public.exercise_library FOR DELETE
USING (clinic_id IS NOT NULL AND public.has_clinic_permission(auth.uid(), clinic_id, 'create_exercises'));

-- Atualizar policies de exercise_sequences
DROP POLICY IF EXISTS "Staff manage clinic sequences" ON public.exercise_sequences;
CREATE POLICY "Staff manage clinic sequences"
ON public.exercise_sequences FOR ALL
USING (clinic_id IS NOT NULL AND public.has_clinic_permission(auth.uid(), clinic_id, 'create_sequences'))
WITH CHECK (clinic_id IS NOT NULL AND public.has_clinic_permission(auth.uid(), clinic_id, 'create_sequences') AND is_global = false);

DROP POLICY IF EXISTS "Staff manage clinic sequence items" ON public.exercise_sequence_items;
CREATE POLICY "Staff manage clinic sequence items"
ON public.exercise_sequence_items FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.exercise_sequences s
  WHERE s.id = exercise_sequence_items.sequence_id
    AND s.clinic_id IS NOT NULL
    AND public.has_clinic_permission(auth.uid(), s.clinic_id, 'create_sequences')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.exercise_sequences s
  WHERE s.id = exercise_sequence_items.sequence_id
    AND s.clinic_id IS NOT NULL
    AND public.has_clinic_permission(auth.uid(), s.clinic_id, 'create_sequences')
));

-- Atualizar policies de prescriptions
DROP POLICY IF EXISTS "Staff manage prescriptions" ON public.prescriptions;
CREATE POLICY "Staff manage prescriptions"
ON public.prescriptions FOR ALL
USING (public.has_clinic_permission(auth.uid(), clinic_id, 'prescribe_workouts') OR public.is_clinic_staff(auth.uid(), clinic_id))
WITH CHECK (public.has_clinic_permission(auth.uid(), clinic_id, 'prescribe_workouts'));