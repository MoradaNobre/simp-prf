
CREATE POLICY "Gestor regional can delete contratos"
ON public.contratos
FOR DELETE
USING (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND regional_id IS NOT NULL
  AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
);
