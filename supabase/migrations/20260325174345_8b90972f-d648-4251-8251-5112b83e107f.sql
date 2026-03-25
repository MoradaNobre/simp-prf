
-- 1. Create os_revisoes_orcamento table
CREATE TABLE public.os_revisoes_orcamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  valor_anterior numeric NOT NULL,
  valor_novo numeric NOT NULL,
  diferenca numeric GENERATED ALWAYS AS (valor_novo - valor_anterior) STORED,
  justificativa text NOT NULL,
  arquivo_justificativa text,
  solicitado_por uuid NOT NULL,
  aprovado_por uuid,
  resposta text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.os_revisoes_orcamento ENABLE ROW LEVEL SECURITY;

-- 3. RLS: Admin full access
CREATE POLICY "Admin full access on revisoes"
ON public.os_revisoes_orcamento FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 4. RLS: Nacional/Regional/Fiscal can view and manage revisoes for their regionals
CREATE POLICY "Scoped users can view revisoes"
ON public.os_revisoes_orcamento FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) OR
  (os_id IN (
    SELECT id FROM ordens_servico
    WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  ))
);

CREATE POLICY "Gestores e fiscais can manage revisoes"
ON public.os_revisoes_orcamento FOR ALL
TO authenticated
USING (
  is_admin(auth.uid()) OR
  (
    (is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
    AND os_id IN (SELECT id FROM ordens_servico WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  )
)
WITH CHECK (
  is_admin(auth.uid()) OR
  (
    (is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
    AND os_id IN (SELECT id FROM ordens_servico WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  )
);

-- 5. RLS: Preposto can insert and view revisoes for their contracts
CREATE POLICY "Preposto can manage revisoes"
ON public.os_revisoes_orcamento FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'preposto'::app_role) AND
  os_id IN (SELECT id FROM ordens_servico WHERE contrato_id = ANY(get_preposto_contrato_ids(auth.uid())))
)
WITH CHECK (
  has_role(auth.uid(), 'preposto'::app_role) AND
  os_id IN (SELECT id FROM ordens_servico WHERE contrato_id = ANY(get_preposto_contrato_ids(auth.uid())))
);

-- 6. RLS: Terceirizado can insert and view revisoes for their contracts
CREATE POLICY "Terceirizado can manage revisoes"
ON public.os_revisoes_orcamento FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'terceirizado'::app_role) AND
  os_id IN (SELECT id FROM ordens_servico WHERE contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid())))
)
WITH CHECK (
  has_role(auth.uid(), 'terceirizado'::app_role) AND
  os_id IN (SELECT id FROM ordens_servico WHERE contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid())))
);

-- 7. Function to approve a revision with budget validation
CREATE OR REPLACE FUNCTION public.approve_os_revisao(
  _revisao_id uuid,
  _aprovado_por uuid,
  _resposta text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  -- Get revision details
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

  -- Get OS details
  SELECT regional_id, status, EXTRACT(year FROM data_abertura)::integer
  INTO _regional_id, _status, _exercicio
  FROM ordens_servico
  WHERE id = _os_id
  FOR UPDATE;

  IF _status != 'execucao' THEN
    RAISE EXCEPTION 'Revisão orçamentária só pode ser aprovada quando a OS está em execução (status atual: %)', _status;
  END IF;

  _delta := _valor_novo - _valor_anterior;

  -- If increasing, validate budget limits
  IF _delta > 0 AND _regional_id IS NOT NULL THEN
    -- Get total empenhos
    SELECT COALESCE(sum(oe.valor), 0) INTO _total_empenhos
    FROM orcamento_empenhos oe
    JOIN orcamento_anual oa ON oa.id = oe.orcamento_id
    WHERE oa.regional_id = _regional_id AND oa.exercicio = _exercicio;

    -- Get total consumo OS (excluding current OS)
    SELECT COALESCE(sum(os.valor_orcamento), 0) INTO _total_consumo_os
    FROM ordens_servico os
    WHERE os.regional_id = _regional_id
      AND os.id != _os_id
      AND os.status NOT IN ('aberta', 'orcamento', 'autorizacao')
      AND EXTRACT(year FROM os.data_abertura) = _exercicio;

    _saldo_empenhado := _total_empenhos - _total_consumo_os;

    IF _saldo_empenhado < _valor_novo THEN
      RAISE EXCEPTION 'Saldo empenhado insuficiente para o novo valor. Disponível: R$ %, necessário: R$ %.',
        to_char(_saldo_empenhado, 'FM999G999G999D00'),
        to_char(_valor_novo, 'FM999G999G999D00');
    END IF;
  END IF;

  -- Update revision status
  UPDATE os_revisoes_orcamento
  SET status = 'aprovado',
      aprovado_por = _aprovado_por,
      resposta = _resposta,
      updated_at = now()
  WHERE id = _revisao_id;

  -- Update OS valor_orcamento
  UPDATE ordens_servico
  SET valor_orcamento = _valor_novo,
      updated_at = now()
  WHERE id = _os_id;

  -- Audit log
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
$$;

-- 8. Function to reject a revision
CREATE OR REPLACE FUNCTION public.reject_os_revisao(
  _revisao_id uuid,
  _aprovado_por uuid,
  _resposta text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _revisao_status text;
BEGIN
  SELECT status INTO _revisao_status
  FROM os_revisoes_orcamento
  WHERE id = _revisao_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Revisão não encontrada';
  END IF;

  IF _revisao_status != 'pendente' THEN
    RAISE EXCEPTION 'Esta revisão já foi processada (status: %)', _revisao_status;
  END IF;

  UPDATE os_revisoes_orcamento
  SET status = 'recusado',
      aprovado_por = _aprovado_por,
      resposta = _resposta,
      updated_at = now()
  WHERE id = _revisao_id;
END;
$$;

-- 9. Update trigger on updated_at
CREATE TRIGGER trg_update_revisao_updated_at
  BEFORE UPDATE ON public.os_revisoes_orcamento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
