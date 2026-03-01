
-- =====================================================================
-- FIX: Convert role-specific RESTRICTIVE policies to PERMISSIVE
-- RESTRICTIVE policies are ANDed together, so role-specific ones
-- block users who don't match that specific role, even if other
-- policies would grant access. They must be PERMISSIVE (OR logic).
-- =====================================================================

-- 1. agendamentos_visita: "Terceirizado can manage agendamentos" was RESTRICTIVE
DROP POLICY IF EXISTS "Terceirizado can manage agendamentos" ON public.agendamentos_visita;
CREATE POLICY "Terceirizado can manage agendamentos"
ON public.agendamentos_visita
AS PERMISSIVE FOR ALL TO authenticated
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

-- 2. contrato_aditivos: "Scoped users can view aditivos" was RESTRICTIVE
DROP POLICY IF EXISTS "Scoped users can view aditivos" ON public.contrato_aditivos;
CREATE POLICY "Scoped users can view aditivos"
ON public.contrato_aditivos
AS PERMISSIVE FOR SELECT TO authenticated
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

-- 3. contrato_contatos: ALL 6 SELECT/ALL policies were RESTRICTIVE - fix all
DROP POLICY IF EXISTS "Admins can view all contatos" ON public.contrato_contatos;
CREATE POLICY "Admins can view all contatos"
ON public.contrato_contatos
AS PERMISSIVE FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authorized users can manage contatos" ON public.contrato_contatos;
CREATE POLICY "Authorized users can manage contatos"
ON public.contrato_contatos
AS PERMISSIVE FOR ALL TO authenticated
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND contrato_id IN (
    SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  ))
  OR (has_role(auth.uid(), 'fiscal_contrato') AND contrato_id IN (
    SELECT id FROM contratos WHERE regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  ))
  OR (has_role(auth.uid(), 'preposto') AND contrato_id = ANY(get_preposto_contrato_ids(auth.uid())))
);

DROP POLICY IF EXISTS "Nacional can view regional contatos" ON public.contrato_contatos;
CREATE POLICY "Nacional can view regional contatos"
ON public.contrato_contatos
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  is_nacional(auth.uid()) AND contrato_id IN (
    SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Preposto can view own contract contatos" ON public.contrato_contatos;
CREATE POLICY "Preposto can view own contract contatos"
ON public.contrato_contatos
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'preposto') AND contrato_id = ANY(get_preposto_contrato_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Regional and fiscal can view contatos" ON public.contrato_contatos;
CREATE POLICY "Regional and fiscal can view contatos"
ON public.contrato_contatos
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  (has_role(auth.uid(), 'gestor_regional') OR has_role(auth.uid(), 'fiscal_contrato'))
  AND contrato_id IN (
    SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Terceirizado can view own contract contatos" ON public.contrato_contatos;
CREATE POLICY "Terceirizado can view own contract contatos"
ON public.contrato_contatos
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'terceirizado') AND contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid()))
);

-- 4. contratos: "Authenticated can view contratos" was RESTRICTIVE
DROP POLICY IF EXISTS "Authenticated can view contratos" ON public.contratos;
CREATE POLICY "Authenticated can view contratos"
ON public.contratos
AS PERMISSIVE FOR SELECT TO authenticated
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

-- 5. ordens_servico: both policies were RESTRICTIVE
DROP POLICY IF EXISTS "Authenticated can view OS" ON public.ordens_servico;
CREATE POLICY "Authenticated can view OS"
ON public.ordens_servico
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    is_admin(auth.uid())
    OR (is_nacional(auth.uid()) AND (
      (regional_id IS NOT NULL AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
      OR (uop_id IS NOT NULL AND uop_id IN (
        SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id
        WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
      ))
    ))
    OR (has_role(auth.uid(), 'fiscal_contrato') AND (
      (regional_id IS NOT NULL AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
      OR (uop_id IS NOT NULL AND uop_id IN (
        SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id
        WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
      ))
    ))
    OR ((has_role(auth.uid(), 'gestor_regional') OR has_role(auth.uid(), 'operador')) AND (
      (regional_id IS NOT NULL AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
      OR (uop_id IS NOT NULL AND uop_id IN (
        SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id
        WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
      ))
    ))
    OR (has_role(auth.uid(), 'preposto') AND contrato_id = ANY(get_preposto_contrato_ids(auth.uid())))
    OR (has_role(auth.uid(), 'terceirizado') AND (
      contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid()))
      OR responsavel_execucao_id = auth.uid()
      OR responsavel_encerramento_id = auth.uid()
    ))
  )
);

DROP POLICY IF EXISTS "Scoped users can update OS" ON public.ordens_servico;
CREATE POLICY "Scoped users can update OS"
ON public.ordens_servico
AS PERMISSIVE FOR UPDATE TO authenticated
USING (
  auth.uid() = solicitante_id
  OR auth.uid() = responsavel_id
  OR is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND (
    regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    OR uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  ))
  OR (has_role(auth.uid(), 'gestor_regional') AND (
    regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    OR uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  ))
  OR (has_role(auth.uid(), 'fiscal_contrato') AND (
    regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    OR uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  ))
  OR (has_role(auth.uid(), 'preposto') AND contrato_id = ANY(get_preposto_contrato_ids(auth.uid())))
  OR (has_role(auth.uid(), 'terceirizado') AND (
    contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid()))
    OR responsavel_execucao_id = auth.uid()
  ))
);
