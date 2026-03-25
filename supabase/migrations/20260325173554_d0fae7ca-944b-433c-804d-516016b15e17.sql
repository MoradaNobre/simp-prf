
-- 1. Recreate view with saldo_empenhado column
CREATE OR REPLACE VIEW public.vw_orcamento_regional_saldo
WITH (security_invoker = on) AS
SELECT
  oa.id AS orcamento_id,
  oa.regional_id,
  oa.exercicio,
  oa.valor_dotacao,
  COALESCE(cr.total_creditos, 0) AS total_creditos,
  COALESCE(emp.total_empenhos, 0) AS total_empenhos,
  COALESCE(osc.total_consumo_os, 0) AS total_consumo_os,
  oa.valor_dotacao + COALESCE(cr.total_creditos, 0) - COALESCE(osc.total_consumo_os, 0) AS saldo_disponivel,
  oa.valor_dotacao + COALESCE(cr.total_creditos, 0) - COALESCE(emp.total_empenhos, 0) AS credito_nao_empenhado,
  GREATEST(COALESCE(emp.total_empenhos, 0) - COALESCE(osc.total_consumo_os, 0), 0) AS saldo_empenhado
FROM orcamento_anual oa
LEFT JOIN LATERAL (
  SELECT sum(oc.valor) AS total_creditos
  FROM orcamento_creditos oc
  WHERE oc.orcamento_id = oa.id
) cr ON true
LEFT JOIN LATERAL (
  SELECT sum(oe.valor) AS total_empenhos
  FROM orcamento_empenhos oe
  WHERE oe.orcamento_id = oa.id
) emp ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(sum(os.valor_orcamento), 0) AS total_consumo_os
  FROM ordens_servico os
  WHERE os.regional_id = oa.regional_id
    AND os.status NOT IN ('aberta', 'orcamento', 'autorizacao')
    AND EXTRACT(year FROM os.data_abertura) = oa.exercicio
) osc ON true;

-- 2. Create validation function for empenho limit on OS transition
CREATE OR REPLACE FUNCTION public.check_os_empenho_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _regional_id uuid;
  _exercicio integer;
  _total_empenhos numeric;
  _total_consumo_os numeric;
  _saldo_empenhado numeric;
  _valor_os numeric;
  _tipo_servico text;
BEGIN
  -- Only check when transitioning INTO execucao
  IF NEW.status = 'execucao' AND (OLD.status IS DISTINCT FROM 'execucao') THEN
    _regional_id := NEW.regional_id;
    _valor_os := COALESCE(NEW.valor_orcamento, 0);
    _exercicio := EXTRACT(year FROM NEW.data_abertura)::integer;

    -- Check tipo_servico to see if budget check should be skipped
    IF NEW.contrato_id IS NOT NULL THEN
      SELECT tipo_servico INTO _tipo_servico
      FROM contratos WHERE id = NEW.contrato_id;
      -- Skip for cartao_corporativo and contrata_brasil (they bypass budget blocking)
      IF _tipo_servico IN ('cartao_corporativo', 'contrata_brasil') THEN
        RETURN NEW;
      END IF;
    END IF;

    IF _regional_id IS NOT NULL THEN
      -- Get total empenhos
      SELECT COALESCE(sum(oe.valor), 0) INTO _total_empenhos
      FROM orcamento_empenhos oe
      JOIN orcamento_anual oa ON oa.id = oe.orcamento_id
      WHERE oa.regional_id = _regional_id AND oa.exercicio = _exercicio;

      -- Get total consumo OS (excluding the current OS being transitioned)
      SELECT COALESCE(sum(os.valor_orcamento), 0) INTO _total_consumo_os
      FROM ordens_servico os
      WHERE os.regional_id = _regional_id
        AND os.id != NEW.id
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
$$;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS trg_check_os_empenho_limit ON public.ordens_servico;
CREATE TRIGGER trg_check_os_empenho_limit
  BEFORE UPDATE ON public.ordens_servico
  FOR EACH ROW
  EXECUTE FUNCTION public.check_os_empenho_limit();
