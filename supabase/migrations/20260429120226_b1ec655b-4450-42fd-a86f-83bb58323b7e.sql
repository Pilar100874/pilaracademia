-- Enum para origem das aulas
DO $$ BEGIN
  CREATE TYPE public.appointment_origin AS ENUM ('particular', 'gympass', 'totalpass', 'classpass', 'outro');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Enum de plataformas de pass externos
DO $$ BEGIN
  CREATE TYPE public.external_pass_platform AS ENUM ('gympass', 'totalpass', 'classpass', 'outro');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Adiciona coluna origin em class_appointments
ALTER TABLE public.class_appointments
  ADD COLUMN IF NOT EXISTS origin public.appointment_origin NOT NULL DEFAULT 'particular';

-- Tabela: registros de importação
CREATE TABLE IF NOT EXISTS public.external_pass_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  platform public.external_pass_platform NOT NULL,
  file_name TEXT NOT NULL,
  file_hash TEXT,
  total_rows INTEGER NOT NULL DEFAULT 0,
  matched_rows INTEGER NOT NULL DEFAULT 0,
  unmatched_rows INTEGER NOT NULL DEFAULT 0,
  duplicate_rows INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  reference_period TEXT,
  total_amount NUMERIC(12,2),
  raw_columns JSONB,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_epi_clinic ON public.external_pass_imports(clinic_id, created_at DESC);

-- Tabela: check-ins importados
CREATE TABLE IF NOT EXISTS public.external_pass_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.external_pass_imports(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  platform public.external_pass_platform NOT NULL,
  student_id UUID REFERENCES public.clinic_students(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.class_appointments(id) ON DELETE SET NULL,
  external_user_id TEXT,
  student_name TEXT,
  student_email TEXT,
  student_document TEXT,
  checkin_at TIMESTAMPTZ NOT NULL,
  amount NUMERIC(12,2),
  currency TEXT DEFAULT 'BRL',
  payment_status TEXT,
  raw_row JSONB,
  dedupe_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, platform, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_epc_clinic_date ON public.external_pass_checkins(clinic_id, checkin_at DESC);
CREATE INDEX IF NOT EXISTS idx_epc_student ON public.external_pass_checkins(student_id);
CREATE INDEX IF NOT EXISTS idx_epc_import ON public.external_pass_checkins(import_id);

-- Tabela: mapeamento salvo de colunas
CREATE TABLE IF NOT EXISTS public.external_pass_column_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  platform public.external_pass_platform NOT NULL,
  mapping JSONB NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, platform)
);

CREATE TRIGGER trg_epcm_updated_at
  BEFORE UPDATE ON public.external_pass_column_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.external_pass_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_pass_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_pass_column_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view imports"
  ON public.external_pass_imports FOR SELECT
  USING (public.is_clinic_admin_or_instructor(auth.uid(), clinic_id) OR public.is_master_admin(auth.uid()));

CREATE POLICY "Staff can create imports"
  ON public.external_pass_imports FOR INSERT
  WITH CHECK (public.is_clinic_admin_or_instructor(auth.uid(), clinic_id) AND created_by = auth.uid());

CREATE POLICY "Staff can delete imports"
  ON public.external_pass_imports FOR DELETE
  USING (public.is_clinic_admin_or_instructor(auth.uid(), clinic_id));

CREATE POLICY "Staff can view checkins"
  ON public.external_pass_checkins FOR SELECT
  USING (public.is_clinic_admin_or_instructor(auth.uid(), clinic_id) OR public.is_master_admin(auth.uid()));

CREATE POLICY "Staff can insert checkins"
  ON public.external_pass_checkins FOR INSERT
  WITH CHECK (public.is_clinic_admin_or_instructor(auth.uid(), clinic_id));

CREATE POLICY "Staff can update checkins"
  ON public.external_pass_checkins FOR UPDATE
  USING (public.is_clinic_admin_or_instructor(auth.uid(), clinic_id));

CREATE POLICY "Staff can delete checkins"
  ON public.external_pass_checkins FOR DELETE
  USING (public.is_clinic_admin_or_instructor(auth.uid(), clinic_id));

CREATE POLICY "Staff can view mappings"
  ON public.external_pass_column_mappings FOR SELECT
  USING (public.is_clinic_admin_or_instructor(auth.uid(), clinic_id));

CREATE POLICY "Staff can upsert mappings"
  ON public.external_pass_column_mappings FOR INSERT
  WITH CHECK (public.is_clinic_admin_or_instructor(auth.uid(), clinic_id) AND created_by = auth.uid());

CREATE POLICY "Staff can update mappings"
  ON public.external_pass_column_mappings FOR UPDATE
  USING (public.is_clinic_admin_or_instructor(auth.uid(), clinic_id));