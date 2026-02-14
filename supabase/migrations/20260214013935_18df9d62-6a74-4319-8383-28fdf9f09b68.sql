
-- Drop and recreate the SELECT policy for ordens_servico
DROP POLICY IF EXISTS "Authenticated can view OS" ON public.ordens_servico;

CREATE POLICY "Authenticated can view OS"
ON public.ordens_servico
FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_nacional'::app_role)
  OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
  OR (
    (has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
    AND uop_id IS NOT NULL
    AND uop_id IN (
      SELECT u.id FROM uops u
      JOIN delegacias d ON u.delegacia_id = d.id
      WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    )
  )
  OR (
    has_role(auth.uid(), 'preposto'::app_role)
    AND contrato_id IN (SELECT id FROM contratos WHERE preposto_user_id = auth.uid())
  )
  OR (
    has_role(auth.uid(), 'terceirizado'::app_role)
    AND (
      responsavel_triagem_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
      OR responsavel_execucao_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
      OR responsavel_encerramento_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
    )
  )
);
