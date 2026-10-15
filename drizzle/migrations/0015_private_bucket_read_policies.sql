-- Lecture privée des buckets : propriétaire du dossier, ou média référencé par une ligne lisible (bibliothèque partagée, treinos)
DROP POLICY "Exercise videos are publicly accessible" ON storage.objects;
CREATE POLICY "Read own or shared library exercise videos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'exercise-videos' AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR EXISTS (
        SELECT 1 FROM public.exercise_library el
        WHERE position(('/exercise-videos/' || name) IN el.video_url) > 0
      )
    )
  );

DROP POLICY "Anyone can view workout images" ON storage.objects;
CREATE POLICY "Read own or shared workout images" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'workout-images' AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR EXISTS (
        SELECT 1 FROM public.exercise_library el
        WHERE position(('/workout-images/' || name) IN el.image_urls::text) > 0
      )
      OR EXISTS (
        SELECT 1 FROM public.workout_exercises we
        WHERE position(('/workout-images/' || name) IN we.image_url) > 0
      )
    )
  );

DROP POLICY "Body reports are publicly readable" ON storage.objects;
CREATE POLICY "Owners read body analysis reports" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'body-analysis-reports' AND (storage.foldername(name))[1] = (auth.uid())::text);

DROP POLICY "Anyone can view product images" ON storage.objects;
CREATE POLICY "Read own or shared product images" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'product-images' AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR EXISTS (
        SELECT 1 FROM public.custom_products cp
        WHERE position(('/product-images/' || name) IN cp.image_url) > 0
      )
    )
  );