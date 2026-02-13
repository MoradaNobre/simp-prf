
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    IF TG_TABLE_NAME IN ('ordens_servico', 'contratos') AND (_old->>'status') IS DISTINCT FROM (_new->>'status') THEN
      INSERT INTO public.audit_logs(user_id, action, table_name, record_id, old_data, new_data, description)
      VALUES (_user_id, 'STATUS_CHANGE', TG_TABLE_NAME, NEW.id, _old, _new,
        'Status alterado de ' || (_old->>'status') || ' para ' || (_new->>'status'));
    END IF;

    -- Responsavel changes (ordens_servico only)
    IF TG_TABLE_NAME = 'ordens_servico' AND (
      (_old->>'responsavel_id') IS DISTINCT FROM (_new->>'responsavel_id') OR
      (_old->>'responsavel_triagem_id') IS DISTINCT FROM (_new->>'responsavel_triagem_id') OR
      (_old->>'responsavel_execucao_id') IS DISTINCT FROM (_new->>'responsavel_execucao_id') OR
      (_old->>'responsavel_encerramento_id') IS DISTINCT FROM (_new->>'responsavel_encerramento_id')
    ) THEN
      INSERT INTO public.audit_logs(user_id, action, table_name, record_id, old_data, new_data, description)
      VALUES (_user_id, 'RESPONSAVEL_CHANGE', TG_TABLE_NAME, NEW.id, _old, _new,
        'Responsável alterado na OS');
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$function$;
