
-- Tabela de dotação orçamentária anual por regional
CREATE TABLE public.orcamento_anual (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regional_id uuid NOT NULL REFERENCES public.regionais(id) ON DELETE CASCADE,
  exercicio integer NOT NULL, -- ano do exercício (ex: 2026)
  valor_dotacao numeric NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(regional_id, exercicio)
);

-- Tabela de lançamentos manuais de empenho
CREATE TABLE public.orcamento_empenhos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid NOT NULL REFERENCES public.orcamento_anual(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  data_empenho date NOT NULL DEFAULT CURRENT_DATE,
  numero_empenho text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orcamento_anual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_empenhos ENABLE ROW LEVEL SECURITY;

-- Policies: orcamento_anual
CREATE POLICY "Nacional can manage orcamento"
ON public.orcamento_anual FOR ALL
USING (has_role(auth.uid(), 'gestor_nacional'::app_role));

CREATE POLICY "Regional can view own orcamento"
ON public.orcamento_anual FOR SELECT
USING (has_role(auth.uid(), 'gestor_regional'::app_role) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())));

-- Policies: orcamento_empenhos
CREATE POLICY "Nacional can manage empenhos"
ON public.orcamento_empenhos FOR ALL
USING (has_role(auth.uid(), 'gestor_nacional'::app_role));

CREATE POLICY "Regional can view own empenhos"
ON public.orcamento_empenhos FOR SELECT
USING (has_role(auth.uid(), 'gestor_regional'::app_role) AND orcamento_id IN (
  SELECT id FROM public.orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
));

CREATE POLICY "Regional can manage own empenhos"
ON public.orcamento_empenhos FOR INSERT
WITH CHECK (has_role(auth.uid(), 'gestor_regional'::app_role) AND orcamento_id IN (
  SELECT id FROM public.orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
));

CREATE POLICY "Regional can update own empenhos"
ON public.orcamento_empenhos FOR UPDATE
USING (has_role(auth.uid(), 'gestor_regional'::app_role) AND orcamento_id IN (
  SELECT id FROM public.orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
));

CREATE POLICY "Regional can delete own empenhos"
ON public.orcamento_empenhos FOR DELETE
USING (has_role(auth.uid(), 'gestor_regional'::app_role) AND orcamento_id IN (
  SELECT id FROM public.orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
));

-- Trigger updated_at
CREATE TRIGGER update_orcamento_anual_updated_at
BEFORE UPDATE ON public.orcamento_anual
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
