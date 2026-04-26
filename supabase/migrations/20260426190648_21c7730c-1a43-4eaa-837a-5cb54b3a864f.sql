CREATE TABLE IF NOT EXISTS public.impersonation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  mode text NOT NULL,
  clinic_id uuid NULL,
  student_id uuid NULL
);

ALTER TABLE public.impersonation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master views all impersonation logs"
ON public.impersonation_log FOR SELECT
USING (has_role(auth.uid(), 'master_admin'::app_role));

CREATE POLICY "Clinic admin views own clinic impersonation logs"
ON public.impersonation_log FOR SELECT
USING (clinic_id IS NOT NULL AND is_clinic_admin(auth.uid(), clinic_id));