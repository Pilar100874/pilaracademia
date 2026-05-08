
-- 1) Remove duplicatas internas dentro dos exercícios pessoais do master pilar@pilar.com.br
--    Mantém o mais antigo de cada nome (case-insensitive, trimmed) e remove os demais.
WITH personal AS (
  SELECT id, lower(trim(name)) AS k, created_at,
         row_number() OVER (PARTITION BY lower(trim(name)) ORDER BY created_at ASC, id ASC) AS rn
  FROM public.exercise_library
  WHERE user_id = 'f9ec691b-5a1f-44f5-9119-9b8b92922600'
    AND (is_global = false OR is_global IS NULL)
)
DELETE FROM public.exercise_library el
USING personal p
WHERE el.id = p.id
  AND p.rn > 1;

-- 2) Remove pessoais que tenham nome igual a algum global do mesmo dono (case-insensitive)
DELETE FROM public.exercise_library el
WHERE el.user_id = 'f9ec691b-5a1f-44f5-9119-9b8b92922600'
  AND (el.is_global = false OR el.is_global IS NULL)
  AND EXISTS (
    SELECT 1 FROM public.exercise_library g
    WHERE g.user_id = 'f9ec691b-5a1f-44f5-9119-9b8b92922600'
      AND g.is_global = true
      AND lower(trim(g.name)) = lower(trim(el.name))
  );

-- 3) Promove o restante dos pessoais para global
UPDATE public.exercise_library
SET is_global = true,
    clinic_id = NULL
WHERE user_id = 'f9ec691b-5a1f-44f5-9119-9b8b92922600'
  AND (is_global = false OR is_global IS NULL);
