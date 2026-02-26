
-- Revert: remove preposto and terceirizado from SELECT policy
DROP POLICY IF EXISTS "Users can view chamados" ON public.chamados;

CREATE POLICY "Users can view chamados"
ON public.chamados FOR SELECT TO authenticated
USING (
  (auth.uid() = solicitante_id)
  OR is_admin(auth.uid())
  OR (
    (is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
    AND (regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  )
);

-- Also restrict INSERT: only operador + gestores + fiscais can create
DROP POLICY IF EXISTS "Users can create chamados" ON public.chamados;

CREATE POLICY "Users can create chamados"
ON public.chamados FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = solicitante_id
  AND NOT has_role(auth.uid(), 'preposto'::app_role)
  AND NOT has_role(auth.uid(), 'terceirizado'::app_role)
);
