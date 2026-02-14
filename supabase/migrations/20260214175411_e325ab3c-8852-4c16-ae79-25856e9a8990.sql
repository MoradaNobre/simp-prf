
-- Tabela de créditos orçamentários (dotação inicial + suplementações + reduções)
CREATE TABLE public.orcamento_creditos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid NOT NULL REFERENCES public.orcamento_anual(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'inicial', -- 'inicial', 'suplementacao', 'reducao'
  descricao text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  data_credito date NOT NULL DEFAULT CURRENT_DATE,
  numero_documento text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orcamento_creditos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nacional can manage creditos"
ON public.orcamento_creditos FOR ALL
USING (has_role(auth.uid(), 'gestor_nacional'::app_role));

CREATE POLICY "Regional can view own creditos"
ON public.orcamento_creditos FOR SELECT
USING (has_role(auth.uid(), 'gestor_regional'::app_role) AND orcamento_id IN (
  SELECT id FROM public.orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
));
