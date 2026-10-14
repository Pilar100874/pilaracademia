CREATE OR REPLACE FUNCTION public.workout_exercise_inherit_sets() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND (NEW.sets IS NULL OR NEW.reps IS NULL) THEN
    SELECT COALESCE(NEW.sets, p.sets), COALESCE(NEW.reps, p.reps) INTO NEW.sets, NEW.reps FROM public.workout_plans p WHERE p.id = NEW.workout_plan_id;
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.workout_plan_propagate_sets() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.sets IS DISTINCT FROM OLD.sets OR NEW.reps IS DISTINCT FROM OLD.reps THEN
    UPDATE public.workout_exercises SET sets = NEW.sets, reps = NEW.reps WHERE workout_plan_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;