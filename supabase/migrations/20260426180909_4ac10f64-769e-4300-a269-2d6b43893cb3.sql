CREATE OR REPLACE FUNCTION public.is_clinic_admin(_user_id uuid, _clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND clinic_id = _clinic_id
      AND role = 'clinic_admin'::public.app_role
  )
$$;

DROP POLICY IF EXISTS "Clinic admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Clinic admins manage clinic roles" ON public.user_roles;
DROP POLICY IF EXISTS "Clinic admins see clinic roles" ON public.user_roles;
DROP POLICY IF EXISTS "Clinic owner can self-assign admin" ON public.user_roles;
DROP POLICY IF EXISTS "Master admin manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users see their own roles" ON public.user_roles;

CREATE POLICY "Users see their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Master admin manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'master_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'master_admin'::public.app_role));

CREATE POLICY "Clinic admins see clinic roles"
ON public.user_roles
FOR SELECT
USING (
  clinic_id IS NOT NULL
  AND public.is_clinic_admin(auth.uid(), clinic_id)
);

CREATE POLICY "Clinic admins manage clinic roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  clinic_id IS NOT NULL
  AND public.is_clinic_admin(auth.uid(), clinic_id)
);

CREATE POLICY "Clinic admins can delete roles"
ON public.user_roles
FOR DELETE
USING (
  clinic_id IS NOT NULL
  AND public.is_clinic_admin(auth.uid(), clinic_id)
);

CREATE POLICY "Clinic owner can self-assign admin"
ON public.user_roles
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND role = 'clinic_admin'::public.app_role
  AND EXISTS (
    SELECT 1
    FROM public.clinics c
    WHERE c.id = user_roles.clinic_id
      AND c.owner_user_id = auth.uid()
  )
);