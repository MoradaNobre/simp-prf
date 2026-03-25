
-- Allow gestor_regional, fiscal_contrato and auxiliar_fiscal to view audit_logs
-- scoped to their own regionals (via OS record_id matching)
CREATE POLICY "Regional and fiscal can view logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
  OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role)
);
