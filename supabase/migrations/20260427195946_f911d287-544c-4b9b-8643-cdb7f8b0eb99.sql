-- 1. Add equipment_mode flag to clinic_rooms
ALTER TABLE public.clinic_rooms
  ADD COLUMN IF NOT EXISTS equipment_mode text NOT NULL DEFAULT 'free';

ALTER TABLE public.clinic_rooms
  DROP CONSTRAINT IF EXISTS clinic_rooms_equipment_mode_check;

ALTER TABLE public.clinic_rooms
  ADD CONSTRAINT clinic_rooms_equipment_mode_check
  CHECK (equipment_mode IN ('single_per_class', 'free'));

-- 2. Create room_equipment join table (which equipment belongs to which room)
CREATE TABLE IF NOT EXISTS public.room_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  room_id uuid NOT NULL,
  equipment_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (room_id, equipment_id)
);

CREATE INDEX IF NOT EXISTS idx_room_equipment_room ON public.room_equipment(room_id);
CREATE INDEX IF NOT EXISTS idx_room_equipment_equipment ON public.room_equipment(equipment_id);
CREATE INDEX IF NOT EXISTS idx_room_equipment_clinic ON public.room_equipment(clinic_id);

ALTER TABLE public.room_equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view room equipment" ON public.room_equipment;
CREATE POLICY "Members view room equipment"
  ON public.room_equipment FOR SELECT
  USING (public.is_clinic_member(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Staff manage room equipment" ON public.room_equipment;
CREATE POLICY "Staff manage room equipment"
  ON public.room_equipment FOR ALL
  USING (public.is_clinic_staff(auth.uid(), clinic_id))
  WITH CHECK (public.is_clinic_staff(auth.uid(), clinic_id));