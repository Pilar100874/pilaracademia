CREATE TABLE IF NOT EXISTS public.clinic_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL,
  name text NOT NULL,
  color text,
  capacity integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.clinic_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view clinic rooms"
ON public.clinic_rooms FOR SELECT
USING (public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Staff manage clinic rooms"
ON public.clinic_rooms FOR ALL
USING (public.is_clinic_admin_or_instructor(auth.uid(), clinic_id))
WITH CHECK (public.is_clinic_admin_or_instructor(auth.uid(), clinic_id));

CREATE TRIGGER update_clinic_rooms_updated_at
BEFORE UPDATE ON public.clinic_rooms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.bookable_slots ADD COLUMN IF NOT EXISTS room_id uuid;