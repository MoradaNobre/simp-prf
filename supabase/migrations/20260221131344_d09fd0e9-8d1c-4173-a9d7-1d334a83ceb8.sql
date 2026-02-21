
-- =============================================
-- 1. UPDATE is_admin() TO ONLY MATCH gestor_master
-- =============================================
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'gestor_master'::app_role
  )
$$;

-- =============================================
-- 2. CREATE is_nacional() HELPER
-- =============================================
CREATE OR REPLACE FUNCTION public.is_nacional(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'gestor_nacional'::app_role
  )
$$;

-- =============================================
-- 3. CREATE is_manager() (admin OR nacional) for management access
-- =============================================
CREATE OR REPLACE FUNCTION public.is_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('gestor_master'::app_role, 'gestor_nacional'::app_role)
  )
$$;

-- =============================================
-- AUDIT_LOGS (no regional_id - both keep full access)
-- =============================================
DROP POLICY IF EXISTS "Only gestor_nacional can view logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Gestor nacional can delete logs" ON public.audit_logs;

CREATE POLICY "Managers can view logs" ON public.audit_logs
FOR SELECT USING (is_manager(auth.uid()));

CREATE POLICY "Gestor master can delete logs" ON public.audit_logs
FOR DELETE USING (is_admin(auth.uid()));

-- =============================================
-- CONTRATO_ADITIVOS (via contrato -> regional_id)
-- =============================================
DROP POLICY IF EXISTS "Gestores e fiscais can manage aditivos" ON public.contrato_aditivos;

CREATE POLICY "Gestores e fiscais can manage aditivos" ON public.contrato_aditivos
FOR ALL
USING (
  is_admin(auth.uid())
  OR (
    (is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role))
    AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  )
)
WITH CHECK (
  is_admin(auth.uid())
  OR (
    (is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'fiscal_contrato'::app_role))
    AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  )
);

-- =============================================
-- CONTRATO_CONTATOS (via contrato -> regional_id)
-- =============================================
DROP POLICY IF EXISTS "Authorized users can manage contatos" ON public.contrato_contatos;

CREATE POLICY "Authorized users can manage contatos" ON public.contrato_contatos
FOR ALL
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  OR (has_role(auth.uid(), 'fiscal_contrato'::app_role) AND contrato_id IN (SELECT id FROM contratos WHERE regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  OR (has_role(auth.uid(), 'preposto'::app_role) AND contrato_id IN (SELECT id FROM contratos WHERE preposto_user_id = auth.uid()))
);

-- =============================================
-- CONTRATOS (regional_id)
-- =============================================
DROP POLICY IF EXISTS "Authenticated can view contratos" ON public.contratos;
DROP POLICY IF EXISTS "Fiscais and admins can manage contratos" ON public.contratos;

CREATE POLICY "Authenticated can view contratos" ON public.contratos
FOR SELECT
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  OR (has_role(auth.uid(), 'fiscal_contrato'::app_role) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  OR ((has_role(auth.uid(), 'gestor_regional'::app_role) OR has_role(auth.uid(), 'operador'::app_role)) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  OR (has_role(auth.uid(), 'preposto'::app_role) AND preposto_user_id = auth.uid())
);

CREATE POLICY "Admins and fiscais can manage contratos" ON public.contratos
FOR ALL
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  OR (has_role(auth.uid(), 'fiscal_contrato'::app_role) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
);

-- =============================================
-- DELEGACIAS (regional_id)
-- =============================================
DROP POLICY IF EXISTS "Admins can manage delegacias" ON public.delegacias;

CREATE POLICY "Admins can manage delegacias" ON public.delegacias
FOR ALL
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
)
WITH CHECK (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
);

-- =============================================
-- EQUIPAMENTOS (via uop -> delegacia -> regional)
-- =============================================
DROP POLICY IF EXISTS "Admins can manage equipamentos" ON public.equipamentos;

CREATE POLICY "Admins can manage equipamentos" ON public.equipamentos
FOR ALL
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND uop_id IN (
    SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id
    WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  ))
)
WITH CHECK (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND uop_id IN (
    SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id
    WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))
  ))
);

-- =============================================
-- ORCAMENTO_ANUAL (regional_id)
-- =============================================
DROP POLICY IF EXISTS "Nacional can manage orcamento" ON public.orcamento_anual;

CREATE POLICY "Admin can manage all orcamento" ON public.orcamento_anual
FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Nacional can manage own orcamento" ON public.orcamento_anual
FOR ALL
USING (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
WITH CHECK (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())));

-- =============================================
-- ORCAMENTO_CREDITOS (via orcamento -> regional)
-- =============================================
DROP POLICY IF EXISTS "Nacional can manage creditos" ON public.orcamento_creditos;

CREATE POLICY "Admin can manage creditos" ON public.orcamento_creditos
FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Nacional can manage own creditos" ON public.orcamento_creditos
FOR ALL
USING (is_nacional(auth.uid()) AND orcamento_id IN (SELECT id FROM orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
WITH CHECK (is_nacional(auth.uid()) AND orcamento_id IN (SELECT id FROM orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))));

-- =============================================
-- ORCAMENTO_EMPENHOS (via orcamento -> regional)
-- =============================================
DROP POLICY IF EXISTS "Nacional can manage empenhos" ON public.orcamento_empenhos;

CREATE POLICY "Admin can manage empenhos" ON public.orcamento_empenhos
FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Nacional can manage own empenhos" ON public.orcamento_empenhos
FOR ALL
USING (is_nacional(auth.uid()) AND orcamento_id IN (SELECT id FROM orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
WITH CHECK (is_nacional(auth.uid()) AND orcamento_id IN (SELECT id FROM orcamento_anual WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))));

-- =============================================
-- ORCAMENTO_LOA (global - master manages, nacional can view)
-- =============================================
DROP POLICY IF EXISTS "Nacional can manage LOA" ON public.orcamento_loa;

CREATE POLICY "Admin can manage LOA" ON public.orcamento_loa
FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Nacional can view LOA" ON public.orcamento_loa
FOR SELECT USING (is_nacional(auth.uid()));

-- =============================================
-- ORDENS_SERVICO (regional_id)
-- =============================================
DROP POLICY IF EXISTS "Authenticated can view OS" ON public.ordens_servico;
DROP POLICY IF EXISTS "Managers can update OS" ON public.ordens_servico;
DROP POLICY IF EXISTS "Managers can delete OS" ON public.ordens_servico;

CREATE POLICY "Authenticated can view OS" ON public.ordens_servico
FOR SELECT
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND (
    (regional_id IS NOT NULL AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
    OR (uop_id IS NOT NULL AND uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  ))
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

CREATE POLICY "Managers can update OS" ON public.ordens_servico
FOR UPDATE
USING (
  auth.uid() = solicitante_id
  OR auth.uid() = responsavel_id
  OR is_admin(auth.uid())
  OR is_nacional(auth.uid())
  OR has_role(auth.uid(), 'gestor_regional'::app_role)
  OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
  OR (has_role(auth.uid(), 'preposto'::app_role) AND contrato_id IN (SELECT id FROM contratos WHERE preposto_user_id = auth.uid()))
  OR (has_role(auth.uid(), 'terceirizado'::app_role) AND (
    contrato_id IN (SELECT contrato_id FROM contrato_contatos WHERE user_id = auth.uid())
    OR responsavel_execucao_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
    OR responsavel_encerramento_id IN (SELECT id FROM contrato_contatos WHERE user_id = auth.uid())
  ))
);

CREATE POLICY "Managers can delete OS" ON public.ordens_servico
FOR DELETE
USING (
  auth.uid() = solicitante_id
  OR is_admin(auth.uid())
  OR is_nacional(auth.uid())
  OR has_role(auth.uid(), 'gestor_regional'::app_role)
);

-- =============================================
-- OS_CUSTOS (via os)
-- =============================================
DROP POLICY IF EXISTS "Authorized users can manage custos" ON public.os_custos;

CREATE POLICY "Authorized users can manage custos" ON public.os_custos
FOR ALL
USING (
  is_admin(auth.uid())
  OR is_nacional(auth.uid())
  OR (has_role(auth.uid(), 'fiscal_contrato'::app_role) AND os_id IN (
    SELECT id FROM ordens_servico WHERE
      regional_id IN (SELECT get_user_regional_ids(auth.uid()))
      OR uop_id IN (SELECT u.id FROM uops u JOIN delegacias d ON u.delegacia_id = d.id WHERE d.regional_id IN (SELECT get_user_regional_ids(auth.uid())))
  ))
  OR has_role(auth.uid(), 'preposto'::app_role)
  OR has_role(auth.uid(), 'terceirizado'::app_role)
);

-- =============================================
-- PLANOS_MANUTENCAO (no regional scope)
-- =============================================
DROP POLICY IF EXISTS "Admins can manage planos" ON public.planos_manutencao;

CREATE POLICY "Admins can manage planos" ON public.planos_manutencao
FOR ALL
USING (is_admin(auth.uid()) OR is_nacional(auth.uid()) OR has_role(auth.uid(), 'gestor_regional'::app_role));

-- =============================================
-- PROFILES (no regional_id - keep broad access for management)
-- =============================================
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Managers can view all profiles" ON public.profiles
FOR SELECT USING (is_manager(auth.uid()));

CREATE POLICY "Managers can update all profiles" ON public.profiles
FOR UPDATE
USING (is_manager(auth.uid()))
WITH CHECK (is_manager(auth.uid()));

-- =============================================
-- REGIONAIS (gestor_master manages, nacional can view via existing policy)
-- =============================================
DROP POLICY IF EXISTS "Admins can manage regionais" ON public.regionais;

CREATE POLICY "Admins can manage regionais" ON public.regionais
FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- =============================================
-- REGIONAL_OS_SEQ
-- =============================================
DROP POLICY IF EXISTS "Admins can manage regional_os_seq" ON public.regional_os_seq;

CREATE POLICY "Managers can manage regional_os_seq" ON public.regional_os_seq
FOR ALL USING (is_manager(auth.uid()));

-- =============================================
-- RELATORIOS_EXECUCAO (regional_id)
-- =============================================
DROP POLICY IF EXISTS "Gestores e fiscais can view all exec reports" ON public.relatorios_execucao;
DROP POLICY IF EXISTS "Gestor nacional can delete exec reports" ON public.relatorios_execucao;
DROP POLICY IF EXISTS "Gestor nacional can update exec reports" ON public.relatorios_execucao;
DROP POLICY IF EXISTS "Authorized users can create exec reports" ON public.relatorios_execucao;

CREATE POLICY "Admins and nacional can view exec reports" ON public.relatorios_execucao
FOR SELECT
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  OR (has_role(auth.uid(), 'fiscal_contrato'::app_role) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
);

CREATE POLICY "Admins can manage exec reports" ON public.relatorios_execucao
FOR ALL
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
)
WITH CHECK (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
);

CREATE POLICY "Authorized users can create exec reports" ON public.relatorios_execucao
FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) OR is_nacional(auth.uid())
  OR has_role(auth.uid(), 'gestor_regional'::app_role)
  OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
);

-- =============================================
-- RELATORIOS_OS (regional_id)
-- =============================================
DROP POLICY IF EXISTS "Gestor nacional can view all reports" ON public.relatorios_os;
DROP POLICY IF EXISTS "Gestor nacional can delete reports" ON public.relatorios_os;
DROP POLICY IF EXISTS "Gestor nacional can update reports" ON public.relatorios_os;
DROP POLICY IF EXISTS "Authorized users can create reports" ON public.relatorios_os;

CREATE POLICY "Admins and nacional can view reports" ON public.relatorios_os
FOR SELECT
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
  OR (has_role(auth.uid(), 'fiscal_contrato'::app_role) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
);

CREATE POLICY "Admins can manage reports" ON public.relatorios_os
FOR ALL
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
)
WITH CHECK (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND (regional_id IS NULL OR regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
);

CREATE POLICY "Authorized users can create reports" ON public.relatorios_os
FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) OR is_nacional(auth.uid())
  OR has_role(auth.uid(), 'gestor_regional'::app_role)
  OR has_role(auth.uid(), 'fiscal_contrato'::app_role)
);

-- =============================================
-- SOLICITACOES_CREDITO (regional_id)
-- =============================================
DROP POLICY IF EXISTS "Nacional can manage solicitacoes" ON public.solicitacoes_credito;

CREATE POLICY "Admin can manage solicitacoes" ON public.solicitacoes_credito
FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Nacional can manage own solicitacoes" ON public.solicitacoes_credito
FOR ALL
USING (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
WITH CHECK (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())));

-- =============================================
-- UOPS (via delegacia -> regional)
-- =============================================
DROP POLICY IF EXISTS "Admins can manage uops" ON public.uops;

CREATE POLICY "Admins can manage uops" ON public.uops
FOR ALL
USING (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND delegacia_id IN (SELECT id FROM delegacias WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
)
WITH CHECK (
  is_admin(auth.uid())
  OR (is_nacional(auth.uid()) AND delegacia_id IN (SELECT id FROM delegacias WHERE regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
);

-- =============================================
-- USER_REGIONAIS (no regional scope on table, but scope by regional_id)
-- =============================================
DROP POLICY IF EXISTS "Admins can manage user_regionais" ON public.user_regionais;

CREATE POLICY "Admins can manage user_regionais" ON public.user_regionais
FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Nacional can manage user_regionais" ON public.user_regionais
FOR ALL
USING (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())))
WITH CHECK (is_nacional(auth.uid()) AND regional_id IN (SELECT get_user_regional_ids(auth.uid())));

-- =============================================
-- USER_ROLES (scope nacional to users in same regionais)
-- =============================================
DROP POLICY IF EXISTS "National managers can manage roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles" ON public.user_roles
FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Nacional can manage regional roles" ON public.user_roles
FOR ALL
USING (is_nacional(auth.uid()) AND user_id IN (SELECT ur.user_id FROM user_regionais ur WHERE ur.regional_id IN (SELECT get_user_regional_ids(auth.uid()))))
WITH CHECK (is_nacional(auth.uid()) AND user_id IN (SELECT ur.user_id FROM user_regionais ur WHERE ur.regional_id IN (SELECT get_user_regional_ids(auth.uid()))));
