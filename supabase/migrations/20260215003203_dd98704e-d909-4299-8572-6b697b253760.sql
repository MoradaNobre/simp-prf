
-- 1. Migrate data
UPDATE public.ordens_servico SET status = 'orcamento' WHERE status = 'triagem';

-- 2. Swap enum (drop default first)
ALTER TABLE public.ordens_servico ALTER COLUMN status DROP DEFAULT;
ALTER TYPE public.os_status RENAME TO os_status_old;
CREATE TYPE public.os_status AS ENUM ('aberta', 'orcamento', 'autorizacao', 'execucao', 'ateste', 'pagamento', 'encerrada');
ALTER TABLE public.ordens_servico ALTER COLUMN status TYPE public.os_status USING status::text::public.os_status;
DROP TYPE public.os_status_old;
ALTER TABLE public.ordens_servico ALTER COLUMN status SET DEFAULT 'aberta'::public.os_status;

-- 3. Drop old RLS policies BEFORE dropping column
DROP POLICY IF EXISTS "Authenticated can view OS" ON public.ordens_servico;
DROP POLICY IF EXISTS "Managers can update OS" ON public.ordens_servico;

-- 4. Drop column
ALTER TABLE public.ordens_servico DROP COLUMN responsavel_triagem_id;

-- 5. Recreate RLS policies without responsavel_triagem_id
CREATE POLICY "Authenticated can view OS"
ON public.ordens_servico FOR SELECT
USING (
  has_role(auth.uid(), 'gestor_nacional'::app_role) OR
  has_role(auth.uid(), 'fiscal_contrato'::app_role) OR
  ((has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'operador'::app_role)) AND (
    ((regional_id IS NOT NULL) AND (regional_id IN (SELECT get_user_regional_ids(auth.uid())))) OR
    ((uop_id IS NOT NULL) AND (uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid())))))
  )) OR
  (has_role(auth.uid(), 'preposto'::app_role) AND (contrato_id IN (SELECT contratos.id FROM contratos WHERE contratos.preposto_user_id = auth.uid()))) OR
  (has_role(auth.uid(), 'terceirizado'::app_role) AND (
    (contrato_id IN (SELECT cc.contrato_id FROM contrato_contatos cc WHERE cc.user_id = auth.uid())) OR
    (responsavel_execucao_id IN (SELECT contrato_contatos.id FROM contrato_contatos WHERE contrato_contatos.user_id = auth.uid())) OR
    (responsavel_encerramento_id IN (SELECT contrato_contatos.id FROM contrato_contatos WHERE contrato_contatos.user_id = auth.uid()))
  ))
);

CREATE POLICY "Managers can update OS"
ON public.ordens_servico FOR UPDATE
USING (
  (auth.uid() = solicitante_id) OR
  (auth.uid() = responsavel_id) OR
  has_role(auth.uid(), 'gestor_nacional'::app_role) OR
  has_role(auth.uid(), 'gestor_regional'::app_role) OR
  has_role(auth.uid(), 'fiscal_contrato'::app_role) OR
  (has_role(auth.uid(), 'preposto'::app_role) AND (contrato_id IN (SELECT contratos.id FROM contratos WHERE contratos.preposto_user_id = auth.uid()))) OR
  (has_role(auth.uid(), 'terceirizado'::app_role) AND (
    (contrato_id IN (SELECT cc.contrato_id FROM contrato_contatos cc WHERE cc.user_id = auth.uid())) OR
    (responsavel_execucao_id IN (SELECT contrato_contatos.id FROM contrato_contatos WHERE contrato_contatos.user_id = auth.uid())) OR
    (responsavel_encerramento_id IN (SELECT contrato_contatos.id FROM contrato_contatos WHERE contrato_contatos.user_id = auth.uid()))
  ))
);

-- 6. Update audit trigger
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _old jsonb;
  _new jsonb;
  _user_id uuid;
BEGIN
  _user_id := auth.uid();
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs(user_id, action, table_name, record_id, old_data, description)
    VALUES (_user_id, 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), 'Registro excluído de ' || TG_TABLE_NAME);
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    _old := to_jsonb(OLD);
    _new := to_jsonb(NEW);
    IF TG_TABLE_NAME IN ('ordens_servico', 'contratos') AND (_old->>'status') IS DISTINCT FROM (_new->>'status') THEN
      INSERT INTO public.audit_logs(user_id, action, table_name, record_id, old_data, new_data, description)
      VALUES (_user_id, 'STATUS_CHANGE', TG_TABLE_NAME, NEW.id, _old, _new,
        'Status alterado de ' || (_old->>'status') || ' para ' || (_new->>'status'));
    END IF;
    IF TG_TABLE_NAME = 'ordens_servico' AND (
      (_old->>'responsavel_id') IS DISTINCT FROM (_new->>'responsavel_id') OR
      (_old->>'responsavel_execucao_id') IS DISTINCT FROM (_new->>'responsavel_execucao_id') OR
      (_old->>'responsavel_encerramento_id') IS DISTINCT FROM (_new->>'responsavel_encerramento_id')
    ) THEN
      INSERT INTO public.audit_logs(user_id, action, table_name, record_id, old_data, new_data, description)
      VALUES (_user_id, 'RESPONSAVEL_CHANGE', TG_TABLE_NAME, NEW.id, _old, _new, 'Responsável alterado na OS');
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$;
