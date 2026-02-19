-- 1. Allow fiscal_contrato to view orcamento_anual for their regionals
CREATE POLICY "Fiscal can view own orcamento"
ON public.orcamento_anual
FOR SELECT
USING (
  has_role(auth.uid(), 'fiscal_contrato'::app_role)
  AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
);

-- 2. Allow fiscal_contrato to view orcamento_creditos for their regionals
CREATE POLICY "Fiscal can view own creditos"
ON public.orcamento_creditos
FOR SELECT
USING (
  has_role(auth.uid(), 'fiscal_contrato'::app_role)
  AND orcamento_id IN (
    SELECT id FROM orcamento_anual
    WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  )
);

-- 3. Allow fiscal_contrato to view orcamento_empenhos for their regionals
CREATE POLICY "Fiscal can view own empenhos"
ON public.orcamento_empenhos
FOR SELECT
USING (
  has_role(auth.uid(), 'fiscal_contrato'::app_role)
  AND orcamento_id IN (
    SELECT id FROM orcamento_anual
    WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  )
);

-- 4. Allow fiscal_contrato to INSERT solicitacoes_credito for their regionals
CREATE POLICY "Fiscal can create solicitacoes"
ON public.solicitacoes_credito
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'fiscal_contrato'::app_role)
  AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
);