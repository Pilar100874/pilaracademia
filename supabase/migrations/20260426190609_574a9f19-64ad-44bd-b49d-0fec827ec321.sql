ALTER TABLE public.clinic_settings
ADD COLUMN IF NOT EXISTS allow_login_as_student boolean NOT NULL DEFAULT false;