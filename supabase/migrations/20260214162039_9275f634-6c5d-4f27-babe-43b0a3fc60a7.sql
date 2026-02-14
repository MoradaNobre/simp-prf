
-- Table to store generated OS reports for re-download
CREATE TABLE public.relatorios_os (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  os_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  codigo_os TEXT NOT NULL,
  titulo_os TEXT NOT NULL,
  valor_atestado NUMERIC NOT NULL DEFAULT 0,
  gerado_por_id UUID NOT NULL,
  gerado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  dados_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  regional_id UUID REFERENCES public.regionais(id),
  contrato_numero TEXT,
  contrato_empresa TEXT
);

-- Enable RLS
ALTER TABLE public.relatorios_os ENABLE ROW LEVEL SECURITY;

-- Gestores nacionais and fiscais can view all reports
CREATE POLICY "Gestor nacional can view all reports"
ON public.relatorios_os
FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_nacional'::app_role)
  OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
);

-- Gestor regional can view reports from their regionals
CREATE POLICY "Gestor regional can view regional reports"
ON public.relatorios_os
FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND (
    regional_id IS NULL
    OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  )
);

-- Authorized users can insert reports
CREATE POLICY "Authorized users can create reports"
ON public.relatorios_os
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'gestor_nacional'::app_role)
  OR has_role(auth.uid(), 'gestor_regional'::app_role)
  OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
);
