
-- Fix contratos: convert ALL RESTRICTIVE policies to PERMISSIVE

-- 1. "Admins and fiscais can manage contratos" (ALL)
DROP POLICY IF EXISTS "Admins and fiscais can manage contratos" ON public.contratos;
CREATE POLICY "Admins and fiscais can manage contratos"
ON public.contratos AS PERMISSIVE FOR ALL TO authenticated
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

-- 2. "Authenticated can view contratos" (SELECT)
DROP POLICY IF EXISTS "Authenticated can view contratos" ON public.contratos;
CREATE POLICY "Authenticated can view contratos"
ON public.contratos AS PERMISSIVE FOR SELECT TO authenticated
USING (
  (deleted_at IS NULL) AND (
    is_admin(auth.uid())
    OR (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
    OR ((has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
      AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
    OR ((has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
      AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
    OR (has_role(auth.uid(), 'preposto'::app_role) AND preposto_user_id = auth.uid())
    OR (has_role(auth.uid(), 'terceirizado'::app_role) AND id = ANY(get_terceirizado_contrato_ids(auth.uid())))
  )
);

-- 3. "Gestor regional can insert contratos" (INSERT)
DROP POLICY IF EXISTS "Gestor regional can insert contratos" ON public.contratos;
CREATE POLICY "Gestor regional can insert contratos"
ON public.contratos AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND regional_id IS NOT NULL
  AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
);

-- 4. "Gestor regional can update contratos" (UPDATE)
DROP POLICY IF EXISTS "Gestor regional can update contratos" ON public.contratos;
CREATE POLICY "Gestor regional can update contratos"
ON public.contratos AS PERMISSIVE FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND regional_id IS NOT NULL
  AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND regional_id IS NOT NULL
  AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
);
