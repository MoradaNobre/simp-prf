CREATE POLICY "Gestor nacional can delete logs"
ON public.audit_logs
FOR DELETE
USING (has_role(auth.uid(), 'gestor_nacional'::app_role));