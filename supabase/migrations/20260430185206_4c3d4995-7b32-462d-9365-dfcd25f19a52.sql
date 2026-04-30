-- 1) Garante role master_admin para pilar@pilar.com.br
DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'pilar@pilar.com.br' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, clinic_id)
    VALUES (v_uid, 'master_admin'::public.app_role, NULL)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 2) Ajusta RLS de exercise_library para abrir leitura dos globais a TODOS os usuários autenticados
--    (mantendo regras de própria/clinic). Substituímos a policy de SELECT.
DROP POLICY IF EXISTS "View exercises: own, clinic or assigned global" ON public.exercise_library;

CREATE POLICY "View exercises: own, clinic or any global"
ON public.exercise_library
FOR SELECT
USING (
  (auth.uid() = user_id)
  OR ((clinic_id IS NOT NULL) AND public.is_clinic_member(auth.uid(), clinic_id))
  OR (is_global = true)
);

-- 3) Permite ao master_admin (pilar) criar/editar/excluir exercícios globais sem clinic_id
DROP POLICY IF EXISTS "Master inserts global exercise" ON public.exercise_library;
CREATE POLICY "Master inserts global exercise"
ON public.exercise_library
FOR INSERT
WITH CHECK (
  (is_global = true)
  AND public.is_master_admin(auth.uid())
  AND (auth.uid() = user_id)
  AND (clinic_id IS NULL)
);

-- 4) Idem para categorias: leitura pública dos globais
DROP POLICY IF EXISTS "View categories: own, clinic or assigned global" ON public.exercise_categories;
CREATE POLICY "View categories: own, clinic or any global"
ON public.exercise_categories
FOR SELECT
USING (
  (auth.uid() = user_id)
  OR ((clinic_id IS NOT NULL) AND public.is_clinic_member(auth.uid(), clinic_id))
  OR (is_global = true)
);

-- 5) Idem para vínculo exercise_library_categories (junction): leitura quando o exercício for global
DROP POLICY IF EXISTS "View exercise category links" ON public.exercise_library_categories;
CREATE POLICY "View exercise category links"
ON public.exercise_library_categories
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.exercise_library el
    WHERE el.id = exercise_library_categories.exercise_id
      AND (
        (el.user_id = auth.uid())
        OR ((el.clinic_id IS NOT NULL) AND public.is_clinic_member(auth.uid(), el.clinic_id))
        OR (el.is_global = true)
      )
  )
);