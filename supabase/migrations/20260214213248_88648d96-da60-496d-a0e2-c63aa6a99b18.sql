
-- Table to store execution order reports (Ordem de Serviço para Execução)
CREATE TABLE public.relatorios_execucao (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  codigo_os text NOT NULL,
  titulo_os text NOT NULL,
  regional_id uuid REFERENCES public.regionais(id),
  contrato_id uuid REFERENCES public.contratos(id),
  contrato_numero text,
  contrato_empresa text,
  valor_orcamento numeric NOT NULL DEFAULT 0,
  dados_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  gerado_por_id uuid NOT NULL,
  gerado_em timestamp with time zone NOT NULL DEFAULT now(),
  email_enviado boolean NOT NULL DEFAULT false,
  email_destinatarios text[] DEFAULT '{}'::text[]
);

-- Enable RLS
ALTER TABLE public.relatorios_execucao ENABLE ROW LEVEL SECURITY;

-- Gestores e fiscais can view all
CREATE POLICY "Gestores e fiscais can view all exec reports"
ON public.relatorios_execucao
FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_nacional'::app_role)
  OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
);

-- Gestor regional can view regional reports
CREATE POLICY "Gestor regional can view regional exec reports"
ON public.relatorios_execucao
FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid())))
);

-- Preposto and terceirizado can view reports linked to their contracts
CREATE POLICY "Preposto can view exec reports of own contracts"
ON public.relatorios_execucao
FOR SELECT
USING (
  has_role(auth.uid(), 'preposto'::app_role)
  AND contrato_id IN (SELECT id FROM contratos WHERE preposto_user_id = auth.uid())
);

CREATE POLICY "Terceirizado can view exec reports of own contracts"
ON public.relatorios_execucao
FOR SELECT
USING (
  has_role(auth.uid(), 'terceirizado'::app_role)
  AND contrato_id IN (SELECT cc.contrato_id FROM contrato_contatos cc WHERE cc.user_id = auth.uid())
);

-- Authorized users can create reports
CREATE POLICY "Authorized users can create exec reports"
ON public.relatorios_execucao
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'gestor_nacional'::app_role)
  OR has_role(auth.uid(), 'gestor_regional'::app_role)
  OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
);

-- Only gestor_nacional can delete
CREATE POLICY "Gestor nacional can delete exec reports"
ON public.relatorios_execucao
FOR DELETE
USING (has_role(auth.uid(), 'gestor_nacional'::app_role));

-- Only gestor_nacional can update
CREATE POLICY "Gestor nacional can update exec reports"
ON public.relatorios_execucao
FOR UPDATE
USING (has_role(auth.uid(), 'gestor_nacional'::app_role))
WITH CHECK (has_role(auth.uid(), 'gestor_nacional'::app_role));
