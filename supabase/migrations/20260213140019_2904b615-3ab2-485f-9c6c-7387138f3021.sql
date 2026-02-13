
-- Add preposto fields to contratos
ALTER TABLE public.contratos 
  ADD COLUMN tipo_servico text NOT NULL DEFAULT 'manutencao_predial',
  ADD COLUMN preposto_nome text,
  ADD COLUMN preposto_email text,
  ADD COLUMN preposto_telefone text;

-- Create table for additional company contacts
CREATE TABLE public.contrato_contatos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text,
  telefone text,
  funcao text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contrato_contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view contato" ON public.contrato_contatos
  FOR SELECT USING (true);

CREATE POLICY "Fiscais and admins can manage contatos" ON public.contrato_contatos
  FOR ALL USING (
    has_role(auth.uid(), 'gestor_nacional'::app_role) OR 
    has_role(auth.uid(), 'fiscal_contrato'::app_role)
  );
