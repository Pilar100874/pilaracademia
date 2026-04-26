-- Status do equipamento + manutenção
ALTER TABLE public.clinic_equipment
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS maintenance_notes text,
  ADD COLUMN IF NOT EXISTS maintenance_until date;

ALTER TABLE public.clinic_equipment
  DROP CONSTRAINT IF EXISTS clinic_equipment_status_check;
ALTER TABLE public.clinic_equipment
  ADD CONSTRAINT clinic_equipment_status_check
  CHECK (status IN ('active','maintenance','inactive'));

-- Tabela N:N entre bookable_slots e clinic_equipment
CREATE TABLE IF NOT EXISTS public.bookable_slot_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bookable_slot_id uuid NOT NULL REFERENCES public.bookable_slots(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.clinic_equipment(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (bookable_slot_id, equipment_id)
);

CREATE INDEX IF NOT EXISTS idx_bse_slot ON public.bookable_slot_equipment(bookable_slot_id);
CREATE INDEX IF NOT EXISTS idx_bse_equipment ON public.bookable_slot_equipment(equipment_id);
CREATE INDEX IF NOT EXISTS idx_bse_clinic ON public.bookable_slot_equipment(clinic_id);

ALTER TABLE public.bookable_slot_equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view slot equipment" ON public.bookable_slot_equipment;
CREATE POLICY "Members view slot equipment"
  ON public.bookable_slot_equipment FOR SELECT
  USING (public.is_clinic_member(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Staff manage slot equipment" ON public.bookable_slot_equipment;
CREATE POLICY "Staff manage slot equipment"
  ON public.bookable_slot_equipment FOR ALL
  USING (public.is_clinic_staff(auth.uid(), clinic_id))
  WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));