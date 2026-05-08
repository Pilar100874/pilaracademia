
-- Equipamentos extras (bola, alteres, elastico, madeira, etc) por usuario / clinica / global
CREATE TABLE public.exercise_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  clinic_id uuid,
  is_global boolean NOT NULL DEFAULT false,
  name text NOT NULL,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercise_extras_user ON public.exercise_extras(user_id);
CREATE INDEX idx_exercise_extras_clinic ON public.exercise_extras(clinic_id);
CREATE UNIQUE INDEX idx_exercise_extras_unique_personal ON public.exercise_extras(user_id, lower(name)) WHERE clinic_id IS NULL AND is_global = false;
CREATE UNIQUE INDEX idx_exercise_extras_unique_global ON public.exercise_extras(lower(name)) WHERE is_global = true;

ALTER TABLE public.exercise_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View extras: own, clinic or any global"
  ON public.exercise_extras FOR SELECT
  USING (
    auth.uid() = user_id
    OR (clinic_id IS NOT NULL AND is_clinic_member(auth.uid(), clinic_id))
    OR is_global = true
  );

CREATE POLICY "Insert own personal extra"
  ON public.exercise_extras FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_global = false AND clinic_id IS NULL);

CREATE POLICY "Update own personal extra"
  ON public.exercise_extras FOR UPDATE
  USING (auth.uid() = user_id AND is_global = false AND clinic_id IS NULL);

CREATE POLICY "Delete own personal extra"
  ON public.exercise_extras FOR DELETE
  USING (auth.uid() = user_id AND is_global = false AND clinic_id IS NULL);

CREATE POLICY "Insert clinic extra as staff"
  ON public.exercise_extras FOR INSERT
  WITH CHECK (auth.uid() = user_id AND clinic_id IS NOT NULL AND is_global = false AND is_clinic_admin_or_instructor(auth.uid(), clinic_id));

CREATE POLICY "Update clinic extra as staff"
  ON public.exercise_extras FOR UPDATE
  USING (clinic_id IS NOT NULL AND is_clinic_admin_or_instructor(auth.uid(), clinic_id));

CREATE POLICY "Delete clinic extra as staff"
  ON public.exercise_extras FOR DELETE
  USING (clinic_id IS NOT NULL AND is_clinic_admin_or_instructor(auth.uid(), clinic_id));

CREATE POLICY "Master inserts global extra"
  ON public.exercise_extras FOR INSERT
  WITH CHECK (is_global = true AND has_role(auth.uid(), 'master_admin'::app_role) AND auth.uid() = user_id);

CREATE POLICY "Master updates global extra"
  ON public.exercise_extras FOR UPDATE
  USING (is_global = true AND has_role(auth.uid(), 'master_admin'::app_role));

CREATE POLICY "Master deletes global extra"
  ON public.exercise_extras FOR DELETE
  USING (is_global = true AND has_role(auth.uid(), 'master_admin'::app_role));

CREATE TRIGGER update_exercise_extras_updated_at
BEFORE UPDATE ON public.exercise_extras
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Junction: exercicio <-> extra
CREATE TABLE public.exercise_library_extras (
  exercise_id uuid NOT NULL REFERENCES public.exercise_library(id) ON DELETE CASCADE,
  extra_id uuid NOT NULL REFERENCES public.exercise_extras(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (exercise_id, extra_id)
);

CREATE INDEX idx_ex_lib_extras_exercise ON public.exercise_library_extras(exercise_id);
CREATE INDEX idx_ex_lib_extras_extra ON public.exercise_library_extras(extra_id);

ALTER TABLE public.exercise_library_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View exercise extra links"
  ON public.exercise_library_extras FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.exercise_library el
    WHERE el.id = exercise_library_extras.exercise_id
      AND (el.user_id = auth.uid()
           OR (el.clinic_id IS NOT NULL AND is_clinic_member(auth.uid(), el.clinic_id))
           OR el.is_global = true)
  ));

CREATE POLICY "Insert exercise extra links"
  ON public.exercise_library_extras FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.exercise_library el
    WHERE el.id = exercise_library_extras.exercise_id
      AND ((el.user_id = auth.uid() AND el.is_global = false AND el.clinic_id IS NULL)
           OR (el.clinic_id IS NOT NULL AND has_clinic_permission(auth.uid(), el.clinic_id, 'create_exercises'))
           OR (el.is_global = true AND has_role(auth.uid(), 'master_admin'::app_role)))
  ));

CREATE POLICY "Delete exercise extra links"
  ON public.exercise_library_extras FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.exercise_library el
    WHERE el.id = exercise_library_extras.exercise_id
      AND ((el.user_id = auth.uid() AND el.is_global = false AND el.clinic_id IS NULL)
           OR (el.clinic_id IS NOT NULL AND has_clinic_permission(auth.uid(), el.clinic_id, 'create_exercises'))
           OR (el.is_global = true AND has_role(auth.uid(), 'master_admin'::app_role)))
  ));
