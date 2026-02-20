
-- Create helper function to check for admin-level roles (gestor_nacional OR gestor_master)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('gestor_nacional'::app_role, 'gestor_master'::app_role)
  )
$$;

-- === audit_logs ===
DROP POLICY IF EXISTS "Gestor nacional can delete logs" ON public.audit_logs;
CREATE POLICY "Gestor nacional can delete logs" ON public.audit_logs FOR DELETE USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Only gestor_nacional can view logs" ON public.audit_logs;
CREATE POLICY "Only gestor_nacional can view logs" ON public.audit_logs FOR SELECT USING (is_admin(auth.uid()));

-- === contrato_aditivos ===
DROP POLICY IF EXISTS "Gestores e fiscais can manage aditivos" ON public.contrato_aditivos;
CREATE POLICY "Gestores e fiscais can manage aditivos" ON public.contrato_aditivos FOR ALL
USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'gestor_regional'::app_role) AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  OR (has_role(auth.uid(), 'fiscal_contrato'::app_role) AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
)
WITH CHECK (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'gestor_regional'::app_role) AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  OR (has_role(auth.uid(), 'fiscal_contrato'::app_role) AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
);

-- === contrato_contatos ===
DROP POLICY IF EXISTS "Authorized users can manage contatos" ON public.contrato_contatos;
CREATE POLICY "Authorized users can manage contatos" ON public.contrato_contatos FOR ALL
USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'fiscal_contrato'::app_role) AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  OR (has_role(auth.uid(), 'preposto'::app_role) AND contrato_id IN (SELECT id FROM contratos WHERE preposto_user_id = auth.uid()))
);

-- === contratos ===
DROP POLICY IF EXISTS "Authenticated can view contratos" ON public.contratos;
CREATE POLICY "Authenticated can view contratos" ON public.contratos FOR SELECT
USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'fiscal_contrato'::app_role) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  OR ((has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'operador'::app_role)) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  OR (has_role(auth.uid(), 'preposto'::app_role) AND preposto_user_id = auth.uid())
);

DROP POLICY IF EXISTS "Fiscais and admins can manage contratos" ON public.contratos;
CREATE POLICY "Fiscais and admins can manage contratos" ON public.contratos FOR ALL
USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'fiscal_contrato'::app_role) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
);

-- === delegacias ===
DROP POLICY IF EXISTS "Admins can manage delegacias" ON public.delegacias;
CREATE POLICY "Admins can manage delegacias" ON public.delegacias FOR ALL USING (is_admin(auth.uid()));

-- === equipamentos ===
DROP POLICY IF EXISTS "Admins can manage equipamentos" ON public.equipamentos;
CREATE POLICY "Admins can manage equipamentos" ON public.equipamentos FOR ALL USING (is_admin(auth.uid()));

-- === orcamento_anual ===
DROP POLICY IF EXISTS "Nacional can manage orcamento" ON public.orcamento_anual;
CREATE POLICY "Nacional can manage orcamento" ON public.orcamento_anual FOR ALL USING (is_admin(auth.uid()));

-- === orcamento_creditos ===
DROP POLICY IF EXISTS "Nacional can manage creditos" ON public.orcamento_creditos;
CREATE POLICY "Nacional can manage creditos" ON public.orcamento_creditos FOR ALL USING (is_admin(auth.uid()));

-- === orcamento_empenhos ===
DROP POLICY IF EXISTS "Nacional can manage empenhos" ON public.orcamento_empenhos;
CREATE POLICY "Nacional can manage empenhos" ON public.orcamento_empenhos FOR ALL USING (is_admin(auth.uid()));

-- === orcamento_loa ===
DROP POLICY IF EXISTS "Nacional can manage LOA" ON public.orcamento_loa;
CREATE POLICY "Nacional can manage LOA" ON public.orcamento_loa FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- === ordens_servico ===
DROP POLICY IF EXISTS "Authenticated can view OS" ON public.ordens_servico;
CREATE POLICY "Authenticated can view OS" ON public.ordens_servico FOR SELECT
USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'fiscal_contrato'::app_role) AND (
    (regional_id IS NOT NULL AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
    OR (uop_id IS NOT NULL AND uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  ))
  OR ((has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'operador'::app_role)) AND (
    (regional_id IS NOT NULL AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
    OR (uop_id IS NOT NULL AND uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  ))
  OR (has_role(auth.uid(), 'preposto'::app_role) AND contrato_id IN (SELECT id FROM contratos WHERE preposto_user_id = auth.uid()))
  OR (has_role(auth.uid(), 'terceirizado'::app_role) AND (
    contrato_id IN (SELECT contrato_id FROM contrato_contatos WHERE user_id = auth.uid())
    OR responsavel_execucao_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
    OR responsavel_encerramento_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
  ))
);

DROP POLICY IF EXISTS "Managers can delete OS" ON public.ordens_servico;
CREATE POLICY "Managers can delete OS" ON public.ordens_servico FOR DELETE
USING (auth.uid() = solicitante_id OR is_admin(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role));

DROP POLICY IF EXISTS "Managers can update OS" ON public.ordens_servico;
CREATE POLICY "Managers can update OS" ON public.ordens_servico FOR UPDATE
USING (
  auth.uid() = solicitante_id OR auth.uid() = responsavel_id
  OR is_admin(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
  OR (has_role(auth.uid(), 'preposto'::app_role) AND contrato_id IN (SELECT id FROM contratos WHERE preposto_user_id = auth.uid()))
  OR (has_role(auth.uid(), 'terceirizado'::app_role) AND (
    contrato_id IN (SELECT contrato_id FROM contrato_contatos WHERE user_id = auth.uid())
    OR responsavel_execucao_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
    OR responsavel_encerramento_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
  ))
);

-- === os_custos ===
DROP POLICY IF EXISTS "Authorized users can manage custos" ON public.os_custos;
CREATE POLICY "Authorized users can manage custos" ON public.os_custos FOR ALL
USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'fiscal_contrato'::app_role) AND os_id IN (
    SELECT id FROM ordens_servico WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))
    OR uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  ))
  OR has_role(auth.uid(), 'preposto'::app_role) OR has_role(auth.uid(), 'terceirizado'::app_role)
);

-- === planos_manutencao ===
DROP POLICY IF EXISTS "Admins can manage planos" ON public.planos_manutencao;
CREATE POLICY "Admins can manage planos" ON public.planos_manutencao FOR ALL
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role));

-- === profiles ===
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (is_admin(auth.uid()));

-- === regionais ===
DROP POLICY IF EXISTS "Admins can manage regionais" ON public.regionais;
CREATE POLICY "Admins can manage regionais" ON public.regionais FOR ALL USING (is_admin(auth.uid()));

-- === regional_os_seq ===
DROP POLICY IF EXISTS "Admins can manage regional_os_seq" ON public.regional_os_seq;
CREATE POLICY "Admins can manage regional_os_seq" ON public.regional_os_seq FOR ALL USING (is_admin(auth.uid()));

-- === relatorios_execucao ===
DROP POLICY IF EXISTS "Authorized users can create exec reports" ON public.relatorios_execucao;
CREATE POLICY "Authorized users can create exec reports" ON public.relatorios_execucao FOR INSERT
WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role));

DROP POLICY IF EXISTS "Gestor nacional can delete exec reports" ON public.relatorios_execucao;
CREATE POLICY "Gestor nacional can delete exec reports" ON public.relatorios_execucao FOR DELETE USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Gestor nacional can update exec reports" ON public.relatorios_execucao;
CREATE POLICY "Gestor nacional can update exec reports" ON public.relatorios_execucao FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Gestores e fiscais can view all exec reports" ON public.relatorios_execucao;
CREATE POLICY "Gestores e fiscais can view all exec reports" ON public.relatorios_execucao FOR SELECT
USING (is_admin(auth.uid()) OR (has_role(auth.uid(), 'fiscal_contrato'::app_role) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid())))));

-- === relatorios_os ===
DROP POLICY IF EXISTS "Authorized users can create reports" ON public.relatorios_os;
CREATE POLICY "Authorized users can create reports" ON public.relatorios_os FOR INSERT
WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role));

DROP POLICY IF EXISTS "Gestor nacional can delete reports" ON public.relatorios_os;
CREATE POLICY "Gestor nacional can delete reports" ON public.relatorios_os FOR DELETE USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Gestor nacional can update reports" ON public.relatorios_os;
CREATE POLICY "Gestor nacional can update reports" ON public.relatorios_os FOR UPDATE USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Gestor nacional can view all reports" ON public.relatorios_os;
CREATE POLICY "Gestor nacional can view all reports" ON public.relatorios_os FOR SELECT
USING (is_admin(auth.uid()) OR (has_role(auth.uid(), 'fiscal_contrato'::app_role) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid())))));

-- === solicitacoes_credito ===
DROP POLICY IF EXISTS "Nacional can manage solicitacoes" ON public.solicitacoes_credito;
CREATE POLICY "Nacional can manage solicitacoes" ON public.solicitacoes_credito FOR ALL USING (is_admin(auth.uid()));

-- === uops ===
DROP POLICY IF EXISTS "Admins can manage uops" ON public.uops;
CREATE POLICY "Admins can manage uops" ON public.uops FOR ALL USING (is_admin(auth.uid()));

-- === user_regionais ===
DROP POLICY IF EXISTS "Admins can manage user_regionais" ON public.user_regionais;
CREATE POLICY "Admins can manage user_regionais" ON public.user_regionais FOR ALL USING (is_admin(auth.uid()));

-- === user_roles ===
DROP POLICY IF EXISTS "National managers can manage roles" ON public.user_roles;
CREATE POLICY "National managers can manage roles" ON public.user_roles FOR ALL USING (is_admin(auth.uid()));
