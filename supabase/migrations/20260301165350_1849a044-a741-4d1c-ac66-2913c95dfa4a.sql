
-- Fix ordens_servico SELECT policy to use security definer functions instead of contrato_contatos subqueries
DROP POLICY IF EXISTS "Authenticated can view OS" ON public.ordens_servico;

CREATE POLICY "Authenticated can view OS"
ON public.ordens_servico
AS RESTRICTIVE
FOR SELECT
TO authenticated
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

-- Fix ordens_servico UPDATE policy
DROP POLICY IF EXISTS "Scoped users can update OS" ON public.ordens_servico;

CREATE POLICY "Scoped users can update OS"
ON public.ordens_servico
AS RESTRICTIVE
FOR UPDATE
TO authenticated
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

-- Fix profiles "Preposto can view contract profiles" to use security definer function
DROP POLICY IF EXISTS "Preposto can view contract profiles" ON public.profiles;

CREATE POLICY "Preposto can view contract profiles"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'preposto') AND (
    user_id = auth.uid()
    OR user_id IN (
      SELECT cc.user_id FROM contrato_contatos cc
      WHERE cc.contrato_id = ANY(get_preposto_contrato_ids(auth.uid()))
      AND cc.user_id IS NOT NULL
    )
  )
);
