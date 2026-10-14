CREATE TABLE public.managed_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL,
  member_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX managed_users_manager_idx ON public.managed_users(manager_id);
GRANT SELECT ON public.managed_users TO authenticated;
GRANT ALL ON public.managed_users TO service_role;
ALTER TABLE public.managed_users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.manager_of(_member uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT manager_id FROM public.managed_users WHERE member_id = _member LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_manager_of(_manager uuid, _member uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.managed_users WHERE manager_id = _manager AND member_id = _member)
$$;

CREATE POLICY "Manager or member reads link" ON public.managed_users FOR SELECT TO authenticated
USING (manager_id = auth.uid() OR member_id = auth.uid() OR public.has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Manager views member profiles" ON public.profiles FOR SELECT TO authenticated
USING (public.is_manager_of(auth.uid(), user_id));

CREATE POLICY "Members view manager exercises" ON public.exercise_library FOR SELECT TO authenticated
USING (user_id = public.manager_of(auth.uid()));
CREATE POLICY "Members view manager categories" ON public.exercise_categories FOR SELECT TO authenticated
USING (user_id = public.manager_of(auth.uid()));
CREATE POLICY "Members view manager extras" ON public.exercise_extras FOR SELECT TO authenticated
USING (user_id = public.manager_of(auth.uid()));
CREATE POLICY "Members view manager exercise category links" ON public.exercise_library_categories FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.exercise_library el WHERE el.id = exercise_id AND el.user_id = public.manager_of(auth.uid())));
CREATE POLICY "Members view manager exercise extra links" ON public.exercise_library_extras FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.exercise_library el WHERE el.id = exercise_id AND el.user_id = public.manager_of(auth.uid())));

CREATE POLICY "Manager views member workouts" ON public.workout_plans FOR SELECT TO authenticated
USING (public.is_manager_of(auth.uid(), user_id));
CREATE POLICY "Manager views member workout exercises" ON public.workout_exercises FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.workout_plans wp WHERE wp.id = workout_plan_id AND public.is_manager_of(auth.uid(), wp.user_id)));