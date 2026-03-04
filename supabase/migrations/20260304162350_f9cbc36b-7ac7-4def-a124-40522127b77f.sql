
-- =====================================================
-- Fix ALL RESTRICTIVE policies → PERMISSIVE
-- RESTRICTIVE without PERMISSIVE = deny all mutations
-- =====================================================

-- ─── ordens_servico ───
DROP POLICY IF EXISTS "Scoped users can update OS" ON public.ordens_servico;
CREATE POLICY "Scoped users can update OS"
ON public.ordens_servico AS PERMISSIVE FOR UPDATE TO authenticated
USING (
  (auth.uid() = solicitante_id)
  OR (auth.uid() = responsavel_id)
  OR is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND (
    (regional_id IN (SELECT get_user_regional_ids(auth.uid())))
    OR (uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  ))
  OR (has_role(auth.uid(), 'gestor_regional'::app_role) AND (
    (regional_id IN (SELECT get_user_regional_ids(auth.uid())))
    OR (uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  ))
  OR ((has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role)) AND (
    (regional_id IN (SELECT get_user_regional_ids(auth.uid())))
    OR (uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  ))
  OR (has_role(auth.uid(), 'preposto'::app_role) AND contrato_id = ANY(get_preposto_contrato_ids(auth.uid())))
  OR (has_role(auth.uid(), 'terceirizado'::app_role) AND (contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid())) OR responsavel_execucao_id = auth.uid()))
);

DROP POLICY IF EXISTS "Users can create OS" ON public.ordens_servico;
CREATE POLICY "Users can create OS"
ON public.ordens_servico AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (auth.uid() = solicitante_id);

DROP POLICY IF EXISTS "Authenticated can view OS" ON public.ordens_servico;
CREATE POLICY "Authenticated can view OS"
ON public.ordens_servico AS PERMISSIVE FOR SELECT TO authenticated
USING (
  (deleted_at IS NULL) AND (
    is_admin(auth.uid())
    OR (is_nacional(auth.uid()) AND (
      (regional_id IS NOT NULL AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
      OR (uop_id IS NOT NULL AND uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON d.id = u.delegacia_id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
    ))
    OR ((has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role)) AND (
      (regional_id IS NOT NULL AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
      OR (uop_id IS NOT NULL AND uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON d.id = u.delegacia_id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
    ))
    OR ((has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'operador'::app_role)) AND (
      (regional_id IS NOT NULL AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
      OR (uop_id IS NOT NULL AND uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON d.id = u.delegacia_id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
    ))
    OR (has_role(auth.uid(), 'preposto'::app_role) AND contrato_id = ANY(get_preposto_contrato_ids(auth.uid())))
    OR (has_role(auth.uid(), 'terceirizado'::app_role) AND (contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid())) OR responsavel_execucao_id = auth.uid() OR responsavel_encerramento_id = auth.uid()))
  )
);

-- ─── chamados ───
DROP POLICY IF EXISTS "Gestores can update chamados" ON public.chamados;
CREATE POLICY "Gestores can update chamados"
ON public.chamados AS PERMISSIVE FOR UPDATE TO authenticated
USING (
  (auth.uid() = solicitante_id)
  OR is_admin(auth.uid())
  OR ((is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
    AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
);

DROP POLICY IF EXISTS "Users can create chamados" ON public.chamados;
CREATE POLICY "Users can create chamados"
ON public.chamados AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = solicitante_id)
  AND NOT has_role(auth.uid(), 'preposto'::app_role)
  AND NOT has_role(auth.uid(), 'terceirizado'::app_role)
  AND (is_admin(auth.uid()) OR is_nacional(auth.uid()) OR regional_id IN (SELECT get_user_regional_ids(auth.uid())))
);

DROP POLICY IF EXISTS "Users can view chamados" ON public.chamados;
CREATE POLICY "Users can view chamados"
ON public.chamados AS PERMISSIVE FOR SELECT TO authenticated
USING (
  (deleted_at IS NULL) AND (
    (auth.uid() = solicitante_id)
    OR is_admin(auth.uid())
    OR (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
    OR ((has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
      AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  )
);

-- ─── contratos ───
DROP POLICY IF EXISTS "Admins and fiscais can manage contratos" ON public.contratos;
CREATE POLICY "Admins and fiscais can manage contratos"
ON public.contratos AS PERMISSIVE FOR ALL TO authenticated
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  OR ((has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
    AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
);

DROP POLICY IF EXISTS "Authenticated can view contratos" ON public.contratos;
CREATE POLICY "Authenticated can view contratos"
ON public.contratos AS PERMISSIVE FOR SELECT TO authenticated
USING (
  (deleted_at IS NULL) AND (
    is_admin(auth.uid())
    OR (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
    OR ((has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
      AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
    OR ((has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
      AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
    OR (has_role(auth.uid(), 'preposto'::app_role) AND preposto_user_id = auth.uid())
    OR (has_role(auth.uid(), 'terceirizado'::app_role) AND id = ANY(get_terceirizado_contrato_ids(auth.uid())))
  )
);

DROP POLICY IF EXISTS "Gestor regional can insert contratos" ON public.contratos;
CREATE POLICY "Gestor regional can insert contratos"
ON public.contratos AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND regional_id IS NOT NULL
  AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Gestor regional can update contratos" ON public.contratos;
CREATE POLICY "Gestor regional can update contratos"
ON public.contratos AS PERMISSIVE FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'gestor_regional'::app_role)
  AND regional_id IS NOT NULL
  AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))
);

-- ─── contrato_aditivos ───
DROP POLICY IF EXISTS "Gestores e fiscais can manage aditivos" ON public.contrato_aditivos;
CREATE POLICY "Gestores e fiscais can manage aditivos"
ON public.contrato_aditivos AS PERMISSIVE FOR ALL TO authenticated
USING (
  is_admin(auth.uid())
  OR ((is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
    AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
)
WITH CHECK (
  is_admin(auth.uid())
  OR ((is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
    AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
);

DROP POLICY IF EXISTS "Scoped users can view aditivos" ON public.contrato_aditivos;
CREATE POLICY "Scoped users can view aditivos"
ON public.contrato_aditivos AS PERMISSIVE FOR SELECT TO authenticated
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND contrato_id IN (SELECT c.id FROM contratos c WHERE c.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  OR ((has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
    AND contrato_id IN (SELECT c.id FROM contratos c WHERE c.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  OR (has_role(auth.uid(), 'preposto'::app_role) AND contrato_id = ANY(get_preposto_contrato_ids(auth.uid())))
  OR (has_role(auth.uid(), 'terceirizado'::app_role) AND contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid())))
);

-- ─── contrato_contatos ───
DROP POLICY IF EXISTS "Deny anon access to contrato_contatos" ON public.contrato_contatos;
CREATE POLICY "Deny anon access to contrato_contatos"
ON public.contrato_contatos AS RESTRICTIVE FOR ALL TO anon
USING (false);

DROP POLICY IF EXISTS "Admins can view all contatos" ON public.contrato_contatos;
CREATE POLICY "Admins can view all contatos"
ON public.contrato_contatos AS PERMISSIVE FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authorized users can manage contatos" ON public.contrato_contatos;
CREATE POLICY "Authorized users can manage contatos"
ON public.contrato_contatos AS PERMISSIVE FOR ALL TO authenticated
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  OR ((has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
    AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  OR (has_role(auth.uid(), 'preposto'::app_role) AND contrato_id = ANY(get_preposto_contrato_ids(auth.uid())))
);

DROP POLICY IF EXISTS "Nacional can view regional contatos" ON public.contrato_contatos;
CREATE POLICY "Nacional can view regional contatos"
ON public.contrato_contatos AS PERMISSIVE FOR SELECT TO authenticated
USING (is_nacional(auth.uid()) AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))));

DROP POLICY IF EXISTS "Preposto can view own contract contatos" ON public.contrato_contatos;
CREATE POLICY "Preposto can view own contract contatos"
ON public.contrato_contatos AS PERMISSIVE FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'preposto'::app_role) AND contrato_id = ANY(get_preposto_contrato_ids(auth.uid())));

DROP POLICY IF EXISTS "Regional and fiscal can view contatos" ON public.contrato_contatos;
CREATE POLICY "Regional and fiscal can view contatos"
ON public.contrato_contatos AS PERMISSIVE FOR SELECT TO authenticated
USING (
  (has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
  AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid())))
);

DROP POLICY IF EXISTS "Terceirizado can view own contract contatos" ON public.contrato_contatos;
CREATE POLICY "Terceirizado can view own contract contatos"
ON public.contrato_contatos AS PERMISSIVE FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'terceirizado'::app_role) AND contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid())));

-- ─── relatorios_execucao ───
DROP POLICY IF EXISTS "Admins and nacional can view exec reports" ON public.relatorios_execucao;
CREATE POLICY "Admins and nacional can view exec reports"
ON public.relatorios_execucao AS PERMISSIVE FOR SELECT TO authenticated
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  OR ((has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
    AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
);

DROP POLICY IF EXISTS "Admins can manage exec reports" ON public.relatorios_execucao;
CREATE POLICY "Admins can manage exec reports"
ON public.relatorios_execucao AS PERMISSIVE FOR ALL TO authenticated
USING (is_admin(auth.uid()) OR (is_nacional(auth.uid()) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid())))))
WITH CHECK (is_admin(auth.uid()) OR (is_nacional(auth.uid()) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid())))));

DROP POLICY IF EXISTS "Authorized users can create exec reports" ON public.relatorios_execucao;
CREATE POLICY "Authorized users can create exec reports"
ON public.relatorios_execucao AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (is_admin(auth.uid()) OR is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role));

DROP POLICY IF EXISTS "Gestor regional can view regional exec reports" ON public.relatorios_execucao;
CREATE POLICY "Gestor regional can view regional exec reports"
ON public.relatorios_execucao AS PERMISSIVE FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'gestor_regional'::app_role) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))));

DROP POLICY IF EXISTS "Preposto can view exec reports of own contracts" ON public.relatorios_execucao;
CREATE POLICY "Preposto can view exec reports of own contracts"
ON public.relatorios_execucao AS PERMISSIVE FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'preposto'::app_role) AND contrato_id IN (SELECT id FROM contratos WHERE preposto_user_id = auth.uid()));

DROP POLICY IF EXISTS "Terceirizado can view exec reports of own contracts" ON public.relatorios_execucao;
CREATE POLICY "Terceirizado can view exec reports of own contracts"
ON public.relatorios_execucao AS PERMISSIVE FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'terceirizado'::app_role) AND contrato_id IN (SELECT cc.contrato_id FROM contrato_contatos cc WHERE cc.user_id = auth.uid()));

-- ─── agendamentos_visita ───
DROP POLICY IF EXISTS "Gestores can manage agendamentos" ON public.agendamentos_visita;
CREATE POLICY "Gestores can manage agendamentos"
ON public.agendamentos_visita AS PERMISSIVE FOR ALL TO authenticated
USING (
  is_admin(auth.uid())
  OR ((is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
    AND os_id IN (SELECT os.id FROM ordens_servico os WHERE os.regional_id IN (SELECT get_user_regional_ids(auth.uid())) OR os.uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid())))))
)
WITH CHECK (
  is_admin(auth.uid())
  OR ((is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role))
    AND os_id IN (SELECT os.id FROM ordens_servico os WHERE os.regional_id IN (SELECT get_user_regional_ids(auth.uid())) OR os.uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid())))))
);

DROP POLICY IF EXISTS "Operador can view agendamentos" ON public.agendamentos_visita;
CREATE POLICY "Operador can view agendamentos"
ON public.agendamentos_visita AS PERMISSIVE FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'operador'::app_role)
  AND os_id IN (SELECT os.id FROM ordens_servico os WHERE os.regional_id IN (SELECT get_user_regional_ids(auth.uid())) OR os.uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
);

DROP POLICY IF EXISTS "Preposto can manage agendamentos" ON public.agendamentos_visita;
CREATE POLICY "Preposto can manage agendamentos"
ON public.agendamentos_visita AS PERMISSIVE FOR ALL TO authenticated
USING (has_role(auth.uid(), 'preposto'::app_role) AND os_id IN (SELECT os.id FROM ordens_servico os WHERE os.contrato_id IN (SELECT c.id FROM contratos c WHERE c.preposto_user_id = auth.uid())))
WITH CHECK (has_role(auth.uid(), 'preposto'::app_role) AND os_id IN (SELECT os.id FROM ordens_servico os WHERE os.contrato_id IN (SELECT c.id FROM contratos c WHERE c.preposto_user_id = auth.uid())));

DROP POLICY IF EXISTS "Terceirizado can manage agendamentos" ON public.agendamentos_visita;
CREATE POLICY "Terceirizado can manage agendamentos"
ON public.agendamentos_visita AS PERMISSIVE FOR ALL TO authenticated
USING (has_role(auth.uid(), 'terceirizado'::app_role) AND os_id IN (SELECT os.id FROM ordens_servico os WHERE os.contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid()))))
WITH CHECK (has_role(auth.uid(), 'terceirizado'::app_role) AND os_id IN (SELECT os.id FROM ordens_servico os WHERE os.contrato_id = ANY(get_terceirizado_contrato_ids(auth.uid()))));

-- ─── delegacias ───
DROP POLICY IF EXISTS "Admins can manage delegacias" ON public.delegacias;
CREATE POLICY "Admins can manage delegacias"
ON public.delegacias AS PERMISSIVE FOR ALL TO authenticated
USING (is_admin(auth.uid()) OR (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
WITH CHECK (is_admin(auth.uid()) OR (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid()))));

DROP POLICY IF EXISTS "Authenticated can view delegacias" ON public.delegacias;
CREATE POLICY "Authenticated can view delegacias"
ON public.delegacias AS PERMISSIVE FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Gestor regional can manage delegacias" ON public.delegacias;
CREATE POLICY "Gestor regional can manage delegacias"
ON public.delegacias AS PERMISSIVE FOR ALL TO authenticated
USING (has_role(auth.uid(), 'gestor_regional'::app_role) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
WITH CHECK (has_role(auth.uid(), 'gestor_regional'::app_role) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())));

-- ─── uops ───
DROP POLICY IF EXISTS "Admins can manage uops" ON public.uops;
CREATE POLICY "Admins can manage uops"
ON public.uops AS PERMISSIVE FOR ALL TO authenticated
USING (is_admin(auth.uid()) OR (is_nacional(auth.uid()) AND delegacia_id IN (SELECT id FROM delegacias WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid())))))
WITH CHECK (is_admin(auth.uid()) OR (is_nacional(auth.uid()) AND delegacia_id IN (SELECT id FROM delegacias WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid())))));

DROP POLICY IF EXISTS "Authenticated can view uops" ON public.uops;
CREATE POLICY "Authenticated can view uops"
ON public.uops AS PERMISSIVE FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Gestor regional can manage uops" ON public.uops;
CREATE POLICY "Gestor regional can manage uops"
ON public.uops AS PERMISSIVE FOR ALL TO authenticated
USING (has_role(auth.uid(), 'gestor_regional'::app_role) AND delegacia_id IN (SELECT d.id FROM delegacias d WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
WITH CHECK (has_role(auth.uid(), 'gestor_regional'::app_role) AND delegacia_id IN (SELECT d.id FROM delegacias d WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))));

-- ─── user_roles ───
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Fiscal can view regional roles" ON public.user_roles;
CREATE POLICY "Fiscal can view regional roles"
ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated
USING ((has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role)) AND user_id IN (SELECT ur.user_id FROM user_regionais ur WHERE ur.regional_id IN (SELECT get_user_regional_ids(auth.uid()))));

DROP POLICY IF EXISTS "Gestor regional can view regional roles" ON public.user_roles;
CREATE POLICY "Gestor regional can view regional roles"
ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'gestor_regional'::app_role) AND user_id IN (SELECT ur.user_id FROM user_regionais ur WHERE ur.regional_id IN (SELECT get_user_regional_ids(auth.uid()))));

DROP POLICY IF EXISTS "Nacional can manage regional roles" ON public.user_roles;
CREATE POLICY "Nacional can manage regional roles"
ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated
USING (is_nacional(auth.uid()) AND user_id IN (SELECT ur.user_id FROM user_regionais ur WHERE ur.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
WITH CHECK (is_nacional(auth.uid()) AND user_id IN (SELECT ur.user_id FROM user_regionais ur WHERE ur.regional_id IN (SELECT get_user_regional_ids(auth.uid()))));

-- ─── audit_logs ───
DROP POLICY IF EXISTS "Managers can view logs" ON public.audit_logs;
CREATE POLICY "Managers can view logs"
ON public.audit_logs AS PERMISSIVE FOR SELECT TO authenticated
USING (is_manager(auth.uid()));

DROP POLICY IF EXISTS "Only triggers can insert logs" ON public.audit_logs;
CREATE POLICY "Only triggers can insert logs"
ON public.audit_logs AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (false);

-- ─── edge_function_logs ───
DROP POLICY IF EXISTS "Authenticated can insert own logs" ON public.edge_function_logs;
CREATE POLICY "Authenticated can insert own logs"
ON public.edge_function_logs AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (auth.uid() = caller_id);

DROP POLICY IF EXISTS "Managers can view logs" ON public.edge_function_logs;
CREATE POLICY "Managers can view func logs"
ON public.edge_function_logs AS PERMISSIVE FOR SELECT TO authenticated
USING (is_manager(auth.uid()));

-- ─── planos_manutencao ───
DROP POLICY IF EXISTS "Admins can manage planos" ON public.planos_manutencao;
CREATE POLICY "Admins can manage planos"
ON public.planos_manutencao AS PERMISSIVE FOR ALL TO authenticated
USING (is_admin(auth.uid()) OR is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role));

DROP POLICY IF EXISTS "Authenticated can view planos" ON public.planos_manutencao;
CREATE POLICY "Authenticated can view planos"
ON public.planos_manutencao AS PERMISSIVE FOR SELECT TO authenticated
USING (true);

-- ─── monitoring_config ───
DROP POLICY IF EXISTS "Managers can manage config" ON public.monitoring_config;
CREATE POLICY "Managers can manage config"
ON public.monitoring_config AS PERMISSIVE FOR ALL TO authenticated
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

-- ─── orcamento_anual ───
DROP POLICY IF EXISTS "Admin can manage all orcamento" ON public.orcamento_anual;
CREATE POLICY "Admin can manage all orcamento"
ON public.orcamento_anual AS PERMISSIVE FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Fiscal can view own orcamento" ON public.orcamento_anual;
CREATE POLICY "Fiscal can view own orcamento"
ON public.orcamento_anual AS PERMISSIVE FOR SELECT TO authenticated
USING ((has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role)) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())));

DROP POLICY IF EXISTS "Nacional can manage own orcamento" ON public.orcamento_anual;
CREATE POLICY "Nacional can manage own orcamento"
ON public.orcamento_anual AS PERMISSIVE FOR ALL TO authenticated
USING (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
WITH CHECK (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())));

-- ─── orcamento_creditos ───
DROP POLICY IF EXISTS "Admin can manage creditos" ON public.orcamento_creditos;
CREATE POLICY "Admin can manage creditos"
ON public.orcamento_creditos AS PERMISSIVE FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Fiscal can view own creditos" ON public.orcamento_creditos;
CREATE POLICY "Fiscal can view own creditos"
ON public.orcamento_creditos AS PERMISSIVE FOR SELECT TO authenticated
USING ((has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role)) AND orcamento_id IN (SELECT id FROM orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))));

DROP POLICY IF EXISTS "Nacional can manage own creditos" ON public.orcamento_creditos;
CREATE POLICY "Nacional can manage own creditos"
ON public.orcamento_creditos AS PERMISSIVE FOR ALL TO authenticated
USING (is_nacional(auth.uid()) AND orcamento_id IN (SELECT id FROM orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
WITH CHECK (is_nacional(auth.uid()) AND orcamento_id IN (SELECT id FROM orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))));

DROP POLICY IF EXISTS "Regional can view own creditos" ON public.orcamento_creditos;
CREATE POLICY "Regional can view own creditos"
ON public.orcamento_creditos AS PERMISSIVE FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'gestor_regional'::app_role) AND orcamento_id IN (SELECT id FROM orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))));

-- ─── orcamento_empenhos ───
DROP POLICY IF EXISTS "Admin can manage empenhos" ON public.orcamento_empenhos;
CREATE POLICY "Admin can manage empenhos"
ON public.orcamento_empenhos AS PERMISSIVE FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Fiscal can view own empenhos" ON public.orcamento_empenhos;
CREATE POLICY "Fiscal can view own empenhos"
ON public.orcamento_empenhos AS PERMISSIVE FOR SELECT TO authenticated
USING ((has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role)) AND orcamento_id IN (SELECT id FROM orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))));

DROP POLICY IF EXISTS "Nacional can manage own empenhos" ON public.orcamento_empenhos;
CREATE POLICY "Nacional can manage own empenhos"
ON public.orcamento_empenhos AS PERMISSIVE FOR ALL TO authenticated
USING (is_nacional(auth.uid()) AND orcamento_id IN (SELECT id FROM orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
WITH CHECK (is_nacional(auth.uid()) AND orcamento_id IN (SELECT id FROM orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))));

DROP POLICY IF EXISTS "Regional can delete own empenhos" ON public.orcamento_empenhos;
CREATE POLICY "Regional can delete own empenhos"
ON public.orcamento_empenhos AS PERMISSIVE FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'gestor_regional'::app_role) AND orcamento_id IN (SELECT id FROM orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))));

DROP POLICY IF EXISTS "Regional can manage own empenhos" ON public.orcamento_empenhos;
CREATE POLICY "Regional can manage own empenhos"
ON public.orcamento_empenhos AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'gestor_regional'::app_role) AND orcamento_id IN (SELECT id FROM orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))));

DROP POLICY IF EXISTS "Regional can update own empenhos" ON public.orcamento_empenhos;
CREATE POLICY "Regional can update own empenhos"
ON public.orcamento_empenhos AS PERMISSIVE FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'gestor_regional'::app_role) AND orcamento_id IN (SELECT id FROM orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))));

DROP POLICY IF EXISTS "Regional can view own empenhos" ON public.orcamento_empenhos;
CREATE POLICY "Regional can view own empenhos"
ON public.orcamento_empenhos AS PERMISSIVE FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'gestor_regional'::app_role) AND orcamento_id IN (SELECT id FROM orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))));

-- ─── orcamento_loa ───
DROP POLICY IF EXISTS "Admin can manage LOA" ON public.orcamento_loa;
CREATE POLICY "Admin can manage LOA"
ON public.orcamento_loa AS PERMISSIVE FOR ALL TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Nacional can manage LOA" ON public.orcamento_loa;
CREATE POLICY "Nacional can manage LOA"
ON public.orcamento_loa AS PERMISSIVE FOR ALL TO authenticated
USING (is_nacional(auth.uid()))
WITH CHECK (is_nacional(auth.uid()));

-- ─── solicitacoes_credito ───
DROP POLICY IF EXISTS "Admin can manage solicitacoes" ON public.solicitacoes_credito;
CREATE POLICY "Admin can manage solicitacoes"
ON public.solicitacoes_credito AS PERMISSIVE FOR ALL TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Fiscal can create solicitacoes" ON public.solicitacoes_credito;
CREATE POLICY "Fiscal can create solicitacoes"
ON public.solicitacoes_credito AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK ((has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role)) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())));

DROP POLICY IF EXISTS "Fiscal can view solicitacoes" ON public.solicitacoes_credito;
CREATE POLICY "Fiscal can view solicitacoes"
ON public.solicitacoes_credito AS PERMISSIVE FOR SELECT TO authenticated
USING ((has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role)) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())));

DROP POLICY IF EXISTS "Nacional can manage own solicitacoes" ON public.solicitacoes_credito;
CREATE POLICY "Nacional can manage own solicitacoes"
ON public.solicitacoes_credito AS PERMISSIVE FOR ALL TO authenticated
USING (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
WITH CHECK (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())));

DROP POLICY IF EXISTS "Regional can create solicitacoes" ON public.solicitacoes_credito;
CREATE POLICY "Regional can create solicitacoes"
ON public.solicitacoes_credito AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'gestor_regional'::app_role) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())));

DROP POLICY IF EXISTS "Regional can view own solicitacoes" ON public.solicitacoes_credito;
CREATE POLICY "Regional can view own solicitacoes"
ON public.solicitacoes_credito AS PERMISSIVE FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'gestor_regional'::app_role) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())));

-- ─── limites_modalidade ───
DROP POLICY IF EXISTS "Admins can manage limits" ON public.limites_modalidade;
CREATE POLICY "Admins can manage limits"
ON public.limites_modalidade AS PERMISSIVE FOR ALL TO authenticated
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Nacional can manage limits for their regionals" ON public.limites_modalidade;
CREATE POLICY "Nacional can manage limits for their regionals"
ON public.limites_modalidade AS PERMISSIVE FOR ALL TO authenticated
USING (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())));

DROP POLICY IF EXISTS "Regional managers can manage limits for their regional" ON public.limites_modalidade;
CREATE POLICY "Regional managers can manage limits for their regional"
ON public.limites_modalidade AS PERMISSIVE FOR ALL TO authenticated
USING (has_role(auth.uid(), 'gestor_regional'::app_role) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())));

DROP POLICY IF EXISTS "Scoped users can view limits" ON public.limites_modalidade;
CREATE POLICY "Scoped users can view limits"
ON public.limites_modalidade AS PERMISSIVE FOR SELECT TO authenticated
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  OR ((has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role) OR has_role(auth.uid(), 'auxiliar_fiscal'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
    AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
);
