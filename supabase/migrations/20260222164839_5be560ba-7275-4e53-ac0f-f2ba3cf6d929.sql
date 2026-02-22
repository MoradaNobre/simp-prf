
-- Atomic OS status transition function to prevent race conditions
CREATE OR REPLACE FUNCTION public.transition_os_status(
  _os_id uuid,
  _expected_status os_status,
  _new_status os_status,
  _updates jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _current_status os_status;
  _result_id uuid;
BEGIN
  -- Lock the row and get current status atomically
  SELECT status INTO _current_status
  FROM public.ordens_servico
  WHERE id = _os_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OS não encontrada: %', _os_id;
  END IF;

  IF _current_status != _expected_status THEN
    RAISE EXCEPTION 'Conflito de concorrência: status atual é "%" mas esperado era "%". Outro usuário pode ter alterado esta OS.', _current_status, _expected_status;
  END IF;

  -- Apply the status change plus any additional updates from _updates jsonb
  UPDATE public.ordens_servico
  SET
    status = _new_status,
    updated_at = now(),
    -- Optional fields from _updates
    contrato_id = COALESCE((_updates->>'contrato_id')::uuid, contrato_id),
    valor_orcamento = COALESCE((_updates->>'valor_orcamento')::numeric, valor_orcamento),
    arquivo_orcamento = COALESCE(_updates->>'arquivo_orcamento', arquivo_orcamento),
    foto_antes = COALESCE(_updates->>'foto_antes', foto_antes),
    foto_depois = COALESCE(_updates->>'foto_depois', foto_depois),
    motivo_restituicao = CASE WHEN _updates ? 'motivo_restituicao' THEN _updates->>'motivo_restituicao' ELSE motivo_restituicao END,
    responsavel_id = COALESCE((_updates->>'responsavel_id')::uuid, responsavel_id),
    responsavel_execucao_id = COALESCE((_updates->>'responsavel_execucao_id')::uuid, responsavel_execucao_id),
    responsavel_encerramento_id = COALESCE((_updates->>'responsavel_encerramento_id')::uuid, responsavel_encerramento_id),
    data_encerramento = COALESCE((_updates->>'data_encerramento')::timestamptz, data_encerramento),
    documentos_pagamento = CASE WHEN _updates ? 'documentos_pagamento' THEN (_updates->'documentos_pagamento') ELSE documentos_pagamento END,
    assinatura_digital = COALESCE(_updates->>'assinatura_digital', assinatura_digital),
    equipamento_id = COALESCE((_updates->>'equipamento_id')::uuid, equipamento_id)
  WHERE id = _os_id
  RETURNING id INTO _result_id;

  RETURN _result_id;
END;
$$;
