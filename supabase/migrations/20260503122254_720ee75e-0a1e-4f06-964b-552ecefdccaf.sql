ALTER TABLE public.workout_exercises ADD COLUMN IF NOT EXISTS is_cooldown boolean NOT NULL DEFAULT false;
ALTER TABLE public.workout_plans ADD COLUMN IF NOT EXISTS cooldown_enabled boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_workout_exercises_cooldown ON public.workout_exercises(workout_plan_id, is_cooldown);