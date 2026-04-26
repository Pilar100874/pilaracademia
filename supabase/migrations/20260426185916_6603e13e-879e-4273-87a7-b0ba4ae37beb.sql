-- Tabela de links compartilháveis de sequências
CREATE TABLE public.sequence_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL,
  clinic_id uuid NOT NULL,
  student_id uuid NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL,
  last_viewed_at timestamptz NULL,
  view_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);

CREATE INDEX idx_sequence_share_links_sequence ON public.sequence_share_links(sequence_id);
CREATE INDEX idx_sequence_share_links_clinic ON public.sequence_share_links(clinic_id);

ALTER TABLE public.sequence_share_links ENABLE ROW LEVEL SECURITY;

-- Staff da clínica gerencia
CREATE POLICY "Staff manage share links"
ON public.sequence_share_links
FOR ALL
USING (is_clinic_staff(auth.uid(), clinic_id))
WITH CHECK (is_clinic_staff(auth.uid(), clinic_id));

-- Leitura pública por token (com active e não expirado)
CREATE POLICY "Public read share links by token"
ON public.sequence_share_links
FOR SELECT
TO anon, authenticated
USING (active = true AND (expires_at IS NULL OR expires_at > now()));

-- Permitir leitura pública das sequências/itens quando há um share link ativo
CREATE POLICY "Public read sequence via active share link"
ON public.exercise_sequences
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sequence_share_links sl
    WHERE sl.sequence_id = exercise_sequences.id
      AND sl.active = true
      AND (sl.expires_at IS NULL OR sl.expires_at > now())
  )
);

CREATE POLICY "Public read sequence items via active share link"
ON public.exercise_sequence_items
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sequence_share_links sl
    WHERE sl.sequence_id = exercise_sequence_items.sequence_id
      AND sl.active = true
      AND (sl.expires_at IS NULL OR sl.expires_at > now())
  )
);

-- Função para registrar visualização (público)
CREATE OR REPLACE FUNCTION public.register_share_link_view(_token uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sequence_share_links
  SET view_count = view_count + 1,
      last_viewed_at = now()
  WHERE token = _token
    AND active = true
    AND (expires_at IS NULL OR expires_at > now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_share_link_view(uuid) TO anon, authenticated;