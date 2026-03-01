-- =============================================
-- 1. Deny anonymous access to profiles
-- =============================================
CREATE POLICY "Deny anon access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- =============================================
-- 2. Deny anonymous access to contrato_contatos
-- =============================================
CREATE POLICY "Deny anon access to contrato_contatos"
ON public.contrato_contatos
FOR ALL
TO anon
USING (false);

-- =============================================
-- 3. Restrict audit_logs INSERT to triggers only
--    (SECURITY DEFINER triggers bypass RLS, so WITH CHECK (false) blocks direct inserts)
-- =============================================
DROP POLICY IF EXISTS "System can insert logs" ON public.audit_logs;

CREATE POLICY "Only triggers can insert logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (false);

-- =============================================
-- 4. Restrict edge_function_logs INSERT to own records only
-- =============================================
DROP POLICY IF EXISTS "System can insert logs" ON public.edge_function_logs;

CREATE POLICY "Authenticated can insert own logs"
ON public.edge_function_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = caller_id);

-- =============================================
-- 5. Tighten ordens_servico UPDATE policy with regional scope
-- =============================================
DROP POLICY IF EXISTS "Managers can update OS" ON public.ordens_servico;

CREATE POLICY "Scoped users can update OS"
ON public.ordens_servico
FOR UPDATE
TO authenticated
USING (
  -- Owner/responsible
  auth.uid() = solicitante_id
  OR auth.uid() = responsavel_id
  -- Admin: global
  OR is_admin(auth.uid())
  -- Nacional: scoped to their regionals
  OR (is_nacional(auth.uid()) AND (
    regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    OR uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  ))
  -- Regional manager: scoped
  OR (has_role(auth.uid(), 'gestor_regional'::app_role) AND (
    regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    OR uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  ))
  -- Fiscal: scoped
  OR (has_role(auth.uid(), 'fiscal_contrato'::app_role) AND (
    regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    OR uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  ))
  -- Preposto: own contracts only
  OR (has_role(auth.uid(), 'preposto'::app_role) AND contrato_id IN (
    SELECT id FROM contratos WHERE preposto_user_id = auth.uid()
  ))
  -- Terceirizado: own contract assignments only
  OR (has_role(auth.uid(), 'terceirizado'::app_role) AND (
    contrato_id IN (SELECT contrato_id FROM contrato_contatos WHERE user_id = auth.uid())
    OR responsavel_execucao_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
  ))
);

-- =============================================
-- 6. Simplify chamados INSERT policy
-- =============================================
DROP POLICY IF EXISTS "Users can create chamados" ON public.chamados;

CREATE POLICY "Users can create chamados"
ON public.chamados
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = solicitante_id
  AND NOT has_role(auth.uid(), 'preposto'::app_role)
  AND NOT has_role(auth.uid(), 'terceirizado'::app_role)
  AND (
    is_admin(auth.uid())
    OR is_nacional(auth.uid())
    OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  )
);