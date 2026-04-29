-- Tabela de identidades externas do aluno (Gympass, TotalPass, ClassPass, etc)
CREATE TABLE public.student_external_identities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  student_id UUID NOT NULL,
  platform appointment_origin NOT NULL,
  external_user_id TEXT,
  external_email TEXT,
  external_document TEXT,
  external_name TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  linked_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unicidade: mesma plataforma + external_user_id por clínica não duplica
CREATE UNIQUE INDEX student_ext_id_unique_external
  ON public.student_external_identities (clinic_id, platform, external_user_id)
  WHERE external_user_id IS NOT NULL;

-- Índices de busca
CREATE INDEX student_ext_id_student ON public.student_external_identities (student_id);
CREATE INDEX student_ext_id_clinic_platform ON public.student_external_identities (clinic_id, platform);
CREATE INDEX student_ext_id_email ON public.student_external_identities (lower(external_email));
CREATE INDEX student_ext_id_document ON public.student_external_identities (external_document);

ALTER TABLE public.student_external_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view student external identities"
  ON public.student_external_identities FOR SELECT
  USING (is_clinic_admin_or_instructor(auth.uid(), clinic_id));

CREATE POLICY "Staff insert student external identities"
  ON public.student_external_identities FOR INSERT
  WITH CHECK (is_clinic_admin_or_instructor(auth.uid(), clinic_id));

CREATE POLICY "Staff update student external identities"
  ON public.student_external_identities FOR UPDATE
  USING (is_clinic_admin_or_instructor(auth.uid(), clinic_id));

CREATE POLICY "Staff delete student external identities"
  ON public.student_external_identities FOR DELETE
  USING (is_clinic_admin_or_instructor(auth.uid(), clinic_id));

CREATE POLICY "Student views own external identities"
  ON public.student_external_identities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM clinic_students cs
    WHERE cs.id = student_external_identities.student_id
      AND cs.user_id = auth.uid()
  ));

CREATE TRIGGER update_student_external_identities_updated_at
  BEFORE UPDATE ON public.student_external_identities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();