
DROP INDEX IF EXISTS public.exercise_categories_user_name_idx;
CREATE UNIQUE INDEX exercise_categories_scope_name_idx
  ON public.exercise_categories (
    COALESCE(clinic_id, '00000000-0000-0000-0000-000000000000'::uuid),
    is_global,
    user_id,
    lower(name),
    COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
