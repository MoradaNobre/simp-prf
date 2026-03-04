
-- Table to store raw imported contracts from comprasnet API
CREATE TABLE public.contratos_gov_import (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_gov_id integer NOT NULL,
  uasg_codigo text NOT NULL,
  numero text NOT NULL,
  empresa text NOT NULL,
  cnpj text,
  objeto text,
  vigencia_inicio date,
  vigencia_fim date,
  valor_global numeric DEFAULT 0,
  valor_inicial numeric DEFAULT 0,
  valor_acumulado numeric DEFAULT 0,
  situacao text,
  categoria text,
  modalidade text,
  processo text,
  data_assinatura date,
  empenhos jsonb DEFAULT '[]'::jsonb,
  historico jsonb DEFAULT '[]'::jsonb,
  contrato_simp_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  importado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(contrato_gov_id)
);

-- Sync execution log
CREATE TABLE public.contratos_gov_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iniciado_em timestamp with time zone NOT NULL DEFAULT now(),
  finalizado_em timestamp with time zone,
  status text NOT NULL DEFAULT 'em_andamento',
  total_uasgs integer DEFAULT 0,
  total_contratos integer DEFAULT 0,
  total_importados integer DEFAULT 0,
  total_erros integer DEFAULT 0,
  detalhes jsonb DEFAULT '{}'::jsonb,
  iniciado_por uuid
);

-- RLS
ALTER TABLE public.contratos_gov_import ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_gov_sync_log ENABLE ROW LEVEL SECURITY;

-- Only managers can view/manage
CREATE POLICY "Managers can view gov imports" ON public.contratos_gov_import
  FOR SELECT TO authenticated USING (is_manager(auth.uid()));

CREATE POLICY "Managers can manage gov imports" ON public.contratos_gov_import
  FOR ALL TO authenticated USING (is_manager(auth.uid())) WITH CHECK (is_manager(auth.uid()));

CREATE POLICY "Managers can view sync logs" ON public.contratos_gov_sync_log
  FOR SELECT TO authenticated USING (is_manager(auth.uid()));

CREATE POLICY "Managers can manage sync logs" ON public.contratos_gov_sync_log
  FOR ALL TO authenticated USING (is_manager(auth.uid())) WITH CHECK (is_manager(auth.uid()));

-- Service role inserts bypass RLS, so the edge function uses service role
