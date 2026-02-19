
-- ============================================================
-- View: saldo orçamentário por regional no exercício corrente
-- ============================================================
CREATE OR REPLACE VIEW public.vw_orcamento_regional_saldo AS
SELECT
  oa.id AS orcamento_id,
  oa.regional_id,
  oa.exercicio,
  oa.valor_dotacao,
  COALESCE(cr.total_creditos, 0) AS total_creditos,
  COALESCE(emp.total_empenhos, 0) AS total_empenhos,
  COALESCE(osc.total_consumo_os, 0) AS total_consumo_os,
  -- Saldo = créditos - consumo OS - empenhos
  COALESCE(cr.total_creditos, 0) - COALESCE(osc.total_consumo_os, 0) - COALESCE(emp.total_empenhos, 0) AS saldo_disponivel,
  -- Créditos não empenhados (disponível para empenhar)
  COALESCE(cr.total_creditos, 0) - COALESCE(emp.total_empenhos, 0) AS credito_nao_empenhado
FROM public.orcamento_anual oa
LEFT JOIN LATERAL (
  SELECT SUM(valor) AS total_creditos
  FROM public.orcamento_creditos oc
  WHERE oc.orcamento_id = oa.id
) cr ON true
LEFT JOIN LATERAL (
  SELECT SUM(valor) AS total_empenhos
  FROM public.orcamento_empenhos oe
  WHERE oe.orcamento_id = oa.id
) emp ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(os.valor_orcamento), 0) AS total_consumo_os
  FROM public.ordens_servico os
  WHERE os.regional_id = oa.regional_id
    AND os.status NOT IN ('aberta')
    AND EXTRACT(YEAR FROM os.data_abertura) = oa.exercicio
) osc ON true;

-- ============================================================
-- Tabela: solicitações de crédito suplementar (escalação)
-- ============================================================
CREATE TABLE public.solicitacoes_credito (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  regional_id uuid NOT NULL REFERENCES public.regionais(id),
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id),
  solicitante_id uuid NOT NULL,
  valor_os numeric NOT NULL DEFAULT 0,
  saldo_contrato numeric NOT NULL DEFAULT 0,
  saldo_orcamento numeric NOT NULL DEFAULT 0,
  motivo text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',  -- pendente, aprovada, recusada
  resposta text,
  respondido_por uuid,
  respondido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitacoes_credito ENABLE ROW LEVEL SECURITY;

-- Gestor Nacional pode ver e gerenciar todas
CREATE POLICY "Nacional can manage solicitacoes"
ON public.solicitacoes_credito
FOR ALL
USING (has_role(auth.uid(), 'gestor_nacional'::app_role));

-- Gestor Regional pode criar e ver suas solicitações
CREATE POLICY "Regional can create solicitacoes"
ON public.solicitacoes_credito
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
);

CREATE POLICY "Regional can view own solicitacoes"
ON public.solicitacoes_credito
FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
);

-- Fiscal pode ver solicitações
CREATE POLICY "Fiscal can view solicitacoes"
ON public.solicitacoes_credito
FOR SELECT
USING (has_role(auth.uid(), 'fiscal_contrato'::app_role));
