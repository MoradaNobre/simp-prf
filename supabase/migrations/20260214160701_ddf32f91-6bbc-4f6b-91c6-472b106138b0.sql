
-- Fix: Allow terceirizados to see and update OS linked to contracts where they are a contato
-- DROP and recreate SELECT policy
DROP POLICY IF EXISTS "Authenticated can view OS" ON public.ordens_servico;

CREATE POLICY "Authenticated can view OS"
ON public.ordens_servico
FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_nacional'::app_role)
  OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
  OR (
    (has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
    AND (
      (regional_id IS NOT NULL AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
      OR (uop_id IS NOT NULL AND uop_id IN (
        SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id
        WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
      ))
    )
  )
  OR (
    has_role(auth.uid(), 'preposto'::app_role)
    AND contrato_id IN (SELECT id FROM contratos WHERE preposto_user_id = auth.uid())
  )
  OR (
    has_role(auth.uid(), 'terceirizado'::app_role)
    AND (
      contrato_id IN (
        SELECT cc.contrato_id FROM contrato_contatos cc WHERE cc.user_id = auth.uid()
      )
      OR responsavel_triagem_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
      OR responsavel_execucao_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
      OR responsavel_encerramento_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
    )
  )
);

-- Also fix UPDATE policy to allow terceirizados linked via contrato_id
DROP POLICY IF EXISTS "Managers can update OS" ON public.ordens_servico;

CREATE POLICY "Managers can update OS"
ON public.ordens_servico
FOR UPDATE
USING (
  auth.uid() = solicitante_id
  OR auth.uid() = responsavel_id
  OR has_role(auth.uid(), 'gestor_nacional'::app_role)
  OR has_role(auth.uid(), 'gestor_regional'::app_role)
  OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
  OR (
    has_role(auth.uid(), 'preposto'::app_role)
    AND contrato_id IN (SELECT id FROM contratos WHERE preposto_user_id = auth.uid())
  )
  OR (
    has_role(auth.uid(), 'terceirizado'::app_role)
    AND (
      contrato_id IN (SELECT cc.contrato_id FROM contrato_contatos cc WHERE cc.user_id = auth.uid())
      OR responsavel_triagem_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
      OR responsavel_execucao_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
      OR responsavel_encerramento_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
    )
  )
);
