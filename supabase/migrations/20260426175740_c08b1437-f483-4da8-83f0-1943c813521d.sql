CREATE OR REPLACE FUNCTION public.is_master_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'master_admin'::public.app_role AND clinic_id IS NULL
  )
$$;

DROP POLICY IF EXISTS "Master admin full access clinics" ON public.clinics;
CREATE POLICY "Master admin full access clinics"
ON public.clinics FOR ALL
USING (public.is_master_admin(auth.uid()))
WITH CHECK (public.is_master_admin(auth.uid()));

DROP POLICY IF EXISTS "Master admin manage all roles" ON public.user_roles;
CREATE POLICY "Master admin manage all roles"
ON public.user_roles FOR ALL
USING (public.is_master_admin(auth.uid()))
WITH CHECK (public.is_master_admin(auth.uid()));

DROP POLICY IF EXISTS "Master admin read all students" ON public.clinic_students;
CREATE POLICY "Master admin read all students"
ON public.clinic_students FOR SELECT
USING (public.is_master_admin(auth.uid()));

DROP POLICY IF EXISTS "Master admin read all profiles" ON public.profiles;
CREATE POLICY "Master admin read all profiles"
ON public.profiles FOR SELECT
USING (public.is_master_admin(auth.uid()));