-- Fix critical RLS regression: SELECT policies were RESTRICTIVE without a PERMISSIVE counterpart,
-- causing empty result sets even for authorized users.

-- chamados
DROP POLICY IF EXISTS "Users can view chamados" ON public.chamados;
CREATE POLICY "Users can view chamados"
ON public.chamados
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  (deleted_at IS NULL)
  AND (
    auth.uid() = solicitante_id
    OR is_admin(auth.uid())
    OR (
      is_nacional(auth.uid())
      AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    )
    OR (
      (
        has_role(auth.uid(), 'gestor_regional'::app_role)
        OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
        OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role)
        OR has_role(auth.uid(), 'operador'::app_role)
      )
      AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    )
  )
);

-- ordens_servico
DROP POLICY IF EXISTS "Authenticated can view OS" ON public.ordens_servico;
CREATE POLICY "Authenticated can view OS"
ON public.ordens_servico
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  (deleted_at IS NULL)
  AND (
    is_admin(auth.uid())
    OR (
      is_nacional(auth.uid())
      AND (
        (regional_id IS NOT NULL AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
        OR (
          uop_id IS NOT NULL
          AND uop_id IN (
            SELECT u.id
            FROM public.uops u
            JOIN public.delegacias d ON d.id = u.delegacia_id
            WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
          )
        )
      )
    )
    OR (
      (
        has_role(auth.uid(), 'fiscal_contrato'::app_role)
        OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role)
      )
      AND (
        (regional_id IS NOT NULL AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
        OR (
          uop_id IS NOT NULL
          AND uop_id IN (
            SELECT u.id
            FROM public.uops u
            JOIN public.delegacias d ON d.id = u.delegacia_id
            WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
          )
        )
      )
    )
    OR (
      (
        has_role(auth.uid(), 'gestor_regional'::app_role)
        OR has_role(auth.uid(), 'operador'::app_role)
      )
      AND (
        (regional_id IS NOT NULL AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
        OR (
          uop_id IS NOT NULL
          AND uop_id IN (
            SELECT u.id
            FROM public.uops u
            JOIN public.delegacias d ON d.id = u.delegacia_id
            WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
          )
        )
      )
    )
    OR (
      has_role(auth.uid(), 'preposto'::app_role)
      AND contrato_id = ANY (get_preposto_contrato_ids(auth.uid()))
    )
    OR (
      has_role(auth.uid(), 'terceirizado'::app_role)
      AND (
        contrato_id = ANY (get_terceirizado_contrato_ids(auth.uid()))
        OR responsavel_execucao_id = auth.uid()
        OR responsavel_encerramento_id = auth.uid()
      )
    )
  )
);

-- contratos
DROP POLICY IF EXISTS "Authenticated can view contratos" ON public.contratos;
CREATE POLICY "Authenticated can view contratos"
ON public.contratos
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  (deleted_at IS NULL)
  AND (
    is_admin(auth.uid())
    OR (
      is_nacional(auth.uid())
      AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    )
    OR (
      (
        has_role(auth.uid(), 'fiscal_contrato'::app_role)
        OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role)
      )
      AND (
        regional_id IS NULL
        OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))
      )
    )
    OR (
      (
        has_role(auth.uid(), 'gestor_regional'::app_role)
        OR has_role(auth.uid(), 'operador'::app_role)
      )
      AND (
        regional_id IS NULL
        OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))
      )
    )
    OR (
      has_role(auth.uid(), 'preposto'::app_role)
      AND preposto_user_id = auth.uid()
    )
    OR (
      has_role(auth.uid(), 'terceirizado'::app_role)
      AND id = ANY (get_terceirizado_contrato_ids(auth.uid()))
    )
  )
);

-- contrato_aditivos
DROP POLICY IF EXISTS "Scoped users can view aditivos" ON public.contrato_aditivos;
CREATE POLICY "Scoped users can view aditivos"
ON public.contrato_aditivos
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR (
    is_nacional(auth.uid())
    AND contrato_id IN (
      SELECT c.id
      FROM public.contratos c
      WHERE c.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    )
  )
  OR (
    (
      has_role(auth.uid(), 'gestor_regional'::app_role)
      OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
      OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role)
      OR has_role(auth.uid(), 'operador'::app_role)
    )
    AND contrato_id IN (
      SELECT c.id
      FROM public.contratos c
      WHERE c.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    )
  )
  OR (
    has_role(auth.uid(), 'preposto'::app_role)
    AND contrato_id = ANY (get_preposto_contrato_ids(auth.uid()))
  )
  OR (
    has_role(auth.uid(), 'terceirizado'::app_role)
    AND contrato_id = ANY (get_terceirizado_contrato_ids(auth.uid()))
  )
);