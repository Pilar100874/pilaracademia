-- Tornar clinic_id opcional em sequences
ALTER TABLE public.exercise_sequences
  ALTER COLUMN clinic_id DROP NOT NULL;

ALTER TABLE public.exercise_sequences
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false;

-- Garantir consistência: ou clinic_id ou is_global
ALTER TABLE public.exercise_sequences
  ADD CONSTRAINT sequences_scope_chk
  CHECK ((clinic_id IS NOT NULL AND is_global = false) OR (clinic_id IS NULL AND is_global = true));

-- Atualizar policies de exercise_sequences
DROP POLICY IF EXISTS "Members view sequences" ON public.exercise_sequences;
DROP POLICY IF EXISTS "Staff manage sequences" ON public.exercise_sequences;

CREATE POLICY "View sequences: clinic or global"
ON public.exercise_sequences
FOR SELECT
USING (
  (clinic_id IS NOT NULL AND is_clinic_member(auth.uid(), clinic_id))
  OR (is_global = true)
);

CREATE POLICY "Staff manage clinic sequences"
ON public.exercise_sequences
FOR ALL
USING (clinic_id IS NOT NULL AND is_clinic_admin_or_instructor(auth.uid(), clinic_id))
WITH CHECK (clinic_id IS NOT NULL AND is_clinic_admin_or_instructor(auth.uid(), clinic_id) AND is_global = false);

CREATE POLICY "Master manage global sequences"
ON public.exercise_sequences
FOR ALL
USING (is_global = true AND has_role(auth.uid(), 'master_admin'::app_role))
WITH CHECK (is_global = true AND clinic_id IS NULL AND has_role(auth.uid(), 'master_admin'::app_role));

-- Atualizar policies de exercise_sequence_items para refletir o mesmo
DROP POLICY IF EXISTS "Members view sequence items" ON public.exercise_sequence_items;
DROP POLICY IF EXISTS "Staff manage sequence items" ON public.exercise_sequence_items;

CREATE POLICY "View sequence items: clinic or global"
ON public.exercise_sequence_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.exercise_sequences s
    WHERE s.id = exercise_sequence_items.sequence_id
      AND (
        (s.clinic_id IS NOT NULL AND is_clinic_member(auth.uid(), s.clinic_id))
        OR s.is_global = true
      )
  )
);

CREATE POLICY "Staff manage clinic sequence items"
ON public.exercise_sequence_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.exercise_sequences s
    WHERE s.id = exercise_sequence_items.sequence_id
      AND s.clinic_id IS NOT NULL
      AND is_clinic_admin_or_instructor(auth.uid(), s.clinic_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.exercise_sequences s
    WHERE s.id = exercise_sequence_items.sequence_id
      AND s.clinic_id IS NOT NULL
      AND is_clinic_admin_or_instructor(auth.uid(), s.clinic_id)
  )
);

CREATE POLICY "Master manage global sequence items"
ON public.exercise_sequence_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.exercise_sequences s
    WHERE s.id = exercise_sequence_items.sequence_id
      AND s.is_global = true
      AND has_role(auth.uid(), 'master_admin'::app_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.exercise_sequences s
    WHERE s.id = exercise_sequence_items.sequence_id
      AND s.is_global = true
      AND has_role(auth.uid(), 'master_admin'::app_role)
  )
);

-- Função: copiar uma sequência global como sequência da clínica
CREATE OR REPLACE FUNCTION public.copy_global_sequence_to_clinic(_sequence_id uuid, _clinic_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id uuid;
  v_src RECORD;
BEGIN
  -- Verifica permissão: precisa ser staff da clínica destino
  IF NOT is_clinic_admin_or_instructor(auth.uid(), _clinic_id) THEN
    RAISE EXCEPTION 'Sem permissão para copiar para esta clínica';
  END IF;

  SELECT * INTO v_src FROM public.exercise_sequences WHERE id = _sequence_id AND is_global = true;
  IF v_src IS NULL THEN
    RAISE EXCEPTION 'Sequência global não encontrada';
  END IF;

  INSERT INTO public.exercise_sequences (
    clinic_id, name, description, equipment_id, equipment_type,
    skill_level_id, estimated_minutes, created_by, is_global
  ) VALUES (
    _clinic_id, v_src.name, v_src.description, NULL, v_src.equipment_type,
    NULL, v_src.estimated_minutes, auth.uid(), false
  ) RETURNING id INTO v_new_id;

  INSERT INTO public.exercise_sequence_items (
    sequence_id, exercise_library_id, name, image_urls, video_url, video_type,
    video_start_seconds, video_end_seconds, sets, reps, duration_seconds,
    rest_seconds, notes, order_index
  )
  SELECT v_new_id, exercise_library_id, name, image_urls, video_url, video_type,
         video_start_seconds, video_end_seconds, sets, reps, duration_seconds,
         rest_seconds, notes, order_index
  FROM public.exercise_sequence_items
  WHERE sequence_id = _sequence_id;

  RETURN v_new_id;
END;
$$;