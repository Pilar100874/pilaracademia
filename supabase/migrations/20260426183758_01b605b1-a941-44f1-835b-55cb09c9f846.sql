-- Tabela de junção: quais categorias globais cada clínica vê
CREATE TABLE public.clinic_global_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.exercise_categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  UNIQUE(clinic_id, category_id)
);

CREATE INDEX idx_cgc_clinic ON public.clinic_global_categories(clinic_id);
CREATE INDEX idx_cgc_category ON public.clinic_global_categories(category_id);

ALTER TABLE public.clinic_global_categories ENABLE ROW LEVEL SECURITY;

-- Master gerencia tudo
CREATE POLICY "Master manages clinic global categories"
ON public.clinic_global_categories
FOR ALL
USING (has_role(auth.uid(), 'master_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'master_admin'::app_role) AND auth.uid() = created_by);

-- Membros da clínica podem ver suas próprias associações
CREATE POLICY "Members view own clinic global categories"
ON public.clinic_global_categories
FOR SELECT
USING (is_clinic_member(auth.uid(), clinic_id));

-- Atualizar policy de SELECT em exercise_categories: clínica só vê globais que foram explicitamente atribuídas
DROP POLICY IF EXISTS "View categories: own, clinic or global" ON public.exercise_categories;

CREATE POLICY "View categories: own, clinic or assigned global"
ON public.exercise_categories
FOR SELECT
USING (
  (auth.uid() = user_id)
  OR (clinic_id IS NOT NULL AND is_clinic_member(auth.uid(), clinic_id))
  OR (
    is_global = true AND (
      has_role(auth.uid(), 'master_admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.clinic_global_categories cgc
        JOIN public.user_roles ur ON ur.clinic_id = cgc.clinic_id
        WHERE cgc.category_id = exercise_categories.id
          AND ur.user_id = auth.uid()
      )
    )
  )
);

-- Atualizar policy de SELECT em exercise_library: clínica só vê exercícios globais cuja categoria foi atribuída
DROP POLICY IF EXISTS "View exercises: own, clinic or global" ON public.exercise_library;

CREATE POLICY "View exercises: own, clinic or assigned global"
ON public.exercise_library
FOR SELECT
USING (
  (auth.uid() = user_id)
  OR (clinic_id IS NOT NULL AND is_clinic_member(auth.uid(), clinic_id))
  OR (
    is_global = true AND (
      has_role(auth.uid(), 'master_admin'::app_role)
      OR (
        category_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.clinic_global_categories cgc
          JOIN public.user_roles ur ON ur.clinic_id = cgc.clinic_id
          WHERE cgc.category_id = exercise_library.category_id
            AND ur.user_id = auth.uid()
        )
      )
    )
  )
);