CREATE OR REPLACE VIEW public.contratos_saldo AS
SELECT c.id,
    c.numero,
    c.empresa,
    c.valor_total,
    COALESCE(sum(os.valor_orcamento), 0::numeric) AS total_custos,
    c.valor_total - COALESCE(sum(os.valor_orcamento), 0::numeric) AS saldo
   FROM contratos c
     LEFT JOIN ordens_servico os ON os.contrato_id = c.id AND os.status NOT IN ('aberta', 'orcamento', 'autorizacao')
  GROUP BY c.id, c.numero, c.empresa, c.valor_total;