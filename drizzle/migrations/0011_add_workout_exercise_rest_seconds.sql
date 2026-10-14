ALTER TABLE public.workout_exercises ADD COLUMN IF NOT EXISTS rest_seconds integer DEFAULT 30;
COMMENT ON COLUMN public.workout_exercises.rest_seconds IS 'Rest duration in seconds after this exercise, suggested by AI and editable in the workout editor.';
NOTIFY pgrst, 'reload schema';