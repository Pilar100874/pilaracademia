-- Tabela de treinos (workout plans)
CREATE TABLE public.workout_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  days_of_week INTEGER[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de exercícios do treino
CREATE TABLE public.workout_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT,
  sets INTEGER NOT NULL DEFAULT 3,
  reps INTEGER NOT NULL DEFAULT 12,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

-- Policies for workout_plans
CREATE POLICY "Users can view their own workout plans" 
ON public.workout_plans 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workout plans" 
ON public.workout_plans 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout plans" 
ON public.workout_plans 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout plans" 
ON public.workout_plans 
FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for workout_exercises (via workout_plan ownership)
CREATE POLICY "Users can view their workout exercises" 
ON public.workout_exercises 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.workout_plans 
  WHERE workout_plans.id = workout_exercises.workout_plan_id 
  AND workout_plans.user_id = auth.uid()
));

CREATE POLICY "Users can add exercises to their workouts" 
ON public.workout_exercises 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.workout_plans 
  WHERE workout_plans.id = workout_exercises.workout_plan_id 
  AND workout_plans.user_id = auth.uid()
));

CREATE POLICY "Users can update their workout exercises" 
ON public.workout_exercises 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.workout_plans 
  WHERE workout_plans.id = workout_exercises.workout_plan_id 
  AND workout_plans.user_id = auth.uid()
));

CREATE POLICY "Users can delete their workout exercises" 
ON public.workout_exercises 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.workout_plans 
  WHERE workout_plans.id = workout_exercises.workout_plan_id 
  AND workout_plans.user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_workout_plans_updated_at
BEFORE UPDATE ON public.workout_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for workout exercise images
INSERT INTO storage.buckets (id, name, public) VALUES ('workout-images', 'workout-images', true);

-- Storage policies for workout images
CREATE POLICY "Anyone can view workout images"
ON storage.objects FOR SELECT
USING (bucket_id = 'workout-images');

CREATE POLICY "Authenticated users can upload workout images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'workout-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their workout images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'workout-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their workout images"
ON storage.objects FOR DELETE
USING (bucket_id = 'workout-images' AND auth.role() = 'authenticated');