
-- Add user_id to contratos to link preposto account
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS preposto_user_id uuid REFERENCES auth.users(id);

-- Add user_id to contrato_contatos to link terceirizado account
ALTER TABLE public.contrato_contatos ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Update OS SELECT policy to allow preposto and terceirizado
DROP POLICY IF EXISTS "Authenticated can view OS" ON public.ordens_servico;
CREATE POLICY "Authenticated can view OS"
ON public.ordens_servico
FOR SELECT
USING (
  (has_role(auth.uid(), 'gestor_nacional') OR has_role(auth.uid(), 'gestor_regional') OR has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'operador'))
  OR
  (has_role(auth.uid(), 'preposto') AND contrato_id IN (
    SELECT id FROM public.contratos WHERE preposto_user_id = auth.uid()
  ))
  OR
  (has_role(auth.uid(), 'terceirizado') AND (
    responsavel_triagem_id IN (SELECT id FROM public.contrato_contatos WHERE user_id = auth.uid())
    OR responsavel_execucao_id IN (SELECT id FROM public.contrato_contatos WHERE user_id = auth.uid())
    OR responsavel_encerramento_id IN (SELECT id FROM public.contrato_contatos WHERE user_id = auth.uid())
  ))
);

-- Update OS UPDATE policy
DROP POLICY IF EXISTS "Managers can update OS" ON public.ordens_servico;
CREATE POLICY "Managers can update OS"
ON public.ordens_servico
FOR UPDATE
USING (
  (auth.uid() = solicitante_id)
  OR (auth.uid() = responsavel_id)
  OR has_role(auth.uid(), 'gestor_nacional')
  OR has_role(auth.uid(), 'gestor_regional')
  OR (has_role(auth.uid(), 'preposto') AND contrato_id IN (
    SELECT id FROM public.contratos WHERE preposto_user_id = auth.uid()
  ))
  OR (has_role(auth.uid(), 'terceirizado') AND (
    responsavel_triagem_id IN (SELECT id FROM public.contrato_contatos WHERE user_id = auth.uid())
    OR responsavel_execucao_id IN (SELECT id FROM public.contrato_contatos WHERE user_id = auth.uid())
    OR responsavel_encerramento_id IN (SELECT id FROM public.contrato_contatos WHERE user_id = auth.uid())
  ))
);

-- Update custos policy to include preposto and terceirizado
DROP POLICY IF EXISTS "Fiscais and admins can manage custos" ON public.os_custos;
CREATE POLICY "Authorized users can manage custos"
ON public.os_custos
FOR ALL
USING (
  has_role(auth.uid(), 'gestor_nacional')
  OR has_role(auth.uid(), 'fiscal_contrato')
  OR has_role(auth.uid(), 'preposto')
  OR has_role(auth.uid(), 'terceirizado')
);
