
DROP POLICY IF EXISTS "Users can view chamados" ON public.chamados;

CREATE POLICY "Users can view chamados"
ON public.chamados
FOR SELECT
TO authenticated
USING (
  -- Sempre pode ver os próprios
  (auth.uid() = solicitante_id)
  -- Gestor Master vê tudo
  OR is_admin(auth.uid())
  -- Gestor Nacional vê chamados das suas regionais
  OR (is_nacional(auth.uid()) AND (regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  -- Gestor Regional, Fiscal e Operador veem chamados das suas regionais
  OR (
    (has_role(auth.uid(), 'gestor_regional'::app_role)
     OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
     OR has_role(auth.uid(), 'operador'::app_role))
    AND (regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  )
);
