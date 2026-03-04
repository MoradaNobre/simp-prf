-- Grant explicit write permissions for Gestor Master on soft-delete tables

-- ORDENS DE SERVIÇO
DROP POLICY IF EXISTS "Gestor master can update OS" ON public.ordens_servico;
CREATE POLICY "Gestor master can update OS"
ON public.ordens_servico
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'gestor_master'::app_role))
WITH CHECK (has_role(auth.uid(), 'gestor_master'::app_role));

DROP POLICY IF EXISTS "Gestor master can delete OS" ON public.ordens_servico;
CREATE POLICY "Gestor master can delete OS"
ON public.ordens_servico
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'gestor_master'::app_role));

-- CHAMADOS
DROP POLICY IF EXISTS "Gestor master can update chamados" ON public.chamados;
CREATE POLICY "Gestor master can update chamados"
ON public.chamados
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'gestor_master'::app_role))
WITH CHECK (has_role(auth.uid(), 'gestor_master'::app_role));

DROP POLICY IF EXISTS "Gestor master can delete chamados" ON public.chamados;
CREATE POLICY "Gestor master can delete chamados"
ON public.chamados
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'gestor_master'::app_role));