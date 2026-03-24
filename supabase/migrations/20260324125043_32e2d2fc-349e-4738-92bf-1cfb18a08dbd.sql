
CREATE TABLE public.relatorios_imr (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id),
  regional_id uuid REFERENCES public.regionais(id),
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  imr_score numeric NOT NULL DEFAULT 10,
  situacao text NOT NULL DEFAULT 'conforme',
  total_ocorrencias integer DEFAULT 0,
  total_pontos_perdidos numeric DEFAULT 0,
  valor_fatura numeric DEFAULT 0,
  valor_glosa numeric DEFAULT 0,
  percentual_retencao numeric DEFAULT 0,
  analise_qualitativa text,
  contraditorio_status text DEFAULT 'sem_manifestacao',
  contraditorio_data_envio date,
  decisao_final text,
  imr_pos_reconsideracao numeric,
  penalidade_aplicada text,
  encaminhamento text DEFAULT 'arquivamento',
  ocorrencias jsonb DEFAULT '[]'::jsonb,
  os_consolidadas jsonb DEFAULT '[]'::jsonb,
  dados_json jsonb DEFAULT '{}'::jsonb,
  gerado_por_id uuid NOT NULL,
  gerado_em timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.relatorios_imr ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as relatorios_execucao)
CREATE POLICY "Admins can manage IMR reports"
  ON public.relatorios_imr FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR (is_nacional(auth.uid()) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid())))))
  WITH CHECK (is_admin(auth.uid()) OR (is_nacional(auth.uid()) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid())))));

CREATE POLICY "Authorized users can create IMR reports"
  ON public.relatorios_imr FOR INSERT TO authenticated
  WITH CHECK (
    is_admin(auth.uid()) OR is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role)
    OR has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role)
  );

CREATE POLICY "Scoped users can view IMR reports"
  ON public.relatorios_imr FOR SELECT TO authenticated
  USING (
    is_admin(auth.uid())
    OR (is_nacional(auth.uid()) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
    OR ((has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
        AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  );

-- Updated_at trigger
CREATE TRIGGER set_updated_at_relatorios_imr
  BEFORE UPDATE ON public.relatorios_imr
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
