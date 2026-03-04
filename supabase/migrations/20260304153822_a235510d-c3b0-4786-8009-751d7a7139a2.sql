
-- Update validate_role_hierarchy to handle auxiliar_fiscal
CREATE OR REPLACE FUNCTION public.validate_role_hierarchy()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _caller_id uuid;
  _caller_role app_role;
  _target_role app_role;
  _role_level int;
  _caller_level int;
BEGIN
  _caller_id := auth.uid();
  _target_role := NEW.role;

  IF _caller_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO _caller_role
  FROM public.user_roles
  WHERE user_id = _caller_id
  LIMIT 1;

  IF _caller_role IS NULL THEN
    RAISE EXCEPTION 'Usuário sem perfil não pode atribuir papéis.';
  END IF;

  _caller_level := CASE _caller_role
    WHEN 'gestor_master' THEN 100
    WHEN 'gestor_nacional' THEN 80
    WHEN 'gestor_regional' THEN 60
    WHEN 'fiscal_contrato' THEN 40
    WHEN 'auxiliar_fiscal' THEN 40
    ELSE 0
  END;

  _role_level := CASE _target_role
    WHEN 'gestor_master' THEN 100
    WHEN 'gestor_nacional' THEN 80
    WHEN 'gestor_regional' THEN 60
    WHEN 'fiscal_contrato' THEN 40
    WHEN 'auxiliar_fiscal' THEN 40
    WHEN 'operador' THEN 20
    WHEN 'preposto' THEN 20
    WHEN 'terceirizado' THEN 20
    ELSE 20
  END;

  IF _caller_level = 0 THEN
    RAISE EXCEPTION 'Seu perfil (%) não tem permissão para atribuir papéis.', _caller_role;
  END IF;

  IF _caller_level <= _role_level THEN
    RAISE EXCEPTION 'Seu perfil (%) não tem autoridade para atribuir o papel (%). Escalonamento de privilégio bloqueado.', _caller_role, _target_role;
  END IF;

  IF _caller_role = 'fiscal_contrato' AND _target_role NOT IN ('operador', 'preposto', 'terceirizado') THEN
    RAISE EXCEPTION 'Fiscal de Contrato só pode atribuir os papéis: Operador, Preposto ou Terceirizado.';
  END IF;

  IF _caller_role = 'auxiliar_fiscal' AND _target_role NOT IN ('operador', 'preposto', 'terceirizado') THEN
    RAISE EXCEPTION 'Auxiliar de Fiscal só pode atribuir os papéis: Operador, Preposto ou Terceirizado.';
  END IF;

  RETURN NEW;
END;
$function$;

-- chamados: Users can view chamados
DROP POLICY IF EXISTS "Users can view chamados" ON public.chamados;
CREATE POLICY "Users can view chamados" ON public.chamados
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    auth.uid() = solicitante_id
    OR is_admin(auth.uid())
    OR (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
    OR (
      (has_role(auth.uid(), 'gestor_regional') OR has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal') OR has_role(auth.uid(), 'operador'))
      AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    )
  )
);

-- chamados: Gestores can update chamados
DROP POLICY IF EXISTS "Gestores can update chamados" ON public.chamados;
CREATE POLICY "Gestores can update chamados" ON public.chamados
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (
  auth.uid() = solicitante_id
  OR is_admin(auth.uid())
  OR (
    (is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional') OR has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal'))
    AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  )
);

-- contrato_contatos: Authorized users can manage contatos
DROP POLICY IF EXISTS "Authorized users can manage contatos" ON public.contrato_contatos;
CREATE POLICY "Authorized users can manage contatos" ON public.contrato_contatos
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  OR ((has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal')) AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  OR (has_role(auth.uid(), 'preposto') AND contrato_id = ANY(get_preposto_contrato_ids(auth.uid())))
);

-- contrato_contatos: Regional and fiscal can view contatos
DROP POLICY IF EXISTS "Regional and fiscal can view contatos" ON public.contrato_contatos;
CREATE POLICY "Regional and fiscal can view contatos" ON public.contrato_contatos
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (has_role(auth.uid(), 'gestor_regional') OR has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal'))
  AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid())))
);

-- contratos: Authenticated can view contratos
DROP POLICY IF EXISTS "Authenticated can view contratos" ON public.contratos;
CREATE POLICY "Authenticated can view contratos" ON public.contratos
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    is_admin(auth.uid())
    OR (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
    OR ((has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal')) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
    OR ((has_role(auth.uid(), 'gestor_regional') OR has_role(auth.uid(), 'operador')) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
    OR (has_role(auth.uid(), 'preposto') AND preposto_user_id = auth.uid())
    OR (has_role(auth.uid(), 'terceirizado') AND id = ANY(get_terceirizado_contrato_ids(auth.uid())))
  )
);

-- contratos: Admins and fiscais can manage contratos
DROP POLICY IF EXISTS "Admins and fiscais can manage contratos" ON public.contratos;
CREATE POLICY "Admins and fiscais can manage contratos" ON public.contratos
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  OR ((has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal')) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
);

-- ordens_servico: Authenticated can view OS
DROP POLICY IF EXISTS "Authenticated can view OS" ON public.ordens_servico;
CREATE POLICY "Authenticated can view OS" ON public.ordens_servico
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    is_admin(auth.uid())
    OR (is_nacional(auth.uid()) AND (
      (regional_id IS NOT NULL AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
      OR (uop_id IS NOT NULL AND uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
    ))
    OR ((has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal')) AND (
      (regional_id IS NOT NULL AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
      OR (uop_id IS NOT NULL AND uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
    ))
    OR ((has_role(auth.uid(), 'gestor_regional') OR has_role(auth.uid(), 'operador')) AND (
      (regional_id IS NOT NULL AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
      OR (uop_id IS NOT NULL AND uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
    ))
    OR (has_role(auth.uid(), 'preposto') AND contrato_id = ANY(get_preposto_contrato_ids(auth.uid())))
    OR (has_role(auth.uid(), 'terceirizado') AND (contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid())) OR responsavel_execucao_id = auth.uid() OR responsavel_encerramento_id = auth.uid()))
  )
);

-- ordens_servico: Scoped users can update OS
DROP POLICY IF EXISTS "Scoped users can update OS" ON public.ordens_servico;
CREATE POLICY "Scoped users can update OS" ON public.ordens_servico
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (
  auth.uid() = solicitante_id
  OR auth.uid() = responsavel_id
  OR is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND (regional_id IN (SELECT get_user_regional_ids(auth.uid())) OR uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid())))))
  OR (has_role(auth.uid(), 'gestor_regional') AND (regional_id IN (SELECT get_user_regional_ids(auth.uid())) OR uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid())))))
  OR ((has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal')) AND (regional_id IN (SELECT get_user_regional_ids(auth.uid())) OR uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid())))))
  OR (has_role(auth.uid(), 'preposto') AND contrato_id = ANY(get_preposto_contrato_ids(auth.uid())))
  OR (has_role(auth.uid(), 'terceirizado') AND (contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid())) OR responsavel_execucao_id = auth.uid()))
);

-- agendamentos_visita: Gestores can manage agendamentos
DROP POLICY IF EXISTS "Gestores can manage agendamentos" ON public.agendamentos_visita;
CREATE POLICY "Gestores can manage agendamentos" ON public.agendamentos_visita
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  is_admin(auth.uid())
  OR (
    (is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional') OR has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal'))
    AND os_id IN (
      SELECT os.id FROM ordens_servico os
      WHERE os.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
        OR os.uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid())))
    )
  )
)
WITH CHECK (
  is_admin(auth.uid())
  OR (
    (is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional') OR has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal'))
    AND os_id IN (
      SELECT os.id FROM ordens_servico os
      WHERE os.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
        OR os.uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid())))
    )
  )
);

-- contrato_aditivos: Gestores e fiscais can manage aditivos
DROP POLICY IF EXISTS "Gestores e fiscais can manage aditivos" ON public.contrato_aditivos;
CREATE POLICY "Gestores e fiscais can manage aditivos" ON public.contrato_aditivos
AS RESTRICTIVE FOR ALL TO authenticated
USING (
  is_admin(auth.uid())
  OR (
    (is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional') OR has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal'))
    AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  )
)
WITH CHECK (
  is_admin(auth.uid())
  OR (
    (is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional') OR has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal'))
    AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  )
);

-- contrato_aditivos: Scoped users can view aditivos
DROP POLICY IF EXISTS "Scoped users can view aditivos" ON public.contrato_aditivos;
CREATE POLICY "Scoped users can view aditivos" ON public.contrato_aditivos
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  OR (
    (has_role(auth.uid(), 'gestor_regional') OR has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal') OR has_role(auth.uid(), 'operador'))
    AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  )
  OR (has_role(auth.uid(), 'preposto') AND contrato_id = ANY(get_preposto_contrato_ids(auth.uid())))
  OR (has_role(auth.uid(), 'terceirizado') AND contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid())))
);

-- limites_modalidade: Scoped users can view limits
DROP POLICY IF EXISTS "Scoped users can view limits" ON public.limites_modalidade;
CREATE POLICY "Scoped users can view limits" ON public.limites_modalidade
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  OR (
    (has_role(auth.uid(), 'gestor_regional') OR has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal') OR has_role(auth.uid(), 'operador'))
    AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  )
);

-- orcamento_creditos: Fiscal can view own creditos
DROP POLICY IF EXISTS "Fiscal can view own creditos" ON public.orcamento_creditos;
CREATE POLICY "Fiscal can view own creditos" ON public.orcamento_creditos
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal'))
  AND orcamento_id IN (SELECT id FROM orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid())))
);

-- orcamento_empenhos: Fiscal can view own empenhos
DROP POLICY IF EXISTS "Fiscal can view own empenhos" ON public.orcamento_empenhos;
CREATE POLICY "Fiscal can view own empenhos" ON public.orcamento_empenhos
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal'))
  AND orcamento_id IN (SELECT id FROM orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid())))
);

-- orcamento_anual: Fiscal can view own orcamento
DROP POLICY IF EXISTS "Fiscal can view own orcamento" ON public.orcamento_anual;
CREATE POLICY "Fiscal can view own orcamento" ON public.orcamento_anual
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal'))
  AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
);

-- relatorios_execucao: Admins and nacional can view exec reports
DROP POLICY IF EXISTS "Admins and nacional can view exec reports" ON public.relatorios_execucao;
CREATE POLICY "Admins and nacional can view exec reports" ON public.relatorios_execucao
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  OR ((has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal')) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
);

-- relatorios_execucao: Authorized users can create exec reports
DROP POLICY IF EXISTS "Authorized users can create exec reports" ON public.relatorios_execucao;
CREATE POLICY "Authorized users can create exec reports" ON public.relatorios_execucao
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  is_admin(auth.uid()) OR is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional') OR has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal')
);

-- solicitacoes_credito: Fiscal can create solicitacoes
DROP POLICY IF EXISTS "Fiscal can create solicitacoes" ON public.solicitacoes_credito;
CREATE POLICY "Fiscal can create solicitacoes" ON public.solicitacoes_credito
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal'))
  AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
);

-- solicitacoes_credito: Fiscal can view solicitacoes
DROP POLICY IF EXISTS "Fiscal can view solicitacoes" ON public.solicitacoes_credito;
CREATE POLICY "Fiscal can view solicitacoes" ON public.solicitacoes_credito
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal'))
  AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
);

-- user_roles: Fiscal can view regional roles
DROP POLICY IF EXISTS "Fiscal can view regional roles" ON public.user_roles;
CREATE POLICY "Fiscal can view regional roles" ON public.user_roles
AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (has_role(auth.uid(), 'fiscal_contrato') OR has_role(auth.uid(), 'auxiliar_fiscal'))
  AND user_id IN (SELECT ur.user_id FROM user_regionais ur WHERE ur.regional_id IN (SELECT get_user_regional_ids(auth.uid())))
);
