
-- Update SELECT policies to filter soft-deleted records

-- ordens_servico
DROP POLICY IF EXISTS "Authenticated can view OS" ON public.ordens_servico;
CREATE POLICY "Authenticated can view OS" ON public.ordens_servico FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    is_admin(auth.uid()) OR
    (is_nacional(auth.uid()) AND (
      (regional_id IS NOT NULL AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))) OR
      (uop_id IS NOT NULL AND uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
    )) OR
    (has_role(auth.uid(), 'fiscal_contrato') AND (
      (regional_id IS NOT NULL AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))) OR
      (uop_id IS NOT NULL AND uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
    )) OR
    ((has_role(auth.uid(), 'gestor_regional') OR has_role(auth.uid(), 'operador')) AND (
      (regional_id IS NOT NULL AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))) OR
      (uop_id IS NOT NULL AND uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
    )) OR
    (has_role(auth.uid(), 'preposto') AND contrato_id IN (SELECT id FROM contratos WHERE preposto_user_id = auth.uid())) OR
    (has_role(auth.uid(), 'terceirizado') AND (
      contrato_id IN (SELECT contrato_id FROM contrato_contatos WHERE user_id = auth.uid()) OR
      responsavel_execucao_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid()) OR
      responsavel_encerramento_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
    ))
  )
);

-- chamados
DROP POLICY IF EXISTS "Users can view chamados" ON public.chamados;
CREATE POLICY "Users can view chamados" ON public.chamados FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    auth.uid() = solicitante_id OR
    is_admin(auth.uid()) OR
    (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))) OR
    ((has_role(auth.uid(), 'gestor_regional') OR has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'operador')) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  )
);

-- contratos
DROP POLICY IF EXISTS "Authenticated can view contratos" ON public.contratos;
CREATE POLICY "Authenticated can view contratos" ON public.contratos FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    is_admin(auth.uid()) OR
    (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))) OR
    (has_role(auth.uid(), 'fiscal_contrato') AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid())))) OR
    ((has_role(auth.uid(), 'gestor_regional') OR has_role(auth.uid(), 'operador')) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid())))) OR
    (has_role(auth.uid(), 'preposto') AND preposto_user_id = auth.uid())
  )
);

-- Remove DELETE policies (no more hard deletes)
DROP POLICY IF EXISTS "Managers can delete OS" ON public.ordens_servico;
DROP POLICY IF EXISTS "Gestores can delete chamados" ON public.chamados;
DROP POLICY IF EXISTS "Gestor regional can delete contratos" ON public.contratos;

-- Recreate contratos_saldo view filtering soft-deleted
DROP VIEW IF EXISTS public.contratos_saldo;
CREATE VIEW public.contratos_saldo WITH (security_invoker = on) AS
SELECT c.id, c.numero, c.empresa, c.valor_total,
  COALESCE(SUM(oc.valor), 0) AS total_custos,
  COALESCE((SELECT SUM(ca.valor) FROM contrato_aditivos ca WHERE ca.contrato_id = c.id), 0) AS total_aditivos,
  c.valor_total + COALESCE((SELECT SUM(ca.valor) FROM contrato_aditivos ca WHERE ca.contrato_id = c.id), 0) AS valor_total_com_aditivos,
  c.valor_total + COALESCE((SELECT SUM(ca.valor) FROM contrato_aditivos ca WHERE ca.contrato_id = c.id), 0) - COALESCE(SUM(oc.valor), 0) AS saldo
FROM contratos c
LEFT JOIN ordens_servico os ON os.contrato_id = c.id AND os.deleted_at IS NULL
LEFT JOIN os_custos oc ON oc.os_id = os.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.numero, c.empresa, c.valor_total;
