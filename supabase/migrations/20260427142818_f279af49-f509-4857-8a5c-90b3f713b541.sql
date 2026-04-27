-- Disponibilidade (turnos de trabalho) dos professores
CREATE TABLE IF NOT EXISTS public.instructor_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  instructor_id UUID NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_id UUID NULL,
  color TEXT NULL,
  notes TEXT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_instructor_availability_clinic ON public.instructor_availability(clinic_id);
CREATE INDEX IF NOT EXISTS idx_instructor_availability_instructor ON public.instructor_availability(instructor_id);

ALTER TABLE public.instructor_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view instructor availability"
ON public.instructor_availability FOR SELECT
USING (public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Staff manage instructor availability"
ON public.instructor_availability FOR ALL
USING (public.is_clinic_staff(auth.uid(), clinic_id))
WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));

CREATE TRIGGER trg_instructor_availability_updated_at
BEFORE UPDATE ON public.instructor_availability
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cor preferida do professor por clínica (1 linha por instructor/clinic)
CREATE TABLE IF NOT EXISTS public.instructor_colors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL,
  instructor_id UUID NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, instructor_id)
);

ALTER TABLE public.instructor_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view instructor colors"
ON public.instructor_colors FOR SELECT
USING (public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Staff manage instructor colors"
ON public.instructor_colors FOR ALL
USING (public.is_clinic_staff(auth.uid(), clinic_id))
WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));

CREATE TRIGGER trg_instructor_colors_updated_at
BEFORE UPDATE ON public.instructor_colors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();