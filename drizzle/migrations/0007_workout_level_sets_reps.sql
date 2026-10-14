ALTER TABLE public.workout_plans ADD COLUMN IF NOT EXISTS sets integer NOT NULL DEFAULT 3, ADD COLUMN IF NOT EXISTS reps integer NOT NULL DEFAULT 12;
UPDATE public.workout_plans p SET sets = e.sets, reps = e.reps
FROM (SELECT DISTINCT ON (workout_plan_id) workout_plan_id, sets, reps FROM public.workout_exercises ORDER BY workout_plan_id, order_index) e
WHERE e.workout_plan_id = p.id;
UPDATE public.workout_exercises we SET sets = p.sets, reps = p.reps FROM public.workout_plans p WHERE p.id = we.workout_plan_id AND (we.sets <> p.sets OR we.reps <> p.reps);
CREATE OR REPLACE FUNCTION public.workout_exercise_inherit_sets() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT sets, reps INTO NEW.sets, NEW.reps FROM public.workout_plans WHERE id = NEW.workout_plan_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_workout_exercise_inherit_sets ON public.workout_exercises;
CREATE TRIGGER trg_workout_exercise_inherit_sets BEFORE INSERT OR UPDATE OF sets, reps, workout_plan_id ON public.workout_exercises FOR EACH ROW EXECUTE FUNCTION public.workout_exercise_inherit_sets();
CREATE OR REPLACE FUNCTION public.workout_plan_propagate_sets() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.workout_exercises SET sets = NEW.sets, reps = NEW.reps WHERE workout_plan_id = NEW.id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_workout_plan_propagate_sets ON public.workout_plans;
CREATE TRIGGER trg_workout_plan_propagate_sets AFTER UPDATE OF sets, reps ON public.workout_plans FOR EACH ROW WHEN (OLD.sets IS DISTINCT FROM NEW.sets OR OLD.reps IS DISTINCT FROM NEW.reps) EXECUTE FUNCTION public.workout_plan_propagate_sets();
COMMENT ON COLUMN public.exercise_library.default_sets IS 'DEPRECATED: sets live on workout_plans';
COMMENT ON COLUMN public.exercise_library.default_reps IS 'DEPRECATED: reps live on workout_plans';