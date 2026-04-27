ALTER TABLE public.exercise_library
  ADD COLUMN IF NOT EXISTS skill_level_id uuid;

CREATE INDEX IF NOT EXISTS idx_exercise_library_skill_level
  ON public.exercise_library(skill_level_id);