
-- Audit log table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  action text NOT NULL, -- 'DELETE', 'STATUS_CHANGE', 'ROLE_CHANGE', 'RESPONSAVEL_CHANGE'
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  description text
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only gestor_nacional can view logs"
ON public.audit_logs FOR SELECT
USING (has_role(auth.uid(), 'gestor_nacional'::app_role));

CREATE POLICY "System can insert logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _action text;
  _old jsonb;
  _new jsonb;
  _desc text;
  _record_id uuid;
  _user_id uuid;
BEGIN
  _user_id := auth.uid();

  IF TG_OP = 'DELETE' THEN
    _action := 'DELETE';
    _old := to_jsonb(OLD);
    _record_id := OLD.id;
    _desc := 'Registro excluído de ' || TG_TABLE_NAME;
    INSERT INTO public.audit_logs(user_id, action, table_name, record_id, old_data, description)
    VALUES (_user_id, _action, TG_TABLE_NAME, _record_id, _old, _desc);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    _old := to_jsonb(OLD);
    _new := to_jsonb(NEW);

    -- Status changes (ordens_servico, contratos)
    IF TG_TABLE_NAME IN ('ordens_servico', 'contratos') AND OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.audit_logs(user_id, action, table_name, record_id, old_data, new_data, description)
      VALUES (_user_id, 'STATUS_CHANGE', TG_TABLE_NAME, NEW.id, _old, _new,
        'Status alterado de ' || OLD.status || ' para ' || NEW.status);
    END IF;

    -- Responsavel changes (ordens_servico)
    IF TG_TABLE_NAME = 'ordens_servico' AND (
      OLD.responsavel_id IS DISTINCT FROM NEW.responsavel_id OR
      OLD.responsavel_triagem_id IS DISTINCT FROM NEW.responsavel_triagem_id OR
      OLD.responsavel_execucao_id IS DISTINCT FROM NEW.responsavel_execucao_id OR
      OLD.responsavel_encerramento_id IS DISTINCT FROM NEW.responsavel_encerramento_id
    ) THEN
      INSERT INTO public.audit_logs(user_id, action, table_name, record_id, old_data, new_data, description)
      VALUES (_user_id, 'RESPONSAVEL_CHANGE', TG_TABLE_NAME, NEW.id, _old, _new,
        'Responsável alterado na OS');
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Role change trigger
CREATE OR REPLACE FUNCTION public.audit_role_change_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.audit_logs(user_id, action, table_name, record_id, old_data, new_data, description)
    VALUES (auth.uid(), 'ROLE_CHANGE', 'user_roles', NEW.id, to_jsonb(OLD), to_jsonb(NEW),
      'Papel alterado de ' || OLD.role || ' para ' || NEW.role);
  END IF;
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs(user_id, action, table_name, record_id, old_data, description)
    VALUES (auth.uid(), 'DELETE', 'user_roles', OLD.id, to_jsonb(OLD), 'Role removida');
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- Attach triggers
CREATE TRIGGER audit_ordens_servico
AFTER DELETE OR UPDATE ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_contratos
AFTER DELETE OR UPDATE ON public.contratos
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_regionais
AFTER DELETE ON public.regionais
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_delegacias
AFTER DELETE ON public.delegacias
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_uops
AFTER DELETE ON public.uops
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE TRIGGER audit_user_roles
AFTER UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_role_change_trigger();
