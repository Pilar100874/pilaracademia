-- Drop recursive policy and recreate using has_role (which is SECURITY DEFINER and bypasses recursion correctly)
DROP POLICY IF EXISTS "Master admin manage all roles" ON public.user_roles;

CREATE POLICY "Master admin manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'master_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'master_admin'::public.app_role));

-- Same fix for clinics policy
DROP POLICY IF EXISTS "Master admin full access clinics" ON public.clinics;
CREATE POLICY "Master admin full access clinics"
ON public.clinics FOR ALL
USING (public.has_role(auth.uid(), 'master_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'master_admin'::public.app_role));

DROP POLICY IF EXISTS "Master admin read all students" ON public.clinic_students;
CREATE POLICY "Master admin read all students"
ON public.clinic_students FOR SELECT
USING (public.has_role(auth.uid(), 'master_admin'::public.app_role));

DROP POLICY IF EXISTS "Master admin read all profiles" ON public.profiles;
CREATE POLICY "Master admin read all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'master_admin'::public.app_role));