
-- Allow gestor_nacional to update reports
CREATE POLICY "Gestor nacional can update reports"
ON public.relatorios_os
FOR UPDATE
USING (has_role(auth.uid(), 'gestor_nacional'::app_role))
WITH CHECK (has_role(auth.uid(), 'gestor_nacional'::app_role));

-- Allow gestor_nacional to delete reports
CREATE POLICY "Gestor nacional can delete reports"
ON public.relatorios_os
FOR DELETE
USING (has_role(auth.uid(), 'gestor_nacional'::app_role));
