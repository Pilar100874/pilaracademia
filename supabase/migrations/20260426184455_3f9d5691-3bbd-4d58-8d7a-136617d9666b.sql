-- Promover categorias do master para globais
UPDATE public.exercise_categories
SET is_global = true
WHERE user_id = 'f9ec691b-5a1f-44f5-9119-9b8b92922600'
  AND is_global = false
  AND clinic_id IS NULL;

-- Promover exercícios do master para globais
UPDATE public.exercise_library
SET is_global = true
WHERE user_id = 'f9ec691b-5a1f-44f5-9119-9b8b92922600'
  AND is_global = false
  AND clinic_id IS NULL;

-- Garantir que todas as clínicas vejam essas categorias agora globais
INSERT INTO public.clinic_global_categories (clinic_id, category_id, created_by)
SELECT c.id, ec.id, c.owner_user_id
FROM public.clinics c
CROSS JOIN public.exercise_categories ec
WHERE ec.is_global = true
ON CONFLICT (clinic_id, category_id) DO NOTHING;