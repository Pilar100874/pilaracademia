-- Trigger: ao criar categoria global, libera para todas as clínicas
CREATE OR REPLACE FUNCTION public.auto_assign_global_category_to_clinics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_global = true THEN
    INSERT INTO public.clinic_global_categories (clinic_id, category_id, created_by)
    SELECT c.id, NEW.id, NEW.user_id
    FROM public.clinics c
    ON CONFLICT (clinic_id, category_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_global_cat
AFTER INSERT ON public.exercise_categories
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_global_category_to_clinics();

-- Trigger: ao criar clínica, libera todas as categorias globais existentes
CREATE OR REPLACE FUNCTION public.auto_assign_globals_to_new_clinic()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.clinic_global_categories (clinic_id, category_id, created_by)
  SELECT NEW.id, ec.id, NEW.owner_user_id
  FROM public.exercise_categories ec
  WHERE ec.is_global = true
  ON CONFLICT (clinic_id, category_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_globals_new_clinic
AFTER INSERT ON public.clinics
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_globals_to_new_clinic();

-- Backfill: liberar todas as categorias globais existentes para todas as clínicas atuais
INSERT INTO public.clinic_global_categories (clinic_id, category_id, created_by)
SELECT c.id, ec.id, COALESCE(c.owner_user_id, ec.user_id)
FROM public.clinics c
CROSS JOIN public.exercise_categories ec
WHERE ec.is_global = true
ON CONFLICT (clinic_id, category_id) DO NOTHING;