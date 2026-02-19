
-- 1. Criar tabela de aditivos contratuais
CREATE TABLE public.contrato_aditivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL DEFAULT 0,
  descricao TEXT NOT NULL,
  numero_aditivo TEXT,
  data_aditivo DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contrato_aditivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view aditivos"
  ON public.contrato_aditivos FOR SELECT
  USING (true);

CREATE POLICY "Gestores e fiscais can manage aditivos"
  ON public.contrato_aditivos FOR ALL
  USING (
    has_role(auth.uid(), 'gestor_nacional'::app_role)
    OR (has_role(auth.uid(), 'gestor_regional'::app_role) AND contrato_id IN (
      SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    ))
    OR (has_role(auth.uid(), 'fiscal_contrato'::app_role) AND contrato_id IN (
      SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    ))
  )
  WITH CHECK (
    has_role(auth.uid(), 'gestor_nacional'::app_role)
    OR (has_role(auth.uid(), 'gestor_regional'::app_role) AND contrato_id IN (
      SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    ))
    OR (has_role(auth.uid(), 'fiscal_contrato'::app_role) AND contrato_id IN (
      SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    ))
  );

-- 2. Recriar a view contratos_saldo incluindo aditivos
DROP VIEW IF EXISTS public.contratos_saldo;

CREATE VIEW public.contratos_saldo WITH (security_invoker=on) AS
SELECT 
  c.id,
  c.numero,
  c.empresa,
  c.valor_total,
  COALESCE(adit.total_aditivos, 0::numeric) AS total_aditivos,
  c.valor_total + COALESCE(adit.total_aditivos, 0::numeric) AS valor_total_com_aditivos,
  COALESCE(sum(os.valor_orcamento), 0::numeric) AS total_custos,
  (c.valor_total + COALESCE(adit.total_aditivos, 0::numeric)) - COALESCE(sum(os.valor_orcamento), 0::numeric) AS saldo
FROM contratos c
LEFT JOIN ordens_servico os ON os.contrato_id = c.id 
  AND (os.status <> ALL (ARRAY['aberta'::os_status, 'orcamento'::os_status, 'autorizacao'::os_status]))
LEFT JOIN (
  SELECT contrato_id, SUM(valor) AS total_aditivos
  FROM contrato_aditivos
  GROUP BY contrato_id
) adit ON adit.contrato_id = c.id
GROUP BY c.id, c.numero, c.empresa, c.valor_total, adit.total_aditivos;
