CREATE OR REPLACE VIEW public.vw_orcamento_regional_saldo AS
SELECT oa.id AS orcamento_id,
    oa.regional_id,
    oa.exercicio,
    oa.valor_dotacao,
    COALESCE(cr.total_creditos, 0::numeric) AS total_creditos,
    COALESCE(emp.total_empenhos, 0::numeric) AS total_empenhos,
    COALESCE(osc.total_consumo_os, 0::numeric) AS total_consumo_os,
    oa.valor_dotacao + COALESCE(cr.total_creditos, 0::numeric) - COALESCE(osc.total_consumo_os, 0::numeric) AS saldo_disponivel,
    oa.valor_dotacao + COALESCE(cr.total_creditos, 0::numeric) - COALESCE(emp.total_empenhos, 0::numeric) AS credito_nao_empenhado
   FROM orcamento_anual oa
     LEFT JOIN LATERAL ( SELECT sum(oc.valor) AS total_creditos
           FROM orcamento_creditos oc
          WHERE oc.orcamento_id = oa.id) cr ON true
     LEFT JOIN LATERAL ( SELECT sum(oe.valor) AS total_empenhos
           FROM orcamento_empenhos oe
          WHERE oe.orcamento_id = oa.id) emp ON true
     LEFT JOIN LATERAL ( SELECT COALESCE(sum(os.valor_orcamento), 0::numeric) AS total_consumo_os
           FROM ordens_servico os
          WHERE os.regional_id = oa.regional_id 
            AND os.status NOT IN ('aberta', 'orcamento', 'autorizacao')
            AND EXTRACT(year FROM os.data_abertura) = oa.exercicio::numeric) osc ON true;