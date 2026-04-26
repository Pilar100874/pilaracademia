INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-logos', 'clinic-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read clinic logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'clinic-logos');

CREATE POLICY "Authenticated upload clinic logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'clinic-logos');

CREATE POLICY "Authenticated update clinic logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'clinic-logos');

CREATE POLICY "Authenticated delete clinic logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'clinic-logos');