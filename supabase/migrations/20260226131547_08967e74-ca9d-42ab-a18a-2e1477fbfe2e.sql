
-- Create chamados table
CREATE TABLE public.chamados (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text NOT NULL DEFAULT '',
  tipo_demanda text NOT NULL,
  descricao text NOT NULL,
  local_servico text NOT NULL,
  prioridade public.os_prioridade NOT NULL DEFAULT 'media',
  justificativa_urgente text,
  regional_id uuid REFERENCES public.regionais(id),
  delegacia_id uuid REFERENCES public.delegacias(id),
  uop_id uuid REFERENCES public.uops(id),
  foto text,
  solicitante_id uuid NOT NULL,
  os_id uuid REFERENCES public.ordens_servico(id),
  status text NOT NULL DEFAULT 'aberto',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;

-- All authenticated users can create chamados
CREATE POLICY "Users can create chamados"
  ON public.chamados FOR INSERT
  WITH CHECK (auth.uid() = solicitante_id);

-- Users can view chamados in their regionals (or their own)
CREATE POLICY "Users can view chamados"
  ON public.chamados FOR SELECT
  USING (
    auth.uid() = solicitante_id
    OR is_admin(auth.uid())
    OR (
      (is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
      AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    )
  );

-- Gestores can update chamados (to link to OS, change status)
CREATE POLICY "Gestores can update chamados"
  ON public.chamados FOR UPDATE
  USING (
    auth.uid() = solicitante_id
    OR is_admin(auth.uid())
    OR (
      (is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role))
      AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    )
  );

-- Gestores can delete chamados
CREATE POLICY "Gestores can delete chamados"
  ON public.chamados FOR DELETE
  USING (
    auth.uid() = solicitante_id
    OR is_admin(auth.uid())
    OR (
      (is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role))
      AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    )
  );

-- Auto-generate codigo for chamados
CREATE OR REPLACE FUNCTION public.generate_chamado_codigo()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _sigla text;
  _count int;
BEGIN
  IF NEW.regional_id IS NOT NULL THEN
    SELECT r.sigla INTO _sigla FROM public.regionais r WHERE r.id = NEW.regional_id;
  END IF;
  
  SELECT COUNT(*) + 1 INTO _count
  FROM public.chamados
  WHERE regional_id IS NOT DISTINCT FROM NEW.regional_id;
  
  NEW.codigo = 'CH-' || COALESCE(_sigla, 'SEM') || '-' || LPAD(_count::text, 5, '0');
  RETURN NEW;
END;
$function$;

CREATE TRIGGER generate_chamado_codigo_trigger
  BEFORE INSERT ON public.chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_chamado_codigo();

-- Updated_at trigger
CREATE TRIGGER update_chamados_updated_at
  BEFORE UPDATE ON public.chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
