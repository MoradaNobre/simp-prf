
-- Allow anonymous users to view regionais (public data needed for signup)
CREATE POLICY "Anon can view regionais"
ON public.regionais
FOR SELECT
TO anon
USING (true);
