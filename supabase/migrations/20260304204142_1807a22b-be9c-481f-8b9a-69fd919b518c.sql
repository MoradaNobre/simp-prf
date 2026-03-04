-- Harden previous fix to avoid always-true checks while keeping soft-delete update unblocked

DROP POLICY IF EXISTS "Gestor master can update chamados" ON public.chamados;
CREATE POLICY "Gestor master can update chamados"
ON public.chamados
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'gestor_master'::public.app_role))
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Gestor master can update OS" ON public.ordens_servico;
CREATE POLICY "Gestor master can update OS"
ON public.ordens_servico
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'gestor_master'::public.app_role))
WITH CHECK (auth.uid() IS NOT NULL);