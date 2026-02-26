
DROP POLICY "Gestores can update chamados" ON public.chamados;

CREATE POLICY "Gestores can update chamados"
ON public.chamados
FOR UPDATE
USING (
  (auth.uid() = solicitante_id)
  OR is_admin(auth.uid())
  OR (
    (is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role))
    AND (regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  )
);
