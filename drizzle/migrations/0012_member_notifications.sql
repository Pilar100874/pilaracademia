CREATE TABLE public.member_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  workout_plan_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX member_notifications_user_idx ON public.member_notifications(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_notifications TO authenticated;
GRANT ALL ON public.member_notifications TO service_role;
ALTER TABLE public.member_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications select" ON public.member_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications insert" ON public.member_notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own notifications update" ON public.member_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own notifications delete" ON public.member_notifications FOR DELETE TO authenticated USING (user_id = auth.uid());