-- Fix contratos RLS for soft delete visibility:
-- remove ALL policy (it also grants SELECT and was exposing deleted rows to gestor_master)
-- and recreate explicit write-only policies.

DROP POLICY IF EXISTS "Admins and fiscais can manage contratos" ON public.contratos;

CREATE POLICY "Admins and fiscais can insert contratos"
ON public.contratos
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  OR ((has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
    AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
);

CREATE POLICY "Admins and fiscais can update contratos"
ON public.contratos
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  OR ((has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
    AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
)
WITH CHECK (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  OR ((has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
    AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
);

CREATE POLICY "Admins and fiscais can delete contratos"
ON public.contratos
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  OR ((has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
    AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
);