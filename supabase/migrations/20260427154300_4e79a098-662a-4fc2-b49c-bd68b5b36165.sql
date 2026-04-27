-- Função: verifica conflito do mesmo instrutor em horários que se sobrepõem
-- (em qualquer sala). Ignora linhas inativas/canceladas e a própria linha.
CREATE OR REPLACE FUNCTION public.check_instructor_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instructor uuid;
  v_start timestamptz;
  v_end   timestamptz;
  v_clinic uuid;
  v_room uuid;
  v_conflict_count int;
  v_room_label text;
BEGIN
  -- Resolve campos do NEW para cada tabela
  v_instructor := NEW.instructor_id;
  v_start := NEW.scheduled_at;
  v_end   := NEW.scheduled_at + (COALESCE(NEW.duration_minutes, 50) || ' minutes')::interval;
  v_clinic := NEW.clinic_id;
  v_room := NEW.room_id;

  -- Sem professor atribuído? não há conflito a verificar.
  IF v_instructor IS NULL THEN
    RETURN NEW;
  END IF;

  -- Se for class_appointments cancelado, não bloqueia.
  IF TG_TABLE_NAME = 'class_appointments' AND NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Se for bookable_slots inativo, não bloqueia.
  IF TG_TABLE_NAME = 'bookable_slots' AND NEW.active = false THEN
    RETURN NEW;
  END IF;

  -- 1) Conflito com OUTROS bookable_slots do mesmo instrutor que se sobreponham.
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.bookable_slots bs
  WHERE bs.instructor_id = v_instructor
    AND bs.active = true
    AND bs.clinic_id = v_clinic
    AND NOT (TG_TABLE_NAME = 'bookable_slots' AND bs.id = NEW.id)
    AND tstzrange(bs.scheduled_at,
                  bs.scheduled_at + (bs.duration_minutes || ' minutes')::interval,
                  '[)')
        && tstzrange(v_start, v_end, '[)');

  IF v_conflict_count > 0 THEN
    SELECT bs.room_id INTO v_room
    FROM public.bookable_slots bs
    WHERE bs.instructor_id = v_instructor
      AND bs.active = true
      AND bs.clinic_id = v_clinic
      AND NOT (TG_TABLE_NAME = 'bookable_slots' AND bs.id = NEW.id)
      AND tstzrange(bs.scheduled_at,
                    bs.scheduled_at + (bs.duration_minutes || ' minutes')::interval,
                    '[)')
          && tstzrange(v_start, v_end, '[)')
    LIMIT 1;
    SELECT name INTO v_room_label FROM public.clinic_rooms WHERE id = v_room;
    RAISE EXCEPTION 'Professor já está alocado em outro horário sobreposto%',
      CASE WHEN v_room_label IS NOT NULL THEN ' (sala: ' || v_room_label || ')' ELSE '' END
      USING ERRCODE = 'P0001';
  END IF;

  -- 2) Conflito com class_appointments do mesmo instrutor que se sobreponham
  --    (não-cancelados).
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.class_appointments ca
  WHERE ca.instructor_id = v_instructor
    AND ca.status <> 'cancelled'
    AND ca.clinic_id = v_clinic
    AND NOT (TG_TABLE_NAME = 'class_appointments' AND ca.id = NEW.id)
    AND tstzrange(ca.scheduled_at,
                  ca.scheduled_at + (ca.duration_minutes || ' minutes')::interval,
                  '[)')
        && tstzrange(v_start, v_end, '[)');

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Professor já tem outra aula nesse horário'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- Triggers: rodam ANTES de INSERT/UPDATE quando instructor_id ou scheduled_at mudam
DROP TRIGGER IF EXISTS trg_check_instructor_conflict_bs ON public.bookable_slots;
CREATE TRIGGER trg_check_instructor_conflict_bs
BEFORE INSERT OR UPDATE OF instructor_id, scheduled_at, duration_minutes, active
ON public.bookable_slots
FOR EACH ROW
EXECUTE FUNCTION public.check_instructor_conflict();

DROP TRIGGER IF EXISTS trg_check_instructor_conflict_ca ON public.class_appointments;
CREATE TRIGGER trg_check_instructor_conflict_ca
BEFORE INSERT OR UPDATE OF instructor_id, scheduled_at, duration_minutes, status
ON public.class_appointments
FOR EACH ROW
EXECUTE FUNCTION public.check_instructor_conflict();