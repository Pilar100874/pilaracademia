-- Multi-category support for exercise library
-- Creates a junction table so each exercise can belong to several categories
-- (and subcategories). The legacy single category_id column is preserved for
-- backward compatibility and is auto-mirrored from the junction by a trigger
-- (so older queries that read exercise_library.category_id keep working).

CREATE TABLE IF NOT EXISTS public.exercise_library_categories (
  exercise_id uuid NOT NULL REFERENCES public.exercise_library(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.exercise_categories(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (exercise_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_exercise_library_categories_category_id
  ON public.exercise_library_categories (category_id);

ALTER TABLE public.exercise_library_categories ENABLE ROW LEVEL SECURITY;

-- RLS: a user may manage a row only if they can see/manage the underlying exercise.
-- We re-use the same access rules as exercise_library by joining to it.

CREATE POLICY "View exercise category links"
  ON public.exercise_library_categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.exercise_library el
      WHERE el.id = exercise_library_categories.exercise_id
        AND (
          el.user_id = auth.uid()
          OR (el.clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), el.clinic_id))
          OR (el.is_global = true AND (
                public.has_role(auth.uid(), 'master_admin'::public.app_role)
                OR EXISTS (
                  SELECT 1 FROM public.clinic_global_categories cgc
                  JOIN public.user_roles ur ON ur.clinic_id = cgc.clinic_id
                  WHERE cgc.category_id = el.category_id AND ur.user_id = auth.uid()
                )
          ))
        )
    )
  );

CREATE POLICY "Insert exercise category links"
  ON public.exercise_library_categories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.exercise_library el
      WHERE el.id = exercise_library_categories.exercise_id
        AND (
          (el.user_id = auth.uid() AND el.is_global = false AND el.clinic_id IS NULL)
          OR (el.clinic_id IS NOT NULL AND public.has_clinic_permission(auth.uid(), el.clinic_id, 'create_exercises'))
          OR (el.is_global = true AND public.has_role(auth.uid(), 'master_admin'::public.app_role))
        )
    )
  );

CREATE POLICY "Delete exercise category links"
  ON public.exercise_library_categories
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.exercise_library el
      WHERE el.id = exercise_library_categories.exercise_id
        AND (
          (el.user_id = auth.uid() AND el.is_global = false AND el.clinic_id IS NULL)
          OR (el.clinic_id IS NOT NULL AND public.has_clinic_permission(auth.uid(), el.clinic_id, 'create_exercises'))
          OR (el.is_global = true AND public.has_role(auth.uid(), 'master_admin'::public.app_role))
        )
    )
  );

-- Backfill: copy existing single category_id into the junction.
INSERT INTO public.exercise_library_categories (exercise_id, category_id)
SELECT id, category_id
FROM public.exercise_library
WHERE category_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Trigger: keep exercise_library.category_id mirrored to the FIRST category in
-- the junction so old code paths (filters, RLS using category_id, etc.) still work.
CREATE OR REPLACE FUNCTION public.sync_exercise_primary_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exercise_id uuid;
  v_first_cat uuid;
BEGIN
  v_exercise_id := COALESCE(NEW.exercise_id, OLD.exercise_id);
  SELECT category_id INTO v_first_cat
  FROM public.exercise_library_categories
  WHERE exercise_id = v_exercise_id
  ORDER BY created_at ASC
  LIMIT 1;
  UPDATE public.exercise_library
    SET category_id = v_first_cat
    WHERE id = v_exercise_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_exercise_primary_category_ins ON public.exercise_library_categories;
CREATE TRIGGER trg_sync_exercise_primary_category_ins
AFTER INSERT ON public.exercise_library_categories
FOR EACH ROW EXECUTE FUNCTION public.sync_exercise_primary_category();

DROP TRIGGER IF EXISTS trg_sync_exercise_primary_category_del ON public.exercise_library_categories;
CREATE TRIGGER trg_sync_exercise_primary_category_del
AFTER DELETE ON public.exercise_library_categories
FOR EACH ROW EXECUTE FUNCTION public.sync_exercise_primary_category();