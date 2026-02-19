
-- =====================================================
-- Restringir fiscal_contrato às suas regionais vinculadas
-- =====================================================

-- 1. ORDENS_SERVICO: Remove fiscal from broad SELECT, add regional-restricted policy
DROP POLICY IF EXISTS "Authenticated can view OS" ON public.ordens_servico;

CREATE POLICY "Authenticated can view OS"
ON public.ordens_servico
FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_nacional'::app_role)
  OR (
    has_role(auth.uid(), 'fiscal_contrato'::app_role)
    AND (
      (regional_id IS NOT NULL AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
      OR (uop_id IS NOT NULL AND uop_id IN (
        SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id
        WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
      ))
    )
  )
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
      contrato_id IN (SELECT cc.contrato_id FROM contrato_contatos cc WHERE cc.user_id = auth.uid())
      OR responsavel_execucao_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
      OR responsavel_encerramento_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
    )
  )
);

-- 2. CONTRATOS: Restrict fiscal SELECT to their regionals
DROP POLICY IF EXISTS "Authenticated can view contratos" ON public.contratos;

CREATE POLICY "Authenticated can view contratos"
ON public.contratos
FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_nacional'::app_role)
  OR (
    has_role(auth.uid(), 'fiscal_contrato'::app_role)
    AND ((regional_id IS NULL) OR (regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  )
  OR (
    (has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
    AND ((regional_id IS NULL) OR (regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  )
  OR (
    has_role(auth.uid(), 'preposto'::app_role)
    AND preposto_user_id = auth.uid()
  )
);

-- 3. CONTRATOS: Restrict fiscal ALL (manage) to their regionals
DROP POLICY IF EXISTS "Fiscais and admins can manage contratos" ON public.contratos;

CREATE POLICY "Fiscais and admins can manage contratos"
ON public.contratos
FOR ALL
USING (
  has_role(auth.uid(), 'gestor_nacional'::app_role)
  OR (
    has_role(auth.uid(), 'fiscal_contrato'::app_role)
    AND ((regional_id IS NULL) OR (regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  )
);

-- 4. RELATORIOS_EXECUCAO: Restrict fiscal SELECT to their regionals
DROP POLICY IF EXISTS "Gestores e fiscais can view all exec reports" ON public.relatorios_execucao;

CREATE POLICY "Gestores e fiscais can view all exec reports"
ON public.relatorios_execucao
FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_nacional'::app_role)
  OR (
    has_role(auth.uid(), 'fiscal_contrato'::app_role)
    AND ((regional_id IS NULL) OR (regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  )
);

-- 5. RELATORIOS_OS: Restrict fiscal SELECT to their regionals
DROP POLICY IF EXISTS "Gestor nacional can view all reports" ON public.relatorios_os;

CREATE POLICY "Gestor nacional can view all reports"
ON public.relatorios_os
FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_nacional'::app_role)
  OR (
    has_role(auth.uid(), 'fiscal_contrato'::app_role)
    AND ((regional_id IS NULL) OR (regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  )
);

-- 6. CONTRATO_CONTATOS: Restrict fiscal management to contracts in their regionals
DROP POLICY IF EXISTS "Authorized users can manage contatos" ON public.contrato_contatos;

CREATE POLICY "Authorized users can manage contatos"
ON public.contrato_contatos
FOR ALL
USING (
  has_role(auth.uid(), 'gestor_nacional'::app_role)
  OR (
    has_role(auth.uid(), 'fiscal_contrato'::app_role)
    AND contrato_id IN (
      SELECT id FROM contratos
      WHERE regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    )
  )
  OR (
    has_role(auth.uid(), 'preposto'::app_role)
    AND contrato_id IN (SELECT id FROM contratos WHERE preposto_user_id = auth.uid())
  )
);

-- 7. SOLICITACOES_CREDITO: Restrict fiscal SELECT to their regionals
DROP POLICY IF EXISTS "Fiscal can view solicitacoes" ON public.solicitacoes_credito;

CREATE POLICY "Fiscal can view solicitacoes"
ON public.solicitacoes_credito
FOR SELECT
USING (
  has_role(auth.uid(), 'fiscal_contrato'::app_role)
  AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
);

-- 8. OS_CUSTOS: Restrict fiscal management to OS in their regionals
DROP POLICY IF EXISTS "Authorized users can manage custos" ON public.os_custos;

CREATE POLICY "Authorized users can manage custos"
ON public.os_custos
FOR ALL
USING (
  has_role(auth.uid(), 'gestor_nacional'::app_role)
  OR (
    has_role(auth.uid(), 'fiscal_contrato'::app_role)
    AND os_id IN (
      SELECT id FROM ordens_servico
      WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
      OR uop_id IN (
        SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id
        WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
      )
    )
  )
  OR has_role(auth.uid(), 'preposto'::app_role)
  OR has_role(auth.uid(), 'terceirizado'::app_role)
);
