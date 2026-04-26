CREATE POLICY "Users insert own security flag"
ON public.user_security_flags
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());