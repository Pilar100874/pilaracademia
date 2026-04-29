-- Garantir captura completa das mudanças (necessário para UPDATEs)
ALTER TABLE public.exercise_library REPLICA IDENTITY FULL;

-- Adicionar tabela à publicação de realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'exercise_library'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.exercise_library;
  END IF;
END $$;