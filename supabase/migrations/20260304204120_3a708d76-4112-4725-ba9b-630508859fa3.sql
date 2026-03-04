-- Fix soft-delete RLS for Gestor Master on chamados and ordens_servico
-- Root issue: UPDATE was blocked at WITH CHECK phase during soft-delete PATCH

-- chamados
DROP POLICY IF EXISTS "Gestor master can update chamados" ON public.chamados;
CREATE POLICY "Gestor master can update chamados"
ON public.chamados
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'gestor_master'::public.app_role))
WITH CHECK (true);

-- ordens_servico
DROP POLICY IF EXISTS "Gestor master can update OS" ON public.ordens_servico;
CREATE POLICY "Gestor master can update OS"
ON public.ordens_servico
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'gestor_master'::public.app_role))
WITH CHECK (true);