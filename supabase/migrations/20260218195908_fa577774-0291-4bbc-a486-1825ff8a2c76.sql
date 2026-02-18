
-- Allow gestor_regional to insert contracts for their own regionais
CREATE POLICY "Gestor regional can insert contratos"
ON public.contratos
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND (regional_id IS NOT NULL)
  AND (regional_id IN (SELECT get_user_regional_ids(auth.uid())))
);

-- Allow gestor_regional to update contracts in their own regionais
CREATE POLICY "Gestor regional can update contratos"
ON public.contratos
FOR UPDATE
USING (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND (regional_id IS NOT NULL)
  AND (regional_id IN (SELECT get_user_regional_ids(auth.uid())))
);
