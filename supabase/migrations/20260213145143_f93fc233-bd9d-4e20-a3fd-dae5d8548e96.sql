
-- Allow preposto to manage contatos on their own contracts
DROP POLICY IF EXISTS "Fiscais and admins can manage contatos" ON public.contrato_contatos;
CREATE POLICY "Authorized users can manage contatos"
ON public.contrato_contatos
FOR ALL
USING (
  has_role(auth.uid(), 'gestor_nacional')
  OR has_role(auth.uid(), 'fiscal_contrato')
  OR (has_role(auth.uid(), 'preposto') AND contrato_id IN (
    SELECT id FROM public.contratos WHERE preposto_user_id = auth.uid()
  ))
);

-- Allow preposto to view their own contracts
DROP POLICY IF EXISTS "Authenticated can view contratos" ON public.contratos;
CREATE POLICY "Authenticated can view contratos"
ON public.contratos
FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_nacional')
  OR has_role(auth.uid(), 'gestor_regional')
  OR has_role(auth.uid(), 'fiscal_contrato')
  OR has_role(auth.uid(), 'operador')
  OR (has_role(auth.uid(), 'preposto') AND preposto_user_id = auth.uid())
);
