-- Restrict SELECT on regional_os_seq to authenticated users with regional scope
DROP POLICY IF EXISTS "Authenticated can view regional_os_seq" ON public.regional_os_seq;

CREATE POLICY "Scoped users can view regional_os_seq"
ON public.regional_os_seq
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR is_nacional(auth.uid())
  OR (
    has_role(auth.uid(), 'gestor_regional'::app_role)
    AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  )
  OR (
    has_role(auth.uid(), 'fiscal_contrato'::app_role)
    AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  )
);

-- Restrict SELECT on contrato_aditivos to role-based + regional scope
DROP POLICY IF EXISTS "Authenticated can view aditivos" ON public.contrato_aditivos;

CREATE POLICY "Scoped users can view aditivos"
ON public.contrato_aditivos
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR (
    is_nacional(auth.uid())
    AND contrato_id IN (
      SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    )
  )
  OR (
    (has_role(auth.uid(), 'gestor_regional'::app_role)
     OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
     OR has_role(auth.uid(), 'operador'::app_role))
    AND contrato_id IN (
      SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    )
  )
  OR (
    has_role(auth.uid(), 'preposto'::app_role)
    AND contrato_id IN (
      SELECT id FROM contratos WHERE preposto_user_id = auth.uid()
    )
  )
  OR (
    has_role(auth.uid(), 'terceirizado'::app_role)
    AND contrato_id IN (
      SELECT cc.contrato_id FROM contrato_contatos cc WHERE cc.user_id = auth.uid()
    )
  )
);

-- Restrict SELECT on limites_modalidade to role-based + regional scope
DROP POLICY IF EXISTS "Authenticated can view limits" ON public.limites_modalidade;

CREATE POLICY "Scoped users can view limits"
ON public.limites_modalidade
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR (
    is_nacional(auth.uid())
    AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  )
  OR (
    (has_role(auth.uid(), 'gestor_regional'::app_role)
     OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
     OR has_role(auth.uid(), 'operador'::app_role))
    AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  )
);