ALTER TABLE public.clinic_equipment
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.clinic_rooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clinic_equipment_room_id ON public.clinic_equipment(room_id);