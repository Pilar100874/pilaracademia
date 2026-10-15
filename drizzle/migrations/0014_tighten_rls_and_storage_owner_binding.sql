-- master_settings: only master admins read it (app reads it only when isMaster; edge functions use the service role)
DROP POLICY "Anyone authenticated reads master settings" ON public.master_settings;
CREATE POLICY "Master admins read master settings" ON public.master_settings
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'master_admin'::app_role));

-- Remove anonymous permissive policies: no app code queries these tables anonymously
DROP POLICY "Anon insert execution log from tablet" ON public.execution_log;
DROP POLICY "Anon read sequence items for tablets" ON public.exercise_sequence_items;
DROP POLICY "Anon read equipment by token" ON public.clinic_equipment;
DROP POLICY "Anon read live_sessions for tablets" ON public.live_sessions;
DROP POLICY "Anon update live student progress" ON public.live_session_students;
DROP POLICY "Anon read live students for any equipment" ON public.live_session_students;

-- Storage: bind writes to the owner's folder (the app uploads to <user_id>/...)
DROP POLICY "Authenticated users can upload workout images" ON storage.objects;
CREATE POLICY "Authenticated users can upload workout images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'workout-images' AND (storage.foldername(name))[1] = (auth.uid())::text);
DROP POLICY "Users can update their workout images" ON storage.objects;
CREATE POLICY "Users can update their workout images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'workout-images' AND (storage.foldername(name))[1] = (auth.uid())::text);
DROP POLICY "Users can delete their workout images" ON storage.objects;
CREATE POLICY "Users can delete their workout images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'workout-images' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY "Authenticated upload clinic logos" ON storage.objects;
CREATE POLICY "Authenticated upload clinic logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'clinic-logos' AND (storage.foldername(name))[1] = (auth.uid())::text);
DROP POLICY "Authenticated update clinic logos" ON storage.objects;
CREATE POLICY "Authenticated update clinic logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'clinic-logos' AND (storage.foldername(name))[1] = (auth.uid())::text);
DROP POLICY "Authenticated delete clinic logos" ON storage.objects;
CREATE POLICY "Authenticated delete clinic logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'clinic-logos' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY "Auth upload student avatars" ON storage.objects;
CREATE POLICY "Auth upload student avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'student-avatars' AND (storage.foldername(name))[1] = (auth.uid())::text);
DROP POLICY "Auth update student avatars" ON storage.objects;
CREATE POLICY "Auth update student avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'student-avatars' AND (storage.foldername(name))[1] = (auth.uid())::text);
DROP POLICY "Auth delete student avatars" ON storage.objects;
CREATE POLICY "Auth delete student avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'student-avatars' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY "Authenticated upload marketing media" ON storage.objects;
CREATE POLICY "Authenticated upload marketing media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marketing-media' AND (storage.foldername(name))[1] = (auth.uid())::text);
DROP POLICY "Authenticated update marketing media" ON storage.objects;
CREATE POLICY "Authenticated update marketing media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'marketing-media' AND (storage.foldername(name))[1] = (auth.uid())::text);
DROP POLICY "Authenticated delete marketing media" ON storage.objects;
CREATE POLICY "Authenticated delete marketing media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'marketing-media' AND (storage.foldername(name))[1] = (auth.uid())::text);

-- Unused empty buckets: replace public listing with owner-only authenticated reads
DROP POLICY "Public read clinic logos" ON storage.objects;
CREATE POLICY "Owners read clinic logos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'clinic-logos' AND (storage.foldername(name))[1] = (auth.uid())::text);
DROP POLICY "Public read student avatars" ON storage.objects;
CREATE POLICY "Owners read student avatars" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'student-avatars' AND (storage.foldername(name))[1] = (auth.uid())::text);
DROP POLICY "Public read marketing media" ON storage.objects;
CREATE POLICY "Owners read marketing media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'marketing-media' AND (storage.foldername(name))[1] = (auth.uid())::text);