-- Per-user permission flag for the AI movement analysis feature.
-- Default false = costly feature is opt-in; master admin grants access individually.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS movement_analysis_enabled boolean NOT NULL DEFAULT false;

-- Allow the master admin to update any user's profile (needed to toggle the flag).
DROP POLICY IF EXISTS "Master admin update all profiles" ON public.profiles;
CREATE POLICY "Master admin update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'master_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'master_admin'::app_role));