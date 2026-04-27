CREATE OR REPLACE FUNCTION public.check_instructor_conflict()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instructor uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_clinic uuid;
  v_room uuid;
  v_bookable_slot uuid;
  v_conflict_count int;
  v_room_label text;
BEGIN
  v_instructor := NEW.instructor_id;
  v_start := NEW.scheduled_at;
  v_end := NEW.scheduled_at + (COALESCE(NEW.duration_minutes, 50) || ' minutes')::interval;
  v_clinic := NEW.clinic_id;
  v_bookable_slot := NULL;

  IF v_instructor IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'class_appointments' THEN
    IF NEW.status = 'cancelled' THEN
      RETURN NEW;
    END IF;
    v_bookable_slot := NEW.bookable_slot_id;
  ELSIF TG_TABLE_NAME = 'bookable_slots' THEN
    IF NEW.active = false OR COALESCE(NEW.blocked, false) = true THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_conflict_count
  FROM public.bookable_slots bs
  WHERE bs.instructor_id = v_instructor
    AND bs.active = true
    AND COALESCE(bs.blocked, false) = false
    AND bs.clinic_id = v_clinic
    AND NOT (TG_TABLE_NAME = 'bookable_slots' AND bs.id = NEW.id)
    AND (v_bookable_slot IS NULL OR bs.id <> v_bookable_slot)
    AND tstzrange(bs.scheduled_at, bs.scheduled_at + (bs.duration_minutes || ' minutes')::interval, '[)')
        && tstzrange(v_start, v_end, '[)');

  IF v_conflict_count > 0 THEN
    SELECT bs.room_id INTO v_room
    FROM public.bookable_slots bs
    WHERE bs.instructor_id = v_instructor
      AND bs.active = true
      AND COALESCE(bs.blocked, false) = false
      AND bs.clinic_id = v_clinic
      AND NOT (TG_TABLE_NAME = 'bookable_slots' AND bs.id = NEW.id)
      AND (v_bookable_slot IS NULL OR bs.id <> v_bookable_slot)
      AND tstzrange(bs.scheduled_at, bs.scheduled_at + (bs.duration_minutes || ' minutes')::interval, '[)')
          && tstzrange(v_start, v_end, '[)')
    LIMIT 1;

    SELECT name INTO v_room_label FROM public.clinic_rooms WHERE id = v_room;

    RAISE EXCEPTION 'Professor já está alocado em outro horário sobreposto%',
      CASE WHEN v_room_label IS NOT NULL THEN ' (sala: ' || v_room_label || ')' ELSE '' END
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*) INTO v_conflict_count
  FROM public.class_appointments ca
  WHERE ca.instructor_id = v_instructor
    AND ca.status <> 'cancelled'
    AND ca.clinic_id = v_clinic
    AND NOT (TG_TABLE_NAME = 'class_appointments' AND ca.id = NEW.id)
    AND tstzrange(ca.scheduled_at, ca.scheduled_at + (ca.duration_minutes || ' minutes')::interval, '[)')
        && tstzrange(v_start, v_end, '[)');

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Professor já tem outra aula nesse horário'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;