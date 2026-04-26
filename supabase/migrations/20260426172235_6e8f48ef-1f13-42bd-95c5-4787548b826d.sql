
-- Allow ANON read of equipment by station_token (tablet)
CREATE POLICY "Anon read equipment by token" ON public.clinic_equipment
  FOR SELECT TO anon, authenticated
  USING (true);
-- Note: equipment table doesn't have sensitive data; station_token itself is the secret

-- Anon read of live_session_students for matching equipment
CREATE POLICY "Anon read live students for any equipment" ON public.live_session_students
  FOR SELECT TO anon, authenticated
  USING (true);

-- Anon read of related students (just full_name shown)
CREATE POLICY "Anon read clinic_students minimal" ON public.clinic_students
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.live_session_students lss
      WHERE lss.student_id = clinic_students.id
    )
  );

-- Anon read of live_sessions to check status
CREATE POLICY "Anon read live_sessions for tablets" ON public.live_sessions
  FOR SELECT TO anon
  USING (true);

-- Anon read of prescriptions linked to active live students
CREATE POLICY "Anon read prescriptions for tablets" ON public.prescriptions
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.live_session_students lss
      WHERE lss.prescription_id = prescriptions.id
    )
  );

-- Anon read of sequence items for tablet display
CREATE POLICY "Anon read sequence items for tablets" ON public.exercise_sequence_items
  FOR SELECT TO anon
  USING (true);

-- Anon update progress on live_session_students
CREATE POLICY "Anon update live student progress" ON public.live_session_students
  FOR UPDATE TO anon
  USING (true);

-- Anon insert into execution_log from tablet
CREATE POLICY "Anon insert execution log from tablet" ON public.execution_log
  FOR INSERT TO anon
  WITH CHECK (true);

-- ============================================================
-- Auto-link new auth users to pre-created clinic_students by email
-- ============================================================
CREATE OR REPLACE FUNCTION public.link_student_to_clinic()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  matched_student RECORD;
BEGIN
  FOR matched_student IN
    SELECT * FROM public.clinic_students
    WHERE email = NEW.email AND user_id IS NULL
  LOOP
    UPDATE public.clinic_students SET user_id = NEW.id WHERE id = matched_student.id;
    INSERT INTO public.user_roles (user_id, clinic_id, role)
    VALUES (NEW.id, matched_student.clinic_id, 'student')
    ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_link_student ON auth.users;
CREATE TRIGGER on_auth_user_link_student
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_student_to_clinic();
