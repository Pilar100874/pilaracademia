
-- 1. Adiciona colunas
ALTER TABLE public.exercise_categories
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false;

ALTER TABLE public.exercise_library
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_exercise_categories_clinic ON public.exercise_categories(clinic_id);
CREATE INDEX IF NOT EXISTS idx_exercise_categories_global ON public.exercise_categories(is_global) WHERE is_global = true;
CREATE INDEX IF NOT EXISTS idx_exercise_library_clinic ON public.exercise_library(clinic_id);
CREATE INDEX IF NOT EXISTS idx_exercise_library_global ON public.exercise_library(is_global) WHERE is_global = true;

-- 2. Políticas RLS - exercise_categories
DROP POLICY IF EXISTS "Users can view their own exercise categories" ON public.exercise_categories;
DROP POLICY IF EXISTS "Users can create their own exercise categories" ON public.exercise_categories;
DROP POLICY IF EXISTS "Users can update their own exercise categories" ON public.exercise_categories;
DROP POLICY IF EXISTS "Users can delete their own exercise categories" ON public.exercise_categories;

CREATE POLICY "View categories: own, clinic or global"
  ON public.exercise_categories FOR SELECT
  USING (
    is_global = true
    OR auth.uid() = user_id
    OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id))
  );

CREATE POLICY "Insert own personal category"
  ON public.exercise_categories FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND is_global = false
    AND clinic_id IS NULL
  );

CREATE POLICY "Insert clinic category as staff"
  ON public.exercise_categories FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND clinic_id IS NOT NULL
    AND is_global = false
    AND public.is_clinic_admin_or_instructor(auth.uid(), clinic_id)
  );

CREATE POLICY "Master inserts global category"
  ON public.exercise_categories FOR INSERT
  WITH CHECK (
    is_global = true
    AND public.has_role(auth.uid(), 'master_admin'::public.app_role)
    AND auth.uid() = user_id
  );

CREATE POLICY "Update own personal category"
  ON public.exercise_categories FOR UPDATE
  USING (auth.uid() = user_id AND is_global = false AND clinic_id IS NULL);

CREATE POLICY "Update clinic category as staff"
  ON public.exercise_categories FOR UPDATE
  USING (clinic_id IS NOT NULL AND public.is_clinic_admin_or_instructor(auth.uid(), clinic_id));

CREATE POLICY "Master updates global category"
  ON public.exercise_categories FOR UPDATE
  USING (is_global = true AND public.has_role(auth.uid(), 'master_admin'::public.app_role));

CREATE POLICY "Delete own personal category"
  ON public.exercise_categories FOR DELETE
  USING (auth.uid() = user_id AND is_global = false AND clinic_id IS NULL);

CREATE POLICY "Delete clinic category as staff"
  ON public.exercise_categories FOR DELETE
  USING (clinic_id IS NOT NULL AND public.is_clinic_admin_or_instructor(auth.uid(), clinic_id));

CREATE POLICY "Master deletes global category"
  ON public.exercise_categories FOR DELETE
  USING (is_global = true AND public.has_role(auth.uid(), 'master_admin'::public.app_role));

-- 3. Políticas RLS - exercise_library
DROP POLICY IF EXISTS "Users can view their own exercises" ON public.exercise_library;
DROP POLICY IF EXISTS "Users can create their own exercises" ON public.exercise_library;
DROP POLICY IF EXISTS "Users can update their own exercises" ON public.exercise_library;
DROP POLICY IF EXISTS "Users can delete their own exercises" ON public.exercise_library;

CREATE POLICY "View exercises: own, clinic or global"
  ON public.exercise_library FOR SELECT
  USING (
    is_global = true
    OR auth.uid() = user_id
    OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id))
  );

CREATE POLICY "Insert own personal exercise"
  ON public.exercise_library FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND is_global = false
    AND clinic_id IS NULL
  );

CREATE POLICY "Insert clinic exercise as staff"
  ON public.exercise_library FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND clinic_id IS NOT NULL
    AND is_global = false
    AND public.is_clinic_admin_or_instructor(auth.uid(), clinic_id)
  );

CREATE POLICY "Master inserts global exercise"
  ON public.exercise_library FOR INSERT
  WITH CHECK (
    is_global = true
    AND public.has_role(auth.uid(), 'master_admin'::public.app_role)
    AND auth.uid() = user_id
  );

CREATE POLICY "Update own personal exercise"
  ON public.exercise_library FOR UPDATE
  USING (auth.uid() = user_id AND is_global = false AND clinic_id IS NULL);

CREATE POLICY "Update clinic exercise as staff"
  ON public.exercise_library FOR UPDATE
  USING (clinic_id IS NOT NULL AND public.is_clinic_admin_or_instructor(auth.uid(), clinic_id));

CREATE POLICY "Master updates global exercise"
  ON public.exercise_library FOR UPDATE
  USING (is_global = true AND public.has_role(auth.uid(), 'master_admin'::public.app_role));

CREATE POLICY "Delete own personal exercise"
  ON public.exercise_library FOR DELETE
  USING (auth.uid() = user_id AND is_global = false AND clinic_id IS NULL);

CREATE POLICY "Delete clinic exercise as staff"
  ON public.exercise_library FOR DELETE
  USING (clinic_id IS NOT NULL AND public.is_clinic_admin_or_instructor(auth.uid(), clinic_id));

CREATE POLICY "Master deletes global exercise"
  ON public.exercise_library FOR DELETE
  USING (is_global = true AND public.has_role(auth.uid(), 'master_admin'::public.app_role));
