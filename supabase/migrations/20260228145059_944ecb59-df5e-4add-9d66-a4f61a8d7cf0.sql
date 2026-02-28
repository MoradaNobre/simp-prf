
-- Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'os-fotos';

-- RLS policies for storage.objects on os-fotos bucket
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload to os-fotos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'os-fotos');

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read os-fotos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'os-fotos');

-- Allow authenticated users to update their files
CREATE POLICY "Authenticated users can update os-fotos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'os-fotos');
