
-- Fix agendamentos_visita "Terceirizado can manage agendamentos" to use security definer function
DROP POLICY IF EXISTS "Terceirizado can manage agendamentos" ON public.agendamentos_visita;

CREATE POLICY "Terceirizado can manage agendamentos"
ON public.agendamentos_visita
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'terceirizado') AND os_id IN (
    SELECT os.id FROM ordens_servico os
    WHERE os.contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid()))
  )
)
WITH CHECK (
  has_role(auth.uid(), 'terceirizado') AND os_id IN (
    SELECT os.id FROM ordens_servico os
    WHERE os.contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid()))
  )
);

-- Fix contrato_aditivos "Scoped users can view aditivos" for terceirizado
DROP POLICY IF EXISTS "Scoped users can view aditivos" ON public.contrato_aditivos;

CREATE POLICY "Scoped users can view aditivos"
ON public.contrato_aditivos
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND contrato_id IN (
    SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  ))
  OR ((has_role(auth.uid(), 'gestor_regional') OR has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'operador'))
    AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  OR (has_role(auth.uid(), 'preposto') AND contrato_id = ANY(get_preposto_contrato_ids(auth.uid())))
  OR (has_role(auth.uid(), 'terceirizado') AND contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid())))
);

-- Fix contratos "Authenticated can view contratos" for terceirizado  
DROP POLICY IF EXISTS "Authenticated can view contratos" ON public.contratos;

CREATE POLICY "Authenticated can view contratos"
ON public.contratos
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL AND (
    is_admin(auth.uid())
    OR (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
    OR (has_role(auth.uid(), 'fiscal_contrato') AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
    OR ((has_role(auth.uid(), 'gestor_regional') OR has_role(auth.uid(), 'operador')) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
    OR (has_role(auth.uid(), 'preposto') AND preposto_user_id = auth.uid())
    OR (has_role(auth.uid(), 'terceirizado') AND id = ANY(get_terceirizado_contrato_ids(auth.uid())))
  )
);
