
-- Allow gestor_nacional to update any profile (for ativo toggle, name changes, etc.)
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'gestor_nacional'::app_role))
WITH CHECK (has_role(auth.uid(), 'gestor_nacional'::app_role));
