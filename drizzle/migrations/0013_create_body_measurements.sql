CREATE TABLE public.body_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  measured_at date NOT NULL DEFAULT CURRENT_DATE,
  neck_cm numeric(6,1),
  shoulders_cm numeric(6,1),
  chest_cm numeric(6,1),
  waist_cm numeric(6,1),
  abdomen_cm numeric(6,1),
  hip_cm numeric(6,1),
  arm_left_cm numeric(6,1),
  arm_right_cm numeric(6,1),
  forearm_left_cm numeric(6,1),
  forearm_right_cm numeric(6,1),
  thigh_left_cm numeric(6,1),
  thigh_right_cm numeric(6,1),
  calf_left_cm numeric(6,1),
  calf_right_cm numeric(6,1),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_measurements TO authenticated;
GRANT ALL ON public.body_measurements TO service_role;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own measurements" ON public.body_measurements FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Managers read members measurements" ON public.body_measurements FOR SELECT TO authenticated USING (public.is_manager_of(auth.uid(), user_id));
CREATE TRIGGER body_measurements_updated_at BEFORE UPDATE ON public.body_measurements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();