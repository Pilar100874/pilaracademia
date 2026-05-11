
-- 1. master_settings: modelos configuráveis
ALTER TABLE public.master_settings
  ADD COLUMN IF NOT EXISTS library_analysis_model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  ADD COLUMN IF NOT EXISTS user_video_analysis_model text NOT NULL DEFAULT 'google/gemini-2.5-flash';

-- 2. profiles: per-user model, is_active, approval_status
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS video_analysis_model text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approval_decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_decided_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_approval_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_approval_status_check
      CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Backfill: usuários já existentes ficam aprovados
UPDATE public.profiles
SET approval_status = 'approved',
    approval_decided_at = COALESCE(approval_decided_at, now())
WHERE approval_status = 'pending' AND created_at < now() - interval '5 seconds';

-- 3. handle_new_user: novos cadastros entram como pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, approval_status, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
    NEW.email,
    'pending',
    true
  );
  RETURN NEW;
END;
$function$;

-- 4. RLS: master_admin pode atualizar qualquer perfil
DROP POLICY IF EXISTS "Master admin can update any profile" ON public.profiles;
CREATE POLICY "Master admin can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_master_admin(auth.uid()))
WITH CHECK (public.is_master_admin(auth.uid()));

-- master_admin também precisa ler todos os perfis para a tela admin
DROP POLICY IF EXISTS "Master admin can read any profile" ON public.profiles;
CREATE POLICY "Master admin can read any profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_master_admin(auth.uid()));
