
-- Add valor_aprovado to solicitacoes_credito for partial approvals
ALTER TABLE public.solicitacoes_credito ADD COLUMN IF NOT EXISTS valor_aprovado numeric DEFAULT NULL;

-- Create LOA (Lei Orçamentária Anual) table for global budget management
CREATE TABLE public.orcamento_loa (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercicio integer NOT NULL UNIQUE,
  valor_total numeric NOT NULL DEFAULT 0,
  observacoes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.orcamento_loa ENABLE ROW LEVEL SECURITY;

-- Only gestor_nacional can manage LOA
CREATE POLICY "Nacional can manage LOA"
  ON public.orcamento_loa
  FOR ALL
  USING (has_role(auth.uid(), 'gestor_nacional'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gestor_nacional'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_orcamento_loa_updated_at
  BEFORE UPDATE ON public.orcamento_loa
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
