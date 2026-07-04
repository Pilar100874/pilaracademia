
-- Promote existing categories/extras owned by master admins to global
UPDATE public.exercise_categories
SET is_global = true, clinic_id = NULL
WHERE user_id IN (SELECT user_id FROM public.user_roles WHERE role='master_admin' AND clinic_id IS NULL);

UPDATE public.exercise_extras
SET is_global = true, clinic_id = NULL
WHERE user_id IN (SELECT user_id FROM public.user_roles WHERE role='master_admin' AND clinic_id IS NULL);

-- Allow master admins to toggle is_global on any category/extra they own (or any row)
DROP POLICY IF EXISTS "Master can update any category" ON public.exercise_categories;
CREATE POLICY "Master can update any category"
ON public.exercise_categories
FOR UPDATE
USING (public.has_role(auth.uid(), 'master_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'master_admin'::public.app_role));

DROP POLICY IF EXISTS "Master can update any extra" ON public.exercise_extras;
CREATE POLICY "Master can update any extra"
ON public.exercise_extras
FOR UPDATE
USING (public.has_role(auth.uid(), 'master_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'master_admin'::public.app_role));
