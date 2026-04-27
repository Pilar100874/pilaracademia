ALTER TABLE public.bookable_slots
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS series_id uuid;

CREATE INDEX IF NOT EXISTS idx_bookable_slots_clinic_series
  ON public.bookable_slots (clinic_id, series_id);

CREATE INDEX IF NOT EXISTS idx_bookable_slots_clinic_active_date
  ON public.bookable_slots (clinic_id, active, scheduled_at);