
-- Create storage bucket for OS photos
INSERT INTO storage.buckets (id, name, public) VALUES ('os-fotos', 'os-fotos', true);

-- Authenticated users can upload files
CREATE POLICY "Authenticated users can upload OS photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'os-fotos');

-- Anyone can view OS photos (public bucket)
CREATE POLICY "Public can view OS photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'os-fotos');

-- Authenticated users can update their uploads
CREATE POLICY "Authenticated users can update OS photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'os-fotos');

-- Authenticated users can delete their uploads
CREATE POLICY "Authenticated users can delete OS photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'os-fotos');
