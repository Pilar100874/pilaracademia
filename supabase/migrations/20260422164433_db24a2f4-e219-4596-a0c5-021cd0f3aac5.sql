
CREATE TABLE public.exercise_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.exercise_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own exercise categories"
ON public.exercise_categories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exercise categories"
ON public.exercise_categories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise categories"
ON public.exercise_categories FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise categories"
ON public.exercise_categories FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_exercise_categories_updated_at
BEFORE UPDATE ON public.exercise_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX exercise_categories_user_name_idx
ON public.exercise_categories (user_id, lower(name));

ALTER TABLE public.exercise_library
ADD COLUMN category_id UUID REFERENCES public.exercise_categories(id) ON DELETE SET NULL;

CREATE INDEX exercise_library_category_idx ON public.exercise_library(category_id);
