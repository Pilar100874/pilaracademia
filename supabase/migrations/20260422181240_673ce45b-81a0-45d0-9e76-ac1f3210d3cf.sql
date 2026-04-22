ALTER TABLE public.exercise_categories
ADD COLUMN parent_id uuid REFERENCES public.exercise_categories(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_exercise_categories_parent_id ON public.exercise_categories(parent_id);