
-- Fix: check_os_empenho_limit must exclude soft-deleted OS from consumo calculation
CREATE OR REPLACE FUNCTION public.check_os_empenho_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _regional_id uuid;
  _exercicio integer;
  _total_empenhos numeric;
  _total_consumo_os numeric;
  _saldo_empenhado numeric;
  _valor_os numeric;
  _tipo_servico text;
BEGIN
  IF NEW.status = 'execucao' AND (OLD.status IS DISTINCT FROM 'execucao') THEN
    _regional_id := NEW.regional_id;
    _valor_os := COALESCE(NEW.valor_orcamento, 0);
    _exercicio := EXTRACT(year FROM NEW.data_abertura)::integer;

    IF NEW.contrato_id IS NOT NULL THEN
      SELECT tipo_servico INTO _tipo_servico
      FROM contratos WHERE id = NEW.contrato_id;
      IF _tipo_servico IN ('cartao_corporativo', 'contrata_brasil') THEN
        RETURN NEW;
      END IF;
    END IF;

    IF _regional_id IS NOT NULL THEN
      SELECT COALESCE(sum(oe.valor), 0) INTO _total_empenhos
      FROM orcamento_empenhos oe
      JOIN orcamento_anual oa ON oa.id = oe.orcamento_id
      WHERE oa.regional_id = _regional_id AND oa.exercicio = _exercicio;

      SELECT COALESCE(sum(os.valor_orcamento), 0) INTO _total_consumo_os
      FROM ordens_servico os
      WHERE os.regional_id = _regional_id
        AND os.id != NEW.id
        AND os.deleted_at IS NULL
        AND os.status NOT IN ('aberta', 'orcamento', 'autorizacao')
        AND EXTRACT(year FROM os.data_abertura) = _exercicio;

      _saldo_empenhado := _total_empenhos - _total_consumo_os;

      IF _saldo_empenhado < _valor_os THEN
        RAISE EXCEPTION 'Saldo empenhado insuficiente. Disponível: R$ %, necessário: R$ %. Solicite reforço de empenho.',
          to_char(_saldo_empenhado, 'FM999G999G999D00'),
          to_char(_valor_os, 'FM999G999G999D00');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Fix: approve_os_revisao must also exclude soft-deleted OS
CREATE OR REPLACE FUNCTION public.approve_os_revisao(_revisao_id uuid, _aprovado_por uuid, _resposta text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _os_id uuid;
  _valor_novo numeric;
  _valor_anterior numeric;
  _delta numeric;
  _regional_id uuid;
  _exercicio integer;
  _total_empenhos numeric;
  _total_consumo_os numeric;
  _saldo_empenhado numeric;
  _status text;
  _revisao_status text;
BEGIN
  SELECT os_id, valor_novo, valor_anterior, status
  INTO _os_id, _valor_novo, _valor_anterior, _revisao_status
  FROM os_revisoes_orcamento
  WHERE id = _revisao_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Revisão não encontrada';
  END IF;

  IF _revisao_status != 'pendente' THEN
    RAISE EXCEPTION 'Esta revisão já foi processada (status: %)', _revisao_status;
  END IF;

  SELECT regional_id, status, EXTRACT(year FROM data_abertura)::integer
  INTO _regional_id, _status, _exercicio
  FROM ordens_servico
  WHERE id = _os_id
  FOR UPDATE;

  IF _status != 'execucao' THEN
    RAISE EXCEPTION 'Revisão orçamentária só pode ser aprovada quando a OS está em execução (status atual: %)', _status;
  END IF;

  _delta := _valor_novo - _valor_anterior;

  IF _delta > 0 AND _regional_id IS NOT NULL THEN
    SELECT COALESCE(sum(oe.valor), 0) INTO _total_empenhos
    FROM orcamento_empenhos oe
    JOIN orcamento_anual oa ON oa.id = oe.orcamento_id
    WHERE oa.regional_id = _regional_id AND oa.exercicio = _exercicio;

    SELECT COALESCE(sum(os.valor_orcamento), 0) INTO _total_consumo_os
    FROM ordens_servico os
    WHERE os.regional_id = _regional_id
      AND os.id != _os_id
      AND os.deleted_at IS NULL
      AND os.status NOT IN ('aberta', 'orcamento', 'autorizacao')
      AND EXTRACT(year FROM os.data_abertura) = _exercicio;

    _saldo_empenhado := _total_empenhos - _total_consumo_os;

    IF _saldo_empenhado < _valor_novo THEN
      RAISE EXCEPTION 'Saldo empenhado insuficiente para o novo valor. Disponível: R$ %, necessário: R$ %.',
        to_char(_saldo_empenhado, 'FM999G999G999D00'),
        to_char(_valor_novo, 'FM999G999G999D00');
    END IF;
  END IF;

  UPDATE os_revisoes_orcamento
  SET status = 'aprovado',
      aprovado_por = _aprovado_por,
      resposta = _resposta,
      updated_at = now()
  WHERE id = _revisao_id;

  UPDATE ordens_servico
  SET valor_orcamento = _valor_novo,
      updated_at = now()
  WHERE id = _os_id;

  INSERT INTO audit_logs (user_id, action, table_name, record_id, description, new_data)
  VALUES (
    _aprovado_por,
    'REVISAO_ORCAMENTO',
    'ordens_servico',
    _os_id,
    'Revisão orçamentária aprovada: R$ ' || to_char(_valor_anterior, 'FM999G999G999D00') || ' → R$ ' || to_char(_valor_novo, 'FM999G999G999D00'),
    jsonb_build_object('valor_anterior', _valor_anterior, 'valor_novo', _valor_novo, 'diferenca', _delta)
  );
END;
$function$;
