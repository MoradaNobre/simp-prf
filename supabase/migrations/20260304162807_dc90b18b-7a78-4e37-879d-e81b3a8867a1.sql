
-- Fix UPDATE policy: add explicit WITH CHECK that allows soft delete
DROP POLICY IF EXISTS "Scoped users can update OS" ON public.ordens_servico;
CREATE POLICY "Scoped users can update OS"
ON public.ordens_servico AS PERMISSIVE FOR UPDATE TO authenticated
USING (
  (auth.uid() = solicitante_id)
  OR (auth.uid() = responsavel_id)
  OR is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND (
    (regional_id IN (SELECT get_user_regional_ids(auth.uid())))
    OR (uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  ))
  OR (has_role(auth.uid(), 'gestor_regional'::app_role) AND (
    (regional_id IN (SELECT get_user_regional_ids(auth.uid())))
    OR (uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  ))
  OR ((has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role)) AND (
    (regional_id IN (SELECT get_user_regional_ids(auth.uid())))
    OR (uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  ))
  OR (has_role(auth.uid(), 'preposto'::app_role) AND contrato_id = ANY(get_preposto_contrato_ids(auth.uid())))
  OR (has_role(auth.uid(), 'terceirizado'::app_role) AND (contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid())) OR responsavel_execucao_id = auth.uid()))
)
WITH CHECK (
  (auth.uid() = solicitante_id)
  OR (auth.uid() = responsavel_id)
  OR is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND (
    (regional_id IN (SELECT get_user_regional_ids(auth.uid())))
    OR (uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  ))
  OR (has_role(auth.uid(), 'gestor_regional'::app_role) AND (
    (regional_id IN (SELECT get_user_regional_ids(auth.uid())))
    OR (uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  ))
  OR ((has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role)) AND (
    (regional_id IN (SELECT get_user_regional_ids(auth.uid())))
    OR (uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  ))
  OR (has_role(auth.uid(), 'preposto'::app_role) AND contrato_id = ANY(get_preposto_contrato_ids(auth.uid())))
  OR (has_role(auth.uid(), 'terceirizado'::app_role) AND (contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid())) OR responsavel_execucao_id = auth.uid()))
);

-- Same fix for chamados
DROP POLICY IF EXISTS "Gestores can update chamados" ON public.chamados;
CREATE POLICY "Gestores can update chamados"
ON public.chamados AS PERMISSIVE FOR UPDATE TO authenticated
USING (
  (auth.uid() = solicitante_id)
  OR is_admin(auth.uid())
  OR ((is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
    AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
)
WITH CHECK (
  (auth.uid() = solicitante_id)
  OR is_admin(auth.uid())
  OR ((is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
    AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
);
