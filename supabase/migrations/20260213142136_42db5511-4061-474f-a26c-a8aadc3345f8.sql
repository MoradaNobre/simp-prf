-- Allow managers to delete OS
CREATE POLICY "Managers can delete OS"
ON public.ordens_servico
FOR DELETE
USING (
  auth.uid() = solicitante_id
  OR has_role(auth.uid(), 'gestor_nacional'::app_role)
  OR has_role(auth.uid(), 'gestor_regional'::app_role)
);