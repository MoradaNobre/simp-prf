
-- Add responsible person fields for each OS stage
ALTER TABLE public.ordens_servico
  ADD COLUMN responsavel_triagem_id uuid,
  ADD COLUMN responsavel_execucao_id uuid,
  ADD COLUMN responsavel_encerramento_id uuid;

-- Create a view for contract balance (valor_total - sum of custos)
CREATE OR REPLACE VIEW public.contratos_saldo AS
SELECT 
  c.id,
  c.numero,
  c.empresa,
  c.valor_total,
  COALESCE(SUM(oc.valor), 0) AS total_custos,
  c.valor_total - COALESCE(SUM(oc.valor), 0) AS saldo
FROM public.contratos c
LEFT JOIN public.ordens_servico os ON os.contrato_id = c.id
LEFT JOIN public.os_custos oc ON oc.os_id = os.id
GROUP BY c.id, c.numero, c.empresa, c.valor_total;
